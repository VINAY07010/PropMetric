import { EstimationParams, EstimationResult, OverpricingVerdict, Property } from '../types';
import localitiesRaw from '../data/localities.json';
import analyticsRaw from '../data/analytics.json';

export interface LocalityInfo {
  locality: string;
  city: string;
  count: number;
  median_rate_sqft: number;
  gmean_rate_sqft?: number;
  smoothed_rate_sqft?: number;
  median_price_inr: number;
  multiplier: number;
}

export const LOCALITIES_BY_CITY: Record<string, LocalityInfo[]> = localitiesRaw as Record<string, LocalityInfo[]>;

const MODEL_META = (analyticsRaw as any).model_meta || {};
const CITY_MEDIAN_RATES = MODEL_META.city_median_rates || {
  Pune: (analyticsRaw as any).pune_rate_per_sqft?.median || 12142,
  Mumbai: (analyticsRaw as any).mumbai_rate_per_sqft?.median || 32379,
};
const CITY_GMEAN_RATES: Record<string, number> = MODEL_META.city_gmean_rates || {
  Pune: 11850,
  Mumbai: 29500,
};
const MMR_OUTER_GMEAN_RATE: number = Number(MODEL_META.mmr_outer_gmean_rate || 9200);
const OUTER_MMR_TOKENS: string[] = Array.isArray(MODEL_META.outer_mmr_tokens)
  ? MODEL_META.outer_mmr_tokens
  : [
      'nalasopara', 'virar', 'vasai', 'ulhasnagar', 'badlapur', 'ambernath',
      'boisar', 'palghar', 'chikhal dongari', 'kalyan', 'dombivli', 'karjat',
      'khopoli', 'bhiwandi', 'panvel', 'taloja', 'kamothe', 'kharghar', 'ulwe',
    ];

const RIDGE_COEFFICIENTS: number[] = Array.isArray(MODEL_META.coefficients) && MODEL_META.coefficients.length === 9
  ? MODEL_META.coefficients
  : [-1.502696, 0.952067, 1.160192, -0.126416, 0.03819, 0.078074, 0.055819, 0.003956, 0.02866];

export const CITY_BASE_RATES: Record<string, number> = {
  Pune: Math.round(Number(CITY_MEDIAN_RATES.Pune || 12142)),
  Mumbai: Math.round(Number(CITY_MEDIAN_RATES.Mumbai || 32379)),
};

export const MODEL_TOLERANCE_PERCENT: number = Number(MODEL_META.tolerance_band_percent ?? 16.1);

function isOuterMmr(localityName?: string): boolean {
  const low = (localityName || '').toLowerCase();
  return OUTER_MMR_TOKENS.some((tok) => low.includes(tok));
}

export function getLocalitiesForCity(city: 'Pune' | 'Mumbai' | string): LocalityInfo[] {
  return LOCALITIES_BY_CITY[city] || [];
}

