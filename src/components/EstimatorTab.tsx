import React, { useState, useMemo } from 'react';
import { EstimationParams, EstimationResult } from '../types';
import {
  calculateEstimate,
  formatInr,
  formatNumber,
  getLocalitiesForCity,
  MODEL_TOLERANCE_PERCENT,
  LocalityInfo,
} from '../utils/calculator';
import {
  Calculator,
  ShieldCheck,
  MapPin,
  Search,
  ChevronDown,
  Check,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleArrow } from './AnimatedArrowBadge';

interface EstimatorTabProps {
  onEstimateGenerated: (result: EstimationResult) => void;
  onNavigateToScreening: () => void;
}

export const EstimatorTab: React.FC<EstimatorTabProps> = ({
  onEstimateGenerated,
  onNavigateToScreening,
}) => {
  const [params, setParams] = useState<EstimationParams>({
    city: 'Pune',
    locality: 'Kharadi',
    bhk: 2,
    area_sqft: 950,
    bathrooms: 2,
    furnishing: 'Unfurnished',
    status: 'Ready to Move',
  });

  const [localitySearch, setLocalitySearch] = useState('');
  const [isLocalityDropdownOpen, setIsLocalityDropdownOpen] = useState(false);

  // Mortgage Simulator state
  const [showMortgage, setShowMortgage] = useState(false);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);

  const cityLocalities = useMemo(() => {
    return getLocalitiesForCity(params.city);
  }, [params.city]);

  const filteredLocalities = useMemo(() => {
    if (!localitySearch.trim()) return cityLocalities;
    const q = localitySearch.toLowerCase();
    return cityLocalities.filter((l) => l.locality.toLowerCase().includes(q));
  }, [cityLocalities, localitySearch]);

  const selectedLocalityInfo: LocalityInfo | undefined = useMemo(() => {
    if (!params.locality) return undefined;
    return cityLocalities.find((l) => l.locality.toLowerCase() === params.locality?.toLowerCase());
  }, [cityLocalities, params.locality]);

  const [lastEstimate, setLastEstimate] = useState<EstimationResult>(() => calculateEstimate(params));

  const handleParamChange = (field: keyof EstimationParams, val: any) => {
    const updated = { ...params, [field]: val };

    if (field === 'city') {
      const newLocs = getLocalitiesForCity(val);
      const defaultLoc = newLocs.length > 0 ? newLocs[0].locality : '';
      updated.locality = defaultLoc;
      setLocalitySearch('');
    }

    setParams(updated);
    const est = calculateEstimate(updated);
    setLastEstimate(est);
    onEstimateGenerated(est);
  };

  const handleSelectLocality = (loc: string) => {
    handleParamChange('locality', loc);
    setIsLocalityDropdownOpen(false);
    setLocalitySearch('');
  };

  // Mortgage calculations
  const mortgageCalc = useMemo(() => {
    const price = lastEstimate.estimated_price_inr;
    const downPayment = Math.round(price * (downPaymentPercent / 100));
    const loanAmount = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = tenureYears * 12;

    const emi =
      loanAmount > 0 && monthlyRate > 0
        ? Math.round(
            (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
              (Math.pow(1 + monthlyRate, totalMonths) - 1)
          )
        : 0;

    const totalRepayment = emi * totalMonths;
    const totalInterest = Math.max(0, totalRepayment - loanAmount);
    const estimatedGovtCharges = Math.round(price * 0.06);

    return {
      downPayment,
      loanAmount,
      emi,
      totalInterest,
      totalRepayment,
      estimatedGovtCharges,
    };
  }, [lastEstimate.estimated_price_inr, downPaymentPercent, interestRate, tenureYears]);

  return (
    <div className="space-y-8">
      {/* Hestora Editorial Page Header */}
      <div className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF] mb-4">
          <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
          <span>Price Estimator</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <h1
            className="font-display font-medium tracking-[-0.03em] text-3xl sm:text-4xl text-[#111210] dark:text-white leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Residential asking price <span className="text-[#9E9E98] dark:text-[#666660]">estimation.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98] max-w-lg leading-relaxed">
            Configure property specifications and micro-market locality to compute a hedonic regression baseline calibrated across Mumbai &amp; Pune.
          </p>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Card (7 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-black/[0.07] dark:border-white/[0.08] pb-4 flex items-center justify-between">
            <h2 className="font-display font-medium text-lg text-[#111210] dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
              <span>Property Specifications</span>
            </h2>
            <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono">Live Recalculation</span>
          </div>

          {/* City Selection */}
          <div>
            <label className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
              Select Metro Market
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Pune', 'Mumbai'] as const).map((c) => {
                const isSelected = params.city === c;
                return (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleParamChange('city', c)}
                    className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-[#111210] dark:border-[#D9F935] bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] shadow-sm'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white hover:border-black/25 dark:hover:border-white/25'
                    }`}
                  >
                    <div className="font-display font-medium text-base">{c}</div>
                    <div
                      className={`text-xs font-mono mt-0.5 tabular-nums ${
                        isSelected ? 'text-[#D9F935] dark:text-[#111210]/80' : 'text-[#5E5E5A] dark:text-[#9E9E98]'
                      }`}
                    >
                      {c === 'Pune' ? 'Median ₹12,143/sqft' : 'Median ₹32,380/sqft'}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Locality Search & Select */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="locality-search-input"
                className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E]"
              >
                Locality / Submarket ({params.city})
              </label>
              <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                {cityLocalities.length} verified localities
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLocalityDropdownOpen(!isLocalityDropdownOpen)}
              className="w-full border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-3 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white text-sm flex items-center justify-between cursor-pointer hover:border-black/25 dark:hover:border-white/25 transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                <MapPin className="w-4 h-4 text-[#111210] dark:text-[#D9F935] shrink-0" />
                <span className="font-medium truncate">
                  {params.locality || 'Select or search locality'}
                </span>
                {selectedLocalityInfo && (
                  <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                    ({selectedLocalityInfo.count} listings · ₹{formatNumber(selectedLocalityInfo.median_rate_sqft)}/sqft)
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#5E5E5A] transition-transform duration-200 ${
                  isLocalityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {isLocalityDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1E201C] border border-black/[0.1] dark:border-white/[0.12] rounded-2xl shadow-xl z-20 max-h-64 flex flex-col overflow-hidden"
                >
                  <div className="p-2.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#141513] sticky top-0 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[#5E5E5A] shrink-0" />
                    <input
                      id="locality-search-input"
                      type="text"
                      placeholder={`Search ${params.city} localities (e.g. Kharadi, Andheri, Baner)...`}
                      value={localitySearch}
                      onChange={(e) => setLocalitySearch(e.target.value)}
                      className="w-full text-xs bg-transparent focus:outline-none text-[#111210] dark:text-white placeholder:text-[#8C8C86]"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectLocality('Other / General')}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#F4F3EF] dark:hover:bg-white/[0.05] flex items-center justify-between text-[#111210] dark:text-white cursor-pointer"
                    >
                      <span className="font-medium">Other / General {params.city} Average</span>
                      <span className="text-[#5E5E5A] dark:text-[#9E9E98] font-mono">Citywide Baseline</span>
                    </button>

                    {filteredLocalities.map((loc) => {
                      const isSelected = params.locality === loc.locality;
                      return (
                        <button
                          key={loc.locality}
                          type="button"
                          onClick={() => handleSelectLocality(loc.locality)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-[#F4F3EF] dark:hover:bg-white/[0.05] flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#F4F3EF] dark:bg-[#D9F935]/15 font-semibold text-[#111210] dark:text-[#D9F935]'
                              : 'text-[#111210] dark:text-[#E5E5DF]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{loc.locality}</span>
                          </div>
                          <div className="text-right shrink-0 font-mono text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] tabular-nums">
                            <span className="font-medium text-[#111210] dark:text-white">
                              ₹{formatNumber(loc.median_rate_sqft)}/sqft
                            </span>
                            <span className="ml-1.5">({loc.count})</span>
                          </div>
                        </button>
                      );
                    })}

                    {filteredLocalities.length === 0 && (
                      <div className="p-4 text-center text-[#5E5E5A] dark:text-[#9E9E98] text-xs">
                        No matching locality found. Select "Other / General" for the citywide baseline.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedLocalityInfo && (
              <div className="mt-2 flex items-center justify-between text-xs text-[#5E5E5A] dark:text-[#9E9E98] px-1">
                <span>
                  Submarket sample: <strong className="text-[#111210] dark:text-white">{selectedLocalityInfo.count} listings</strong>
                </span>
                <span className="font-mono tabular-nums">
                  Multiplier: <strong className="text-[#111210] dark:text-[#D9F935]">{selectedLocalityInfo.multiplier}x</strong> vs city baseline
                </span>
              </div>
            )}
          </div>

          {/* BHK & Carpet Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bhk-button-group" className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
                Bedrooms (BHK)
              </label>
              <div id="bhk-button-group" className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((b) => {
                  const isActive = params.bhk === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleParamChange('bhk', b)}
                      className={`relative py-2.5 text-xs font-mono font-medium rounded-xl border transition-colors cursor-pointer z-0 ${
                        isActive
                          ? 'border-transparent text-white dark:text-[#111210] font-semibold'
                          : 'border-black/[0.08] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white hover:border-black/25'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="estimator-bhk-pill"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-[#111210] dark:bg-[#D9F935] -z-10"
                        />
                      )}
                      <span>{b}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="carpet-area-input" className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
                Carpet Area (sqft)
              </label>
              <input
                id="carpet-area-input"
                type="number"
                min="200"
                max="15000"
                step="50"
                value={params.area_sqft}
                onChange={(e) => handleParamChange('area_sqft', Math.max(100, Number(e.target.value)))}
                className="w-full text-sm font-mono border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
              />
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] mt-1 block">
                Typical range: 450 – 3,500 sqft
              </span>
            </div>
          </div>

          {/* Bathrooms & Furnishing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bathrooms-select" className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
                Bathrooms
              </label>
              <select
                id="bathrooms-select"
                value={params.bathrooms}
                onChange={(e) => handleParamChange('bathrooms', Number(e.target.value))}
                className="w-full text-sm border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Bathroom{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="furnishing-select" className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
                Furnishing Status
              </label>
              <select
                id="furnishing-select"
                value={params.furnishing}
                onChange={(e) => handleParamChange('furnishing', e.target.value as any)}
                className="w-full text-sm border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3.5 py-2.5 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
              >
                <option value="Unfurnished">Unfurnished (Baseline)</option>
                <option value="Semi-Furnished">Semi-Furnished (+5% adjustment)</option>
                <option value="Furnished">Fully Furnished (+12% adjustment)</option>
              </select>
            </div>
          </div>

          {/* Construction Stage */}
          <div>
            <label className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2">
              Construction Stage
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Ready to Move', 'Under Construction'] as const).map((s) => {
                const isActive = params.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleParamChange('status', s)}
                    className={`relative py-2.5 px-4 text-xs font-medium rounded-xl border transition-colors cursor-pointer text-center z-0 ${
                      isActive
                        ? 'border-transparent text-white dark:text-[#111210] font-semibold'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#111210] text-[#5E5E5A] dark:text-[#A3A39E] hover:border-black/25'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="estimator-status-pill"
                        transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-[#111210] dark:bg-[#D9F935] -z-10"
                      />
                    )}
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Right Result Showcase & Financing Simulator (5 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 space-y-5"
        >
          <div className="rounded-3xl bg-[#141513] text-white p-6 sm:p-8 border border-white/[0.08] shadow-[0_20px_50px_rgba(17,18,16,0.16)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1 text-[11px] font-medium tracking-[0.06em] uppercase text-[#E5E5DF]">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#D9F935]" />
              <span>Model Asking Price Estimate</span>
            </div>

            <motion.div
              key={lastEstimate.estimated_price_inr}
              initial={{ opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] text-white tabular-nums"
            >
              {formatInr(lastEstimate.estimated_price_inr)}
            </motion.div>
            <p className="text-xs text-[#9E9E98] font-mono tabular-nums mt-1">
              ₹{lastEstimate.estimated_price_inr.toLocaleString('en-IN')} INR
            </p>

            <div className="mt-6 pt-5 border-t border-white/[0.1] grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#9E9E98] block">Estimated Unit Rate</span>
                <span className="text-xl font-bold font-mono text-[#D9F935] tabular-nums mt-0.5 block">
                  ₹{formatNumber(lastEstimate.estimated_rate_per_sqft)}
                  <span className="text-xs font-normal text-[#9E9E98] font-sans ml-1">/ sqft</span>
                </span>
              </div>
              <div>
                <span className="text-xs text-[#9E9E98] block">Configuration</span>
                <span className="text-sm font-medium text-white mt-1 block truncate">
                  {lastEstimate.bhk} BHK · {lastEstimate.locality || lastEstimate.city}
                </span>
              </div>
            </div>

            {/* Expected Market Corridor */}
            <div className="mt-6 bg-white/[0.06] p-4 rounded-2xl border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#C6C6C0]">
                <span>Expected Market Corridor</span>
                <span className="font-mono text-[#D9F935] font-semibold tabular-nums">±{MODEL_TOLERANCE_PERCENT}% MAPE</span>
              </div>
              <div className="text-base font-bold font-mono text-white tabular-nums">
                {formatInr(lastEstimate.lower_bound_inr)} – {formatInr(lastEstimate.upper_bound_inr)}
              </div>
              <p className="text-[11px] text-[#9E9E98] leading-relaxed">
                Derived from cross-validated model errors. 68% of actual comparable listings sit inside this corridor.
              </p>
            </div>

            {/* Action to Screen Overpricing */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onNavigateToScreening}
                className="w-full bg-[#D9F935] hover:bg-[#cae92b] text-[#111210] font-semibold rounded-full p-1.5 pr-5 inline-flex items-center justify-between text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <CircleArrow className="w-8 h-8 bg-[#111210] text-[#D9F935]" iconClassName="w-4 h-4" />
                <span className="flex-1 text-center">Screen Seller&apos;s Asking Price</span>
              </button>
            </div>
          </div>

          {/* Interactive Financing & EMI Simulator */}
          <div className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMortgage(!showMortgage)}
              className="w-full p-5 flex items-center justify-between text-xs sm:text-sm font-medium text-[#111210] dark:text-white hover:bg-[#F4F3EF]/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#F4F3EF] dark:bg-white/[0.08] flex items-center justify-center">
                  <Coins className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
                </span>
                <span>Financing &amp; Monthly EMI Simulator</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${showMortgage ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showMortgage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4 text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[#5E5E5A] dark:text-[#9E9E98]">
                        <span>Down Payment ({downPaymentPercent}%):</span>
                        <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">
                          {formatInr(mortgageCalc.downPayment)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        className="w-full accent-[#111210] dark:accent-[#D9F935] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[#5E5E5A] dark:text-[#9E9E98]">
                        <span>Interest Rate:</span>
                        <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">
                          {interestRate}% p.a.
                        </span>
                      </div>
                      <input
                        type="range"
                        min="7.5"
                        max="11.5"
                        step="0.25"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full accent-[#111210] dark:accent-[#D9F935] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[#5E5E5A] dark:text-[#9E9E98]">
                        <span>Loan Tenure:</span>
                        <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">
                          {tenureYears} Years
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        value={tenureYears}
                        onChange={(e) => setTenureYears(Number(e.target.value))}
                        className="w-full accent-[#111210] dark:accent-[#D9F935] cursor-pointer"
                      />
                    </div>

                    <div className="bg-[#F4F3EF] dark:bg-[#111210] p-4 rounded-2xl grid grid-cols-2 gap-3 text-center">
                      <div>
                        <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Monthly Loan EMI</span>
                        <span className="text-base font-bold font-mono text-[#111210] dark:text-[#D9F935] tabular-nums">
                          ₹{formatNumber(mortgageCalc.emi)}
                          <span className="text-[10px] text-[#5E5E5A] dark:text-[#9E9E98] font-normal">/mo</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Est. Stamp Duty (6%)</span>
                        <span className="text-sm font-bold font-mono text-[#111210] dark:text-white tabular-nums">
                          {formatInr(mortgageCalc.estimatedGovtCharges)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Decision-Support Note */}
          <div className="rounded-3xl bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-5 text-xs text-[#5E5E5A] dark:text-[#9E9E98] space-y-2">
            <div className="flex items-center gap-2 font-medium text-[#111210] dark:text-white">
              <ShieldCheck className="w-4 h-4" />
              <span>Statistical Decision-Support Notice</span>
            </div>
            <p className="leading-relaxed">
              This estimate is computed from advertised listing values and does not replace municipal registrar circle rates or formal civil appraisals. Floor elevation, view, and builder reputation account for legitimate variations.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
