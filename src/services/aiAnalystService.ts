import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function getModuleDir(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback when bundled to CJS in serverless runtimes
  }
  return process.cwd();
}
const __dirname = getModuleDir();

export type IntentCategory =
  | 'negotiation'
  | 'price_estimate'
  | 'overpricing'
  | 'comparables'
  | 'due_diligence'
  | 'risks_limitations'
  | 'property_evaluation'
  | 'market_analysis'
  | 'locality_comparison'
  | 'market_ranking'
  | 'financial_analysis'
  | 'model_methodology'
  | 'comparison'
  | 'follow_up'
  | 'general_faq';

export interface PropertyContext {
  id?: string;
  property_id?: string;
  title?: string;
  society?: string;
  locality?: string;
  city?: string;
  bhk?: number;
  bathrooms?: number;
  area_sqft?: number;
  age_years?: number | null;
  furnishing?: string;
  status?: string;
  price_inr?: number;
  seller_asking_price?: number;
  price_per_sqft?: number;
  estimated_price_inr?: number;
  estimated_rate_per_sqft?: number;
  difference_inr?: number;
  difference_percent?: number;
  tolerance_band_percent?: number;
  verdict?: string;
  risk_tier?: string;
  listing_url?: string;
  suggested_counter_offer?: number;
  target_stance?: string;
  comparison_mode?: boolean;
  properties_count?: number;
  properties?: any[];
  query_intent?: string;
  analyst_role?: 'strategist' | 'negotiator' | 'auditor';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AnalystRole = 'strategist' | 'negotiator' | 'auditor';

interface LocalityBenchmark {
  locality: string;
  city: string;
  count: number;
  median_rate_sqft: number;
  median_price_inr: number;
  multiplier: number;
}

// Cached dataset artifacts for instant, empirically grounded responses
let cachedProperties: any[] = [];
let cachedLocalities: Record<string, LocalityBenchmark[]> = {};
let cachedAnalytics: any = {};

try {
  const candidateDirs = [
    path.join(process.cwd(), 'src', 'data'),
    path.join(__dirname, '../data'),
    path.join(__dirname, '../../src/data'),
  ];
  const dataDir = candidateDirs.find((dir) => fs.existsSync(path.join(dir, 'properties.json'))) || candidateDirs[0];
  const propPath = path.join(dataDir, 'properties.json');
  const locPath = path.join(dataDir, 'localities.json');
  const analyticsPath = path.join(dataDir, 'analytics.json');

  if (fs.existsSync(propPath)) {
    cachedProperties = JSON.parse(fs.readFileSync(propPath, 'utf-8'));
  }
  if (fs.existsSync(locPath)) {
    cachedLocalities = JSON.parse(fs.readFileSync(locPath, 'utf-8'));
  }
  if (fs.existsSync(analyticsPath)) {
    cachedAnalytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
  }
} catch (e) {
  console.warn('aiAnalystService: could not load dataset artifacts:', e);
}

export function formatInr(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n) || n === 0) return 'N/A';
  if (n < 0) return `-${formatInr(Math.abs(n))}`;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  return Math.round(Number(n)).toLocaleString('en-IN');
}

export function cleanUrl(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://www.magicbricks.com';
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `https://www.magicbricks.com${trimmed}`;
  return `https://www.magicbricks.com/${trimmed}`;
}