export function calculateEstimate(params: EstimationParams): EstimationResult {
  const { city, locality, area_sqft, bhk, bathrooms, furnishing, status } = params;

  const cityGmean = CITY_GMEAN_RATES[city] || CITY_GMEAN_RATES.Pune || 12000;
  const cityMedian = CITY_BASE_RATES[city] || 12142;

  let smoothedLocRate = city === 'Mumbai' && isOuterMmr(locality) ? MMR_OUTER_GMEAN_RATE : cityGmean;
  let locMultiplier = 1.0;

  if (locality && locality !== 'All' && locality !== 'Other / General') {
    const cityLocs = LOCALITIES_BY_CITY[city] || [];
    const found = cityLocs.find((l) => l.locality.toLowerCase() === locality.toLowerCase());
    if (found) {
      smoothedLocRate = found.smoothed_rate_sqft || found.gmean_rate_sqft || found.median_rate_sqft || smoothedLocRate;
      locMultiplier = found.multiplier || Number((found.median_rate_sqft / cityMedian).toFixed(3));
    }
  }

  const safeArea = Math.max(50, Number(area_sqft) || 500);
  const safeBhk = Math.max(1, Number(bhk) || 2);
  const safeBath = bathrooms > 0 ? bathrooms : Math.max(1, Math.min(safeBhk, 5));
  const isMumbai = city === 'Mumbai' ? 1.0 : 0.0;
  const isFurnished = furnishing === 'Furnished' ? 1.0 : 0.0;
  const isSemiFurnished = furnishing === 'Semi-Furnished' ? 1.0 : 0.0;
  const isUnderConstruction = status === 'Under Construction' ? 1.0 : 0.0;

  // Exact 9-feature Hedonic Log-Linear Ridge Regression vector:
  // [intercept, ln(area), ln(smoothed_loc_rate), is_mumbai, bhk, bathrooms, is_furnished, is_semi_furnished, is_under_construction]
  const features = [
    1.0,
    Math.log(safeArea),
    Math.log(Math.max(1000, smoothedLocRate)),
    isMumbai,
    safeBhk,
    safeBath,
    isFurnished,
    isSemiFurnished,
    isUnderConstruction,
  ];

  const logPrice = features.reduce((sum, val, idx) => sum + val * (RIDGE_COEFFICIENTS[idx] || 0), 0);
  const estimatedPrice = Math.round(Math.exp(logPrice));

  const lowerBound = Math.round(estimatedPrice * (1 - MODEL_TOLERANCE_PERCENT / 100));
  const upperBound = Math.round(estimatedPrice * (1 + MODEL_TOLERANCE_PERCENT / 100));

  return {
    estimated_price_inr: estimatedPrice,
    estimated_rate_per_sqft: Math.round(estimatedPrice / safeArea),
    lower_bound_inr: lowerBound,
    upper_bound_inr: upperBound,
    tolerance_band_percent: MODEL_TOLERANCE_PERCENT,
    city,
    locality,
    area_sqft: safeArea,
    bhk: safeBhk,
    locality_multiplier: locMultiplier,
  };
}

export function evaluateOverpricing(
  sellerAskingPrice: number,
  estimateResult: EstimationResult
): OverpricingVerdict {
  const estimated = estimateResult.estimated_price_inr;
  const tol = estimateResult.tolerance_band_percent ?? MODEL_TOLERANCE_PERCENT;
  const diffInr = sellerAskingPrice - estimated;
  const diffPct = Number(((diffInr / estimated) * 100).toFixed(1));

  let verdict = '';
  let riskTier: 'low' | 'fair' | 'moderate' | 'high' = 'fair';

  if (diffPct <= tol) {
    if (diffPct < -tol) {
      verdict = 'Below model estimate — potential value or unlisted property caveats';
      riskTier = 'low';
    } else {
      verdict = "Within model's expected market range";
      riskTier = 'fair';
    }
  } else if (diffPct <= tol * 2) {
    verdict = 'Above model estimate — review suggested';
    riskTier = 'moderate';
  } else {
    verdict = 'Significantly above model estimate';
    riskTier = 'high';
  }

  return {
    seller_asking_price: sellerAskingPrice,
    estimated_price: estimated,
    difference_inr: diffInr,
    difference_percent: diffPct,
    tolerance_percent: tol,
    verdict,
    risk_tier: riskTier,
  };
}

export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-IN');
}

export function findMatchingComparables(
  allProperties: Property[],
  city: string,
  bhk: number,
  area: number,
  limit = 6
): Property[] {
  // First match strictly on City and BHK
  let candidates = allProperties.filter(
    (p) => p.city.toLowerCase() === city.toLowerCase() && p.bhk === bhk && p.price_inr && p.area_sqft
  );

  // If too few, include +/- 1 BHK
  if (candidates.length < 3) {
    candidates = allProperties.filter(
      (p) =>
        p.city.toLowerCase() === city.toLowerCase() &&
        p.bhk &&
        Math.abs(p.bhk - bhk) <= 1 &&
        p.price_inr &&
        p.area_sqft
    );
  }

  // Sort by closest area
  return candidates
    .map((p) => ({
      property: p,
      areaDiff: Math.abs((p.area_sqft || 0) - area),
    }))
    .sort((a, b) => a.areaDiff - b.areaDiff)
    .slice(0, limit)
    .map((x) => x.property);
}

export function cleanListingUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return 'https://www.magicbricks.com';
  }
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://www.magicbricks.com${trimmed}`;
  }
  return `https://www.magicbricks.com/${trimmed}`;
}

