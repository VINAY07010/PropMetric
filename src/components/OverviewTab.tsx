import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnalyticsSummary, Property } from '../types';
import { formatInr, formatNumber, getLocalitiesForCity, MODEL_TOLERANCE_PERCENT, LOCALITIES_BY_CITY } from '../utils/calculator';

const TOTAL_LOCALITIES_COUNT = (LOCALITIES_BY_CITY.Pune?.length || 0) + (LOCALITIES_BY_CITY.Mumbai?.length || 0);
import {
  MapPin,
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TabKey } from './Navbar';
import type { ComparablesPreset } from '../App';
import { CircleArrow, CountUpNumber } from './AnimatedArrowBadge';

interface HeroDropdownOption {
  value: string;
  label: string;
}

interface HeroDropdownProps {
  label: string;
  value: string;
  options: HeroDropdownOption[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

const HeroDropdown: React.FC<HeroDropdownProps> = ({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}) => {
  const activeOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        className={`w-full flex items-center justify-between gap-2 text-xs sm:text-sm px-3.5 py-2.5 rounded-full transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/[0.14] text-white'
            : 'bg-transparent text-white hover:bg-white/[0.08]'
        }`}
      >
        <span className="truncate font-medium">{activeOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#B6B6B0] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#D9F935]' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 sm:min-w-[190px] top-full mt-2.5 rounded-2xl bg-white dark:bg-[#1E201C] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_18px_40px_rgba(17,18,16,0.22)] p-1.5 z-30"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-[13px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] font-semibold'
                      : 'text-[#111210] dark:text-[#E5E5DF] hover:bg-[#F4F3EF] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface OverviewTabProps {
  analytics: AnalyticsSummary;
  properties: Property[];
  onSelectLocalityForEstimation?: (city: 'Pune' | 'Mumbai', locality: string) => void;
  onNavigateToTab?: (tab: TabKey) => void;
  onBrowseListingsWithPreset?: (preset: Omit<ComparablesPreset, 'nonce'>) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  analytics,
  properties,
  onNavigateToTab,
  onBrowseListingsWithPreset,
}) => {
  // Hero quick search bar state
  const [heroSearch, setHeroSearch] = useState('');
  const [heroCity, setHeroCity] = useState<string>('All');
  const [heroBhk, setHeroBhk] = useState<string>('All');
  const [heroBudget, setHeroBudget] = useState<string>('All');
  const [openDropdown, setOpenDropdown] = useState<'city' | 'bhk' | 'budget' | null>(null);
  const heroDockRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (heroDockRef.current && !heroDockRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Localities explorer state
  const [localityCityTab, setLocalityCityTab] = useState<'Pune' | 'Mumbai'>('Pune');
  const [localitySearchText, setLocalitySearchText] = useState('');

  // Interactive BHK table filter state
  const [selectedCity, setSelectedCity] = useState<'All' | 'Pune' | 'Mumbai'>('All');
  const [selectedBhk, setSelectedBhk] = useState<number | 'All'>('All');

  const activeCityLocalities = useMemo(() => {
    const locs = getLocalitiesForCity(localityCityTab);
    if (!localitySearchText.trim()) return locs;
    const q = localitySearchText.toLowerCase();
    return locs.filter((l) => l.locality.toLowerCase().includes(q));
  }, [localityCityTab, localitySearchText]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (selectedCity !== 'All' && p.city !== selectedCity) return false;
      if (selectedBhk !== 'All' && p.bhk !== selectedBhk) return false;
      return true;
    });
  }, [properties, selectedCity, selectedBhk]);

