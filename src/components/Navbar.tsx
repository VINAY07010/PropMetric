import React, { useState } from 'react';
import {
  BarChart3,
  Calculator,
  ShieldAlert,
  Search,
  MessageSquareCode,
  FileText,
  Sun,
  Moon,
  ArrowLeft,
  ArrowUpRight,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { PropMetricLogo } from './PropMetricLogo';
import { CircleArrow } from './AnimatedArrowBadge';

export type TabKey = 'overview' | 'estimate' | 'screen' | 'comparables' | 'assistant' | 'reports';

interface NavbarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  totalListings: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  canGoBack?: boolean;
  previousTabLabel?: string;
  onGoBack?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  canGoBack = false,
  previousTabLabel,
  onGoBack,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'estimate', label: 'Estimator', icon: <Calculator className="w-4 h-4" /> },
    { key: 'screen', label: 'Screener', icon: <ShieldAlert className="w-4 h-4" /> },
    { key: 'comparables', label: 'Listings', icon: <Search className="w-4 h-4" /> },
    { key: 'assistant', label: 'AI Analyst', icon: <MessageSquareCode className="w-4 h-4" /> },
    { key: 'reports', label: 'Audit & Model', icon: <FileText className="w-4 h-4" /> },
  ];

  const handleSelect = (key: TabKey) => {
    onSelectTab(key);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6 lg:px-8 pointer-events-none">
      <div className="max-w-[1360px] mx-auto pointer-events-auto">
        <div className="rounded-full bg-white/95 dark:bg-[#171815]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_30px_rgba(17,18,16,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] px-3 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8 transition-colors">
          {/* Zone 1: Geometric Skyline Brand Mark + Wordmark */}
          <button
            type="button"
            onClick={() => handleSelect('overview')}
            className="flex items-center text-left cursor-pointer group shrink-0 transition-transform duration-200 hover:scale-[1.015]"
            aria-label="PropMetric Home"
          >
            <PropMetricLogo size="md" />
          </button>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleSelect(tab.key)}
                  className={`relative px-3.5 py-2 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#111210] dark:text-[#111210] font-semibold'
                      : 'text-[#5E5E5A] dark:text-[#A3A39E] hover:text-[#111210] dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="hestora-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#F4F3EF] dark:bg-[#D9F935] -z-10"
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Back Control + Theme Switcher + Primary Action Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <AnimatePresence>
              {canGoBack && onGoBack && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  onClick={onGoBack}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-[#F4F3EF] dark:bg-white/[0.08] hover:bg-[#EAE8E1] dark:hover:bg-white/[0.14] text-xs font-medium text-[#111210] dark:text-white transition-colors cursor-pointer group shrink-0"
                  title={previousTabLabel ? `Back to ${previousTabLabel}` : 'Go back to previous page'}
                  aria-label={previousTabLabel ? `Back to ${previousTabLabel}` : 'Go back to previous page'}
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  <span>Back</span>
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F7F4] dark:bg-white/[0.05] text-[#111210] dark:text-white hover:bg-[#EFEDE7] dark:hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center justify-center shrink-0 overflow-hidden"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark or light mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -45, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 45, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center justify-center"
                  >
                    <Sun className="w-4 h-4 text-[#D9F935]" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 45, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -45, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center justify-center"
                  >
                    <Moon className="w-4 h-4 text-[#111210]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <button
              type="button"
              onClick={() => handleSelect('assistant')}
              className="hidden sm:inline-flex items-center gap-2.5 bg-[#111210] dark:bg-[#1F211C] hover:bg-[#232520] dark:hover:bg-[#2B2D27] text-white rounded-full p-1 pr-4 text-xs font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer group whitespace-nowrap shrink-0 border border-transparent dark:border-white/[0.12]"
            >
              <CircleArrow className="w-7 h-7 bg-[#D9F935] text-[#111210]" />
              <span>Ask AI Analyst</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F7F4] dark:bg-white/[0.05] text-[#111210] dark:text-white flex items-center justify-center cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden mt-2 rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.1] shadow-xl p-3 space-y-1"
            >
              {tabs.map((tab, idx) => {
                const isActive = activeTab === tab.key;
                return (
                  <motion.button
                    key={tab.key}
                    type="button"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.16, delay: idx * 0.03 }}
                    onClick={() => handleSelect(tab.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] font-semibold'
                        : 'text-[#5E5E5A] dark:text-[#A3A39E] hover:bg-[#F4F3EF] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 opacity-60" />
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
