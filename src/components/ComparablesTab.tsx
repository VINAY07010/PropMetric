import React, { useState, useMemo } from 'react';
import { Property, EstimationResult } from '../types';
import {
  formatInr,
  formatNumber,
  getLocalitiesForCity,
  cleanListingUrl,
  calculateEstimate,
  evaluateOverpricing,
  MODEL_TOLERANCE_PERCENT,
} from '../utils/calculator';
import {
  Search,
  MapPin,
  Building,
  Scale,
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ComparablesTabProps {
  properties: Property[];
  initialCity?: string;
  initialBhk?: number | 'All';
  initialLocality?: string;
  initialSearch?: string;
  initialBudget?: string;
  onSelectProperty?: (property: Property) => void;
  onAskAiToExplain?: (context: any) => void;
}

export const ComparablesTab: React.FC<ComparablesTabProps> = ({
  properties,
  initialCity = 'All',
  initialBhk = 'All',
  initialLocality = 'All',
  initialSearch = '',
  initialBudget = 'All',
  onSelectProperty,
  onAskAiToExplain,
}) => {
  const [cityFilter, setCityFilter] = useState<string>(initialCity);
  const [localityFilter, setLocalityFilter] = useState<string>(initialLocality);
  const [bhkFilter, setBhkFilter] = useState<string | number>(initialBhk);
  const [budgetTier, setBudgetTier] = useState<string>(initialBudget);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rate_asc' | 'rate_desc'>('price_asc');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Interactive Pin / Compare Tray state
  const [pinnedProperties, setPinnedProperties] = useState<Property[]>([]);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Available localities based on current city filter
  const availableLocalities = useMemo(() => {
    if (cityFilter === 'All') {
      const puneLocs = getLocalitiesForCity('Pune');
      const mumLocs = getLocalitiesForCity('Mumbai');
      return [...puneLocs, ...mumLocs].sort((a, b) => b.count - a.count);
    }
    return getLocalitiesForCity(cityFilter);
  }, [cityFilter]);

  // Filter properties strictly from genuine dataset
  const filteredList = useMemo(() => {
    return properties.filter((p) => {
      if (cityFilter !== 'All' && p.city !== cityFilter) return false;
      if (localityFilter !== 'All' && p.locality.toLowerCase() !== localityFilter.toLowerCase()) return false;
      if (bhkFilter !== 'All' && p.bhk !== Number(bhkFilter)) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;

      // Budget Tier Filter
      if (budgetTier !== 'All' && p.price_inr) {
        if (budgetTier === 'sub_75l' && p.price_inr > 7500000) return false;
        if (budgetTier === '75l_15cr' && (p.price_inr <= 7500000 || p.price_inr > 15000000)) return false;
        if (budgetTier === '15cr_3cr' && (p.price_inr <= 15000000 || p.price_inr > 30000000)) return false;
        if (budgetTier === 'above_3cr' && p.price_inr <= 30000000) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSoc = p.society.toLowerCase().includes(q);
        const matchLoc = p.locality.toLowerCase().includes(q);
        if (!matchTitle && !matchSoc && !matchLoc) return false;
      }

      return true;
    });
  }, [properties, cityFilter, localityFilter, bhkFilter, statusFilter, budgetTier, searchQuery]);

  // Sort properties
  const sortedList = useMemo(() => {
    const copy = [...filteredList];
    copy.sort((a, b) => {
      const priceA = a.price_inr || 0;
      const priceB = b.price_inr || 0;
      const rateA = a.price_per_sqft || 0;
      const rateB = b.price_per_sqft || 0;

      switch (sortBy) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'rate_asc':
          return rateA - rateB;
        case 'rate_desc':
          return rateB - rateA;
        default:
          return 0;
      }
    });
    return copy;
  }, [filteredList, sortBy]);

  // Handle Pin / Unpin property
  const togglePinProperty = (prop: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedProperties((prev) => {
      const exists = prev.some((p) => p.id === prop.id);
      if (exists) {
        return prev.filter((p) => p.id !== prop.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), prop];
      }
      return [...prev, prop];
    });
  };

  // Direct trigger for AI Explanation
  const triggerAiForProperty = (item: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAskAiToExplain) return;

    const est: EstimationResult = calculateEstimate({
      city: item.city === 'Mumbai' ? 'Mumbai' : 'Pune',
      locality: item.locality,
      bhk: item.bhk || 2,
      area_sqft: item.area_sqft || 950,
      bathrooms: item.bathrooms || Math.max(1, Math.min(item.bhk || 2, 5)),
      furnishing: (item.furnishing as any) || 'Unfurnished',
      status: (item.status as any) || 'Ready to Move',
    });

    const verdict = evaluateOverpricing(item.price_inr || est.estimated_price_inr, est);

    onAskAiToExplain({
      property_id: item.id,
      id: item.id,
      title: item.title,
      society: item.society,
      locality: item.locality,
      city: item.city,
      bhk: item.bhk,
      bathrooms: item.bathrooms,
      area_sqft: item.area_sqft,
      furnishing: item.furnishing,
      status: item.status,
      price_inr: item.price_inr,
      seller_asking_price: item.price_inr,
      price_per_sqft: item.price_per_sqft,
      estimated_price_inr: est.estimated_price_inr,
      estimated_rate_per_sqft: est.estimated_rate_per_sqft,
      difference_inr: verdict.difference_inr,
      difference_percent: verdict.difference_percent,
      tolerance_band_percent: MODEL_TOLERANCE_PERCENT,
      verdict: verdict.verdict,
      risk_tier: verdict.risk_tier,
      listing_url: cleanListingUrl(item.listing_url),
    });
  };

  // Compare pinned properties with AI
  const comparePinnedWithAi = () => {
    if (!onAskAiToExplain || pinnedProperties.length < 2) return;
    const compsContext = pinnedProperties.map((p) => {
      const est = calculateEstimate({
        city: p.city === 'Mumbai' ? 'Mumbai' : 'Pune',
        locality: p.locality,
        bhk: p.bhk || 2,
        area_sqft: p.area_sqft || 950,
        bathrooms: p.bathrooms || 2,
        furnishing: (p.furnishing as any) || 'Unfurnished',
        status: (p.status as any) || 'Ready to Move',
      });
      const verd = evaluateOverpricing(p.price_inr || est.estimated_price_inr, est);
      return {
        id: p.id,
        title: p.title,
        society: p.society,
        locality: p.locality,
        city: p.city,
        bhk: p.bhk,
        area_sqft: p.area_sqft,
        asking_price: p.price_inr,
        asking_rate: p.price_per_sqft,
        model_estimate: est.estimated_price_inr,
        variance_percent: verd.difference_percent,
        verdict: verd.verdict,
      };
    });

    onAskAiToExplain({
      comparison_mode: true,
      properties_count: pinnedProperties.length,
      properties: compsContext,
      query_intent: 'compare_pinned_listings',
    });
    setIsCompareDrawerOpen(false);
  };

  // Export CSV
  const exportCsv = () => {
    const headers = [
      'ID',
      'City',
      'Locality',
      'Society',
      'BHK',
      'Carpet Area (sqft)',
      'Price (INR)',
      'Rate/sqft',
      'Status',
      'Furnishing',
      'URL',
    ];
    const rows = sortedList.slice(0, 50).map((p) => [
      p.id,
      p.city,
      p.locality,
      `"${p.society.replace(/"/g, '""')}"`,
      p.bhk,
      p.area_sqft,
      p.price_inr,
      p.price_per_sqft,
      p.status,
      p.furnishing,
      cleanListingUrl(p.listing_url),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="space-y-7">
      {/* Hestora Editorial Page Header */}
      <div className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF] mb-4">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
              <span>Verified Listings</span>
            </div>
            <h1
              className="font-display font-medium tracking-[-0.03em] text-3xl sm:text-4xl text-[#111210] dark:text-white leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Comparable residential <span className="text-[#9E9E98] dark:text-[#666660]">listings.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98] mt-2.5 max-w-2xl leading-relaxed">
              Inspect genuine residential inventory across Mumbai and Pune. Click any card to review hedonic pricing variance,
              or select <strong>Ask AI Analyst</strong> for a structured valuation brief.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2.5 rounded-full bg-white dark:bg-[#111210] border border-black/[0.1] dark:border-white/[0.12] hover:border-black/30 dark:hover:border-white/30 px-4 py-2.5 text-xs font-medium text-[#111210] dark:text-white transition-colors cursor-pointer shrink-0 self-start lg:self-auto"
            title="Copy CSV to clipboard"
          >
            {copiedCsv ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-[#D9F935]" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-[#5E5E5A] dark:text-[#9E9E98]" />
            )}
            <span>{copiedCsv ? 'Copied CSV' : 'Export Table CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E5E5A] dark:text-[#9E9E98]" />
            <input
              type="text"
              placeholder="Search society, locality (e.g. Kharadi, Andheri)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-2xl pl-10 pr-4 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white placeholder:text-[#8C8C86] focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
            />
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setLocalityFilter('All');
              }}
              className="w-full text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
            >
              <option value="All">All Cities</option>
              <option value="Pune">Pune Only</option>
              <option value="Mumbai">Mumbai Only</option>
            </select>
          </div>

          {/* Locality Filter Dropdown */}
          <div>
            <select
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="w-full text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
            >
              <option value="All">All Localities ({availableLocalities.length})</option>
              {availableLocalities.map((l) => (
                <option key={l.locality} value={l.locality}>
                  {l.locality} ({l.count})
                </option>
              ))}
            </select>
          </div>

          {/* BHK Filter */}
          <div>
            <select
              value={bhkFilter}
              onChange={(e) => setBhkFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="w-full text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
            >
              <option value="All">All BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rate_asc">Rate/sqft: Low to High</option>
              <option value="rate_desc">Rate/sqft: High to Low</option>
            </select>
          </div>
        </div>

        {/* Budget Tier Presets & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5">
            <span className="text-[#5E5E5A] dark:text-[#9E9E98] text-[11px] font-medium uppercase tracking-wider mr-1">
              Budget
            </span>
            {[
              { id: 'All', label: 'All Budgets' },
              { id: 'sub_75l', label: '< ₹75 Lakh' },
              { id: '75l_15cr', label: '₹75L – ₹1.5 Cr' },
              { id: '15cr_3cr', label: '₹1.5 Cr – ₹3 Cr' },
              { id: 'above_3cr', label: '₹3 Cr+' },
            ].map((t) => {
              const isSelected = budgetTier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBudgetTier(t.id)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap z-0 ${
                    isSelected
                      ? 'text-white dark:text-[#111210] font-semibold'
                      : 'bg-[#F4F3EF] dark:bg-[#111210] text-[#5E5E5A] dark:text-[#C6C6C0] hover:text-[#111210] dark:hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="comparables-budget-pill"
                      transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#111210] dark:bg-[#D9F935] -z-10"
                    />
                  )}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#5E5E5A] dark:text-[#9E9E98]">
            <span>
              Showing{' '}
              <strong className="text-[#111210] dark:text-white font-mono tabular-nums">{sortedList.length}</strong>{' '}
              matching listings
              {localityFilter !== 'All' && (
                <span>
                  {' '}
                  in <strong className="text-[#111210] dark:text-white">{localityFilter}</strong>
                </span>
              )}
            </span>
            {(searchQuery ||
              cityFilter !== 'All' ||
              localityFilter !== 'All' ||
              bhkFilter !== 'All' ||
              statusFilter !== 'All' ||
              budgetTier !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setCityFilter('All');
                  setLocalityFilter('All');
                  setBhkFilter('All');
                  setBudgetTier('All');
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#F4F3EF] dark:bg-white/[0.08] px-3 py-1 text-[#111210] dark:text-[#D9F935] hover:opacity-80 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparable Listings Grid - Clean Architectural Cards (Zero images) */}
      {sortedList.length === 0 ? (
        <div className="rounded-3xl bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-14 text-center text-[#5E5E5A] dark:text-[#9E9E98]">
          <p className="font-display text-lg font-medium text-[#111210] dark:text-white">
            No comparable properties found
          </p>
          <p className="text-xs mt-1.5">Try widening your search terms or resetting city and locality filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedList.slice(0, 36).map((item, idx) => {
            const directUrl = cleanListingUrl(item.listing_url);
            const isPinned = pinnedProperties.some((p) => p.id === item.id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.025, 0.22),
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => onSelectProperty && onSelectProperty(item)}
                className={`rounded-3xl p-6 flex flex-col justify-between cursor-pointer group transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 ${
                  isPinned
                    ? 'bg-white dark:bg-[#171815] border-2 border-[#111210] dark:border-[#D9F935] shadow-lg'
                    : 'bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/25 dark:hover:border-white/25 hover:shadow-[0_16px_36px_rgba(17,18,16,0.08)]'
                }`}
              >
                <div>
                  {/* Top Badges & Pin Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold bg-[#111210] dark:bg-white/[0.1] text-white px-2.5 py-1 rounded-full">
                        {item.bhk} BHK · {item.city}
                      </span>
                      <span className="text-[11px] font-medium text-[#5E5E5A] dark:text-[#C6C6C0] bg-[#F4F3EF] dark:bg-[#111210] px-2.5 py-1 rounded-full">
                        {item.status}
                      </span>
                      {item.furnishing && item.furnishing !== 'Unfurnished' && (
                        <span className="text-[11px] font-medium text-[#111210] dark:text-[#D9F935] bg-[#D9F935]/40 dark:bg-[#D9F935]/15 px-2.5 py-1 rounded-full">
                          {item.furnishing}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => togglePinProperty(item, e)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                        isPinned
                          ? 'bg-[#D9F935] text-[#111210] font-semibold border-[#D9F935]'
                          : 'border-black/[0.1] dark:border-white/[0.12] text-[#5E5E5A] dark:text-[#9E9E98] hover:text-[#111210] dark:hover:text-white'
                      }`}
                      title={isPinned ? 'Remove from compare' : 'Pin to compare up to 3 listings'}
                    >
                      <Layers className="w-3 h-3" />
                      <span>{isPinned ? 'Pinned' : 'Compare'}</span>
                    </button>
                  </div>

                  {/* Locality & ID */}
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5E5E5A] dark:text-[#9E9E98] mb-1.5">
                    <span className="inline-flex items-center gap-1.5 truncate font-medium text-[#111210] dark:text-[#E5E5DF]">
                      <MapPin className="w-3.5 h-3.5 text-[#5E5E5A] dark:text-[#D9F935] shrink-0" />
                      <span className="truncate">{item.locality ? `${item.locality}, ${item.city}` : item.city}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#8C8C86] shrink-0">{item.id}</span>
                  </div>

                  {/* Listing Title */}
                  <h3 className="font-display font-medium text-base text-[#111210] dark:text-white line-clamp-2 leading-snug group-hover:opacity-80 transition-opacity">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] mt-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.society || 'Standalone Property'}</span>
                  </p>

                  {/* Carpet Area & Unit Rate Box */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
                    <div>
                      <span className="text-[#5E5E5A] dark:text-[#9E9E98] block text-[11px]">Carpet Area</span>
                      <span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                        {item.area_sqft ? `${formatNumber(item.area_sqft)} sqft` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5E5E5A] dark:text-[#9E9E98] block text-[11px]">Rate / sqft</span>
                      <span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                        {item.price_per_sqft ? `₹${formatNumber(item.price_per_sqft)}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Price & Action Pills */}
                <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Asking Price</span>
                      <span className="text-xl font-display font-medium text-[#111210] dark:text-white tabular-nums">
                        {formatInr(item.price_inr)}
                      </span>
                    </div>

                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#111210] dark:text-white bg-[#F4F3EF] dark:bg-white/[0.08] hover:bg-[#e8e6e0] dark:hover:bg-white/[0.14] px-3 py-1.5 rounded-full transition-colors"
                      title="Open live listing on Magicbricks"
                    >
                      <span>Visit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Dual Pill Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => triggerAiForProperty(item, e)}
                      className="py-2 px-3 bg-[#D9F935] hover:bg-[#cae92b] text-[#111210] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                      title="Open AI Analyst for this listing"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask AI Analyst</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectProperty) onSelectProperty(item);
                      }}
                      className="py-2 px-3 bg-[#111210] dark:bg-white/[0.1] hover:bg-[#232520] dark:hover:bg-white/[0.18] text-white rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5 text-[#D9F935]" />
                      <span>Screen Price</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {sortedList.length > 36 && (
        <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] text-center text-xs text-[#5E5E5A] dark:text-[#9E9E98]">
          Displaying first 36 of {sortedList.length} matching records. Use locality or budget filters above to refine your search.
        </div>
      )}

      {/* Floating Pin & Compare Dock */}
      <AnimatePresence>
        {pinnedProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#141513]/95 text-white border border-white/[0.12] rounded-full shadow-2xl px-4 py-2.5 flex items-center gap-4 backdrop-blur-md max-w-xl w-[92%]"
          >
            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-6 h-6 rounded-full bg-[#D9F935] text-[#111210] flex items-center justify-center text-xs font-bold font-mono">
                {pinnedProperties.length}
              </span>
              <span className="text-xs font-medium">
                {pinnedProperties.length} of 3 properties pinned
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsCompareDrawerOpen(true)}
                className="px-4 py-1.5 bg-[#D9F935] hover:bg-[#cae92b] text-[#111210] font-semibold rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare Side-by-Side</span>
              </button>

              <button
                type="button"
                onClick={() => setPinnedProperties([])}
                className="p-1.5 text-[#9E9E98] hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                title="Clear pinned properties"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side-by-Side Comparison Modal */}
      <AnimatePresence>
        {isCompareDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsCompareDrawerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#171815] rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-black/[0.07] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#141513] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-medium text-[#111210] dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
                    Side-by-Side Listing Valuation Comparison
                  </h3>
                  <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] mt-0.5">
                    Compare unit rates, carpet area efficiency, and hedonic model variance across {pinnedProperties.length} listings
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {pinnedProperties.length >= 2 && (
                    <button
                      type="button"
                      onClick={comparePinnedWithAi}
                      className="px-4 py-2 bg-[#D9F935] hover:bg-[#cae92b] text-[#111210] font-semibold rounded-full text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze with AI Analyst</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsCompareDrawerOpen(false)}
                    className="p-2 rounded-full text-[#5E5E5A] hover:text-[#111210] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="p-6 overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black/[0.08] dark:border-white/[0.1] text-[#5E5E5A] dark:text-[#9E9E98] uppercase text-[11px] font-medium">
                      <th className="py-3 px-3 w-44">Attribute</th>
                      {pinnedProperties.map((p) => (
                        <th key={p.id} className="py-3 px-3">
                          <div className="font-display font-medium text-[#111210] dark:text-white text-sm line-clamp-1 normal-case">
                            {p.society || p.title}
                          </div>
                          <span className="text-[10px] font-mono text-[#8C8C86] font-normal">{p.id}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-[#111210] dark:text-[#E5E5DF]">
                    <tr>
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Locality &amp; City</td>
                      {pinnedProperties.map((p) => (
                        <td key={p.id} className="py-3 px-3 font-medium">
                          {p.locality ? `${p.locality}, ${p.city}` : p.city}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Configuration</td>
                      {pinnedProperties.map((p) => (
                        <td key={p.id} className="py-3 px-3 font-mono font-medium tabular-nums">
                          {p.bhk} BHK · {p.area_sqft || 0} sqft
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#F4F3EF]/60 dark:bg-white/[0.02]">
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Seller Asking Price</td>
                      {pinnedProperties.map((p) => (
                        <td key={p.id} className="py-3 px-3 font-bold font-mono text-base tabular-nums">
                          {formatInr(p.price_inr)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Asking Rate / sqft</td>
                      {pinnedProperties.map((p) => (
                        <td key={p.id} className="py-3 px-3 font-mono font-semibold tabular-nums">
                          ₹{formatNumber(p.price_per_sqft || 0)}/sqft
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#F4F3EF]/60 dark:bg-white/[0.02]">
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Model Hedonic Estimate</td>
                      {pinnedProperties.map((p) => {
                        const est = calculateEstimate({
                          city: p.city === 'Mumbai' ? 'Mumbai' : 'Pune',
                          locality: p.locality,
                          bhk: p.bhk || 2,
                          area_sqft: p.area_sqft || 950,
                          bathrooms: p.bathrooms || 2,
                          furnishing: (p.furnishing as any) || 'Unfurnished',
                          status: (p.status as any) || 'Ready to Move',
                        });
                        return (
                          <td key={p.id} className="py-3 px-3 font-mono font-medium tabular-nums">
                            {formatInr(est.estimated_price_inr)}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Screening Verdict</td>
                      {pinnedProperties.map((p) => {
                        const est = calculateEstimate({
                          city: p.city === 'Mumbai' ? 'Mumbai' : 'Pune',
                          locality: p.locality,
                          bhk: p.bhk || 2,
                          area_sqft: p.area_sqft || 950,
                          bathrooms: p.bathrooms || 2,
                          furnishing: (p.furnishing as any) || 'Unfurnished',
                          status: (p.status as any) || 'Ready to Move',
                        });
                        const verd = evaluateOverpricing(p.price_inr || est.estimated_price_inr, est);
                        return (
                          <td key={p.id} className="py-3 px-3">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block ${
                                verd.difference_percent > MODEL_TOLERANCE_PERCENT
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                              }`}
                            >
                              {verd.difference_percent >= 0 ? '+' : ''}
                              {verd.difference_percent}% ({verd.verdict})
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-[#5E5E5A] dark:text-[#9E9E98]">Actions</td>
                      {pinnedProperties.map((p) => (
                        <td key={p.id} className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <a
                              href={cleanListingUrl(p.listing_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#111210] dark:text-[#D9F935] hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              <span>Open Source</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => togglePinProperty(p, e)}
                              className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