export function sanitizeAnalystOutput(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const strippedHash = line.replace(/^\s*#{1,6}\s+/, '');
      return strippedHash.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAllLocalities(): LocalityBenchmark[] {
  return [...(cachedLocalities.Pune || []), ...(cachedLocalities.Mumbai || [])];
}

// Find all localities explicitly mentioned in the user query (for single lookup or head-to-head comparison)
function findExplicitlyMentionedLocalities(text: string): LocalityBenchmark[] {
  const tNorm = normalizeToken(text);
  if (!tNorm) return [];
  const all = getAllLocalities().sort((a, b) => b.locality.length - a.locality.length);
  const found: LocalityBenchmark[] = [];
  const seen = new Set<string>();

  for (const loc of all) {
    const locNorm = normalizeToken(loc.locality);
    if (locNorm.length < 4) continue;
    const regex = new RegExp(`\\b${locNorm.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(tNorm) && !seen.has(`${loc.city}:${loc.locality}`)) {
      seen.add(`${loc.city}:${loc.locality}`);
      found.push(loc);
    }
  }
  return found;
}

// Match locality benchmarks via query, conversation history, or active property context
function findRelevantLocalities(
  query: string,
  city?: string,
  activeLocality?: string,
  history?: ChatMessage[]
): LocalityBenchmark[] {
  const allLocs = getAllLocalities();
  if (allLocs.length === 0) return [];

  const matched = new Map<string, LocalityBenchmark>();

  for (const loc of findExplicitlyMentionedLocalities(query)) {
    matched.set(`${loc.city}:${loc.locality}`, loc);
  }

  const actNorm = activeLocality ? normalizeToken(activeLocality) : '';
  if (actNorm && actNorm !== 'micro market' && actNorm !== 'all') {
    for (const l of allLocs) {
      if (city && l.city.toLowerCase() !== city.toLowerCase()) continue;
      const locNorm = normalizeToken(l.locality);
      if (locNorm === actNorm || actNorm.includes(locNorm) || locNorm.includes(actNorm)) {
        matched.set(`${l.city}:${l.locality}`, l);
      }
    }
  }

  if (matched.size === 0 && history && history.length > 0) {
    const recentHistoryText = history
      .slice(-4)
      .map((m) => m.content)
      .join(' ');
    for (const loc of findExplicitlyMentionedLocalities(recentHistoryText)) {
      matched.set(`${loc.city}:${loc.locality}`, loc);
    }
  }

  if (matched.size === 0 && city) {
    for (const loc of (cachedLocalities[city] || []).slice(0, 4)) {
      matched.set(`${loc.city}:${loc.locality}`, loc);
    }
  }

  return Array.from(matched.values()).slice(0, 5);
}

// Extract explicit ₹ amount from user query (e.g. "1.4 Cr", "85 Lakh", "2.25 crore")
function extractInrFromQuery(query: string): number | null {
  const q = query.toLowerCase();
  const crMatch = q.match(/₹?\s*([\d]+(?:\.[\d]+)?)\s*(?:cr|crore|crores)\b/);
  if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000);
  const lakhMatch = q.match(/₹?\s*([\d]+(?:\.[\d]+)?)\s*(?:l|lac|lakh|lakhs)\b/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);
  return null;
}

// Compute stats directly from cachedProperties for a given locality & optional BHK
function computeLocalityMicroStats(locality: string, city: string, bhkFilter?: number) {
  const locNorm = normalizeToken(locality);
  let rows = cachedProperties.filter(
    (p) =>
      p.city?.toLowerCase() === city.toLowerCase() &&
      p.locality &&
      normalizeToken(p.locality) === locNorm &&
      p.price_inr > 0 &&
      p.price_per_sqft > 0
  );
  if (bhkFilter) {
    const bhkRows = rows.filter((p) => p.bhk === bhkFilter);
    if (bhkRows.length > 0) rows = bhkRows;
  }
  if (rows.length === 0) return null;

  const rates = rows.map((r) => r.price_per_sqft).sort((a, b) => a - b);
  const prices = rows.map((r) => r.price_inr).sort((a, b) => a - b);
  const readyCount = rows.filter((r) => r.status === 'Ready to Move').length;
  const ucCount = rows.filter((r) => r.status === 'Under Construction').length;
  const bestValue = [...rows].sort((a, b) => a.price_per_sqft - b.price_per_sqft)[0];

  const avgBhkArea = Math.round(
    rows.reduce((acc, r) => acc + (r.area_sqft || 0), 0) / rows.length
  );

  return {
    count: rows.length,
    minRate: Math.round(rates[0]),
    medianRate: Math.round(rates[Math.floor(rates.length / 2)]),
    maxRate: Math.round(rates[rates.length - 1]),
    minPrice: prices[0],
    medianPrice: prices[Math.floor(prices.length / 2)],
    maxPrice: prices[prices.length - 1],
    readyCount,
    ucCount,
    avgArea: avgBhkArea,
    bestValue,
  };
}

// Compute how a target ₹/sqft ranks inside its locality or city
function computeRatePercentile(city: string, locality: string | undefined, targetRate: number) {
  if (!targetRate || targetRate <= 0) return null;
  const cityPool = cachedProperties.filter(
    (p) => p.city?.toLowerCase() === city.toLowerCase() && p.price_per_sqft > 0
  );
  if (cityPool.length === 0) return null;
  const cityCheaper = cityPool.filter((p) => p.price_per_sqft <= targetRate).length;
  const cityPct = Math.round((cityCheaper / cityPool.length) * 100);

  let locPct: number | null = null;
  let locCount = 0;
  if (locality) {
    const locNorm = normalizeToken(locality);
    const locPool = cityPool.filter((p) => p.locality && normalizeToken(p.locality) === locNorm);
    locCount = locPool.length;
    if (locCount >= 3) {
      const locCheaper = locPool.filter((p) => p.price_per_sqft <= targetRate).length;
      locPct = Math.round((locCheaper / locCount) * 100);
    }
  }

  return { cityPct, cityCount: cityPool.length, locPct, locCount };
}

function computeSameBhkPeers(
  city: string,
  locality: string | undefined,
  bhk: number,
  excludeId?: string
) {
  if (!locality || !bhk) return null;
  const locNorm = normalizeToken(locality);
  const peers = cachedProperties.filter(
    (p) =>
      p.city?.toLowerCase() === city.toLowerCase() &&
      p.locality &&
      normalizeToken(p.locality) === locNorm &&
      p.bhk === bhk &&
      p.price_inr > 0 &&
      p.price_per_sqft > 0
  );
  if (peers.length < 2) return null;

  const rates = [...peers].map((p) => p.price_per_sqft).sort((a, b) => a - b);
  const prices = [...peers].map((p) => p.price_inr).sort((a, b) => a - b);
  const medRate = rates[Math.floor(rates.length / 2)];
  const medPrice = prices[Math.floor(prices.length / 2)];
  const others = peers.filter((p) => p.id !== excludeId);
  const cheapestRatePeer = [...others].sort((a, b) => a.price_per_sqft - b.price_per_sqft)[0] || null;
  const cheapestTicketPeer = [...others].sort((a, b) => a.price_inr - b.price_inr)[0] || null;

  return {
    count: peers.length,
    medRate,
    minRate: rates[0],
    maxRate: rates[rates.length - 1],
    medPrice,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    cheapestRatePeer,
    cheapestTicketPeer,
  };
}

function computeSameSocietyPeers(society: string | undefined, city: string, excludeId?: string) {
  const sNorm = normalizeToken(society || '');
  if (!sNorm || sNorm === 'standalone gated society' || sNorm.length < 4) return null;
  const peers = cachedProperties.filter(
    (p) =>
      p.city?.toLowerCase() === city.toLowerCase() &&
      p.id !== excludeId &&
      p.price_inr > 0 &&
      p.price_per_sqft > 0 &&
      normalizeToken(p.society || '') === sNorm
  );
  if (peers.length === 0) return null;
  const rates = peers.map((p) => p.price_per_sqft).sort((a, b) => a - b);
  const medRate = rates[Math.floor(rates.length / 2)];
  return {
    count: peers.length,
    medRate,
    minRate: rates[0],
    maxRate: rates[rates.length - 1],
    lowestRatePeer: [...peers].sort((a, b) => a.price_per_sqft - b.price_per_sqft)[0],
  };
}

function splitCompsByLeverage(comps: any[], targetRate: number, targetBhk?: number) {
  if (!targetRate || targetRate <= 0) {
    return { leverageComps: comps.slice(0, 3), ceilingComps: [] as any[] };
  }
  const leverageComps = comps
    .filter((c) => (c.price_per_sqft || 0) > 0 && c.price_per_sqft <= targetRate)
    .sort((a, b) => {
      const aSame = targetBhk && a.bhk === targetBhk ? 0 : 1;
      const bSame = targetBhk && b.bhk === targetBhk ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.price_per_sqft - b.price_per_sqft;
    })
    .slice(0, 3);
  const ceilingComps = comps
    .filter((c) => (c.price_per_sqft || 0) > targetRate)
    .sort((a, b) => a.price_per_sqft - b.price_per_sqft)
    .slice(0, 2);
  return { leverageComps, ceilingComps };
}

function explainVarianceDrivers(
  diag: any,
  ctx: PropertyContext,
  locMatch: LocalityBenchmark | undefined,
  sameBhk: ReturnType<typeof computeSameBhkPeers>,
  socPeers: ReturnType<typeof computeSameSocietyPeers>
): string[] {
  const drivers: string[] = [];
  const furn = ctx.furnishing || 'Unfurnished';
  const status = ctx.status || 'Ready to Move';
  const socName = ctx.society && !ctx.society.toLowerCase().includes('standalone') ? ctx.society : null;

  // 1. Model Baseline Drivers
  const furnNote =
    furn === 'Furnished'
      ? '+5.7% model furnishing uplift'
      : furn === 'Semi-Furnished'
      ? 'minimal (+0.4%) semi-furnished uplift'
      : 'unfurnished base baseline';
  const statusNote =
    status === 'Under Construction' ? '+2.9% under-construction launch pricing effect' : 'Ready-to-Move baseline (0% GST in resale)';
  drivers.push(
    `Model Calibration Factors: Baseline (${formatInr(diag.estPrice)}, ₹${formatNum(diag.estRate)}/sqft) weights ${diag.locality}'s smoothed rate, compact/size elasticity on ${diag.area} sqft (ln_area=+0.952), ${diag.bhk} BHK / ${diag.baths} bath config, ${furnNote}, and ${statusNote}.`
  );

  // 2. Micro-market vs Same-BHK Tension
  if (locMatch && diag.askingRate > 0) {
    const vsLocPct = ((diag.askingRate - locMatch.median_rate_sqft) / locMatch.median_rate_sqft) * 100;
    if (diag.diffPct > 0 && vsLocPct < -3) {
      drivers.push(
        `Submarket vs. Config Split: Even though this ask sits ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% above our ${diag.bhk} BHK model estimate, its ₹${formatNum(diag.askingRate)}/sqft rate is actually ${Math.abs(vsLocPct).toFixed(1)}% below ${locMatch.locality}'s all-BHK median (₹${formatNum(locMatch.median_rate_sqft)}/sqft) because larger luxury 2/3/4 BHK towers pull the overall locality average higher.`
      );
    } else if (sameBhk) {
      const vsBhkPct = ((diag.askingRate - sameBhk.medRate) / sameBhk.medRate) * 100;
      drivers.push(
        `Same-Configuration Spread: Among ${sameBhk.count} verified ${diag.bhk} BHK listings in ${diag.locality} (₹${formatNum(sameBhk.minRate)}–₹${formatNum(sameBhk.maxRate)}/sqft; median ₹${formatNum(sameBhk.medRate)}/sqft), this unit sits ${vsBhkPct >= 0 ? '+' : ''}${vsBhkPct.toFixed(1)}% vs. direct peers.`
      );
    }
  }

  // 3. Society / Brand / Seller Padding Attribution
  if (socPeers) {
    const vsSocPct = ((diag.askingRate - socPeers.medRate) / socPeers.medRate) * 100;
    drivers.push(
      `Intra-Society Check (${socName}): ${socPeers.count} sibling listings in the same project trade at ₹${formatNum(socPeers.minRate)}–₹${formatNum(socPeers.maxRate)}/sqft (median ₹${formatNum(socPeers.medRate)}/sqft) — this seller is ${vsSocPct >= 0 ? '+' : ''}${vsSocPct.toFixed(1)}% vs. neighbors.`
    );
  } else if (diag.sellerPrice > 0) {
    if (diag.diffPct > 0 && diag.diffPct <= 10) {
      drivers.push(
        `Brand & Negotiation Cushion: A +${diag.diffPct}% (${formatInr(diag.diffInr)}) gap is textbook portal negotiation room (typically 3%–8% seller buffer) plus unmodeled micro-perks${socName ? ` like ${socName}'s Tier-1 developer brand/amenities` : ''}, floor rise, or reserved parking.`
      );
    } else if (diag.diffPct > 10) {
      drivers.push(
        `Aggressive Seller Markup: A +${diag.diffPct}% (+${formatInr(diag.diffInr)}) premium exceeds normal floor/view variation and signals seller anchoring bias — verify whether a sea/park view, private terrace, or designer fit-out actually justifies paying above ${formatInr(diag.estHighBand)}.`
      );
    } else {
      drivers.push(
        `Discount / Value Driver: Priced ${Math.abs(diag.diffPct)}% (${formatInr(Math.abs(diag.diffInr))}) below model — commonly reflects lower floor height, older building age, quick-liquidity seller motivation, or missing amenities/OC caveats that warrant verification.`
      );
    }
  }

  return drivers;
}

// Compute EMI & All-in buying cost breakdown
function computeAcquisitionFinancials(basePrice: number, status?: string, city: string = 'Pune') {
  const stampPct = 0.06;
  const stampFemalePct = 0.05;
  const stampDuty = Math.round(basePrice * stampPct);
  const stampDutyFemale = Math.round(basePrice * stampFemalePct);
  const registrationFee = basePrice >= 3000000 ? 30000 : Math.round(basePrice * 0.01);
  const isUC = status === 'Under Construction';
  const gstPct = isUC ? (basePrice <= 4500000 ? 0.01 : 0.05) : 0;
  const gstAmount = Math.round(basePrice * gstPct);
  const legalAndSocietyReserve = Math.round(Math.min(75000, Math.max(25000, basePrice * 0.0025)));
  const totalAllInCost = basePrice + stampDuty + registrationFee + gstAmount + legalAndSocietyReserve;

  const downPayment20 = Math.round(basePrice * 0.2);
  const loanPrincipal80 = basePrice - downPayment20;
  const monthlyRate = 0.085 / 12; // 8.50% p.a. benchmark home loan rate
  const calcEmi = (years: number) => {
    const n = years * 12;
    return Math.round(
      (loanPrincipal80 * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
    );
  };
  const emi20Yr = calcEmi(20);
  const emi15Yr = calcEmi(15);
  const recommendedMonthlyIncome = Math.round(emi20Yr / 0.4);

  const grossYieldLow = city === 'Mumbai' ? 0.025 : 0.032;
  const grossYieldHigh = city === 'Mumbai' ? 0.033 : 0.042;
  const estMonthlyRentLow = Math.round((basePrice * grossYieldLow) / 12);
  const estMonthlyRentHigh = Math.round((basePrice * grossYieldHigh) / 12);

  return {
    basePrice,
    stampDuty,
    stampDutyFemale,
    registrationFee,
    gstAmount,
    gstPct,
    legalAndSocietyReserve,
    totalAllInCost,
    downPayment20,
    loanPrincipal80,
    emi20Yr,
    emi15Yr,
    recommendedMonthlyIncome,
    estMonthlyRentLow,
    estMonthlyRentHigh,
    grossYieldLowPct: (grossYieldLow * 100).toFixed(1),
    grossYieldHighPct: (grossYieldHigh * 100).toFixed(1),
  };
}

// Find genuine comparables tagged accurately as same_locality vs citywide_comparable
export function findRealComps(
  city: string,
  locality?: string,
  bhk?: number,
  area?: number,
  excludeId?: string,
  limit: number = 4,
  targetPrice?: number
): { comps: any[]; scope: 'same_locality' | 'citywide' } {
  if (!cachedProperties || cachedProperties.length === 0) {
    return { comps: [], scope: 'citywide' };
  }

  const valid = cachedProperties.filter(
    (p) =>
      p.city &&
      p.city.toLowerCase() === city.toLowerCase() &&
      p.id !== excludeId &&
      p.price_inr &&
      p.price_inr > 0
  );

  const actNorm = locality && locality !== 'All' && locality !== 'Micro-market' ? normalizeToken(locality) : '';
  const isLocalityMatch = (pLoc?: string) => {
    if (!actNorm || !pLoc) return false;
    const pNorm = normalizeToken(pLoc);
    return (
      pNorm === actNorm ||
      (pNorm.length >= 4 && actNorm.includes(pNorm)) ||
      (actNorm.length >= 4 && pNorm.includes(actNorm))
    );
  };

  const sameLocCount = valid.filter((p) => isLocalityMatch(p.locality)).length;

  const scored = valid.map((p) => {
    let score = 0;
    const sameLoc = isLocalityMatch(p.locality);
    if (sameLoc) score += 1200;
    if (bhk && bhk > 0 && p.bhk === bhk) score += 450;
    else if (bhk && p.bhk) score -= Math.abs(p.bhk - bhk) * 120;

    if (area && area > 0 && p.area_sqft) {
      score -= Math.min(250, Math.abs(p.area_sqft - area) * 0.25);
    }

    if (targetPrice && targetPrice > 0 && p.price_inr) {
      const priceRatioDiff = Math.abs(p.price_inr - targetPrice) / targetPrice;
      score -= Math.min(350, priceRatioDiff * 140);
    }

    return { prop: { ...p, same_locality: sameLoc }, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map((s) => s.prop);
  return {
    comps: top,
    scope: sameLocCount > 0 ? 'same_locality' : 'citywide',
  };
}

// Find properties matching user's explicit search/budget/BHK/status filters
function findQueryMatchedProperties(
  query: string,
  matchedLocalities: LocalityBenchmark[],
  fallbackCity?: string
): any[] {
  if (!cachedProperties || cachedProperties.length === 0) return [];
  const qLower = query.toLowerCase();

  let targetCity = fallbackCity;
  if (qLower.includes('mumbai') && !qLower.includes('pune')) targetCity = 'Mumbai';
  else if (qLower.includes('pune') && !qLower.includes('mumbai')) targetCity = 'Pune';

  const bhkMatch = qLower.match(/\b([1-6])\s*bhk\b/);
  const targetBhk = bhkMatch ? Number(bhkMatch[1]) : undefined;

  let maxBudgetInr: number | null = null;
  let minBudgetInr: number | null = null;
  const underCr = qLower.match(/(?:under|below|within|upto|up to|max|<)\s*₹?\s*([\d.]+)\s*(?:cr|crore|crores)/);
  const underLakh = qLower.match(/(?:under|below|within|upto|up to|max|<)\s*₹?\s*([\d.]+)\s*(?:l|lac|lakh|lakhs)/);
  const aroundCr = qLower.match(/(?:around|near|about|~)\s*₹?\s*([\d.]+)\s*(?:cr|crore|crores)/);
  const aroundLakh = qLower.match(/(?:around|near|about|~)\s*₹?\s*([\d.]+)\s*(?:l|lac|lakh|lakhs)/);

  if (underCr) maxBudgetInr = parseFloat(underCr[1]) * 10000000;
  else if (underLakh) maxBudgetInr = parseFloat(underLakh[1]) * 100000;
  else if (aroundCr) {
    const mid = parseFloat(aroundCr[1]) * 10000000;
    minBudgetInr = mid * 0.75;
    maxBudgetInr = mid * 1.25;
  } else if (aroundLakh) {
    const mid = parseFloat(aroundLakh[1]) * 100000;
    minBudgetInr = mid * 0.75;
    maxBudgetInr = mid * 1.25;
  }

  const explicitLocs = findExplicitlyMentionedLocalities(query);
  const queryExplicitlyMentionsLocality = explicitLocs.length > 0;

  const wantsQueryFilter =
    Boolean(targetBhk) ||
    Boolean(maxBudgetInr) ||
    qLower.includes('under construction') ||
    qLower.includes('under-construction') ||
    qLower.includes('ready to move') ||
    queryExplicitlyMentionsLocality;

  if (!wantsQueryFilter) return [];

  let pool = cachedProperties.filter((p) => p.price_inr && p.price_inr > 0);
  if (queryExplicitlyMentionsLocality) {
    const locNames = explicitLocs.map((l) => normalizeToken(l.locality));
    const locCities = new Set(explicitLocs.map((l) => l.city.toLowerCase()));
    const locFiltered = pool.filter((p) => {
      if (!p.locality || !p.city || !locCities.has(p.city.toLowerCase())) return false;
      const pLoc = normalizeToken(p.locality);
      return locNames.some((n) => pLoc === n || pLoc.includes(n) || n.includes(pLoc));
    });
    if (locFiltered.length > 0) pool = locFiltered;
  } else if (targetCity) {
    pool = pool.filter((p) => p.city?.toLowerCase() === targetCity.toLowerCase());
  }

  if (targetBhk) {
    const bhkFiltered = pool.filter((p) => p.bhk === targetBhk);
    if (bhkFiltered.length > 0) pool = bhkFiltered;
  }
  if (qLower.includes('ready to move')) {
    const ready = pool.filter((p) => p.status === 'Ready to Move');
    if (ready.length > 0) pool = ready;
  } else if (qLower.includes('under construction') || qLower.includes('under-construction')) {
    const uc = pool.filter((p) => p.status === 'Under Construction');
    if (uc.length > 0) pool = uc;
  }
  if (maxBudgetInr) {
    const budgetFiltered = pool.filter(
      (p) => p.price_inr <= maxBudgetInr! && (!minBudgetInr || p.price_inr >= minBudgetInr)
    );
    return budgetFiltered
      .sort((a, b) => (a.price_per_sqft || 999999) - (b.price_per_sqft || 999999))
      .slice(0, 5);
  }

  return pool.sort((a, b) => (a.price_per_sqft || 999999) - (b.price_per_sqft || 999999)).slice(0, 5);
}

// Compute accurate, situation-aware pricing & negotiation numbers
function computeValuationDiagnostics(ctx: PropertyContext) {
  const city = ctx.city || 'Pune';
  const locality = ctx.locality || 'Micro-market';
  const bhk = ctx.bhk || 2;
  const baths = ctx.bathrooms || bhk;
  const area = ctx.area_sqft || 950;
  const estPrice = ctx.estimated_price_inr || 0;
  const estRate = ctx.estimated_rate_per_sqft || (area > 0 && estPrice > 0 ? Math.round(estPrice / area) : 0);
  const sellerPrice = ctx.seller_asking_price || ctx.price_inr || 0;
  const askingRate = ctx.price_per_sqft || (area > 0 && sellerPrice > 0 ? Math.round(sellerPrice / area) : 0);
  const defaultTol = Number(cachedAnalytics?.model_meta?.tolerance_band_percent ?? 16.1);
  const tolerance = ctx.tolerance_band_percent || defaultTol;

  const diffInr =
    ctx.difference_inr !== undefined
      ? ctx.difference_inr
      : sellerPrice > 0 && estPrice > 0
      ? sellerPrice - estPrice
      : 0;
  const diffPct =
    ctx.difference_percent !== undefined
      ? ctx.difference_percent
      : estPrice > 0 && sellerPrice > 0
      ? Math.round(((sellerPrice - estPrice) / estPrice) * 1000) / 10
      : 0;

  let pricingRegime:
    | 'deep_discount_anomaly'
    | 'below_band'
    | 'fair_band'
    | 'moderate_overprice'
    | 'high_overprice'
    | 'estimate_only' = 'estimate_only';
  if (sellerPrice > 0 && estPrice > 0) {
    if (diffPct <= -45) pricingRegime = 'deep_discount_anomaly';
    else if (diffPct < -tolerance) pricingRegime = 'below_band';
    else if (diffPct <= tolerance) pricingRegime = 'fair_band';
    else if (diffPct <= tolerance * 2) pricingRegime = 'moderate_overprice';
    else pricingRegime = 'high_overprice';
  }

  // Negotiation anchors never exceed the seller's asking price
  let openingBid = 0;
  let targetRangeLow = 0;
  let targetRangeHigh = 0;
  let walkAwayCeiling = 0;

  if (sellerPrice > 0 && estPrice > 0) {
    if (pricingRegime === 'deep_discount_anomaly' || pricingRegime === 'below_band') {
      openingBid = Math.round(sellerPrice * 0.88);
      targetRangeLow = Math.round(sellerPrice * 0.92);
      targetRangeHigh = Math.round(sellerPrice * 0.96);
      walkAwayCeiling = sellerPrice;
    } else if (pricingRegime === 'fair_band') {
      const anchor = Math.min(sellerPrice, estPrice);
      openingBid = Math.round(anchor * 0.93);
      targetRangeLow = Math.round(sellerPrice * 0.95);
      targetRangeHigh = Math.round(sellerPrice * 0.98);
      walkAwayCeiling = Math.min(sellerPrice, Math.round(estPrice * (1 + tolerance / 200)));
    } else {
      openingBid = Math.round(estPrice * 0.94);
      targetRangeLow = estPrice;
      targetRangeHigh = Math.round(estPrice * 1.05);
      walkAwayCeiling = Math.round(estPrice * (1 + tolerance / 100));
    }
  } else if (estPrice > 0) {
    openingBid = Math.round(estPrice * 0.94);
    targetRangeLow = estPrice;
    targetRangeHigh = Math.round(estPrice * 1.04);
    walkAwayCeiling = Math.round(estPrice * (1 + tolerance / 100));
  }

  const baseForTax = sellerPrice || estPrice;
  const stampDuty6Pct = baseForTax > 0 ? Math.round(baseForTax * 0.06) : 0;
  const stampDutyFemale5Pct = baseForTax > 0 ? Math.round(baseForTax * 0.05) : 0;
  const registrationFee = baseForTax >= 3000000 ? 30000 : Math.round(baseForTax * 0.01);
  const estLowBand = estPrice > 0 ? Math.round(estPrice * (1 - tolerance / 100)) : 0;
  const estHighBand = estPrice > 0 ? Math.round(estPrice * (1 + tolerance / 100)) : 0;

  return {
    city,
    locality,
    bhk,
    baths,
    area,
    estPrice,
    estRate,
    sellerPrice,
    askingRate,
    diffInr,
    diffPct,
    tolerance,
    pricingRegime,
    openingBid,
    targetRangeLow,
    targetRangeHigh,
    walkAwayCeiling,
    stampDuty6Pct,
    stampDutyFemale5Pct,
    registrationFee,
    estLowBand,
    estHighBand,
    verdict:
      ctx.verdict ||
      (pricingRegime === 'deep_discount_anomaly' || pricingRegime === 'below_band'
        ? 'Below model estimate — potential value or unlisted caveats'
        : pricingRegime === 'fair_band'
        ? "Within model's expected market range"
        : pricingRegime === 'moderate_overprice'
        ? 'Above model estimate — review suggested'
        : pricingRegime === 'high_overprice'
        ? 'Significantly above model estimate'
        : 'Baseline Valuation Estimate'),
  };
}

// Rich Intent Classification
export function classifyIntent(query: string, context?: PropertyContext): IntentCategory {
  if (context?.comparison_mode) {
    return 'comparison';
  }
  const q = query.toLowerCase().trim();
  const mentionedLocs = findExplicitlyMentionedLocalities(query);

  if (
    mentionedLocs.length >= 2 ||
    (mentionedLocs.length >= 1 && (q.includes(' vs ') || q.includes('versus') || q.includes('better than')))
  ) {
    return 'locality_comparison';
  }

  if (
    q.includes('what if the seller') ||
    q.includes('what if they refuse') ||
    q.includes('what if they say no') ||
    q.includes('what if they reject') ||
    q.includes('if they refuse') ||
    q.includes('seller refuses') ||
    q.includes('then what') ||
    q.includes('what next') ||
    q.includes('what else')
  ) {
    return 'follow_up';
  }

  if (
    q.includes('emi') ||
    q.includes('home loan') ||
    q.includes('down payment') ||
    q.includes('total cost') ||
    q.includes('all-in') ||
    q.includes('all in') ||
    q.includes('hidden cost') ||
    q.includes('hidden charges') ||
    q.includes('brokerage') ||
    q.includes('rental yield') ||
    q.includes('rent vs buy') ||
    q.includes('roi') ||
    q.includes('closing cost') ||
    q.includes('how much cash')
  ) {
    return 'financial_analysis';
  }

  if (
    q.includes('best area') ||
    q.includes('best localit') ||
    q.includes('top localit') ||
    q.includes('top area') ||
    q.includes('cheapest') ||
    q.includes('most affordable') ||
    q.includes('affordable area') ||
    q.includes('most expensive') ||
    q.includes('luxury area') ||
    q.includes('where should i buy') ||
    q.includes('top 5') ||
    q.includes('ranking')
  ) {
    return 'market_ranking';
  }

  if (
    q.includes('negotiat') ||
    q.includes('counter-offer') ||
    q.includes('counter offer') ||
    q.includes('counter bid') ||
    q.includes('bargain') ||
    q.includes('how much should i offer') ||
    q.includes('how much to offer') ||
    q.includes('offer price') ||
    q.includes('draft a') ||
    q.includes('message to') ||
    q.includes('script')
  ) {
    return 'negotiation';
  }

  if (
    q.includes('document') ||
    q.includes('paper') ||
    q.includes('verify') ||
    q.includes('check before buying') ||
    q.includes('due diligence') ||
    q.includes('rera') ||
    q.includes('encumbrance') ||
    q.includes('title deed') ||
    q.includes('occupancy certificate') ||
    q.includes('checklist') ||
    q.includes('legal') ||
    q.includes('stamp duty') ||
    q.includes('carpet area')
  ) {
    return 'due_diligence';
  }

  if (
    q.includes('overprice') ||
    q.includes('underprice') ||
    q.includes('is this property overpriced') ||
    q.includes('is it overpriced') ||
    q.includes('is it fair') ||
    q.includes('worth the price') ||
    q.includes('fairly priced') ||
    q.includes('why is this') ||
    q.includes('priced at') ||
    q.includes('variance') ||
    q.includes('compare with the')
  ) {
    return 'overpricing';
  }

  if (
    q.includes('similar') ||
    q.includes('comparable') ||
    q.includes('comp') ||
    q.includes('other properties') ||
    q.includes('other flats') ||
    q.includes('alternatives') ||
    q.includes('nearby') ||
    /\bunder\s*₹?\s*\d+/.test(q) ||
    /\bshow\s+.*\bbhk\b/.test(q) ||
    /\bfind\s+.*\bbhk\b/.test(q)
  ) {
    return 'comparables';
  }

  if (
    q.includes('how did you calculate') ||
    q.includes('how did model calculate') ||
    q.includes('why this estimate') ||
    q.includes('formula') ||
    q.includes('hedonic')
  ) {
    return 'price_estimate';
  }

  if (
    q.includes('risk') ||
    q.includes('drawback') ||
    q.includes('limitation') ||
    q.includes('caveat') ||
    q.includes('downside') ||
    q.includes('problem')
  ) {
    return 'risks_limitations';
  }

  if (
    q.includes('locality') ||
    q.includes('neighborhood') ||
    q.includes('submarket') ||
    q.includes('mumbai vs pune') ||
    q.includes('pune vs mumbai') ||
    q.includes('2.7x') ||
    q.includes('higher per sqft') ||
    q.includes('market trend') ||
    q.includes('median') ||
    q.includes('under construction') ||
    q.includes('under-construction') ||
    q.includes('appreciation') ||
    q.includes('discount') ||
    q.includes('investment') ||
    mentionedLocs.length === 1
  ) {
    return 'market_analysis';
  }

  if (
    q.includes('methodology') ||
    q.includes('mape') ||
    q.includes('median ape') ||
    q.includes('tolerance band') ||
    q.includes('tolerance corridor') ||
    q.includes('16.1') ||
    q.includes('18.3') ||
    q.includes('regression') ||
    q.includes('r2')
  ) {
    return 'model_methodology';
  }

  if (
    q.includes('evaluat') ||
    q.includes('assessment') ||
    q.includes('opinion') ||
    q.includes('tell me about this property') ||
    q.includes('break down this property') ||
    q.includes('sharp, practical assessment') ||
    q.includes('worth buying') ||
    q.includes('should i buy')
  ) {
    return 'property_evaluation';
  }

  return 'general_faq';
}

function formatRoleHeader(role: AnalystRole): string {
  if (role === 'negotiator') return 'Negotiation Coach';
  if (role === 'auditor') return 'Due Diligence Auditor';
  return 'Deal Strategist';
}

// Comprehensive, instant, empirically grounded PropMetric analytical engine
export function generateDeterministicResponse(
  intent: IntentCategory,
  query: string,
  ctx: PropertyContext,
  history?: ChatMessage[]
): string {
  const qLower = (query || '').toLowerCase().trim();
  const activeRole: AnalystRole = ctx.analyst_role || 'strategist';

  // 1. Portfolio Comparison Mode
  if (intent === 'comparison' && ctx.comparison_mode && Array.isArray(ctx.properties) && ctx.properties.length > 0) {
    const props = ctx.properties;
    const sortedByValue = [...props].sort((a, b) => (a.variance_percent ?? 0) - (b.variance_percent ?? 0));
    const sortedByRate = [...props].sort((a, b) => (a.asking_rate ?? 999999) - (b.asking_rate ?? 999999));
    const best = sortedByValue[0];
    const worst = sortedByValue[sortedByValue.length - 1];
    const cheapestRate = sortedByRate[0];

    if (qLower.includes('document') || qLower.includes('legal') || qLower.includes('shortlist')) {
      return `Due Diligence Audit Across Shortlisted Properties (${props.length} Listings)

1. Legal & Title Priorities
• Occupancy Certificate (OC) & MahaRERA: Verify OC before releasing any booking token — missing OC blocks nationalized/private bank home loans and hurts exit liquidity.
• Title Chain & Index II: Pull the registered Index II and a 30-year Search & Encumbrance Certificate to confirm zero prior bank liens or family disputes.
• Society & Municipal Clearance: Verify approved floor plan vs. built state and get a zero-dues No Objection Certificate (NOC) from the housing society.

2. Financial & Area Comparison
• Best Unit Rate in Basket: ${cheapestRate.id} (${cheapestRate.locality}) at ₹${formatNum(cheapestRate.asking_rate)}/sqft (${cheapestRate.area_sqft} sqft).
• Area Audit Rule: Reconcile quoted super built-up sqft against registered RERA carpet area before signing, as 25%–35% loading variance can swing effective value by 10%+.
• Statutory Add-On: Budget 6% Maharashtra stamp duty (5% for women buyers) plus ₹30,000 registration on top of the negotiated price.`;
    }

    if (qLower.includes('negotiat')) {
      const bestModel = best.model_estimate || best.asking_price;
      const openBid = Math.round(Math.min(best.asking_price, bestModel) * 0.93);
      const targetClose = Math.round(Math.min(best.asking_price, bestModel) * 0.97);
      const fin = computeAcquisitionFinancials(targetClose, best.status, best.city);
      return `Negotiation Strategy on Best-Value Pick: ${best.society || best.title} (${best.id})

1. Anchor & Target Math
• Lead Contender: ${best.id} (${best.locality}, ${best.city}) quoted at ${formatInr(best.asking_price)} vs ${formatInr(best.model_estimate)} model baseline (${best.variance_percent >= 0 ? '+' : ''}${best.variance_percent}% variance).
• Opening Anchor: ${formatInr(openBid)} | Target Closing Zone: ${formatInr(targetClose)} | Walk-Away Cap: ${formatInr(best.asking_price)}.
• Estimated All-In Outflow at Target Close: ${formatInr(fin.totalAllInCost)} (including ${formatInr(fin.stampDuty)} stamp duty & ₹30,000 registration).

2. Competitive Leverage Against Other Pinned Units
• Reference lower unit rates in your shortlist (down to ₹${formatNum(cheapestRate.asking_rate)}/sqft at ${cheapestRate.id}) and offer a 30-day pre-approved loan closure.
• Counter-Offer Script: "We have shortlisted ${best.id} alongside competing ${best.bhk} BHK options in ${best.city}. Based on verified ₹/sqft benchmarks, our pre-approved offer is ${formatInr(openBid)} for a quick 30-day closing."`;
    }

    if (qLower.includes('carpet') || qLower.includes('efficiency') || qLower.includes('rate')) {
      let resp = `Area & Rate Per Sqft Efficiency Comparison (${props.length} Listings)\n\n1. Rate & Size Breakdown\n`;
      sortedByRate.forEach((p: any, idx: number) => {
        const modelRate = p.model_rate || Math.round((p.model_estimate || 0) / Math.max(1, p.area_sqft || 1));
        const rateSpread = modelRate > 0 ? Math.round(((p.asking_rate - modelRate) / modelRate) * 100) : 0;
        resp += `${idx + 1}. ${p.society || p.title} (${p.id}) — ${p.locality}, ${p.city}\n`;
        resp += `• ${p.bhk} BHK, ${p.area_sqft || 'N/A'} sqft · Ask: ₹${formatNum(p.asking_rate)}/sqft vs Model: ₹${formatNum(modelRate)}/sqft (${rateSpread >= 0 ? '+' : ''}${rateSpread}% spread)\n`;
      });
      resp += `\n2. Analytical Takeaway\n• Lowest Rate Per Sqft: ${cheapestRate.id} at ₹${formatNum(cheapestRate.asking_rate)}/sqft (${cheapestRate.area_sqft} sqft).\n• Next Step: Inspect RERA carpet area on Index II across all ${props.length} flats — a flat with 74% carpet efficiency outperforms a larger super built-up flat with 65% efficiency.`;
      return resp;
    }

    let response = `Side-by-Side Comparison (${props.length} Pinned Listings · ${formatRoleHeader(activeRole)})\n\n`;
    props.forEach((p: any, idx: number) => {
      const fin = computeAcquisitionFinancials(p.asking_price || 0, p.status, p.city);
      response += `${idx + 1}. ${p.society || p.title} (${p.id})\n`;
      response += `• ${p.locality ? `${p.locality}, ${p.city}` : p.city} · ${p.bhk} BHK · ${p.area_sqft || 'N/A'} sqft\n`;
      response += `• Seller Ask: ${formatInr(p.asking_price)} (₹${formatNum(p.asking_rate)}/sqft) vs Model: ${formatInr(p.model_estimate)} (${p.variance_percent >= 0 ? '+' : ''}${p.variance_percent}% · ${p.verdict})\n`;
      response += `• Estimated All-In Cost (incl. Stamp Duty): ~${formatInr(fin.totalAllInCost)}\n\n`;
    });
    if (best) {
      const spreadMsg =
        worst && worst.id !== best.id
          ? ` (${((worst.variance_percent ?? 0) - (best.variance_percent ?? 0)).toFixed(1)} percentage points better value than ${worst.id})`
          : '';
      response += `Verdict — Best Risk-Adjusted Value: ${best.society || best.title} (${best.id}) at ${best.variance_percent >= 0 ? '+' : ''}${best.variance_percent}% variance (${formatInr(best.asking_price)})${spreadMsg}.`;
    }
    return response;
  }

  const diag = computeValuationDiagnostics(ctx);
  const pId = ctx.property_id || ctx.id || '';
  const hasSpecificProperty = Boolean(pId || diag.sellerPrice > 0);
  const title = ctx.title || `${diag.bhk} BHK Residence in ${diag.locality}`;
  const { comps, scope } = findRealComps(
    diag.city,
    diag.locality,
    diag.bhk,
    diag.area,
    pId || undefined,
    10,
    diag.sellerPrice || diag.estPrice
  );
  const { leverageComps, ceilingComps } = splitCompsByLeverage(comps, diag.askingRate || diag.estRate, diag.bhk);
  const sameBhkPeers = computeSameBhkPeers(diag.city, diag.locality, diag.bhk, pId || undefined);
  const socPeers = computeSameSocietyPeers(ctx.society, diag.city, pId || undefined);
  const relevantLocalities = findRelevantLocalities(query, diag.city, diag.locality, history);
  const explicitLocalities = findExplicitlyMentionedLocalities(query);
  const queryMatches = findQueryMatchedProperties(query, relevantLocalities, diag.city);

  const puneMedianRate = Math.round(cachedAnalytics?.pune_rate_per_sqft?.median || 12142);
  const mumbaiMedianRate = Math.round(cachedAnalytics?.mumbai_rate_per_sqft?.median || 32379);
  const puneMedianPrice = cachedAnalytics?.pune_properties?.median || 12000000;
  const mumbaiMedianPrice = cachedAnalytics?.mumbai_properties?.median || 26500000;
  const cityMedianRate = diag.city === 'Mumbai' ? mumbaiMedianRate : puneMedianRate;

  // 2. Head-to-Head Locality Comparison (e.g., "Kharadi vs Baner", "Andheri vs Powai")
  if (intent === 'locality_comparison' && explicitLocalities.length >= 2) {
    const locA = explicitLocalities[0];
    const locB = explicitLocalities[1];
    const statsA = computeLocalityMicroStats(locA.locality, locA.city);
    const statsB = computeLocalityMicroStats(locB.locality, locB.city);
    const cheaperLoc = locA.median_rate_sqft <= locB.median_rate_sqft ? locA : locB;
    const pricierLoc = locA.median_rate_sqft <= locB.median_rate_sqft ? locB : locA;
    const ratePremiumPct = (
      ((pricierLoc.median_rate_sqft - cheaperLoc.median_rate_sqft) / cheaperLoc.median_rate_sqft) *
      100
    ).toFixed(1);

    let resp = `Micro-Market Comparison: ${locA.locality} (${locA.city}) vs. ${locB.locality} (${locB.city})\n\n`;
    resp += `1. Empirical Benchmark Metrics\n`;
    resp += `• ${locA.locality} (${locA.count} verified listings): Median ₹${formatNum(locA.median_rate_sqft)}/sqft | Median Ticket ${formatInr(locA.median_price_inr)} | Locality Multiplier ${locA.multiplier.toFixed(3)}x${statsA ? ` | Range ₹${formatNum(statsA.minRate)}–₹${formatNum(statsA.maxRate)}/sqft` : ''}\n`;
    resp += `• ${locB.locality} (${locB.count} verified listings): Median ₹${formatNum(locB.median_rate_sqft)}/sqft | Median Ticket ${formatInr(locB.median_price_inr)} | Locality Multiplier ${locB.multiplier.toFixed(3)}x${statsB ? ` | Range ₹${formatNum(statsB.minRate)}–₹${formatNum(statsB.maxRate)}/sqft` : ''}\n`;
    resp += `• Relative Pricing Spread: ${pricierLoc.locality} commands a +${ratePremiumPct}% per-sqft premium over ${cheaperLoc.locality} (₹${formatNum(pricierLoc.median_rate_sqft - cheaperLoc.median_rate_sqft)}/sqft gap).\n\n`;

    resp += `2. Buyer Trade-Off & Inventory Depth\n`;
    if (statsA && statsB) {
      resp += `• Supply & Readiness: ${locA.locality} has ${statsA.readyCount} Ready / ${statsA.ucCount} Under-Construction units (avg ${statsA.avgArea} sqft); ${locB.locality} has ${statsB.readyCount} Ready / ${statsB.ucCount} Under-Construction units (avg ${statsB.avgArea} sqft).\n`;
    }
    resp += `• Positioning Guidance: Pick ${cheaperLoc.locality} for lower entry capital and stronger yield per rupee invested; pick ${pricierLoc.locality} only if specific society grade or commute proximity justifies paying +${ratePremiumPct}% per sqft.\n`;

    const samplePicks = [statsA?.bestValue, statsB?.bestValue].filter(Boolean);
    if (samplePicks.length > 0) {
      resp += `\n3. Best-Value Entry Listings to Benchmark\n`;
      samplePicks.forEach((c: any) => {
        resp += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    return resp.trim();
  }

  // 3. Locality Rankings ("Best areas", "Top affordable localities in Pune", "Most expensive areas in Mumbai")
  if (intent === 'market_ranking') {
    const targetCity =
      qLower.includes('mumbai') && !qLower.includes('pune')
        ? 'Mumbai'
        : qLower.includes('pune') && !qLower.includes('mumbai')
        ? 'Pune'
        : diag.city;
    const pool = (cachedLocalities[targetCity] || []).filter((l) => l.count >= 5);
    const wantsExpensive =
      qLower.includes('expensive') || qLower.includes('luxury') || qLower.includes('premium') || qLower.includes('highest');
    const sorted = [...pool].sort((a, b) =>
      wantsExpensive ? b.median_rate_sqft - a.median_rate_sqft : a.median_rate_sqft - b.median_rate_sqft
    );
    const top5 = sorted.slice(0, 5);
    const targetCityMed = targetCity === 'Mumbai' ? mumbaiMedianRate : puneMedianRate;

    let resp = `${wantsExpensive ? 'Most Prime / Premium' : 'Most Affordable / High-Value'} Localities in ${targetCity} (Min. 5 Verified Listings)\n\n1. Ranked Submarkets vs. ${targetCity} Median (₹${formatNum(targetCityMed)}/sqft)\n`;
    top5.forEach((l, i) => {
      const diff = (((l.median_rate_sqft - targetCityMed) / targetCityMed) * 100).toFixed(1);
      resp += `${i + 1}. ${l.locality}: ₹${formatNum(l.median_rate_sqft)}/sqft (${Number(diff) >= 0 ? '+' : ''}${diff}% vs city) · Median Ticket ${formatInr(l.median_price_inr)} · ${l.count} listings\n`;
    });
    resp += `\n2. Analytical Takeaway\n• Focusing on submarkets 10%–30% below the ₹${formatNum(targetCityMed)}/sqft city median offers stronger downside protection, while still maintaining active resale liquidity (${top5[0]?.count || 5}+ listings).`;
    return resp;
  }

  // 4. Financial, EMI, Stamp Duty, All-In Cost & Rental Yield Breakdown
  if (intent === 'financial_analysis') {
    const queryPrice = extractInrFromQuery(query);
    const targetBase = queryPrice || diag.sellerPrice || diag.estPrice || (diag.city === 'Mumbai' ? 20000000 : 10000000);
    const fin = computeAcquisitionFinancials(targetBase, ctx.status, diag.city);
    const targetClosePrice = diag.targetRangeHigh > 0 && !queryPrice ? diag.targetRangeHigh : targetBase;
    const finTarget = computeAcquisitionFinancials(targetClosePrice, ctx.status, diag.city);

    let resp = `All-In Buying Cost, Loan EMI & Rental Yield Breakdown (${formatInr(targetBase)})\n\n`;
    resp += `1. Upfront & Statutory Cash Outflow (Maharashtra)\n`;
    resp += `• Base Property Price: ${formatInr(fin.basePrice)}\n`;
    resp += `• Stamp Duty (6% standard / 5% women buyer): ${formatInr(fin.stampDuty)} (or ${formatInr(fin.stampDutyFemale)} if registered in a female buyer's name — saves ${formatInr(fin.stampDuty - fin.stampDutyFemale)})\n`;
    resp += `• Registration & Legal/Society Reserve: ${formatInr(fin.registrationFee)} registration + ~${formatInr(fin.legalAndSocietyReserve)} legal/NOC buffer\n`;
    resp += `• GST Impact: ${fin.gstPct > 0 ? `${formatInr(fin.gstAmount)} (${(fin.gstPct * 100).toFixed(0)}% on Under-Construction unit)` : '₹0 (0% GST on Ready-to-Move OC resale)'}\n`;
    resp += `• Total All-In Acquisition Cost: ${formatInr(fin.totalAllInCost)}\n\n`;

    resp += `2. Home Loan & Monthly EMI Estimate (80% LTV @ 8.50% p.a.)\n`;
    resp += `• 20% Down Payment: ${formatInr(fin.downPayment20)} (+ statutory charges ~${formatInr(fin.stampDuty + fin.registrationFee + fin.gstAmount)} = ${formatInr(fin.downPayment20 + fin.stampDuty + fin.registrationFee + fin.gstAmount)} total cash needed)\n`;
    resp += `• 80% Loan Principal: ${formatInr(fin.loanPrincipal80)}\n`;
    resp += `• Estimated EMI: ${formatInr(fin.emi20Yr)}/month (20-year tenure) or ${formatInr(fin.emi15Yr)}/month (15-year tenure)\n`;
    resp += `• Safe Affordability Benchmark: Household net monthly income >= ${formatInr(fin.recommendedMonthlyIncome)} (keeping EMI <= 40% of income)\n\n`;

    resp += `3. Expected Rental Yield (${diag.city})\n`;
    resp += `• Typical Gross Residential Yield (${fin.grossYieldLowPct}%–${fin.grossYieldHighPct}%): Est. ${formatInr(fin.estMonthlyRentLow)}–${formatInr(fin.estMonthlyRentHigh)}/month rent.\n`;
    if (!queryPrice && diag.sellerPrice > targetClosePrice) {
      resp += `• Negotiation Payoff: Closing at PropMetric's ${formatInr(targetClosePrice)} target reduces total all-in outlay to ${formatInr(finTarget.totalAllInCost)}, saving ${formatInr(fin.totalAllInCost - finTarget.totalAllInCost)} immediately.`;
    }
    return resp.trim();
  }

  // 5. Market Analysis (Mumbai vs Pune, Under-Construction Discount, Single Locality Deep-Dive)
  if (intent === 'market_analysis') {
    if (qLower.includes('2.7') || qLower.includes('higher per sqft') || (qLower.includes('mumbai') && qLower.includes('pune'))) {
      const ratio = (mumbaiMedianRate / puneMedianRate).toFixed(2);
      const topPune = (cachedLocalities.Pune || []).slice(0, 3);
      const topMumbai = (cachedLocalities.Mumbai || []).slice(0, 3);
      return `Mumbai vs. Pune Valuation Gap (${ratio}x Rate Spread)

1. Verified PropMetric Dataset Medians (1,796 ML-Ready Listings)
• Mumbai (912 listings): Median ₹${formatNum(mumbaiMedianRate)}/sqft (mean ₹${formatNum(cachedAnalytics?.mumbai_rate_per_sqft?.mean || 36782)}/sqft) · Median Ticket ${formatInr(mumbaiMedianPrice)}.
• Pune (884 listings): Median ₹${formatNum(puneMedianRate)}/sqft (mean ₹${formatNum(cachedAnalytics?.pune_rate_per_sqft?.mean || 12894)}/sqft) · Median Ticket ${formatInr(puneMedianPrice)}.

2. Key Submarkets Driving Each City
• Top Mumbai Corridors: ${topMumbai.map((l) => `${l.locality} (₹${formatNum(l.median_rate_sqft)}/sqft)`).join(', ')}.
• Top Pune Corridors: ${topPune.map((l) => `${l.locality} (₹${formatNum(l.median_rate_sqft)}/sqft)`).join(', ')}.

3. Structural Reasons & Buyer Impact
• Geography & FSI Scarcity: Mumbai's island constraint pushes redevelopment and FSI premiums far above Pune's expandable IT corridors.
• Capital Sensitivity: A +10% overpricing variance on a median Mumbai flat adds ~${formatInr(mumbaiMedianPrice * 0.1)} vs. ~${formatInr(puneMedianPrice * 0.1)} in Pune — making empirical screening vital before locking a price.`;
    }

    if (qLower.includes('under construction') || qLower.includes('under-construction') || qLower.includes('discount')) {
      const ucCount = cachedAnalytics?.status_distribution?.['Under Construction'] || 409;
      const readyCount = cachedAnalytics?.status_distribution?.['Ready to Move'] || 1387;
      let resp = `Under-Construction vs. Ready-to-Move Pricing Economics

1. Empirical Model & Tax Impact
• PropMetric Status Multiplier: Under-Construction carries a 0.98x factor (~6% below Ready-to-Move's 1.04x factor) across ${ucCount} Under-Construction and ${readyCount} Ready-to-Move listings.
• GST Penalty: Under-Construction properties attract 5% GST (1% if <=₹45 Lakh), whereas Ready-to-Move units with an Occupancy Certificate (OC) carry 0% GST.

2. Required Buyer Discount to Break Even
• Demand at least an 8%–12% base-price discount vs. nearby Ready OC flats to cover 5% GST, pre-EMI/rent overlap during construction, and MahaRERA delivery timeline risk.`;
      if (queryMatches.length > 0) {
        resp += `\n\n3. Matching ${diag.city} Listings to Benchmark\n`;
        queryMatches.slice(0, 3).forEach((c) => {
          resp += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
        });
      }
      return resp;
    }

    const focusLoc = explicitLocalities[0] || relevantLocalities[0];
    const microStats = focusLoc ? computeLocalityMicroStats(focusLoc.locality, focusLoc.city) : null;
    const targetCityMed = (focusLoc?.city || diag.city) === 'Mumbai' ? mumbaiMedianRate : puneMedianRate;

    let locResp = `Micro-Market Deep Dive: ${focusLoc ? `${focusLoc.locality}, ${focusLoc.city}` : diag.city}\n\n`;
    if (focusLoc) {
      const vsCity = (((focusLoc.median_rate_sqft - targetCityMed) / targetCityMed) * 100).toFixed(1);
      locResp += `1. Pricing & Supply Depth (${focusLoc.count} Verified Listings)\n`;
      locResp += `• Median Asking Rate: ₹${formatNum(focusLoc.median_rate_sqft)}/sqft (${Number(vsCity) >= 0 ? '+' : ''}${vsCity}% vs ${focusLoc.city} ₹${formatNum(targetCityMed)}/sqft median)\n`;
      locResp += `• Median Ticket Price: ${formatInr(focusLoc.median_price_inr)} | Locality Model Multiplier: ${focusLoc.multiplier.toFixed(3)}x\n`;
      if (microStats) {
        locResp += `• Observed Rate Spread: ₹${formatNum(microStats.minRate)}–₹${formatNum(microStats.maxRate)}/sqft · Average Unit Size: ${microStats.avgArea} sqft · Inventory Mix: ${microStats.readyCount} Ready / ${microStats.ucCount} Under Construction\n`;
      }
    }
    if (queryMatches.length > 0 || comps.length > 0) {
      const list = queryMatches.length > 0 ? queryMatches : comps;
      locResp += `\n2. Active Benchmark Listings\n`;
      list.slice(0, 4).forEach((c) => {
        locResp += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft · ${c.status || 'Ready to Move'} · ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    return locResp.trim();
  }

  if (intent === 'model_methodology' || intent === 'price_estimate') {
    const cityMedRate = Math.round(
      diag.city === 'Mumbai'
        ? (cachedAnalytics?.mumbai_rate_per_sqft?.median ?? 32379)
        : (cachedAnalytics?.pune_rate_per_sqft?.median ?? 12142)
    );
    const tol2 = Number((diag.tolerance * 2).toFixed(1));
    const r2Inr = Number(cachedAnalytics?.model_meta?.r2_score ?? 0.8098).toFixed(4);
    const logR2 = Number(cachedAnalytics?.model_meta?.log_r2_score ?? 0.8890).toFixed(4);
    const medApe = Number(cachedAnalytics?.model_meta?.median_ape_percent ?? diag.tolerance).toFixed(2);
    const mlCount = Number(cachedAnalytics?.total_ml_ready ?? 1796).toLocaleString('en-IN');

    return `PropMetric Hedonic Valuation & ±${diag.tolerance}% Tolerance Corridor

1. Exact Log-Linear Ridge Formula (${diag.bhk} BHK, ${diag.area} sqft in ${diag.locality}, ${diag.city})
• City Median Benchmark: ₹${formatNum(cityMedRate)}/sqft calibrated across ${mlCount} ML-ready listings (with outer-MMR prior adjustment for peripheral Mumbai suburbs).
• 9-Feature Log-Linear Ridge Equation: Fitted on ln(Price_INR) using ln(Area_sqft), ln(Empirical Bayes smoothed locality rate), Mumbai/Pune city indicator, BHK, Bathrooms, Furnishing status, and Construction stage (Test R² = ${r2Inr}, Log R² = ${logR2}).
• Resulting Baseline: ${diag.estPrice > 0 ? `${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft)` : 'Calculated dynamically in Price Estimator'}.

2. How the ±${diag.tolerance}% Tolerance Band Screens Deals
• Fair Market Corridor: ${diag.estLowBand > 0 ? `${formatInr(diag.estLowBand)} to ${formatInr(diag.estHighBand)}` : `Baseline ± ${diag.tolerance}%`} (derived from held-out Test Median APE of ${medApe}%).
• Screening Decision Rule:
  - Within ±${diag.tolerance}%: Fairly aligned with market dispersion (captures floor, view, interior condition).
  - Above +${diag.tolerance}% (up to +${tol2}% or higher): Moderate to High Overpricing Flag — strong case to counter-offer toward baseline.
  - Below -${diag.tolerance}% (or -45%+): Apparent bargain or anomaly — screen strictly for missing OC, title issues, or typo.`;
  }

  if (intent === 'risks_limitations') {
    return `Valuation Risks & Model Limitations (${diag.locality}, ${diag.city})

1. Building & Unit Attributes Outside Portal Feeds
• Floor elevation, balcony view, natural light/orientation, age of structure, and exact RERA carpet vs. super built-up loading (typically 25%–35%).
• Society financial health: sinking fund balance, monthly maintenance charges, and redevelopment prospects.

2. Actionable Protection Checklist
• ${diag.pricingRegime === 'deep_discount_anomaly' ? `Anomaly Alert: At ₹${formatNum(diag.askingRate)}/sqft (${Math.abs(diag.diffPct)}% below model), never transfer a token until OC, sanctioned plan, and bank loan eligibility are confirmed in writing.` : `Treat ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)} as your empirical boundary and validate Index II, MahaRERA, and OC before signing.`}`;
  }

  // 6. Negotiation & Counter-Offer Script
  if (intent === 'negotiation') {
    if (!hasSpecificProperty && diag.estPrice === 0) {
      return `Buyer Negotiation Playbook for Overpriced ("Above Model Estimate") Listings

1. Re-Anchor to Empirical Comparables
• Open 5%–7% below PropMetric's model baseline rather than taking a flat 5% off an inflated asking price.
• Bring 2–3 printed/saved Comparable Listings from the same locality showing lower ₹/sqft so the seller reacts to market evidence, not opinion.

2. Structured 3-Round Concession Strategy
• Round 1 (Opening): Anchor 6% below fair baseline with pre-approved home loan proof and a 30-day deed timeline.
• Round 2 (Concessions): If headline price sticks, trade speed for covered parking inclusion, society transfer fee absorption, or modular kitchen/AC fixtures.
• Round 3 (Walk-Away): Never breach the +${diag.tolerance}% upper tolerance boundary — walk away and pivot to lower-₹/sqft alternatives.`;
    }

    const finOpen = computeAcquisitionFinancials(diag.openingBid, ctx.status, diag.city);
    const finTarget = computeAcquisitionFinancials(diag.targetRangeLow || diag.estPrice, ctx.status, diag.city);
    const finAsk = diag.sellerPrice > 0 ? computeAcquisitionFinancials(diag.sellerPrice, ctx.status, diag.city) : null;
    const savingsAtOpen = finAsk ? finAsk.totalAllInCost - finOpen.totalAllInCost : 0;
    const savingsAtTarget = finAsk ? finAsk.totalAllInCost - finTarget.totalAllInCost : 0;
    const emiSavedAtTarget = finAsk ? finAsk.emi20Yr - finTarget.emi20Yr : 0;
    const bestLeverageComp = leverageComps[0] || sameBhkPeers?.cheapestRatePeer;
    const scriptEvidence = bestLeverageComp
      ? `comparable ${bestLeverageComp.bhk} BHK units in ${diag.locality} trading near ₹${formatNum(bestLeverageComp.price_per_sqft)}/sqft`
      : `verified ${diag.locality} benchmarks near ₹${formatNum(diag.estRate || cityMedianRate)}/sqft`;

    if (qLower.includes('draft') || qLower.includes('message') || qLower.includes('script')) {
      return `Ready-to-Send Negotiation Scripts (${title})

1. WhatsApp / Broker Message (Copy & Send)
• "Hi, we inspected the ${diag.bhk} BHK (${diag.area} sqft) in ${diag.locality} and want to close quickly. Because Maharashtra 6% stamp duty & registration add ~${formatInr(diag.stampDuty6Pct + diag.registrationFee)} upfront, and we've benchmarked ${scriptEvidence}, our fair valuation sits around ${formatInr(diag.targetRangeLow)}. With home loan pre-approval ready for a 30-day registration, we can place a firm opening offer of ${formatInr(diag.openingBid)}. Let us know if the owner wants to take this forward."

2. Escalation Guardrails & Net Savings
• Round 1 Opening: ${formatInr(diag.openingBid)} | Round 2 Target Close: ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)} | Walk-Away Ceiling: ${formatInr(diag.walkAwayCeiling)}.
${savingsAtOpen > 0 ? `• Financial Payoff: Closing near ${formatInr(diag.targetRangeLow)} saves ${formatInr(savingsAtTarget)} in upfront price + stamp duty (or ${formatInr(savingsAtOpen)} at your opening bid) and trims monthly EMI by ~${formatInr(emiSavedAtTarget)}/mo.` : ''}

3. If Broker Pushes Back ("Other flats cost more / Branded society")
• Counter with: "Higher-ticket 2/3 BHK towers or unverified listings sit at different RERA carpet loading. For this ${diag.area} sqft ${diag.bhk} BHK, if the headline price stays near ${formatInr(diag.targetRangeHigh)}, include deeded covered parking / absorb society transfer charges to bridge the gap."`;
    }

    let response = `Negotiation Plan: ${hasSpecificProperty ? `${title}${pId ? ` (${pId})` : ''}` : `${diag.bhk} BHK in ${diag.locality}, ${diag.city}`}\n\n`;
    response += `1. Offer Ladder, All-In Cost & EMI Savings\n`;
    if (diag.sellerPrice > 0) {
      response += `• Price Gap: Seller Ask ${formatInr(diag.sellerPrice)} (₹${formatNum(diag.askingRate)}/sqft) vs Model Baseline ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) — ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% (${formatInr(diag.diffInr)}).\n`;
    } else {
      response += `• Model Fair Baseline: ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) | Fair Corridor: ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)}.\n`;
    }
    if (sameBhkPeers) {
      response += `• ${diag.locality} ${diag.bhk} BHK Peer Range (${sameBhkPeers.count} units): ₹${formatNum(sameBhkPeers.minRate)}–₹${formatNum(sameBhkPeers.maxRate)}/sqft (${formatInr(sameBhkPeers.minPrice)}–${formatInr(sameBhkPeers.maxPrice)} ticket).\n`;
    }
    response += `• 3-Step Anchors: Open at ${formatInr(diag.openingBid)} → Settle at ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)} → Walk away above ${formatInr(diag.walkAwayCeiling)}.\n`;
    if (savingsAtOpen > 0 && finAsk) {
      response += `• Cash & EMI Impact: Closing at ${formatInr(diag.targetRangeLow)} cuts total outlay (incl. 6% stamp duty & reg.) from ${formatInr(finAsk.totalAllInCost)} to ${formatInr(finTarget.totalAllInCost)} (saves ${formatInr(savingsAtTarget)} + ${formatInr(emiSavedAtTarget)}/mo EMI; opening bid saves ${formatInr(savingsAtOpen)}).\n`;
    }

    response += `\n2. Execution Tactics & Objection Handling\n`;
    if (diag.pricingRegime === 'deep_discount_anomaly') {
      response += `• Anomaly Condition: Because ₹${formatNum(diag.askingRate)}/sqft is ${Math.abs(diag.diffPct)}% below baseline, tie your ${formatInr(diag.openingBid)} offer strictly to written Occupancy Certificate (OC), 30-year encumbrance clearance, and bank loan eligibility.\n`;
    } else {
      response += `• Round 1 (Speed Anchor): Submit a written offer at ${formatInr(diag.openingBid)} with a bank pre-approval letter and 30-day registration timeline — serious liquidity beats higher unfinanced inquiries.\n`;
      response += `• Round 2 (Concession Trade): If the owner anchors near ${formatInr(diag.targetRangeHigh)}, keep price conditional on covered parking allotment, society transfer NOC fee waiver (~₹25k–₹50k+), and settling all maintenance/property-tax arrears.\n`;
      response += `• Objection Rebuttal: If told "${diag.locality} averages ₹${formatNum(relevantLocalities[0]?.median_rate_sqft || cityMedianRate)}/sqft", point out that larger luxury configurations skew the overall median — ${sameBhkPeers ? `direct ${diag.bhk} BHK peers start at ₹${formatNum(sameBhkPeers.minRate)}/sqft and nearby listings trade down to ₹${formatNum(bestLeverageComp?.price_per_sqft || sameBhkPeers.minRate)}/sqft` : `${diag.locality} comps trade down to ₹${formatNum(bestLeverageComp?.price_per_sqft || diag.estRate)}/sqft`}.\n`;
    }

    response += `\n3. Ready-to-Send Broker / Seller Message\n`;
    response += `• "Hi, we liked the ${diag.bhk} BHK (${diag.area} sqft) in ${diag.locality}. Given ${formatInr(diag.stampDuty6Pct)} in stamp duty and ${scriptEvidence}, our budget allows an immediate pre-approved offer of ${formatInr(diag.openingBid)} with 30-day closing. Let us know if we can move forward."\n`;

    if (leverageComps.length > 0) {
      response += `\n4. Lower-Rate Comparables to Cite at the Table (${scope === 'same_locality' ? diag.locality : diag.city})\n`;
      leverageComps.forEach((c) => {
        const rateDelta = diag.askingRate > 0 ? Math.round(diag.askingRate - (c.price_per_sqft || 0)) : 0;
        const deltaText = rateDelta > 0 ? ` · ₹${formatNum(rateDelta)}/sqft cheaper` : '';
        response += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft${deltaText}) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    } else if (comps.length > 0) {
      response += `\n4. Competitive Context Listings (No Cheaper Same-Locality Match Found)\n`;
      comps.slice(0, 2).forEach((c) => {
        response += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    if (ceilingComps.length > 0) {
      const topCeil = ceilingComps[0];
      response += `• Market Ceiling Context (do not cite to seller): ${topCeil.society || topCeil.title} asks ₹${formatNum(topCeil.price_per_sqft)}/sqft (${formatInr(topCeil.price_inr)}), confirming your current seller isn't an extreme outlier.\n`;
    }
    return response.trim();
  }

  // 7. Overpricing / Rate Benchmarking Diagnosis ("Why is this listing priced +X% vs model?")
  if (intent === 'overpricing') {
    const locMatch = relevantLocalities[0];
    const pctInfo = computeRatePercentile(diag.city, diag.locality, diag.askingRate || diag.estRate);
    const drivers = explainVarianceDrivers(diag, ctx, locMatch, sameBhkPeers, socPeers);
    const finAsk = diag.sellerPrice > 0 ? computeAcquisitionFinancials(diag.sellerPrice, ctx.status, diag.city) : null;
    const finTarget = computeAcquisitionFinancials(diag.targetRangeLow || diag.estPrice, ctx.status, diag.city);

    let response = `Price & Variance Deep Diagnosis: ${title} (${diag.locality}, ${diag.city})\n\n`;
    response += `1. Multi-Lens Quantitative Benchmark\n`;
    if (diag.sellerPrice > 0) {
      response += `• Seller Ask vs. Ridge Model: ${formatInr(diag.sellerPrice)} (₹${formatNum(diag.askingRate)}/sqft) vs. ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) — ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% (${formatInr(diag.diffInr)} variance; ±${diag.tolerance}% fair band: ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)}).\n`;
    } else {
      response += `• Ridge Model Baseline: ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) | ±${diag.tolerance}% Fair Corridor: ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)}.\n`;
    }
    if (sameBhkPeers) {
      const ticketNote =
        diag.sellerPrice > 0 && diag.sellerPrice <= sameBhkPeers.minPrice
          ? ` (lowest ticket among ${sameBhkPeers.count} ${diag.bhk} BHK listings in ${diag.locality}!)`
          : ` (same-BHK range: ${formatInr(sameBhkPeers.minPrice)}–${formatInr(sameBhkPeers.maxPrice)})`;
      response += `• ${diag.bhk} BHK Peers in ${diag.locality} (${sameBhkPeers.count} units): Median ₹${formatNum(sameBhkPeers.medRate)}/sqft (₹${formatNum(sameBhkPeers.minRate)}–₹${formatNum(sameBhkPeers.maxRate)}/sqft)${ticketNote}.\n`;
    }
    if (locMatch) {
      const activeRate = diag.askingRate || diag.estRate;
      const rateDiffPct = (((activeRate - locMatch.median_rate_sqft) / locMatch.median_rate_sqft) * 100).toFixed(1);
      response += `• All-BHK ${locMatch.locality} Median (${locMatch.count} units): ₹${formatNum(locMatch.median_rate_sqft)}/sqft — this unit sits ${Number(rateDiffPct) >= 0 ? '+' : ''}${rateDiffPct}% vs. locality median${pctInfo ? ` & costlier than ${pctInfo.cityPct}% of ${diag.city}${pctInfo.locPct !== null ? ` / ${pctInfo.locPct}% of ${diag.locality}` : ''}` : ''}.\n`;
    }

    response += `\n2. Why This ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% Variance Occurs (Model & Market Drivers)\n`;
    drivers.forEach((d) => {
      response += `• ${d}\n`;
    });

    response += `\n3. Concrete Recommendation & Action Plan\n`;
    if (diag.pricingRegime === 'deep_discount_anomaly') {
      response += `• Screening Red Flag: Priced ${Math.abs(diag.diffPct)}% below model. Before placing a token, confirm bank loan eligibility, Occupancy Certificate (OC), clear title deed, and true usable RERA carpet area.\n`;
    } else if (diag.pricingRegime === 'high_overprice' || diag.pricingRegime === 'moderate_overprice') {
      response += `• Overpriced Flag (${diag.verdict}): Paying above ${formatInr(diag.estHighBand)} destroys margin unless verified sea/open view, corner orientation, or designer interiors exist. Counter at ${formatInr(diag.openingBid)} and target ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)}${finAsk ? ` (saving ${formatInr(finAsk.totalAllInCost - finTarget.totalAllInCost)} all-in)` : ''}.\n`;
    } else {
      const discountPct = diag.sellerPrice > 0 ? (((diag.sellerPrice - diag.targetRangeLow) / diag.sellerPrice) * 100).toFixed(1) : '5.0';
      response += `• Fair Market Standing: Priced inside the empirical ±${diag.tolerance}% corridor. Push for a disciplined ${discountPct}% closing reduction toward ${formatInr(diag.targetRangeLow)} (opening at ${formatInr(diag.openingBid)})${finAsk ? `, saving ${formatInr(finAsk.totalAllInCost - finTarget.totalAllInCost)} in price + 6% stamp duty` : ''}, and confirm RERA carpet loading (~25–35% gap check) plus OC.\n`;
    }

    if (leverageComps.length > 0) {
      response += `\n4. Lower-Rate Comparables in ${scope === 'same_locality' ? diag.locality : diag.city}\n`;
      leverageComps.slice(0, 2).forEach((c) => {
        response += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    return response.trim();
  }

  // 8. Follow-up Turns
  if (intent === 'follow_up') {
    const prevAssistant = (history || []).filter((h) => h.role === 'assistant').slice(-1)[0]?.content || '';
    const alreadyMentionedWalkAway = prevAssistant.includes(formatInr(diag.walkAwayCeiling));
    const finCeil = computeAcquisitionFinancials(diag.walkAwayCeiling || diag.estPrice, ctx.status, diag.city);
    const backupList = leverageComps.length > 0 ? leverageComps : comps;
    let resp = `Escalation Playbook If Seller Refuses (${diag.locality}, ${diag.city})\n\n`;
    resp += `1. Non-Price Value Extraction\n`;
    resp += `• Hold firm near ${formatInr(diag.targetRangeHigh || diag.estPrice)} and offer 30-day closing certainty backed by a pre-approved home loan.\n`;
    resp += `• Request tangible cash equivalents: reserved covered car parking (worth ₹4–8 Lakh), society transfer fee waiver, or seller settlement of pending arrears.\n\n`;
    resp += `2. Hard Walk-Away Boundary\n`;
    resp += `• ${alreadyMentionedWalkAway ? 'Maintain' : 'Enforce'} your strict ceiling at ${formatInr(diag.walkAwayCeiling)} (all-in outflow incl. stamp duty: ~${formatInr(finCeil.totalAllInCost)}).\n`;
    if (backupList.length > 0) {
      resp += `• Immediate Backup Listings to Tour Next:\n`;
      backupList.slice(0, 3).forEach((c) => {
        resp += `  - ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft · ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    return resp.trim();
  }

  // 9. Due Diligence / Legal / Tax
  if (intent === 'due_diligence') {
    const fin = computeAcquisitionFinancials(diag.sellerPrice || diag.estPrice || 10000000, ctx.status, diag.city);
    return `Maharashtra Legal & Financial Due Diligence: ${title} (${diag.locality}, ${diag.city})

1. Mandatory Title, OC & RERA Verification
• Occupancy Certificate (OC) & Commencement Certificate (CC): Never release a token without verifying the OC — missing OC disqualifies bank loans and triggers municipal penalties.
• MahaRERA & Sanctioned Plan: Cross-check MahaRERA registration number (if post-2017 or Under Construction) and verify approved layout matches actual walls/balconies.
• Index II & 30-Year Encumbrance: Inspect past registered Index II chain and obtain a 30-year Search Report confirming zero unpaid developer mortgages or litigation.
• Society NOC & Zero-Dues Letter: Verify society transfer charges, sinking fund status, and deeded parking allotment.

2. Area & All-In Closing Cost Breakdown
• Carpet vs. Built-Up Check: Confirm usable RERA carpet area (${diag.area} sqft listed) rather than paying on inflated super built-up loading.
• Statutory Costs: ${formatInr(fin.stampDuty)} stamp duty (6%; or ${formatInr(fin.stampDutyFemale)} at 5% for women buyers) + ${formatInr(fin.registrationFee)} registration + ${fin.gstPct > 0 ? `${formatInr(fin.gstAmount)} GST` : '₹0 GST (Ready OC resale)'} → Total All-In Cost: ${formatInr(fin.totalAllInCost)}.`;
  }

  // 10. Comparables & Explicit Property Search
  if (intent === 'comparables' || queryMatches.length > 0) {
    const list = queryMatches.length > 0 ? queryMatches : comps.slice(0, 5);
    const heading =
      queryMatches.length > 0
        ? `Verified Dataset Matches (${list.length} Properties Found)`
        : `Verified Comparables (${scope === 'same_locality' ? `Prioritizing ${diag.locality}` : `${diag.city} matches near ${diag.bhk} BHK / ${diag.area} sqft`})`;

    if (list.length === 0) {
      return `No exact listings matched that filter inside the current ${diag.city} sample. Try widening your budget or BHK filter in the Comparable Listings tab.`;
    }
    let response = `${heading}\n\n`;
    list.forEach((c, i) => {
      const rateDiff =
        diag.askingRate > 0 && c.price_per_sqft
          ? Math.round(c.price_per_sqft - diag.askingRate)
          : null;
      const rateNote =
        rateDiff !== null
          ? ` (${rateDiff <= 0 ? `₹${formatNum(Math.abs(rateDiff))}/sqft cheaper` : `+₹${formatNum(rateDiff)}/sqft higher`})`
          : '';
      response += `${i + 1}. ${c.society || c.title} — ${c.locality}, ${c.city}\n`;
      response += `• ${c.bhk} BHK · ${c.area_sqft} sqft · ${c.status || 'Ready to Move'} · ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft)${rateNote} [View Listing](${cleanUrl(c.listing_url)})\n\n`;
    });
    return response.trim();
  }

  // 11. Smart Contextual Response for Open-Ended Questions (Never a generic menu!)
  if (!hasSpecificProperty && intent === 'general_faq') {
    const fin = computeAcquisitionFinancials(diag.estPrice || 10000000, ctx.status, diag.city);
    const focusLoc = relevantLocalities[0];
    const locMicro = focusLoc ? computeLocalityMicroStats(focusLoc.locality, focusLoc.city, diag.bhk) : null;

    let resp = `${formatRoleHeader(activeRole)} Intelligence Brief: ${diag.bhk} BHK in ${diag.locality}, ${diag.city}\n\n`;
    resp += `1. Valuation, All-In Cost & EMI Snapshot\n`;
    resp += `• Fair Baseline Estimate: ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) with a ±${diag.tolerance}% fair corridor of ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)}.\n`;
    resp += `• All-In Buyer Cost (incl. 6% Stamp Duty & Reg.): ~${formatInr(fin.totalAllInCost)} | Est. 20-Yr EMI (80% LTV @ 8.5%): ${formatInr(fin.emi20Yr)}/month | Est. Monthly Rent: ${formatInr(fin.estMonthlyRentLow)}–${formatInr(fin.estMonthlyRentHigh)}.\n`;

    if (focusLoc) {
      resp += `\n2. ${focusLoc.locality} Micro-Market Benchmark (${focusLoc.count} Listings)\n`;
      resp += `• Locality Median: ₹${formatNum(focusLoc.median_rate_sqft)}/sqft (${formatInr(focusLoc.median_price_inr)} median ticket)${locMicro ? ` · ${diag.bhk} BHK observed range: ${formatInr(locMicro.minPrice)}–${formatInr(locMicro.maxPrice)}` : ''}.\n`;
    }

    if (comps.length > 0) {
      resp += `\n3. Active Market Comparables to Inspect\n`;
      comps.slice(0, 3).forEach((c) => {
        resp += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft · ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft) [View Listing](${cleanUrl(c.listing_url)})\n`;
      });
    }
    return resp.trim();
  }

  // 12. Comprehensive Role-Aware Property Assessment Dossier
  const activePrice = diag.sellerPrice || diag.estPrice;
  const fin = computeAcquisitionFinancials(activePrice, ctx.status, diag.city);
  const finTarget = computeAcquisitionFinancials(diag.targetRangeLow || activePrice, ctx.status, diag.city);
  const locBench = relevantLocalities[0];
  const pctInfo = computeRatePercentile(diag.city, diag.locality, diag.askingRate || diag.estRate);
  const drivers = explainVarianceDrivers(diag, ctx, locBench, sameBhkPeers, socPeers);

  let brief = `Property Dossier (${formatRoleHeader(activeRole)}): ${title}${pId ? ` (${pId})` : ''}\n\n`;

  if (activeRole === 'negotiator') {
    brief += `1. Negotiation Targets & Net Savings (${diag.verdict})\n`;
    brief += `• Seller Ask: ${formatInr(diag.sellerPrice)} (₹${formatNum(diag.askingRate)}/sqft) vs Model Baseline: ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) — ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% spread.\n`;
    brief += `• Opening Bid: ${formatInr(diag.openingBid)} | Target Closing Zone: ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)} | Walk-Away Cap: ${formatInr(diag.walkAwayCeiling)}.\n`;
    brief += `• Total Outlay Savings: Closing at ${formatInr(diag.targetRangeLow)} cuts all-in cost from ${formatInr(fin.totalAllInCost)} to ${formatInr(finTarget.totalAllInCost)} (saving ${formatInr(fin.totalAllInCost - finTarget.totalAllInCost)}).\n`;
    brief += `• Broker/Seller Script: "Based on ${diag.locality} benchmarks near ₹${formatNum(diag.estRate || cityMedianRate)}/sqft and 6% stamp duty (~${formatInr(diag.stampDuty6Pct)}), our pre-approved offer is ${formatInr(diag.openingBid)} for a 30-day closing."\n`;
  } else if (activeRole === 'auditor') {
    brief += `1. Legal, Cost & Valuation Audit (${diag.verdict})\n`;
    brief += `• Valuation Variance: Ask ${formatInr(diag.sellerPrice)} (₹${formatNum(diag.askingRate)}/sqft) vs Baseline ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft), ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% spread.\n`;
    brief += `• All-In Acquisition Cost: ${formatInr(fin.totalAllInCost)} (${formatInr(fin.stampDuty)} 6% stamp duty, ${formatInr(fin.registrationFee)} reg., ${fin.gstPct > 0 ? `${formatInr(fin.gstAmount)} GST` : '₹0 GST'}).\n`;
    brief += `• Mandatory Document Checks: Occupancy Certificate (OC), MahaRERA layout, registered Index II, 30-year Search & Encumbrance Certificate, society NOC, and RERA carpet area verification (${diag.area} sqft listed).\n`;
  } else {
    brief += `1. Valuation & Micro-Market Standing (${diag.verdict})\n`;
    brief += `• Specs & Status: ${diag.locality}, ${diag.city} · ${diag.bhk} BHK, ${diag.area} sqft · ${ctx.furnishing || 'Unfurnished'} · ${ctx.status || 'Ready to Move'}${ctx.age_years ? ` · ~${ctx.age_years} yrs old` : ''}.\n`;
    brief += `• Price vs Model: Seller Ask ${formatInr(diag.sellerPrice)} (₹${formatNum(diag.askingRate)}/sqft) vs Baseline ${formatInr(diag.estPrice)} (₹${formatNum(diag.estRate)}/sqft) — ${diag.diffPct >= 0 ? '+' : ''}${diag.diffPct}% variance (Fair corridor: ${formatInr(diag.estLowBand)}–${formatInr(diag.estHighBand)}).\n`;
    if (sameBhkPeers) {
      brief += `• Same-BHK Submarket (${sameBhkPeers.count} ${diag.bhk} BHK units in ${diag.locality}): Median ₹${formatNum(sameBhkPeers.medRate)}/sqft (${formatInr(sameBhkPeers.minPrice)}–${formatInr(sameBhkPeers.maxPrice)}).\n`;
    }
    if (locBench) {
      const vsLocPct = (((diag.askingRate - locBench.median_rate_sqft) / locBench.median_rate_sqft) * 100).toFixed(1);
      brief += `• Overall Locality Position: ${Number(vsLocPct) >= 0 ? '+' : ''}${vsLocPct}% vs ${locBench.locality} median (₹${formatNum(locBench.median_rate_sqft)}/sqft across ${locBench.count} listings)${pctInfo ? ` · Cheaper than ${100 - pctInfo.cityPct}% of ${diag.city} inventory` : ''}.\n`;
    }
    brief += `• All-In Buyer Budget & EMI: ~${formatInr(fin.totalAllInCost)} total outlay (incl. ${formatInr(fin.stampDuty)} stamp duty) · Est. 20-Yr EMI (80% loan): ${formatInr(fin.emi20Yr)}/month · Est. Rent: ${formatInr(fin.estMonthlyRentLow)}–${formatInr(fin.estMonthlyRentHigh)}/mo.\n`;
  }

  brief += `\n2. Key Price Drivers & Strategic Action\n`;
  drivers.slice(1).forEach((d) => {
    brief += `• ${d}\n`;
  });
  if (diag.pricingRegime === 'deep_discount_anomaly') {
    brief += `• Critical Anomaly Flag: Priced ${Math.abs(diag.diffPct)}% below model baseline. Rule out missing OC (loan rejection risk), Gunthewari/non-society tenure, dilapidated age, or portal price typo before paying a token.\n`;
    brief += `• Condition any offer (${formatInr(diag.openingBid)}–${formatInr(diag.targetRangeHigh)}) on formal bank legal clearance.\n`;
  } else if (diag.pricingRegime === 'high_overprice' || diag.pricingRegime === 'moderate_overprice') {
    brief += `• Overpricing Buffer: Quoted ${formatInr(diag.diffInr)} above baseline. Open at ${formatInr(diag.openingBid)}, anchor negotiations at ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)}, and walk away above ${formatInr(diag.walkAwayCeiling)}.\n`;
  } else {
    brief += `• Balanced Positioning: Reasonably aligned within empirical range. Open at ${formatInr(diag.openingBid)} and target ${formatInr(diag.targetRangeLow)}–${formatInr(diag.targetRangeHigh)}, seeking parking or society transfer fee inclusion.\n`;
  }

  const displayComps = leverageComps.length >= 2 ? leverageComps : comps.slice(0, 3);
  if (displayComps.length > 0) {
    brief += `\n3. Closest Comparable Benchmarks (${scope === 'same_locality' ? diag.locality : `${diag.city} matches`})\n`;
    displayComps.slice(0, 3).forEach((c) => {
      const priceDelta = diag.sellerPrice > 0 && c.price_inr ? diag.sellerPrice - c.price_inr : 0;
      const deltaTag = priceDelta > 100000 ? ` · Save ${formatInr(priceDelta)}` : '';
      brief += `• ${c.society || c.title} (${c.locality}): ${c.bhk} BHK, ${c.area_sqft} sqft at ${formatInr(c.price_inr)} (₹${formatNum(c.price_per_sqft)}/sqft${deltaTag}) [View Listing](${cleanUrl(c.listing_url)})\n`;
    });
  }

  return brief.trim();
}

// Fast Streaming Pipeline (SSE) — instant empirical evaluation streamed cleanly without external API stalls
export async function streamAssistantQuery({
  query,
  context,
  history,
  onSnapshot,
  onMeta,
}: {
  query: string;
  context: PropertyContext;
  history?: ChatMessage[];
  onSnapshot: (cleanFullTextSoFar: string) => void;
  onMeta?: (meta: { intent: IntentCategory; fallback: boolean; stageText?: string }) => void;
}): Promise<{ fullText: string; intent: IntentCategory }> {
  const intent = classifyIntent(query, context);
  const diag = computeValuationDiagnostics(context);

  onMeta?.({
    intent,
    fallback: false,
    stageText: context.comparison_mode
      ? `Benchmarking ${context.properties?.length || 2} pinned listings against market corridors...`
      : `Analyzing ${diag.locality || diag.city} benchmarks & verified comparables...`,
  });

  const fullText = sanitizeAnalystOutput(
    generateDeterministicResponse(intent, query, context, history)
  );

  // Stream progressively in clean lines over ~120ms for immediate visual responsiveness
  const lines = fullText.split('\n');
  let accumulated = '';
  for (let i = 0; i < lines.length; i++) {
    accumulated += (i > 0 ? '\n' : '') + lines[i];
    if (lines[i].trim() !== '' || i === lines.length - 1) {
      onSnapshot(accumulated);
      if (i < lines.length - 1) {
        await new Promise((r) => setTimeout(r, 8));
      }
    }
  }

  return { fullText, intent };
}

// Instant JSON AI Analyst Endpoint
export async function processAssistantQuery({
  query,
  context,
  history,
}: {
  query: string;
  context: PropertyContext;
  history?: ChatMessage[];
}): Promise<{ response: string; intent: IntentCategory }> {
  const intent = classifyIntent(query, context);
  const response = sanitizeAnalystOutput(
    generateDeterministicResponse(intent, query, context, history)
  );
  return { response, intent };
}
