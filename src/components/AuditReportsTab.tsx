import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Database,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Code2,
  Scale,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import analyticsRaw from '../data/analytics.json';
import { AUDIT_REPORTS } from '../data/reportsData';
import { AnalyticsSummary } from '../types';
import { formatInr, formatNumber, MODEL_TOLERANCE_PERCENT } from '../utils/calculator';

const analytics = analyticsRaw as unknown as AnalyticsSummary;
const meta = analytics.model_meta;
const tol = MODEL_TOLERANCE_PERCENT;
const tolDouble = Number((tol * 2).toFixed(1));
const medianApe = meta.median_ape_percent ?? tol;
const meanApe = meta.mean_ape_percent ?? meta.mape_percent;
const logR2 = meta.log_r2_score ?? meta.r2_score;
const dummyMae = meta.dummy_mae_inr ?? 22219604;
const maeReductionPct = Math.round(((dummyMae - meta.mae_inr) / dummyMae) * 100);

export const AuditReportsTab: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<'cleaning' | 'eda' | 'model'>('cleaning');
  const [reportContent, setReportContent] = useState<string>('Loading report content...');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const reports = [
    { id: 'cleaning', file: 'cleaning_report.txt', label: '1. Data Cleaning & Exclusion Audit' },
    { id: 'eda', file: 'eda_report.txt', label: '2. Exploratory Data Analysis (EDA)' },
    { id: 'model', file: 'model_evaluation.txt', label: '3. Model Evaluation & Tolerance Margins' },
  ];

  useEffect(() => {
    const reportFile = reports.find((r) => r.id === selectedReport)?.file;
    if (!reportFile) return;

    if (AUDIT_REPORTS[reportFile]) {
      setReportContent(AUDIT_REPORTS[reportFile]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/reports/${reportFile}`)
      .then((res) => {
        if (!res.ok) throw new Error('Report could not be loaded');
        return res.text();
      })
      .then((text) => setReportContent(text))
      .catch((err) => {
        setReportContent(`Unable to load ${reportFile}: ${err.message}`);
      })
      .finally(() => setIsLoading(false));
  }, [selectedReport]);

  const notebooks = [
    {
      num: '01',
      name: '01_Data_Inspection.ipynb',
      title: 'Raw Data Ingestion & Schema Profiling',
      purpose: 'Initial schema auditing, missingness inspection, column profiling, and non-residential entry identification.',
      operations: 'Loaded 2,043 raw records; detected 240 commercial properties, 3 unclassified titles, 1 corrupted price anomaly.',
      outputs: 'Initial summary statistics, column data types mapping, anomaly log.',
      gates: 'Ingestion integrity: verified 2,043 total rows without parser truncation.',
      status: 'Verified (Outputs Confirmed)',
    },
    {
      num: '02',
      name: '02_Data_Cleaning.ipynb',
      title: 'Taxonomic Filtering & Imputation Pipeline',
      purpose: 'Partitioning dataset into residential vs excluded records using strict exclusion taxonomy.',
      operations: 'Filtered commercial entries; mapped 1,799 residential units; standardized cities, BHK counts, and furnishing trichotomy.',
      outputs: 'Saved residential_properties_cleaned.csv (1,799 rows) and excluded_properties.csv (244 rows).',
      gates: 'Sanity validation: 0 duplicate URLs, no negative prices, carpet area bounded > 100 sqft.',
      status: 'Verified (Outputs Confirmed)',
    },
    {
      num: '03',
      name: '03_Data_Validation.ipynb',
      title: 'Automated Assertion Gates & Leakage Audit',
      purpose: 'Formal verification of pipeline reconciliation and data leakage prevention.',
      operations: 'Executed programmatic assertions: 1,799 + 244 == 2,043; verified target variable isolation; inspected test split isolation.',
      outputs: 'Validation report, row reconciliation confirmation, leakage audit logs.',
      gates: 'Row reconciliation: PASSED (1,799 + 244 = 2,043; exactly 0 row loss or multiplication).',
      status: 'Verified (Outputs Confirmed)',
    },
    {
      num: '04',
      name: '04_EDA.ipynb',
      title: 'Exploratory Spatial & Distributional Analysis',
      purpose: 'Comparative statistical analysis of Mumbai and Pune real estate asking prices.',
      operations: 'Calculated median/mean rates, 2.67x rate ratio, BHK density distributions, furnishing and status splits.',
      outputs: 'Correlation matrices, price-per-sqft histograms, locality density tables.',
      gates: 'Distribution checks: validated non-negative skewness, logged transformation suitability.',
      status: 'Verified (Outputs Confirmed)',
    },
    {
      num: '05',
      name: '05_Model_Training.ipynb',
      title: 'Hedonic Regression & Tolerance Corridor Derivation',
      purpose: 'Training log-linear hedonic ridge regressor, benchmarking against dummy baseline, and deriving overpricing thresholds.',
      operations: '80/20 train/test split (1,436 train / 360 test); trained log-linear ridge regression on 1,796 ML-ready records; evaluated MAE, RMSE, R², MAPE.',
      outputs: 'Trained model weights, test evaluation metrics, held-out Median APE derivation of ±' + tol + '% screening corridor.',
      gates: `Performance gate: R² = ${meta.r2_score.toFixed(4)} (Log R² = ${logR2.toFixed(4)}), Median APE = ${medianApe.toFixed(2)}% (±${tol}% corridor).`,
      status: 'Verified (Outputs Confirmed)',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hestora Editorial Page Header */}
      <div className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF] mb-4">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
              <span>Methodology &amp; Audit</span>
            </div>
            <h1
              className="font-display font-medium tracking-[-0.03em] text-3xl sm:text-4xl text-[#111210] dark:text-white leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Pipeline audit &amp; <span className="text-[#9E9E98] dark:text-[#666660]">empirical modeling.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98] mt-2.5 max-w-3xl leading-relaxed">
              Exhaustive methodological documentation covering row count reconciliation, four-category exclusion taxonomy,
              spatial EDA, hedonic regression metrics, and empirical derivation of the ±{tol}% tolerance corridor.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono bg-[#141513] text-[#D9F935] px-4 py-2 rounded-full border border-white/[0.1] tabular-nums">
              {formatNumber(analytics.total_raw)} Raw · {formatNumber(analytics.total_residential)} Residential
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Pipeline Audit & Row Reconciliation */}
      <section className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.07] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
            <h2 className="font-display text-lg font-medium text-[#111210] dark:text-white">
              1. Pipeline Audit &amp; Row Reconciliation
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            PASSED (2,043 = 1,799 + 244)
          </span>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl">
            <span className="text-[11px] font-medium text-[#5E5E5A] dark:text-[#9E9E98] block uppercase">Ingested Raw</span>
            <div className="text-2xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">2,043</div>
            <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98]">Total Scraped Records</span>
          </div>

          <div className="p-4 bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl">
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 block uppercase">
              Residential Cleaned
            </span>
            <div className="text-2xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">1,799</div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">88.1% of Ingested Raw</span>
          </div>

          <div className="p-4 bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl">
            <span className="text-[11px] font-medium text-rose-800 dark:text-rose-400 block uppercase">
              Excluded Non-Res
            </span>
            <div className="text-2xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">244</div>
            <span className="text-[11px] text-rose-700 dark:text-rose-400">11.9% of Ingested Raw</span>
          </div>

          <div className="p-4 bg-[#141513] text-white rounded-2xl border border-white/[0.08]">
            <span className="text-[11px] font-medium text-[#D9F935] block uppercase">ML-Ready Complete</span>
            <div className="text-2xl font-display font-medium text-white tabular-nums mt-1">1,796</div>
            <span className="text-[11px] text-[#9E9E98]">Complete Regression Features</span>
          </div>
        </div>

        {/* Exclusion Breakdown & Clarifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-medium text-sm text-[#111210] dark:text-white">
                Exclusion Taxonomy Breakdown
              </h3>
              <span className="font-mono text-[11px] text-rose-700 dark:text-rose-400 font-semibold">Total: 244</span>
            </div>
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5E5E5A] dark:text-[#C6C6C0]">Commercial Spaces (Office / Shop / Showroom)</span>
                <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">240</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5E5E5A] dark:text-[#C6C6C0]">Missing BHK with Unclassified Title</span>
                <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">3</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5E5E5A] dark:text-[#C6C6C0]">Corrupted Price Scraper Anomaly</span>
                <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">1</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5E5E5A] dark:text-[#C6C6C0]">Implausible Area Anomaly (≤ 50 or &gt; 40,000 sqft)</span>
                <span className="font-mono font-bold text-[#111210] dark:text-white tabular-nums">0</span>
              </div>
            </div>
            <p className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              Example exclusion: Darshan Promesa 2 BHK listed with scraped value ₹2,017.75 Crore (corrupted entry).
            </p>
          </div>

          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-5 space-y-3">
            <h3 className="font-display font-medium text-sm text-[#111210] dark:text-white">
              Auditing Notes &amp; Data Verification
            </h3>
            <div className="space-y-2.5 text-[11px] text-[#5E5E5A] dark:text-[#C6C6C0] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08]">
                <strong className="text-[#111210] dark:text-white block mb-1">
                  ML-Ready Filtering (3 Non-ML Residential Properties):
                </strong>
                Among the 1,799 retained residential units, exactly 3 records lacked required numerical regression inputs and were excluded from model training:
                <ul className="list-disc list-inside mt-1.5 space-y-0.5 font-mono text-[10px] text-[#111210] dark:text-[#D9F935]">
                  <li>PROP_00409: Missing area_sqft (Null area prevents rate calculation)</li>
                  <li>PROP_00418: Missing BHK count (Null BHK prevents regression)</li>
                  <li>PROP_00460: Missing area_sqft (Null area prevents rate calculation)</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08]">
                <strong className="text-[#111210] dark:text-white block mb-0.5">Duplicate URL Clarification:</strong>
                The 2,043 raw ingested listings contain <strong>2,043 distinct URLs</strong>. Exactly{' '}
                <strong>0 duplicate URLs</strong> exist in the dataset, confirming zero duplicate records were discarded during ingestion.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Exploratory Data Analysis (EDA) */}
      <section className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.07] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
            <h2 className="font-display text-lg font-medium text-[#111210] dark:text-white">
              2. Exploratory Data Analysis (EDA) &amp; Market Distribution
            </h2>
          </div>
          <span className="text-xs font-mono text-[#5E5E5A] dark:text-[#9E9E98]">
            Sample: 1,799 Cleaned Residential Listings
          </span>
        </div>

        {/* Pune vs Mumbai Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-medium text-base text-[#111210] dark:text-white">
                Pune Residential Market
              </span>
              <span className="text-xs font-mono bg-white dark:bg-white/[0.08] px-2.5 py-1 rounded-full text-[#111210] dark:text-[#E5E5DF]">
                884 Listings (49.1%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#171815]">
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Median Asking Price</span>
                <span className="text-base font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                  ₹1.20 Crore
                </span>
                <span className="text-[11px] text-[#8C8C86] block">Mean: ₹1.65 Cr</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#171815]">
                <span className="text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] block">Median Rate / Sqft</span>
                <span className="text-base font-bold font-mono text-[#111210] dark:text-white tabular-nums mt-0.5 block">
                  ₹12,142 / sqft
                </span>
                <span className="text-[11px] text-[#8C8C86] block">Mean: ₹12,894 / sqft</span>
              </div>
            </div>
            <p className="text-xs text-[#5E5E5A] dark:text-[#9E9E98] leading-relaxed">
              Pune asking prices demonstrate lower dispersion with heavy concentration in IT corridors (Hinjawadi, Wakad, Kharadi, Baner).
            </p>
          </div>

          <div className="rounded-2xl bg-[#141513] text-white p-5 space-y-4 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="font-display font-medium text-base text-white">Mumbai Residential Market</span>
              <span className="text-xs font-mono bg-[#D9F935] text-[#111210] font-semibold px-2.5 py-1 rounded-full">
                912 Listings (50.9%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/[0.06]">
                <span className="text-[11px] text-[#9E9E98] block">Median Asking Price</span>
                <span className="text-base font-bold font-mono text-white tabular-nums mt-0.5 block">₹2.65 Crore</span>
                <span className="text-[11px] text-[#8C8C86] block">Mean: ₹4.24 Cr</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/[0.06]">
                <span className="text-[11px] text-[#9E9E98] block">Median Rate / Sqft</span>
                <span className="text-base font-bold font-mono text-[#D9F935] tabular-nums mt-0.5 block">
                  ₹32,379 / sqft
                </span>
                <span className="text-[11px] text-[#8C8C86] block">Mean: ₹36,782 / sqft</span>
              </div>
            </div>
            <p className="text-xs text-[#A3A39E] leading-relaxed">
              Mumbai median price per sqft is <strong className="text-white">2.67x higher</strong> than Pune (₹32,379 vs ₹12,142), with extreme upper-tail luxury dispersion (South Mumbai, BKC, Bandra West).
            </p>
          </div>
        </div>

        {/* BHK, Furnishing & Status Distributions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="font-display font-medium text-sm text-[#111210] dark:text-white block mb-2.5">
              BHK Distribution
            </span>
            <div className="space-y-1.5 text-xs text-[#5E5E5A] dark:text-[#C6C6C0]">
              <div className="flex justify-between"><span>1 BHK</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">235 (13.1%)</span></div>
              <div className="flex justify-between"><span>2 BHK</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">708 (39.4%)</span></div>
              <div className="flex justify-between"><span>3 BHK</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">607 (33.7%)</span></div>
              <div className="flex justify-between"><span>4 BHK</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">194 (10.8%)</span></div>
              <div className="flex justify-between"><span>5+ BHK</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">52 (2.9%)</span></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="font-display font-medium text-sm text-[#111210] dark:text-white block mb-2.5">
              Furnishing Breakdown
            </span>
            <div className="space-y-1.5 text-xs text-[#5E5E5A] dark:text-[#C6C6C0]">
              <div className="flex justify-between"><span>Unfurnished</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">969 (53.9%)</span></div>
              <div className="flex justify-between"><span>Semi-Furnished</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">540 (30.0%)</span></div>
              <div className="flex justify-between"><span>Furnished</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">287 (16.0%)</span></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="font-display font-medium text-sm text-[#111210] dark:text-white block mb-2.5">
              Construction Status
            </span>
            <div className="space-y-1.5 text-xs text-[#5E5E5A] dark:text-[#C6C6C0]">
              <div className="flex justify-between"><span>Ready to Move</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">1,387 (77.1%)</span></div>
              <div className="flex justify-between"><span>Under Construction</span><span className="font-mono font-semibold text-[#111210] dark:text-white tabular-nums">409 (22.7%)</span></div>
              <div className="flex justify-between text-[#8C8C86]"><span>Unclassified</span><span className="font-mono tabular-nums">3 (0.2%)</span></div>
            </div>
          </div>
        </div>

        {/* Limitations Notice */}
        <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] text-xs text-[#5E5E5A] dark:text-[#C6C6C0] space-y-1">
          <div className="font-medium text-[#111210] dark:text-white flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#111210] dark:text-[#D9F935]" />
            <span>Dataset Scope &amp; Real Estate Limitations:</span>
          </div>
          <p className="leading-relaxed">
            All prices analyzed are <strong>portal seller asking prices</strong> from public listings, not final registered transaction deeds or government circle rates (Ready Reckoner). Asking prices reflect seller negotiation aspirations and typically carry a 5% to 15% negotiation margin compared to closed sales.
          </p>
        </div>
      </section>

      {/* SECTION 3: Model Evaluation & Tolerance Margins */}
      <section className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.07] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
            <h2 className="font-display text-lg font-medium text-[#111210] dark:text-white">
              3. Model Evaluation &amp; Tolerance Margins
            </h2>
          </div>
          <span className="text-xs font-mono font-medium text-[#111210] dark:text-[#E5E5DF] bg-[#F4F3EF] dark:bg-[#111210] px-3 py-1 rounded-full self-start sm:self-auto">
            Log-Linear Ridge (80/20 Train/Test Split)
          </span>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="text-[11px] uppercase text-[#5E5E5A] dark:text-[#9E9E98] block font-medium">Test MAE</span>
            <div className="text-xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">
              {formatInr(meta.mae_inr)}
            </div>
            <span className="text-[11px] text-[#8C8C86] font-mono tabular-nums">₹{formatNumber(meta.mae_inr)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="text-[11px] uppercase text-[#5E5E5A] dark:text-[#9E9E98] block font-medium">Test RMSE</span>
            <div className="text-xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">
              {formatInr(meta.rmse_inr)}
            </div>
            <span className="text-[11px] text-[#8C8C86] font-mono tabular-nums">₹{formatNumber(meta.rmse_inr)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210]">
            <span className="text-[11px] uppercase text-emerald-800 dark:text-emerald-400 block font-medium">
              R² Score (INR / Log)
            </span>
            <div className="text-xl font-display font-medium text-[#111210] dark:text-white tabular-nums mt-1">
              {meta.r2_score.toFixed(4)}
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Log R²: {logR2.toFixed(4)} ({(logR2 * 100).toFixed(1)}% log variance)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#141513] text-white border border-white/[0.08]">
            <span className="text-[11px] uppercase text-[#D9F935] block font-medium">Test Median APE</span>
            <div className="text-xl font-display font-medium text-white tabular-nums mt-1">
              {medianApe.toFixed(2)}%
            </div>
            <span className="text-[11px] text-[#D9F935]">
              Basis for ±{tol}% Band (Mean: {meanApe.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Tolerance Corridor Derivation Box */}
        <div className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
            <h3 className="font-display font-medium text-sm text-[#111210] dark:text-white">
              Derivation of the Empirical ±{tol}% Overpricing Corridor
            </h3>
          </div>

          <p className="text-[#5E5E5A] dark:text-[#C6C6C0] leading-relaxed">
            The <strong className="text-[#111210] dark:text-white">±{tol}% screening corridor</strong> is directly derived from the held-out test Median Absolute Percentage Error (Median APE) of <strong className="text-[#111210] dark:text-white">{medianApe.toFixed(2)}%</strong> ({(100 - medianApe).toFixed(1)}% median prediction accuracy across {meta.test_samples} unseen properties; Mean APE: {meanApe.toFixed(2)}%). Locality priors shrink conservatively toward city/outer-MMR baselines strictly inside the training fold to prevent leakage.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#171815] space-y-1">
              <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 block">
                ≤ +{tol}% Variance
              </span>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#C6C6C0] block leading-relaxed">
                <strong>Within Expected Corridor:</strong> Price aligns with prevailing submarket hedonic rates within standard error margins.
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#171815] space-y-1">
              <span className="font-semibold text-xs text-amber-700 dark:text-[#D9F935] block">
                +{tol}% to +{tolDouble}% Variance
              </span>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#C6C6C0] block leading-relaxed">
                <strong>Above Model Estimate:</strong> Premium pricing. Buyer review suggested for floor rise, bespoke interior, or corner orientation.
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#171815] space-y-1">
              <span className="font-semibold text-xs text-rose-700 dark:text-rose-400 block">
                &gt; +{tolDouble}% Variance (&gt;2x Band)
              </span>
              <span className="text-[11px] text-[#5E5E5A] dark:text-[#C6C6C0] block leading-relaxed">
                <strong>Significantly Above Model:</strong> Severe overpricing risk. Strong counter-offer or alternative comp walkaway leverage recommended.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] text-[#5E5E5A] dark:text-[#9E9E98] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong>Benchmark Gain:</strong> {(meta.r2_score * 100).toFixed(1)}% INR R² ({(logR2 * 100).toFixed(1)}% Log R²) &amp; {maeReductionPct}% MAE reduction vs dummy mean regressor (MAE {formatInr(dummyMae)}).
            </span>
            <span className="font-mono">
              Split: {formatNumber(meta.training_samples)} Train / {formatNumber(meta.test_samples)} Test (80/20 Seed 42)
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Notebook Deliverables & Interactive Report Viewer */}
      <section className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.07] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
            <h2 className="font-display text-lg font-medium text-[#111210] dark:text-white">
              4. Notebook Documentation &amp; Artifact Verification
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            5 / 5 Notebooks Verified
          </span>
        </div>

        {/* 5 Notebook Cards */}
        <div className="space-y-3">
          {notebooks.map((nb) => (
            <div
              key={nb.name}
              className="rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] border border-transparent hover:border-black/[0.1] dark:hover:border-white/[0.12] p-4 sm:p-5 space-y-3 text-xs transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] font-mono font-semibold text-[11px]">
                    {nb.num}
                  </span>
                  <span className="font-mono font-semibold text-[#111210] dark:text-white">{nb.name}</span>
                  <span className="text-[#8C8C86]">·</span>
                  <span className="font-display font-medium text-[#111210] dark:text-[#E5E5DF]">{nb.title}</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 w-fit">
                  <CheckCircle2 className="w-3 h-3" />
                  {nb.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-[#5E5E5A] dark:text-[#C6C6C0]">
                <div>
                  <span className="font-semibold text-[#111210] dark:text-white block mb-0.5">Purpose</span>
                  <span>{nb.purpose}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#111210] dark:text-white block mb-0.5">Operations &amp; Outputs</span>
                  <span>{nb.outputs}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#111210] dark:text-white block mb-0.5">Validation Gate</span>
                  <span className="font-mono text-[10px] text-emerald-800 dark:text-[#D9F935]">{nb.gates}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Report Viewer */}
        <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1]">
          <div className="bg-[#F4F3EF] dark:bg-[#141513] border-b border-black/[0.07] dark:border-white/[0.08] flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="text-xs font-medium text-[#111210] dark:text-white mr-2 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
              <span>Audit Logs</span>
            </span>
            {reports.map((r) => {
              const isSelected = selectedReport === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReport(r.id as any)}
                  className={`relative px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer z-0 ${
                    isSelected
                      ? 'text-white dark:text-[#111210] font-semibold'
                      : 'bg-white dark:bg-[#1E201C] text-[#5E5E5A] dark:text-[#C6C6C0] hover:text-[#111210] dark:hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="audit-report-tab-pill"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#111210] dark:bg-[#D9F935] -z-10"
                    />
                  )}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 bg-[#141513] text-[#E5E5DF] font-mono text-xs overflow-x-auto max-h-[460px]">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[#9E9E98] py-8 text-center"
                >
                  Loading audit report...
                </motion.div>
              ) : (
                <motion.pre
                  key={selectedReport}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="whitespace-pre leading-relaxed"
                >
                  {reportContent}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
};
