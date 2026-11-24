import React, { useState, useEffect } from 'react';
import propertiesRaw from './data/properties.json';
import analyticsRaw from './data/analytics.json';
import { Property, AnalyticsSummary, EstimationResult } from './types';
import { calculateEstimate, LOCALITIES_BY_CITY, MODEL_TOLERANCE_PERCENT } from './utils/calculator';

const TOTAL_LOCALITIES_COUNT = (LOCALITIES_BY_CITY.Pune?.length || 0) + (LOCALITIES_BY_CITY.Mumbai?.length || 0);
import { useTheme } from './utils/theme';
import { Navbar, TabKey } from './components/Navbar';
import { PropMetricLogo } from './components/PropMetricLogo';
import { OverviewTab } from './components/OverviewTab';
import { EstimatorTab } from './components/EstimatorTab';
import { OverpricingTab } from './components/OverpricingTab';
import { ComparablesTab } from './components/ComparablesTab';
import { AssistantTab, AnalystChatMessage, AnalystRoleOption, WELCOME_MESSAGE } from './components/AssistantTab';
import { AuditReportsTab } from './components/AuditReportsTab';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { CircleArrow } from './components/AnimatedArrowBadge';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  estimate: 'Price Estimator',
  screen: 'Overpricing Screener',
  comparables: 'Comparable Listings',
  assistant: 'AI Analyst',
  reports: 'Audit & Model',
};

const properties: Property[] = propertiesRaw as Property[];
const analytics: AnalyticsSummary = analyticsRaw as AnalyticsSummary;

export interface ComparablesPreset {
  city?: string;
  locality?: string;
  bhk?: number | 'All';
  search?: string;
  budgetTier?: string;
  nonce: number;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [tabHistory, setTabHistory] = useState<TabKey[]>([]);
  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<Property | null>(null);
  const [comparablesPreset, setComparablesPreset] = useState<ComparablesPreset | null>(null);

  // Shared estimation state
  const [currentEstimate, setCurrentEstimate] = useState<EstimationResult>(() =>
    calculateEstimate({
      city: 'Pune',
      locality: 'Kharadi',
      bhk: 2,
      area_sqft: 950,
      bathrooms: 2,
      furnishing: 'Unfurnished',
      status: 'Ready to Move',
    })
  );

