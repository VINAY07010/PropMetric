import React, { useState } from 'react';
import { EstimationResult } from '../types';
import { evaluateOverpricing, formatInr, MODEL_TOLERANCE_PERCENT } from '../utils/calculator';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  FileSearch,
  Target,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CircleArrow } from './AnimatedArrowBadge';

interface OverpricingTabProps {
  currentEstimate: EstimationResult;
  onAskAiToExplain: (context: any) => void;
}

export const OverpricingTab: React.FC<OverpricingTabProps> = ({
  currentEstimate,
  onAskAiToExplain,
}) => {
  const [sellerPrice, setSellerPrice] = useState<number>(() => {
    return Math.round((currentEstimate.estimated_price_inr * 1.15) / 100000) * 100000;
  });

  const [customEstimate, setCustomEstimate] = useState<number>(currentEstimate.estimated_price_inr);
  const [targetStance, setTargetStance] = useState<'conservative' | 'fair' | 'aggressive'>('fair');

  const activeEstimate: EstimationResult = {
    ...currentEstimate,
    estimated_price_inr: customEstimate,
    lower_bound_inr: Math.round(customEstimate * (1 - MODEL_TOLERANCE_PERCENT / 100)),
    upper_bound_inr: Math.round(customEstimate * (1 + MODEL_TOLERANCE_PERCENT / 100)),
  };

  const verdict = evaluateOverpricing(sellerPrice, activeEstimate);

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
        return 'text-[#111210] dark:text-white bg-[#F4F3EF] dark:bg-[#171815] border-black/[0.08] dark:border-white/[0.1]';
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

  const calculatedCounterOffer = () => {
    switch (targetStance) {
      case 'aggressive':
        return Math.round(activeEstimate.estimated_price_inr * 0.95);
      case 'conservative':
        return Math.round(activeEstimate.estimated_price_inr * 1.04);
      case 'fair':
      default:
        return activeEstimate.estimated_price_inr;
    }
  };

  const counterOfferInr = calculatedCounterOffer();
  const buyerSavingsInr = sellerPrice - counterOfferInr;

  // Map deviation percentage (-30% .. +55%) smoothly onto the 4-band visual corridor track (0..100%)
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

  const handleTriggerAI = () => {
    onAskAiToExplain({
      locality: activeEstimate.locality,
      city: activeEstimate.city,
      bhk: activeEstimate.bhk,
      area_sqft: activeEstimate.area_sqft,
      estimated_price_inr: activeEstimate.estimated_price_inr,
      estimated_rate_per_sqft: activeEstimate.estimated_rate_per_sqft,
      seller_asking_price: sellerPrice,
      price_per_sqft: activeEstimate.area_sqft > 0 ? Math.round(sellerPrice / activeEstimate.area_sqft) : 0,
      difference_inr: verdict.difference_inr,
      difference_percent: verdict.difference_percent,
      tolerance_band_percent: MODEL_TOLERANCE_PERCENT,
      verdict: verdict.verdict,
      risk_tier: verdict.risk_tier,
      suggested_counter_offer: counterOfferInr,
      target_stance: targetStance,
    });
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF] mb-4">
          <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
          <span>Overpricing Screener</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <h1
            className="font-display font-medium tracking-[-0.03em] text-3xl sm:text-4xl text-[#111210] dark:text-white leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Asking price variance <span className="text-[#9E9E98] dark:text-[#666660]">&amp; screening.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98] max-w-lg leading-relaxed">
            Evaluate a seller&apos;s asking price against PropMetric&apos;s hedonic baseline using an empirical ±{MODEL_TOLERANCE_PERCENT}% validation corridor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Inputs Card (5 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6"
        >
          <h2 className="font-display font-medium text-lg text-[#111210] dark:text-white border-b border-black/[0.07] dark:border-white/[0.08] pb-4">
            Pricing Comparison Inputs
          </h2>

          {/* Seller's Asking Price */}
          <div>
            <label
              htmlFor="overpricing-seller-input"
              className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2"
            >
              Seller&apos;s Asking Price (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5E5E5A] font-mono text-sm">₹</span>
              <input
                id="overpricing-seller-input"
                type="number"
                min="100000"
                step="50000"
                value={sellerPrice}
                onChange={(e) => setSellerPrice(Number(e.target.value))}
                className="w-full text-base font-mono font-semibold border border-black/[0.08] dark:border-white/[0.1] rounded-2xl pl-8 pr-4 py-3 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
              />
            </div>
            <div className="mt-1.5 text-xs text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
              Formatted: <strong className="text-[#111210] dark:text-white">{formatInr(sellerPrice)}</strong>
            </div>
          </div>

          {/* Model Estimated Baseline */}
          <div>
            <label
              htmlFor="overpricing-model-baseline-input"
              className="block text-xs font-medium text-[#5E5E5A] dark:text-[#A3A39E] mb-2"
            >
              Model Benchmark Estimate (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5E5E5A] font-mono text-sm">₹</span>
              <input
                id="overpricing-model-baseline-input"
                type="number"
                min="100000"
                step="50000"
                value={customEstimate}
                onChange={(e) => setCustomEstimate(Number(e.target.value))}
                className="w-full text-sm font-mono border border-black/[0.08] dark:border-white/[0.1] rounded-2xl pl-8 pr-4 py-3 bg-[#F4F3EF] dark:bg-[#111210] text-[#111210] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
              />
            </div>
            <div className="mt-1.5 text-xs text-[#5E5E5A] dark:text-[#9E9E98] flex items-center justify-between">
              <span>{activeEstimate.bhk} BHK · {activeEstimate.city} ({activeEstimate.area_sqft} sqft)</span>
              <span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">
                {formatInr(customEstimate)}
              </span>
            </div>
          </div>

          {/* Tolerance Explainer */}
          <div className="bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl p-4 text-xs text-[#5E5E5A] dark:text-[#9E9E98] space-y-1.5">
            <span className="font-medium text-[#111210] dark:text-white block">How Tolerance is Derived</span>
            <p className="leading-relaxed">
              The <strong className="text-[#111210] dark:text-white">±{MODEL_TOLERANCE_PERCENT}%</strong> band represents the Mean Absolute Percentage Error (MAPE) measured on unseen held-out test listings. Prices inside this band sit within normal market dispersion.
            </p>
          </div>

          {/* Primary Pill Action */}
          <button
            type="button"
            onClick={handleTriggerAI}
            className="w-full bg-[#111210] dark:bg-[#D9F935] hover:bg-[#232520] dark:hover:bg-[#cae92b] text-white dark:text-[#111210] font-semibold rounded-full p-1.5 pr-5 inline-flex items-center justify-between text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer group"
          >
            <CircleArrow
              className="w-8 h-8 bg-[#D9F935] dark:bg-[#111210] text-[#111210] dark:text-[#D9F935]"
              iconClassName="w-4 h-4"
            />
            <span className="flex-1 text-center">Ask AI Analyst</span>
          </button>
        </motion.div>

        {/* Right Screening Results & Matrix (7 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-5"
        >
          {/* Classification Banner */}
          <motion.div
            key={verdict.risk_tier}
            initial={{ opacity: 0.65, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`p-6 rounded-3xl border transition-colors ${getTierColor(verdict.risk_tier)}`}
          >
            <div className="flex items-start gap-3.5">
              {getTierIcon(verdict.risk_tier)}
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-semibold tracking-wider opacity-75 block">
                  Screening Classification
                </span>
                <h3 className="font-display font-medium text-xl tracking-tight">
                  {verdict.verdict}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                  Seller asking price deviates by{' '}
                  <strong className="font-mono tabular-nums">
                    {verdict.difference_percent >= 0 ? '+' : ''}
                    {verdict.difference_percent}%
                  </strong>{' '}
                  ({formatInr(verdict.difference_inr)}) relative to the model benchmark.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quantitative Variance Card */}
          <div className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 space-y-5">
            <h3 className="font-display font-medium text-base text-[#111210] dark:text-white">
              Quantitative Variance Breakdown
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl p-4">
              <div>
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Seller Asking</span>
                <span className="text-base sm:text-lg font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                  {formatInr(sellerPrice)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Model Estimate</span>
                <span className="text-base sm:text-lg font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                  {formatInr(activeEstimate.estimated_price_inr)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Deviation</span>
                <span
                  className={`text-base sm:text-lg font-bold font-mono tabular-nums mt-0.5 block ${
                    verdict.difference_percent > MODEL_TOLERANCE_PERCENT
                      ? 'text-amber-700 dark:text-[#D9F935]'
                      : 'text-[#111210] dark:text-white'
                  }`}
                >
                  {verdict.difference_percent >= 0 ? '+' : ''}
                  {verdict.difference_percent}%
                </span>
              </div>
            </div>

            {/* Visual Dispersion Corridor Bar with Live Marker */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] font-mono tabular-nums">
                <span>-25% Value</span>
                <span>Expected Band [±{tol}%]</span>
                <span>+50% High Markup</span>
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
                  animate={{ left: `${markerLeftPercent}%` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#111210] dark:bg-[#D9F935] border-2 border-white dark:border-[#111210] shadow-md pointer-events-none"
                />
              </div>
              <p className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] text-center">
                Center green corridor represents normal empirical dispersion around the hedonic estimate.
              </p>
            </div>
          </div>

          {/* Interactive Counter-Offer Target Matrix */}
          <div className="rounded-3xl bg-[#141513] text-white border border-white/[0.08] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-medium text-base text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#D9F935]" />
                <span>Counter-Offer Target Matrix</span>
              </h3>
              <span className="text-xs text-[#9E9E98] font-mono">Select Stance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {[
                { id: 'aggressive', label: 'Aggressive Anchor', desc: '-5% under model' },
                { id: 'fair', label: 'Fair Benchmark', desc: 'Exact model baseline' },
                { id: 'conservative', label: 'Close-the-Deal', desc: '+4% buffer' },
              ].map((s) => {
                const isSelected = targetStance === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTargetStance(s.id as any)}
                    className={`relative p-3 rounded-2xl border text-left transition-colors cursor-pointer z-0 ${
                      isSelected
                        ? 'border-transparent text-[#111210] font-semibold'
                        : 'border-white/[0.1] bg-white/[0.05] text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="screener-stance-pill"
                        transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                        className="absolute inset-0 rounded-2xl bg-[#D9F935] -z-10"
                      />
                    )}
                    <div>{s.label}</div>
                    <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-[#111210]/75' : 'text-[#9E9E98]'}`}>
                      {s.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white/[0.06] p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#9E9E98] block">Proposed Counter-Bid</span>
                <motion.span
                  key={counterOfferInr}
                  initial={{ opacity: 0.5, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xl font-bold font-mono text-white tabular-nums block"
                >
                  {formatInr(counterOfferInr)}
                </motion.span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#9E9E98] block">
                  {buyerSavingsInr >= 0 ? 'Potential Savings' : 'Premium Surcharge'}
                </span>
                <motion.span
                  key={buyerSavingsInr}
                  initial={{ opacity: 0.5, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className={`text-lg font-bold font-mono tabular-nums block ${
                    buyerSavingsInr >= 0 ? 'text-[#D9F935]' : 'text-rose-400'
                  }`}
                >
                  {buyerSavingsInr >= 0 ? formatInr(buyerSavingsInr) : `+${formatInr(Math.abs(buyerSavingsInr))}`}
                </motion.span>
              </div>
            </div>
          </div>

          {/* Buyer Due Diligence Checklist */}
          <div className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 space-y-3">
            <h3 className="font-display font-medium text-base text-[#111210] dark:text-white flex items-center gap-2">
              <FileSearch className="w-4 h-4" />
              <span>Buyer Due Diligence Checklist</span>
            </h3>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-xs text-[#5E5E5A] dark:text-[#C6C6C0]">
              <div className="py-2.5 flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold text-[#111210] dark:text-white shrink-0">01. Micro-location &amp; View:</span>
                <span>Higher floors, unobstructed views, or corner ventilation can justify 5–15% listing premiums.</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold text-[#111210] dark:text-white shrink-0">02. True RERA Carpet Area:</span>
                <span>Confirm whether the seller is quoting super built-up versus usable RERA carpet area.</span>
              </div>
              <div className="pt-2.5 flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold text-[#111210] dark:text-white shrink-0">03. Negotiation Stance:</span>
                <span>
                  {verdict.difference_percent > MODEL_TOLERANCE_PERCENT
                    ? `With asking price at +${verdict.difference_percent}%, reference comparable market units to anchor closer to ${formatInr(activeEstimate.estimated_price_inr)}.`
                    : 'Current price sits within normal market tolerances. Focus negotiation on parking, transfer fees, or milestone schedules.'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