  const metrics = useMemo(() => {
    const validPrices = filteredProperties.map((p) => p.price_inr).filter((p): p is number => p !== null && p > 0);
    const validRates = filteredProperties.map((p) => p.price_per_sqft).filter((r): r is number => r !== null && r > 0);

    const sortedPrices = [...validPrices].sort((a, b) => a - b);
    const sortedRates = [...validRates].sort((a, b) => a - b);

    const medianPrice = sortedPrices.length ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0;
    const medianRate = sortedRates.length ? sortedRates[Math.floor(sortedRates.length / 2)] : 0;
    const meanRate = sortedRates.length ? Math.round(sortedRates.reduce((a, b) => a + b, 0) / sortedRates.length) : 0;

    return {
      count: filteredProperties.length,
      medianPrice,
      medianRate,
      meanRate,
    };
  }, [filteredProperties]);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onBrowseListingsWithPreset) {
      onBrowseListingsWithPreset({
        city: heroCity,
        bhk: heroBhk === 'All' ? 'All' : Number(heroBhk),
        search: heroSearch.trim(),
        budgetTier: heroBudget,
      });
    } else if (onNavigateToTab) {
      onNavigateToTab('comparables');
    }
  };

  const processSteps = [
    {
      step: 'STEP 01',
      title: 'Zero-Leakage Ingestion',
      desc: '2,043 scraped records audited; 244 non-residential or corrupted rows excluded with full row reconciliation.',
    },
    {
      step: 'STEP 02',
      title: 'Hedonic Calibration',
      desc: `Calibrated across ${TOTAL_LOCALITIES_COUNT} Mumbai & Pune localities accounting for carpet area, BHK, bathrooms, furnishing, and status.`,
    },
    {
      step: 'STEP 03',
      title: 'Overpricing Screening',
      desc: `Evaluates asking prices against an empirical ±${MODEL_TOLERANCE_PERCENT}% Median APE validation corridor derived from held-out tests.`,
    },
    {
      step: 'STEP 04',
      title: 'Grounded Advisory',
      desc: 'Matches verified comparable records and computes data-backed counter-offer ranges without speculation.',
    },
  ];

  const marqueeCorridors: Array<{ name: string; city: 'Pune' | 'Mumbai' }> = [
    { name: 'Kharadi', city: 'Pune' },
    { name: 'Bandra West', city: 'Mumbai' },
    { name: 'Hinjawadi', city: 'Pune' },
    { name: 'Worli', city: 'Mumbai' },
    { name: 'Baner', city: 'Pune' },
    { name: 'Andheri West', city: 'Mumbai' },
    { name: 'Balewadi', city: 'Pune' },
    { name: 'Powai', city: 'Mumbai' },
    { name: 'Wakad', city: 'Pune' },
    { name: 'Lower Parel', city: 'Mumbai' },
    { name: 'Hadapsar', city: 'Pune' },
    { name: 'Goregaon East', city: 'Mumbai' },
  ];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. Hestora-Style Architectural Hero Container */}
      <section className="relative rounded-[28px] bg-[#141513] text-white p-6 sm:p-10 lg:p-14 shadow-[0_24px_60px_rgba(17,18,16,0.14)]">
        {/* Subtle Architectural Grid & Soft Atmospheric Light (overflow-hidden so dropdowns stay unclipped) */}
        <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 82% 22%, rgba(217, 249, 53, 0.14), transparent 44%), radial-gradient(circle at 18% 82%, rgba(255, 255, 255, 0.06), transparent 45%)',
            }}
          />
          <svg
            aria-hidden="true"
            className="absolute right-0 top-0 h-full w-1/2 opacity-[0.06]"
            viewBox="0 0 600 500"
            fill="none"
          >
            <path d="M120 500V160L280 90V500" stroke="white" strokeWidth="1.5" />
            <path d="M280 500V40L460 110V500" stroke="white" strokeWidth="1.5" />
            <path d="M460 500V190L580 150V500" stroke="white" strokeWidth="1.5" />
            <line x1="60" y1="320" x2="580" y2="320" stroke="white" strokeWidth="1" />
            <line x1="60" y1="220" x2="580" y2="220" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative z-20 space-y-10">
          {/* Hero Top Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8 space-y-5"
            >
              {/* Kicker Badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] border border-white/[0.14] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.08em] uppercase text-[#E5E5DF]"
              >
                <span className="w-1.5 h-1.5 rounded-[2px] bg-[#D9F935]" />
                <span>Mumbai &amp; Pune Property Intelligence</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="font-display font-medium tracking-[-0.035em] leading-[1.04] text-white max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4rem)', textWrap: 'balance' }}
              >
                Empirical clarity for residential pricing.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm sm:text-base text-[#B6B6B0] max-w-xl leading-relaxed"
              >
                Analyze {formatNumber(properties.length)} verified listings across {TOTAL_LOCALITIES_COUNT} Mumbai &amp; Pune micro-markets. Model asking baselines via hedonic regression and screen overpricing against a ±{MODEL_TOLERANCE_PERCENT}% validation corridor.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3 pt-1"
              >
                <button
                  type="button"
                  onClick={() => onNavigateToTab && onNavigateToTab('estimate')}
                  className="inline-flex items-center gap-2.5 bg-[#D9F935] hover:bg-[#cae92b] text-[#111210] rounded-full p-1 pr-5 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer group"
                >
                  <CircleArrow className="w-8 h-8 bg-[#111210] text-[#D9F935]" iconClassName="w-4 h-4" />
                  <span>Estimate Property Value</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToTab && onNavigateToTab('screen')}
                  className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.14] text-white rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Screen Asking Price</span>
                </button>
              </motion.div>
            </motion.div>

            {/* Right Floating Glass Analyst Card (Hestora Hero Card Motif) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-4 lg:flex lg:justify-end"
            >
              <motion.button
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onNavigateToTab && onNavigateToTab('assistant')}
                className="w-full max-w-[340px] text-left bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-md border border-white/[0.16] hover:border-white/[0.28] rounded-2xl p-5 transition-colors duration-200 cursor-pointer group shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-white">
                    <span className="w-2 h-2 rounded-full bg-[#D9F935]" />
                    Ask AI Analyst
                  </span>
                  <CircleArrow className="w-7 h-7 bg-white/[0.1] text-[#D9F935]" iconClassName="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-[#C6C6C0] leading-relaxed mb-4">
                  Evaluate counter-offer targets, inspect verified comparables, or ask due diligence questions grounded in real data.
                </p>
                <div className="pt-3 border-t border-white/[0.12] flex items-center justify-between text-[11px] font-mono text-[#E5E5E0] tabular-nums">
                  <span>{formatNumber(properties.length)} listings</span>
                  <span>{TOTAL_LOCALITIES_COUNT} localities</span>
                  <span className="text-[#D9F935]">±{MODEL_TOLERANCE_PERCENT}% Band</span>
                </div>
              </motion.button>
            </motion.div>
          </div>

          {/* Bottom Glass Search & Custom Animated Filter Dock */}
          <motion.form
            ref={heroDockRef}
            onSubmit={handleHeroSearchSubmit}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/[0.09] backdrop-blur-md border border-white/[0.15] rounded-2xl lg:rounded-full p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-[#5E5E5A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search locality or society (e.g. Kharadi, Bandra)..."
                aria-label="Search locality or society"
                className="w-full bg-white text-[#111210] placeholder:text-[#787872] text-xs sm:text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D9F935] transition-shadow"
              />
            </div>

            <div className="lg:col-span-2">
              <HeroDropdown
                label="Select City"
                value={heroCity}
                isOpen={openDropdown === 'city'}
                onToggle={() => setOpenDropdown((prev) => (prev === 'city' ? null : 'city'))}
                onSelect={(val) => {
                  setHeroCity(val);
                  setOpenDropdown(null);
                }}
                options={[
                  { value: 'All', label: 'All Cities' },
                  { value: 'Pune', label: 'Pune' },
                  { value: 'Mumbai', label: 'Mumbai' },
                ]}
              />
            </div>

            <div className="lg:col-span-2">
              <HeroDropdown
                label="Select BHK"
                value={heroBhk}
                isOpen={openDropdown === 'bhk'}
                onToggle={() => setOpenDropdown((prev) => (prev === 'bhk' ? null : 'bhk'))}
                onSelect={(val) => {
                  setHeroBhk(val);
                  setOpenDropdown(null);
                }}
                options={[
                  { value: 'All', label: 'All BHK' },
                  { value: '1', label: '1 BHK' },
                  { value: '2', label: '2 BHK' },
                  { value: '3', label: '3 BHK' },
                  { value: '4', label: '4 BHK' },
                ]}
              />
            </div>

            <div className="lg:col-span-2">
              <HeroDropdown
                label="Select Budget Range"
                value={heroBudget}
                isOpen={openDropdown === 'budget'}
                onToggle={() => setOpenDropdown((prev) => (prev === 'budget' ? null : 'budget'))}
                onSelect={(val) => {
                  setHeroBudget(val);
                  setOpenDropdown(null);
                }}
                options={[
                  { value: 'All', label: 'Any Price Range' },
                  { value: 'sub_75l', label: 'Under ₹75 Lakh' },
                  { value: '75l_15cr', label: '₹75L – ₹1.5 Cr' },
                  { value: '15cr_3cr', label: '₹1.5 Cr – ₹3 Cr' },
                  { value: 'above_3cr', label: '₹3 Cr+' },
                ]}
              />
            </div>

            <div className="lg:col-span-2 sm:col-span-2">
              <button
                type="submit"
                className="w-full bg-white hover:bg-[#F4F3EF] text-[#111210] rounded-full p-1 pr-4 inline-flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <CircleArrow className="w-8 h-8 bg-[#111210] text-white" />
                <span className="flex-1 text-center">All properties</span>
              </button>
            </div>
          </motion.form>
        </div>
      </section>

      {/* Subtle Verified Micro-Markets Marquee Strip (Hestora Ticker Band) */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 py-2 border-b border-black/[0.06] dark:border-white/[0.07]">
        <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] shrink-0 md:max-w-[230px] leading-snug font-medium">
          Empirical coverage across high-velocity Mumbai &amp; Pune corridors
        </p>

        <div className="relative flex-1 overflow-hidden marquee-mask">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white dark:from-[#0E0F0D] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white dark:from-[#0E0F0D] to-transparent z-10" />
          <div className="animate-propmetric-marquee items-center gap-8 py-1.5">
            {[...marqueeCorridors, ...marqueeCorridors].map((corridor, idx) => (
              <button
                key={`${corridor.name}-${idx}`}
                type="button"
                onClick={() =>
                  onBrowseListingsWithPreset &&
                  onBrowseListingsWithPreset({
                    city: corridor.city,
                    locality: corridor.name,
                    bhk: 'All',
                  })
                }
                className="inline-flex items-center gap-2 text-sm font-display font-medium text-[#787872] dark:text-[#7F7F79] hover:text-[#111210] dark:hover:text-[#D9F935] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9F935] opacity-80" />
                <span>{corridor.name}</span>
                <span className="text-[11px] font-mono opacity-60">{corridor.city}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. How PropMetric Works — 4-Step Hestora Grid */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8 pt-2"
      >
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#171815] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF]">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
            <span>How We Work</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] text-2xl sm:text-4xl text-[#111210] dark:text-white leading-[1.12]">
            Clear analytical process for residential valuation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {processSteps.map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.38, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-white dark:bg-[#171815] border border-black/[0.07] dark:border-white/[0.08] p-6 flex flex-col justify-between min-h-[210px] hover:border-black/25 dark:hover:border-[#D9F935]/35 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(17,18,16,0.06)] transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <span className="bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] text-[10px] font-mono font-semibold tracking-wider px-3 py-1 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-[1.03]">
                  {item.step}
                </span>
                <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.1] group-hover:bg-black/25 dark:group-hover:bg-[#D9F935]/40 transition-colors duration-300" />
              </div>

              <div className="space-y-2 mt-10">
                <h3 className="font-display font-medium text-lg text-[#111210] dark:text-white tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-[#5E5E5A] dark:text-[#9E9E98] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 3. Dark Proven Stats Section (Hestora Dark Showcase Motif) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[28px] bg-[#141513] text-white p-6 sm:p-10 lg:p-12 border border-white/[0.06]"
      >
        <div className="text-center space-y-3 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#E5E5DF]">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#D9F935]" />
            <span>Our Proven Metrics</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] text-2xl sm:text-4xl text-white">
            Providing clarity, every metric verified
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.38, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] tabular-nums text-white">
              <CountUpNumber value={properties.length} />
            </div>
            <div className="h-px bg-white/[0.1]" />
            <div>
              <div className="text-sm font-medium text-white">Verified Residential Units</div>
              <p className="text-xs text-[#9E9E98] mt-1 leading-relaxed">
                244 non-residential and malformed entries audited and excluded cleanly.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.38, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] tabular-nums text-white">
              <CountUpNumber value={analytics.pune_rate_per_sqft.median} prefix="₹" />
            </div>
            <div className="h-px bg-white/[0.1]" />
            <div>
              <div className="text-sm font-medium text-white">Pune Median Rate / sqft</div>
              <p className="text-xs text-[#9E9E98] mt-1 leading-relaxed">
                Median flat price {formatInr(analytics.pune_properties.median)} across {analytics.pune_properties.count} units.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.38, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] tabular-nums text-white">
              <CountUpNumber value={analytics.mumbai_rate_per_sqft.median} prefix="₹" />
            </div>
            <div className="h-px bg-white/[0.1]" />
            <div>
              <div className="text-sm font-medium text-white">Mumbai Median Rate / sqft</div>
              <p className="text-xs text-[#9E9E98] mt-1 leading-relaxed">
                Median flat price {formatInr(analytics.mumbai_properties.median)} across {analytics.mumbai_properties.count} units.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.38, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.03em] tabular-nums text-[#D9F935]">
              <CountUpNumber
                value={analytics.model_meta.tolerance_band_percent}
                decimals={1}
                prefix="±"
                suffix="%"
              />
            </div>
            <div className="h-px bg-white/[0.1]" />
            <div>
              <div className="text-sm font-medium text-white">Validation Tolerance (MAPE)</div>
              <p className="text-xs text-[#9E9E98] mt-1 leading-relaxed">
                Derived empirically from 360 unseen held-out residential test listings.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* 4. Asymmetric Metro Comparison (About Hestora Editorial Rhythm) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-sm text-[#111210] dark:text-[#E5E5DF] font-medium leading-relaxed">
              Mumbai asking rates command 2.67x higher price density than Pune. Compare both metro benchmarks side by side.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('screen')}
              className="inline-flex items-center gap-2.5 bg-[#111210] dark:bg-[#D9F935] hover:bg-[#232520] dark:hover:bg-[#cae92b] text-white dark:text-[#111210] rounded-full p-1 pr-5 text-xs font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer group"
            >
              <CircleArrow className="w-7 h-7 bg-[#D9F935] dark:bg-[#111210] text-[#111210] dark:text-[#D9F935]" />
              <span>Compare in Overpricing Screener</span>
            </button>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#171815] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF]">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
              <span>Metro Comparison</span>
            </div>
            <h2 className="font-display font-medium tracking-[-0.03em] text-2xl sm:text-4xl text-[#111210] dark:text-white leading-[1.1]">
              Two distinct urban property cycles, framed with{' '}
              <span className="text-[#C7C7C0] dark:text-[#5B5B55]">clarity.</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pune Card */}
          <div className="rounded-3xl bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(17,18,16,0.06)] transition-all duration-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-medium text-xl text-[#111210] dark:text-white">
                  Pune Residential Profile
                </h3>
                <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                  {analytics.pune_properties.count} verified listings
                </span>
              </div>
              <span className="text-xs font-medium text-[#111210] dark:text-[#D9F935]">
                IT Corridors &amp; High Affordability
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white dark:bg-[#1E201C] p-4 border border-black/[0.05] dark:border-white/[0.06]">
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Median Asking Price</span>
                <span className="text-xl font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-1 block">
                  {formatInr(analytics.pune_properties.median)}
                </span>
              </div>
              <div className="rounded-2xl bg-white dark:bg-[#1E201C] p-4 border border-black/[0.05] dark:border-white/[0.06]">
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Median Rate / sqft</span>
                <span className="text-xl font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-1 block">
                  ₹{formatNumber(analytics.pune_rate_per_sqft.median)}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#A3A39E] leading-relaxed">
              Primary inventory concentrates in <strong className="text-[#111210] dark:text-white font-medium">Kharadi, Hinjawadi, Baner, Wakad, Balewadi, and Hadapsar</strong>. Asking rates cluster tightly around ₹9,500 – ₹15,000/sqft with larger carpet sizes.
            </p>
          </div>

          {/* Mumbai Card */}
          <div className="rounded-3xl bg-[#141513] text-white border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(17,18,16,0.22)] transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-medium text-xl text-white">
                  Mumbai Residential Profile
                </h3>
                <span className="text-xs text-[#9E9E98] font-mono tabular-nums">
                  {analytics.mumbai_properties.count} verified listings
                </span>
              </div>
              <span className="text-xs font-medium text-[#D9F935]">
                Island City &amp; Western Suburbs
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/[0.06] p-4 border border-white/[0.08]">
                <span className="text-[11px] text-[#A3A39E] block">Median Asking Price</span>
                <span className="text-xl font-bold font-mono text-white tabular-nums mt-1 block">
                  {formatInr(analytics.mumbai_properties.median)}
                </span>
              </div>
              <div className="rounded-2xl bg-white/[0.06] p-4 border border-white/[0.08]">
                <span className="text-[11px] text-[#A3A39E] block">Median Rate / sqft</span>
                <span className="text-xl font-bold font-mono text-[#D9F935] tabular-nums mt-1 block">
                  ₹{formatNumber(analytics.mumbai_rate_per_sqft.median)}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#B6B6B0] leading-relaxed">
              Asking rates in Mumbai exhibit <strong className="text-white font-medium">2.67x higher density</strong> than Pune, spanning Western Suburbs (Andheri, Malad, Borivali ~₹28k–42k/sqft) to prime South Mumbai &amp; Worli (~₹65k–100k+/sqft).
            </p>
          </div>
        </div>
      </motion.section>

      {/* 5. Verified Micro-Market Localities ("Browse by area" Warm Stone Section) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.05] dark:border-white/[0.08] p-6 sm:p-10 space-y-8"
      >
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1F211C] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF]">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
            <span>Search Micro-Markets</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] text-2xl sm:text-4xl text-[#111210] dark:text-white">
            Browse by locality
          </h2>
          <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98]">
            Empirical rate per square foot and median asking prices computed directly from verified dataset listings. Click any submarket to inspect properties.
          </p>

          {/* City Segmented Switch (with Hestora spring slider) & Search Input */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex p-1 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1]">
              {(['Pune', 'Mumbai'] as const).map((c) => {
                const isActive = localityCityTab === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLocalityCityTab(c)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap z-0 ${
                      isActive
                        ? 'text-white dark:text-[#111210] font-semibold'
                        : 'text-[#5E5E5A] dark:text-[#A3A39E] hover:text-[#111210] dark:hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="overview-locality-city-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[#111210] dark:bg-[#D9F935] -z-10"
                      />
                    )}
                    <span>{c} ({getLocalitiesForCity(c).length})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#787872] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter locality name..."
                value={localitySearchText}
                onChange={(e) => setLocalitySearchText(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1] rounded-full pl-9 pr-4 py-2 text-[#111210] dark:text-white placeholder:text-[#8C8C86] focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
              />
            </div>
          </div>
        </div>

        {/* Locality Cards Grid (Signature Hestora Obsidian-Invert Card Hover) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={localityCityTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
          >
            {activeCityLocalities.slice(0, 15).map((loc, idx) => {
              const diffVsCity = Math.round((loc.multiplier - 1) * 100);
              return (
                <motion.button
                  key={loc.locality}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2), ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    if (onBrowseListingsWithPreset) {
                      onBrowseListingsWithPreset({
                        city: loc.city,
                        locality: loc.locality,
                        bhk: 'All',
                      });
                    }
                  }}
                  className="text-left bg-white dark:bg-[#1E201C] hover:bg-[#141513] dark:hover:bg-[#242620] border border-black/[0.05] dark:border-white/[0.08] hover:border-[#141513] dark:hover:border-[#D9F935]/55 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F3EF] dark:bg-white/[0.06] group-hover:bg-white/[0.1] flex flex-col items-center justify-center shrink-0 transition-colors duration-300">
                      <MapPin className="w-4 h-4 text-[#111210] dark:text-[#D9F935] group-hover:text-[#D9F935] transition-colors duration-300" />
                      <span className="text-[10px] font-mono font-semibold text-[#5E5E5A] dark:text-[#9E9E98] group-hover:text-[#E5E5DF] mt-0.5 tabular-nums transition-colors duration-300">
                        {loc.count}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="font-display font-medium text-sm text-[#111210] dark:text-white group-hover:text-white truncate transition-colors duration-300">
                        {loc.locality}
                      </div>
                      <div className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] group-hover:text-[#A3A39E] font-mono tabular-nums mt-0.5 flex items-center gap-1.5 transition-colors duration-300">
                        <span className="font-semibold text-[#111210] dark:text-[#E5E5DF] group-hover:text-[#D9F935] transition-colors duration-300">
                          ₹{formatNumber(loc.median_rate_sqft)}/sqft
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{diffVsCity >= 0 ? `+${diffVsCity}%` : `${diffVsCity}%`} vs city</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#8C8C86] group-hover:text-[#D9F935] group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {activeCityLocalities.length > 15 && (
          <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] text-center">
            Showing top 15 of {activeCityLocalities.length} {localityCityTab} micro-markets. Filter above to inspect all localities.
          </p>
        )}
      </motion.section>

      {/* 6. Inventory Distribution by Bedroom Configuration (BHK) */}
      <section className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.07] dark:border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#5E5E5A] dark:text-[#9E9E98] mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Inventory Breakdown</span>
            </div>
            <h2 className="font-display font-medium text-xl sm:text-2xl tracking-[-0.02em] text-[#111210] dark:text-white">
              Distribution by Bedroom Configuration (BHK)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="overview-city-filter-bhk" className="text-xs text-[#5E5E5A] dark:text-[#9E9E98]">
                City
              </label>
              <select
                id="overview-city-filter-bhk"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value as any)}
                className="text-xs bg-[#F4F3EF] dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1] rounded-full px-3.5 py-2 text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
              >
                <option value="All">All Cities</option>
                <option value="Pune">Pune Only</option>
                <option value="Mumbai">Mumbai Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="overview-bhk-select" className="text-xs text-[#5E5E5A] dark:text-[#9E9E98]">
                BHK
              </label>
              <select
                id="overview-bhk-select"
                value={selectedBhk === 'All' ? 'All' : String(selectedBhk)}
                onChange={(e) => setSelectedBhk(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                className="text-xs bg-[#F4F3EF] dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1] rounded-full px-3.5 py-2 text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935] cursor-pointer"
              >
                <option value="All">All BHK</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-4">
            <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] block">Selected Listings</span>
            <p className="text-2xl font-display font-medium font-mono text-[#111210] dark:text-white tabular-nums mt-1">
              {metrics.count}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-4">
            <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] block">Median Asking Price</span>
            <p className="text-2xl font-display font-medium font-mono text-[#111210] dark:text-white tabular-nums mt-1">
              {formatInr(metrics.medianPrice)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-4">
            <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] block">Median Rate / sqft</span>
            <p className="text-2xl font-display font-medium font-mono text-[#111210] dark:text-white tabular-nums mt-1">
              ₹{formatNumber(metrics.medianRate)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-4">
            <span className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] block">Mean Rate / sqft</span>
            <p className="text-2xl font-display font-medium font-mono text-[#111210] dark:text-white tabular-nums mt-1">
              ₹{formatNumber(metrics.meanRate)}
            </p>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/[0.08] text-[#5E5E5A] dark:text-[#9E9E98] font-medium">
                <th className="py-3 px-4">Configuration</th>
                <th className="py-3 px-4 text-right">Mumbai Listings</th>
                <th className="py-3 px-4 text-right">Pune Listings</th>
                <th className="py-3 px-4 text-right">Combined Total</th>
                <th className="py-3 px-4">Share of Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06] font-mono tabular-nums">
              {[1, 2, 3, 4, 5].map((bhk) => {
                const mumCount = properties.filter((p) => p.city === 'Mumbai' && p.bhk === bhk).length;
                const puneCount = properties.filter((p) => p.city === 'Pune' && p.bhk === bhk).length;
                const total = mumCount + puneCount;
                const pct = ((total / properties.length) * 100).toFixed(1);

                return (
                  <tr key={bhk} className="hover:bg-[#F4F3EF]/60 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-[#111210] dark:text-white">{bhk} BHK</td>
                    <td className="py-3.5 px-4 text-right text-[#5E5E5A] dark:text-[#C6C6C0]">{mumCount}</td>
                    <td className="py-3.5 px-4 text-right text-[#5E5E5A] dark:text-[#C6C6C0]">{puneCount}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#111210] dark:text-white">{total}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-[#E6E5E0] dark:bg-white/[0.1] h-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.6, delay: bhk * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-[#111210] dark:bg-[#D9F935] h-full rounded-full"
                          />
                        </div>
                        <span className="text-[#5E5E5A] dark:text-[#9E9E98]">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