  const [assistantContext, setAssistantContext] = useState<any>(null);
  const [pendingBriefNonce, setPendingBriefNonce] = useState<number>(0);
  const [assistantMessages, setAssistantMessages] = useState<AnalystChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: 'Just now',
    },
  ]);
  const [assistantRole, setAssistantRole] = useState<AnalystRoleOption>('strategist');

  useEffect(() => {
    try {
      window.history.replaceState({ propMetricTab: 'overview' }, '');
    } catch {}
    const onPopState = (e: PopStateEvent) => {
      const targetTab = e.state?.propMetricTab as TabKey | undefined;
      if (targetTab && TAB_LABELS[targetTab]) {
        setSelectedPropertyForModal(null);
        setActiveTab(targetTab);
        setTabHistory((prev) => prev.slice(0, -1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToTab = (nextTab: TabKey) => {
    if (nextTab !== activeTab) {
      setTabHistory((prev) => [...prev.slice(-19), activeTab]);
      setActiveTab(nextTab);
      try {
        window.history.pushState({ propMetricTab: nextTab }, '');
      } catch {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    if (tabHistory.length === 0) return;
    const prevTab = tabHistory[tabHistory.length - 1];
    setTabHistory((prev) => prev.slice(0, -1));
    setActiveTab(prevTab);
    try {
      window.history.replaceState({ propMetricTab: prevTab }, '');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEstimateChange = (est: EstimationResult) => {
    setCurrentEstimate(est);
  };

  const handleNavigateToScreening = () => {
    navigateToTab('screen');
  };

  const handleAskAiToExplain = (context: any) => {
    setAssistantContext(context);
    setPendingBriefNonce(Date.now());
    navigateToTab('assistant');
  };

  const handleRunScreenerFromModal = (estimate: EstimationResult, _askingPrice: number) => {
    setCurrentEstimate(estimate);
    navigateToTab('screen');
  };

  const handleBrowseListingsWithPreset = (preset: Omit<ComparablesPreset, 'nonce'>) => {
    setComparablesPreset({ ...preset, nonce: Date.now() });
    navigateToTab('comparables');
  };

  const handleTabSelect = (tab: TabKey) => {
    navigateToTab(tab);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-white dark:bg-[#0E0F0D] text-[#111210] dark:text-[#F5F5F2] flex flex-col font-sans antialiased selection:bg-[#D9F935] selection:text-[#111210] transition-colors">
        {/* Top Floating Hestora-style Navbar */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
          totalListings={properties.length}
          theme={theme}
          onToggleTheme={toggleTheme}
          canGoBack={tabHistory.length > 0}
          previousTabLabel={tabHistory.length > 0 ? TAB_LABELS[tabHistory[tabHistory.length - 1]] : undefined}
          onGoBack={handleGoBack}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14">
          <AnimatePresence>
            {tabHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="mb-4 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F4F3EF] dark:bg-[#171815] hover:bg-[#EAE8E1] dark:hover:bg-[#21231E] border border-black/[0.08] dark:border-white/[0.1] px-3.5 py-1.5 text-xs font-medium text-[#111210] dark:text-[#E5E5DF] transition-all duration-200 active:scale-[0.98] cursor-pointer group"
                >
                  <span className="w-5 h-5 rounded-full bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] flex items-center justify-center">
                    <ArrowLeft className="w-3 h-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  </span>
                  <span>Back to {TAB_LABELS[tabHistory[tabHistory.length - 1]]}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  analytics={analytics}
                  properties={properties}
                  onNavigateToTab={handleTabSelect}
                  onBrowseListingsWithPreset={handleBrowseListingsWithPreset}
                />
              )}

              {activeTab === 'estimate' && (
                <EstimatorTab
                  onEstimateGenerated={handleEstimateChange}
                  onNavigateToScreening={handleNavigateToScreening}
                />
              )}

              {activeTab === 'screen' && (
                <OverpricingTab
                  currentEstimate={currentEstimate}
                  onAskAiToExplain={handleAskAiToExplain}
                />
              )}

              {activeTab === 'comparables' && (
                <ComparablesTab
                  key={comparablesPreset?.nonce || 'default'}
                  properties={properties}
                  initialCity={comparablesPreset?.city ?? currentEstimate.city}
                  initialBhk={comparablesPreset?.bhk ?? currentEstimate.bhk}
                  initialLocality={comparablesPreset?.locality}
                  initialSearch={comparablesPreset?.search}
                  initialBudget={comparablesPreset?.budgetTier}
                  onSelectProperty={(p) => setSelectedPropertyForModal(p)}
                  onAskAiToExplain={handleAskAiToExplain}
                />
              )}

              {activeTab === 'assistant' && (
                <AssistantTab
                  currentEstimate={currentEstimate}
                  initialContext={assistantContext}
                  pendingBriefNonce={pendingBriefNonce}
                  onConsumeBriefNonce={() => setPendingBriefNonce(0)}
                  messages={assistantMessages}
                  onMessagesChange={setAssistantMessages}
                  activeProperty={assistantContext}
                  onActivePropertyChange={setAssistantContext}
                  analystRole={assistantRole}
                  onAnalystRoleChange={setAssistantRole}
                />
              )}

              {activeTab === 'reports' && <AuditReportsTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Property Overview & Overpricing Modal */}
        <AnimatePresence>
          {selectedPropertyForModal && (
            <PropertyDetailModal
              key={selectedPropertyForModal.id}
              property={selectedPropertyForModal}
              onClose={() => setSelectedPropertyForModal(null)}
              onAskAiToExplain={handleAskAiToExplain}
              onRunScreenerTab={handleRunScreenerFromModal}
            />
          )}
        </AnimatePresence>

        {/* Hestora-style Dark Footer with Monumental Chartreuse PropMetric Wordmark (No Framer branding) */}
        <footer className="bg-[#141513] text-white pt-16 pb-8 px-4 sm:px-8 mt-auto border-t border-white/[0.06]">
          <div className="max-w-[1360px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-white/[0.1]">
              {/* Left Navigation Column */}
              <div className="md:col-span-3 space-y-3">
                <span className="text-xs font-medium text-[#8C8C86] block">Platform</span>
                <ul className="space-y-2 text-sm text-[#E5E5E0]">
                  {(
                    [
                      { key: 'overview', label: 'Market Overview' },
                      { key: 'estimate', label: 'Price Estimator' },
                      { key: 'screen', label: 'Overpricing Screener' },
                      { key: 'comparables', label: 'Comparable Listings' },
                      { key: 'assistant', label: 'AI Analyst' },
                      { key: 'reports', label: 'Audit Reports & Model' },
                    ] as { key: TabKey; label: string }[]
                  ).map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => handleTabSelect(item.key)}
                        className="hover:text-[#D9F935] hover:translate-x-1 transition-all duration-200 cursor-pointer text-left inline-block"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Center Analytical Summary Column */}
              <div className="md:col-span-6 flex flex-col items-start md:items-center md:text-center justify-between space-y-5">
                <PropMetricLogo forceDarkSurface size="md" />
                <div className="space-y-2 max-w-md">
                  <p className="text-base sm:text-lg font-display font-medium tracking-[-0.02em] text-white leading-snug">
                    Empirical real estate price intelligence across Mumbai &amp; Pune residential micro-markets.
                  </p>
                  <p className="text-xs text-[#9E9E98] leading-relaxed">
                    Calibrated on {properties.length.toLocaleString('en-IN')} verified residential listings across {TOTAL_LOCALITIES_COUNT} localities with an empirical ±{MODEL_TOLERANCE_PERCENT}% Median APE screening corridor. Decision-support only; not a legal appraisal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTabSelect('estimate')}
                  className="inline-flex items-center gap-2.5 bg-[#1F211C] hover:bg-[#2A2C26] border border-white/[0.12] rounded-full p-1 pr-4 text-xs font-medium text-white transition-all duration-200 active:scale-[0.98] cursor-pointer group"
                >
                  <CircleArrow className="w-7 h-7 bg-[#D9F935] text-[#111210]" />
                  <span>Launch Price Estimator</span>
                </button>
              </div>

              {/* Right Coverage & Methodology Column */}
              <div className="md:col-span-3 md:text-right space-y-4">
                <div>
                  <span className="text-xs font-medium text-[#8C8C86] block mb-2">Coverage</span>
                  <div className="space-y-1 text-sm text-[#E5E5E0]">
                    <div>Mumbai &amp; Pune, India</div>
                    <div className="font-mono text-xs text-[#A3A39E] tabular-nums">
                      {properties.length.toLocaleString('en-IN')} Residential Units
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#8C8C86] block mb-1">Validation Margin</span>
                  <div className="font-mono text-sm text-[#D9F935] tabular-nums">±{MODEL_TOLERANCE_PERCENT}% Median APE</div>
                </div>
              </div>
            </div>

            {/* Monumental Chartreuse Lime PropMetric Wordmark */}
            <div className="pt-8 overflow-hidden text-center">
              <motion.div
                aria-label="PropMetric"
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="font-display font-medium tracking-[-0.045em] leading-[0.88] text-[#D9F935] text-[clamp(3.75rem,14.5vw,12.5rem)] select-none"
              >
                PropMetric
              </motion.div>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
