import React, { useState, useMemo, useEffect } from 'react';
import { Property, EstimationResult, OverpricingVerdict } from '../types';
import {
  calculateEstimate,
  evaluateOverpricing,
  formatInr,
  formatNumber,
  cleanListingUrl,
  MODEL_TOLERANCE_PERCENT,
} from '../utils/calculator';
import {
  X,
  MapPin,
  Building,
  Scale,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleArrow } from './AnimatedArrowBadge';

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
  onAskAiToExplain: (context: any) => void;
  onRunScreenerTab: (estimate: EstimationResult, askingPrice: number) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  onAskAiToExplain,
  onRunScreenerTab,
}) => {
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [showQuickAI, setShowQuickAI] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!property) return null;

  const directUrl = cleanListingUrl(property.listing_url);

  // Run model estimation on this specific listing
  const modelEstimate: EstimationResult = useMemo(() => {
    return calculateEstimate({
      city: property.city === 'Mumbai' ? 'Mumbai' : 'Pune',
      locality: property.locality,
      bhk: property.bhk || 2,
      area_sqft: property.area_sqft || 950,
      bathrooms: property.bathrooms || Math.max(1, Math.min(property.bhk || 2, 5)),
      furnishing: (property.furnishing as any) || 'Unfurnished',
      status: (property.status as any) || 'Ready to Move',
    });
  }, [property]);

  // Evaluate overpricing verdict
  const verdict: OverpricingVerdict = useMemo(() => {
    const askingPrice = property.price_inr || modelEstimate.estimated_price_inr;
    return evaluateOverpricing(askingPrice, modelEstimate);
  }, [property, modelEstimate]);

  const askingPrice = property.price_inr || 0;

  const tol = MODEL_TOLERANCE_PERCENT;
  const tol2 = Number((tol * 2).toFixed(1));
  const markerLeftPercent = (() => {
    const pct = verdict.difference_percent;
    if (pct <= -tol) {
      return Math.max(3, Math.min(20, ((pct + 30) / Math.max(1, 30 - tol)) * 20));
    }
    if (pct <= tol) {
      return 20 + ((pct + tol) / (tol * 2)) * 40;
    }
    if (pct <= tol2) {
      return 60 + ((pct - tol) / tol) * 25;
    }
    return Math.min(97, 85 + ((pct - tol2) / 20) * 15);
  })();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'low':
        return 'text-blue-900 dark:text-blue-200 bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60';
      case 'fair':
        return 'text-emerald-950 dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
      case 'moderate':
        return 'text-amber-950 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
      case 'high':
        return 'text-rose-950 dark:text-rose-200 bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60';
      default:
        return 'text-[#111210] dark:text-white bg-[#F4F3EF] dark:bg-[#111210] border-black/[0.08] dark:border-white/[0.1]';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'low':
      case 'fair':
        return <CheckCircle className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />;
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />;
      case 'high':
        return <ShieldAlert className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" />;
      default:
        return <HelpCircle className="w-5 h-5 text-[#5E5E5A] shrink-0" />;
    }
  };

  const handleAskAssistant = () => {
    onAskAiToExplain({
      property_id: property.id,
      id: property.id,
      title: property.title,
      society: property.society,
      locality: property.locality,
      city: property.city,
      bhk: property.bhk,
      bathrooms: property.bathrooms,
      area_sqft: property.area_sqft,
      furnishing: property.furnishing,
      status: property.status,
      price_inr: property.price_inr,
      seller_asking_price: property.price_inr,
      price_per_sqft: property.price_per_sqft,
      estimated_price_inr: modelEstimate.estimated_price_inr,
      estimated_rate_per_sqft: modelEstimate.estimated_rate_per_sqft,
      difference_inr: verdict.difference_inr,
      difference_percent: verdict.difference_percent,
      tolerance_band_percent: MODEL_TOLERANCE_PERCENT,
      verdict: verdict.verdict,
      risk_tier: verdict.risk_tier,
      listing_url: directUrl,
    });
    onClose();
  };

  const handleDeepScreen = () => {
    onRunScreenerTab(modelEstimate, property.price_inr || modelEstimate.estimated_price_inr);
    onClose();
  };

  const handleCopyDossier = () => {
    const text = `PROPMETRIC VALUATION DOSSIER
Property ID: ${property.id}
Title: ${property.title}
Society: ${property.society || 'Standalone'}
Location: ${property.locality}, ${property.city}
Specs: ${property.bhk} BHK • ${property.bathrooms || property.bhk} Baths • ${property.area_sqft} sqft • ${property.furnishing} • ${property.status}
Listed Asking Price: ${formatInr(property.price_inr)} (₹${formatNumber(property.price_per_sqft || 0)}/sqft)
PropMetric Hedonic Estimate: ${formatInr(modelEstimate.estimated_price_inr)} (₹${formatNumber(modelEstimate.estimated_rate_per_sqft)}/sqft)
Variance: ${verdict.difference_percent >= 0 ? '+' : ''}${verdict.difference_percent}% (${formatInr(verdict.difference_inr)})
Screening Verdict: ${verdict.verdict}
Validation Band: ±${MODEL_TOLERANCE_PERCENT}% MAPE (${formatInr(modelEstimate.lower_bound_inr)} – ${formatInr(modelEstimate.upper_bound_inr)})
Live Listing: ${directUrl}`;

    navigator.clipboard.writeText(text);
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#171815] rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] w-full max-w-4xl my-auto max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#141513]">
          <div className="flex items-center gap-2 text-xs text-[#5E5E5A] dark:text-[#9E9E98] truncate">
            <span className="font-mono font-semibold text-[#111210] dark:text-[#D9F935] bg-white dark:bg-white/[0.08] px-2.5 py-1 rounded-full border border-black/[0.06] dark:border-white/[0.1]">
              {property.id}
            </span>
            <span className="font-medium text-[#111210] dark:text-white flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#5E5E5A] dark:text-[#D9F935] shrink-0" />
              <span className="truncate">
                {property.locality ? `${property.locality}, ${property.city}` : property.city}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Dossier Button */}
            <button
              type="button"
              onClick={handleCopyDossier}
              className="inline-flex items-center gap-1.5 text-xs text-[#111210] dark:text-white bg-white dark:bg-[#1E201C] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.12] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              title="Copy valuation brief"
            >
              {copiedDossier ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#D9F935]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDossier ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Direct Link to Source URL */}
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111210] bg-[#D9F935] hover:bg-[#cae92b] px-3.5 py-1.5 rounded-full transition-colors"
            >
              <span>Magicbricks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-[#5E5E5A] hover:text-[#111210] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
          {/* Title & Basic Specs */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-mono font-semibold px-3 py-1 bg-[#111210] dark:bg-white/[0.1] text-white rounded-full">
                {property.bhk} BHK Residential
              </span>
              <span className="text-xs font-medium px-3 py-1 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-[#E5E5DF] rounded-full">
                {property.status}
              </span>
              <span className="text-xs font-medium px-3 py-1 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-[#E5E5DF] rounded-full">
                {property.furnishing}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-medium text-[#111210] dark:text-white leading-snug tracking-[-0.02em]">
              {property.title}
            </h2>
            <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] mt-1.5 flex items-center gap-1.5">
              <Building className="w-4 h-4 shrink-0" />
              <span>
                Society / Project: <strong className="text-[#111210] dark:text-white">{property.society || 'Standalone Property'}</strong>
              </span>
            </p>
          </div>

          {/* Pricing & Specification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F3EF] dark:bg-[#111210] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] uppercase font-medium block">
                Listed Asking Price
              </span>
              <span className="text-xl font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                {formatInr(askingPrice)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] uppercase font-medium block">
                Asking Rate / sqft
              </span>
              <span className="text-xl font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                {property.price_per_sqft ? `₹${formatNumber(property.price_per_sqft)}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] uppercase font-medium block">
                Carpet Area
              </span>
              <span className="text-base font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-1 block">
                {property.area_sqft ? `${formatNumber(property.area_sqft)} sqft` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] uppercase font-medium block">
                Bedrooms / Baths
              </span>
              <span className="text-base font-bold text-[#111210] dark:text-white mt-1 block">
                {property.bhk} BHK · {property.bathrooms || property.bhk} Bath
              </span>
            </div>
          </div>

          {/* Comprehensive Overpricing Screening & Insights Section */}
          <div className="border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 space-y-5 bg-white dark:bg-[#171815]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.07] dark:border-white/[0.08] gap-2">
              <div>
                <h3 className="font-display text-base font-medium text-[#111210] dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
                  <span>Listing Overpricing Screening &amp; Value Analysis</span>
                </h3>
                <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] mt-0.5">
                  Calibrated against hedonic regression benchmark for {property.locality || property.city}
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-[#111210] dark:text-[#D9F935] bg-[#F4F3EF] dark:bg-[#111210] px-3 py-1 rounded-full self-start sm:self-auto tabular-nums">
                Tolerance: ±{MODEL_TOLERANCE_PERCENT}% MAPE
              </span>
            </div>

            {/* Verdict Card */}
            <div className={`p-5 rounded-2xl border ${getTierColor(verdict.risk_tier)}`}>
              <div className="flex items-start gap-3">
                {getTierIcon(verdict.risk_tier)}
                <div className="flex-1">
                  <span className="text-[11px] uppercase font-semibold tracking-wider opacity-75 block">
                    Valuation Status Verdict
                  </span>
                  <h4 className="font-display text-lg font-medium mt-0.5">{verdict.verdict}</h4>
                  <p className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90">
                    Seller asking price is{' '}
                    <strong className="font-mono tabular-nums">
                      {verdict.difference_percent >= 0 ? '+' : ''}
                      {verdict.difference_percent}%
                    </strong>{' '}
                    ({formatInr(verdict.difference_inr)}) relative to our hedonic model estimate of{' '}
                    <strong className="font-mono tabular-nums">{formatInr(modelEstimate.estimated_price_inr)}</strong> (~₹
                    {formatNumber(modelEstimate.estimated_rate_per_sqft)}/sqft).
                  </p>
                </div>
              </div>
            </div>

            {/* Quantitative Visual Corridor Meter */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                <span>Value Bargain</span>
                <span>Model Baseline: {formatInr(modelEstimate.estimated_price_inr)}</span>
                <span>Premium Markup</span>
              </div>
              <div className="relative py-1">
                <div className="relative w-full h-3.5 bg-[#F4F3EF] dark:bg-[#111210] rounded-full overflow-hidden flex border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="h-full bg-blue-200/80 dark:bg-blue-900/50" style={{ width: '20%' }} title={`Below Model Estimate (< -${tol}%)`} />
                  <div
                    className="h-full bg-emerald-300/80 dark:bg-emerald-800/70 border-x border-emerald-500/60"
                    style={{ width: '40%' }}
                    title={`Within Expected Range (±${tol}%)`}
                  />
                  <div className="h-full bg-amber-200/80 dark:bg-amber-800/50" style={{ width: '25%' }} title={`Review Suggested (+${tol}% to +${tol2}%)`} />
                  <div className="h-full bg-rose-200/80 dark:bg-rose-800/50" style={{ width: '15%' }} title={`Significantly Above (> +${tol2}%)`} />
                </div>
                <motion.div
                  aria-label="Current listing variance position"
                  initial={{ left: '50%' }}
                  animate={{ left: `${markerLeftPercent}%` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#111210] dark:bg-[#D9F935] border-2 border-white dark:border-[#111210] shadow-md pointer-events-none"
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                <span>Lower Band: {formatInr(modelEstimate.lower_bound_inr)}</span>
                <span>Upper Band: {formatInr(modelEstimate.upper_bound_inr)}</span>
              </div>
            </div>

            {/* Micro-Market & Overpricing Insights */}
            <div className="bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl p-4 space-y-3 text-xs">
              <span className="font-medium text-[#111210] dark:text-white uppercase tracking-wider text-[11px] block">
                Detailed Pricing Insights for Buyers &amp; Agents
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171815] p-4 rounded-2xl">
                  <span className="text-[#5E5E5A] dark:text-[#9E9E98] block text-[11px]">Locality Submarket Rate</span>
                  <p className="text-[#111210] dark:text-white mt-1 leading-relaxed">
                    Listed at <strong>₹{formatNumber(property.price_per_sqft || 0)}/sqft</strong> in{' '}
                    {property.locality || property.city}.
                  </p>
                  <span className="text-[11px] block mt-1.5">
                    {property.price_per_sqft && property.price_per_sqft > modelEstimate.estimated_rate_per_sqft ? (
                      <span className="text-amber-800 dark:text-[#D9F935] font-medium">
                        Above submarket baseline by ₹
                        {formatNumber(property.price_per_sqft - modelEstimate.estimated_rate_per_sqft)}/sqft.
                      </span>
                    ) : (
                      <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                        Aligned with or below typical submarket unit rates.
                      </span>
                    )}
                  </span>
                </div>

                <div className="border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171815] p-4 rounded-2xl">
                  <span className="text-[#5E5E5A] dark:text-[#9E9E98] block text-[11px]">Negotiation &amp; Offer Target</span>
                  <p className="text-[#111210] dark:text-white mt-1 leading-relaxed">
                    {verdict.difference_percent > MODEL_TOLERANCE_PERCENT ? (
                      <span>
                        Target counter-offer around <strong>{formatInr(modelEstimate.estimated_price_inr)}</strong> to{' '}
                        <strong>{formatInr(modelEstimate.upper_bound_inr)}</strong>, reflecting typical comparable sales.
                      </span>
                    ) : (
                      <span>
                        Asking price sits within fair market tolerances. Negotiate around parking slot inclusion, society transfer charges, or registration milestones.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Inline Valuation Synopsis Drawer */}
            <div className="border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowQuickAI(!showQuickAI)}
                className="w-full px-4 py-3 bg-[#F4F3EF] dark:bg-[#111210] hover:opacity-90 flex items-center justify-between text-xs font-medium text-[#111210] dark:text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#111210] dark:text-[#D9F935]" />
                  <span>Property Valuation Synopsis</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showQuickAI ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {showQuickAI && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white dark:bg-[#171815] border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#5E5E5A] dark:text-[#C6C6C0] space-y-2.5 leading-relaxed">
                      <p>
                        <strong className="text-[#111210] dark:text-white">Valuation Assessment:</strong> This {property.bhk} BHK in{' '}
                        {property.locality || property.city} carries a listed asking price of{' '}
                        <strong className="text-[#111210] dark:text-white">{formatInr(askingPrice)}</strong>, representing a{' '}
                        <strong className="text-[#111210] dark:text-white">
                          {verdict.difference_percent >= 0 ? '+' : ''}
                          {verdict.difference_percent}%
                        </strong>{' '}
                        variance against the statistical model benchmark of{' '}
                        <strong className="text-[#111210] dark:text-white">{formatInr(modelEstimate.estimated_price_inr)}</strong>.
                      </p>
                      <p>
                        <strong className="text-[#111210] dark:text-white">Risk Assessment:</strong> Evaluated against our empirical test-split error corridor of{' '}
                        <strong className="text-[#111210] dark:text-white">±{MODEL_TOLERANCE_PERCENT}% MAPE</strong>, this listing is classified as{' '}
                        <strong className="text-[#111210] dark:text-white">{verdict.verdict}</strong>.
                      </p>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAskAssistant}
                          className="text-[#111210] dark:text-[#D9F935] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Open Full AI Analyst Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="pt-1 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAskAssistant}
                className="flex-1 bg-[#111210] dark:bg-[#D9F935] hover:bg-[#232520] dark:hover:bg-[#cae92b] text-white dark:text-[#111210] font-semibold rounded-full p-1.5 pr-5 inline-flex items-center justify-between text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <CircleArrow
                  className="w-8 h-8 bg-[#D9F935] dark:bg-[#111210] text-[#111210] dark:text-[#D9F935]"
                  iconClassName="w-4 h-4"
                />
                <span className="flex-1 text-center">Ask AI Analyst</span>
              </button>

              <button
                type="button"
                onClick={handleDeepScreen}
                className="flex-1 border border-black/[0.12] dark:border-white/[0.14] hover:bg-[#F4F3EF] dark:hover:bg-white/[0.06] text-[#111210] dark:text-white font-medium py-2.5 px-5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <span>Open in Full Screener</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3.5 border-t border-black/[0.07] dark:border-white/[0.08] bg-[#F4F3EF] dark:bg-[#141513] flex items-center justify-between text-xs text-[#5E5E5A] dark:text-[#9E9E98]">
          <span>PropMetric Decision-Support Engine · Verified listing from Magicbricks</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1E201C] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-full text-[#111210] dark:text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
