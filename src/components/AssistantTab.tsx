import React, { useState, useEffect, useRef } from 'react';
import { EstimationResult } from '../types';
import {
  Send,
  Sparkles,
  RefreshCw,
  Bot,
  User,
  Building,
  MapPin,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { formatInr, formatNumber, cleanListingUrl, MODEL_TOLERANCE_PERCENT } from '../utils/calculator';
import { motion, AnimatePresence } from 'motion/react';

export type AnalystRoleOption = 'strategist' | 'negotiator' | 'auditor';

export interface AnalystChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export const WELCOME_MESSAGE = `Welcome to the PropMetric AI Analyst.

I specialize in empirical property valuation, overpricing risk screening, and negotiation guidance across Mumbai and Pune (1,799 verified residential properties).

How to Get Started:
• Select any property from the Comparable Listings tab and click "Ask AI Analyst" to receive a tailored valuation brief.
• Choose an analytical role above (Deal Strategist, Negotiation Coach, or Due Diligence) to focus my advice.
• Ask follow-up questions naturally — full conversation context is maintained across turns.`;

interface AssistantTabProps {
  currentEstimate: EstimationResult;
  initialContext?: any;
  pendingBriefNonce?: number;
  onConsumeBriefNonce?: () => void;
  messages?: AnalystChatMessage[];
  onMessagesChange?: React.Dispatch<React.SetStateAction<AnalystChatMessage[]>>;
  activeProperty?: any;
  onActivePropertyChange?: (prop: any) => void;
  analystRole?: AnalystRoleOption;
  onAnalystRoleChange?: (role: AnalystRoleOption) => void;
}

// Clean inline renderer: parses links, bold text, and code chips without raw markdown syntax
const renderInline = (text: string) => {
  const parts: React.ReactNode[] = [];
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];

    if (token.startsWith('[') && token.includes('](')) {
      const closeBracket = token.indexOf('](');
      const label = token.substring(1, closeBracket);
      const url = token.substring(closeBracket + 2, token.length - 1);
      parts.push(
        <a
          key={`link-${key++}`}
          href={cleanListingUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#111210] dark:text-[#D9F935] font-semibold underline underline-offset-2 inline-flex items-center gap-0.5 ml-1"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.substring(2, token.length - 2);
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-[#111210] dark:text-white">
          {inner}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.substring(1, token.length - 1);
      parts.push(
        <span
          key={`code-${key++}`}
          className="font-mono text-[11px] bg-black/[0.06] dark:bg-white/[0.1] text-[#111210] dark:text-[#D9F935] px-1.5 py-0.5 rounded-md"
        >
          {inner}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

// Clean message formatter: eliminates raw markdown hashes and asterisks, rendering styled UI elements
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const rawLines = content.split('\n');
  const elements: React.ReactNode[] = [];

  rawLines.forEach((rawLine, idx) => {
    let line = rawLine.trim();

    const wasHashHeading = line.startsWith('#');
    if (wasHashHeading) {
      line = line.replace(/^#+\s*/, '').trim();
    }

    if (!line) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      return;
    }

    const isNumberedHeading = /^[0-9]+\.\s+[A-Z]/.test(line);
    const isSectionHeading =
      wasHashHeading ||
      isNumberedHeading ||
      /^(Property Valuation Summary|Recommended Next Inquiries|Strategic Negotiation Roadmap|Follow-Up Strategy|Buyer Due Diligence|Overpricing Screening|Micro-Market Analysis|Verified Comparable Properties|Side-by-Side Comparison Analysis|Analytical Takeaway)/i.test(
        line
      );

    if (isSectionHeading) {
      elements.push(
        <div
          key={`h-${idx}`}
          className={`font-display font-medium tracking-tight text-[#111210] dark:text-white ${
            wasHashHeading || idx === 0
              ? 'text-sm mt-2 mb-1.5 border-b border-black/[0.08] dark:border-white/[0.1] pb-1.5'
              : 'text-xs mt-2.5 mb-0.5'
          }`}
        >
          {renderInline(line)}
        </div>
      );
      return;
    }

    const isBullet = line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ');
    if (isBullet) {
      const cleanBulletText = line.replace(/^[•\-\*]\s*/, '').trim();
      elements.push(
        <div
          key={`b-${idx}`}
          className="flex items-start gap-2 my-1 text-xs text-[#2B2B28] dark:text-[#E5E5DF] pl-1 leading-relaxed"
        >
          <span className="text-[#111210] dark:text-[#D9F935] font-bold shrink-0 mt-0.5">•</span>
          <div className="flex-1">{renderInline(cleanBulletText)}</div>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${idx}`} className="my-1 text-xs leading-relaxed text-[#2B2B28] dark:text-[#E5E5DF]">
        {renderInline(line)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
};

export const AssistantTab: React.FC<AssistantTabProps> = ({
  currentEstimate,
  initialContext,
  pendingBriefNonce = 0,
  onConsumeBriefNonce,
  messages: controlledMessages,
  onMessagesChange,
  activeProperty: controlledActiveProperty,
  onActivePropertyChange,
  analystRole: controlledRole,
  onAnalystRoleChange,
}) => {
  const [localActiveProperty, setLocalActiveProperty] = useState<any>(initialContext || null);
  const activeProperty = controlledActiveProperty !== undefined ? controlledActiveProperty : localActiveProperty;
  const setActiveProperty = (val: any) => {
    if (onActivePropertyChange) onActivePropertyChange(val);
    else setLocalActiveProperty(val);
  };

  const [localRole, setLocalRole] = useState<AnalystRoleOption>('strategist');
  const analystRole = controlledRole !== undefined ? controlledRole : localRole;
  const setAnalystRole = (val: AnalystRoleOption) => {
    if (onAnalystRoleChange) onAnalystRoleChange(val);
    else setLocalRole(val);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [localMessages, setLocalMessages] = useState<AnalystChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: 'Just now',
    },
  ]);
  const messages = controlledMessages !== undefined ? controlledMessages : localMessages;
  const setMessages = onMessagesChange || setLocalMessages;

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Analyzing valuation and market data...');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedNonceRef = useRef<number>(0);

  // Trigger initial property brief only when user explicitly opens AI Analyst for a property (pendingBriefNonce > 0)
  useEffect(() => {
    if (
      initialContext &&
      pendingBriefNonce > 0 &&
      consumedNonceRef.current !== pendingBriefNonce
    ) {
      consumedNonceRef.current = pendingBriefNonce;
      onConsumeBriefNonce?.();
      setActiveProperty(initialContext);
      generateInitialPropertyBrief(initialContext);
    }
  }, [pendingBriefNonce, initialContext]);

  // Scroll to bottom when thread grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Shared SSE streaming helper with proper error propagation
  const streamAnalystResponse = async (
    queryText: string,
    propContext: any,
    historyPayload: Array<{ role: 'user' | 'assistant'; content: string }>,
    msgId: string
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let inserted = false;

    const upsertAssistantMessage = (content: string) => {
      if (!inserted) {
        inserted = true;
        setMessages((prev) => [
          ...prev,
          { id: msgId, role: 'assistant', content, timestamp },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content } : m))
        );
      }
    };

    const payloadWithRole = { ...propContext, analyst_role: analystRole };

    const res = await fetch('/api/assistant/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryText,
        context: payloadWithRole,
        history: historyPayload,
      }),
    });

    if (!res.ok || !res.body) {
      const jsonRes = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, context: payloadWithRole, history: historyPayload }),
      });
      const data = await jsonRes.json().catch(() => ({}));
      if (!jsonRes.ok) {
        throw new Error(data.error || `Request failed (${jsonRes.status})`);
      }
      upsertAssistantMessage(data.response || 'No analysis generated.');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        let payload: any = null;
        try {
          payload = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (payload.type === 'stage' && payload.stageText) {
          setLoadingStage(payload.stageText);
        } else if ((payload.type === 'text' || payload.type === 'done') && payload.text) {
          upsertAssistantMessage(payload.text);
        } else if (payload.type === 'error') {
          throw new Error(payload.error || 'Unable to generate analysis right now.');
        }
      }
    }

    if (!inserted) {
      upsertAssistantMessage('No analysis generated.');
    }
  };

  const generateInitialPropertyBrief = async (propContext: any) => {
    const isComparison = Boolean(propContext.comparison_mode && Array.isArray(propContext.properties));
    const pTitle = propContext.title || 'Selected Property';
    const pLoc = propContext.locality || propContext.city || '';
    const askInr = propContext.seller_asking_price || propContext.price_inr;

    const initialUserMsg: AnalystChatMessage = {
      id: `prop-req-${Date.now()}`,
      role: 'user',
      content: isComparison
        ? `Compare these ${propContext.properties_count} pinned properties side-by-side and identify which offers the best risk-adjusted value and why.`
        : `Give a sharp, practical assessment for ${pTitle} in ${pLoc}${askInr ? ` (Quoted: ${formatInr(askInr)})` : ''}: pricing fairness, biggest hidden risks or edge, and exact target offer.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([initialUserMsg]);
    setIsLoading(true);

    try {
      await streamAnalystResponse(
        initialUserMsg.content,
        propContext,
        [],
        `prop-res-${Date.now()}`
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `prop-err-${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'Unable to generate property analysis right now. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: AnalystChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const payloadContext = activeProperty || {
        city: currentEstimate.city,
        locality: currentEstimate.locality,
        bhk: currentEstimate.bhk,
        area_sqft: currentEstimate.area_sqft,
        estimated_price_inr: currentEstimate.estimated_price_inr,
        estimated_rate_per_sqft: currentEstimate.estimated_rate_per_sqft,
        tolerance_band_percent: currentEstimate.tolerance_band_percent,
      };

      const historyPayload = messages
        .filter((m) => !m.isError)
        .slice(-14)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      await streamAnalystResponse(
        query,
        payloadContext,
        historyPayload,
        `msg-assistant-${Date.now()}`
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'Unable to complete the inquiry right now. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryError = async (errorMsgId: string) => {
    if (isLoading) return;
    const errIdx = messages.findIndex((m) => m.id === errorMsgId);
    if (errIdx <= 0) return;

    let targetUserQuery = '';
    let userIdx = -1;
    for (let i = errIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        targetUserQuery = messages[i].content;
        userIdx = i;
        break;
      }
    }
    if (!targetUserQuery || userIdx < 0) return;

    const priorHistory = messages
      .slice(0, userIdx)
      .filter((m) => !m.isError)
      .slice(-14)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
    setIsLoading(true);

    try {
      const payloadContext = activeProperty || {
        city: currentEstimate.city,
        locality: currentEstimate.locality,
        bhk: currentEstimate.bhk,
        area_sqft: currentEstimate.area_sqft,
        estimated_price_inr: currentEstimate.estimated_price_inr,
        estimated_rate_per_sqft: currentEstimate.estimated_rate_per_sqft,
        tolerance_band_percent: currentEstimate.tolerance_band_percent,
      };

      await streamAnalystResponse(
        targetUserQuery,
        payloadContext,
        priorHistory,
        `msg-retry-${Date.now()}`
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'Unable to complete the inquiry right now. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: 'Just now',
      },
    ]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isComparisonActive = Boolean(activeProperty?.comparison_mode && Array.isArray(activeProperty?.properties));

  // Property prompt templates
  const propertyQuickPrompts = isComparisonActive
    ? [
        'Which pinned property has the strongest risk-adjusted value?',
        'How should I negotiate on the best-value listing in this group?',
        'Compare the carpet area efficiency and rate per sqft across these flats.',
        'What legal documents should I check before shortlisting one?',
      ]
    : activeProperty
    ? [
        `What is the ideal counter-offer price for this property?`,
        `Calculate all-in cost, stamp duty & EMI for this flat`,
        `Why is this listing priced ${activeProperty.difference_percent >= 0 ? '+' : ''}${activeProperty.difference_percent}% vs model?`,
        `How does ₹${formatNumber(activeProperty.price_per_sqft || 0)}/sqft compare with the ${activeProperty.locality || activeProperty.city} median?`,
        `Draft a firm negotiation message to send to the seller or broker`,
        `What are the essential due diligence checks to inspect for this flat?`,
      ]
    : [
        'Compare Kharadi vs Baner rates, supply & value',
        'Calculate all-in cost, stamp duty & EMI for my budget',
        `Top 5 most affordable localities in ${currentEstimate.city}`,
        'Why is Mumbai asking rate 2.7x higher per sqft than Pune?',
        'How should a buyer negotiate if a listing is flagged "Above model estimate"?',
      ];

  return (
    <div className="space-y-6">
      {/* Hestora Editorial Page Header */}
      <div className="rounded-[28px] bg-[#F4F3EF] dark:bg-[#171815] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.12] px-3.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[#111210] dark:text-[#E5E5DF] mb-3">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-[#111210] dark:bg-[#D9F935]" />
              <span>AI Analyst</span>
            </div>
            <h1
              className="font-display font-medium tracking-[-0.03em] text-2xl sm:text-3xl text-[#111210] dark:text-white leading-[1.1]"
              style={{ textWrap: 'balance' }}
            >
              PropMetric AI <span className="text-[#9E9E98] dark:text-[#666660]">Analyst.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5E5E5A] dark:text-[#9E9E98] mt-1.5 max-w-2xl">
              Empirical asking price evaluation, overpricing risk screening, and negotiation guidance across Mumbai and Pune.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1] px-4 py-2 text-xs font-medium text-[#111210] dark:text-[#E5E5DF] self-start lg:self-auto shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#D9F935] ring-2 ring-[#111210]/15 dark:ring-[#D9F935]/30" />
            <span>Grounded in 1,799 Listings · ±{MODEL_TOLERANCE_PERCENT}% Tolerance</span>
          </div>
        </div>
      </div>

      {/* Active Property Dossier Banner (Obsidian Showcase) */}
      <AnimatePresence>
        {activeProperty && !isComparisonActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-3xl bg-[#141513] text-white border border-white/[0.08] p-5 sm:p-6 shadow-[0_16px_40px_rgba(17,18,16,0.12)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#D9F935] text-[#111210]">
                    {activeProperty.property_id || activeProperty.id || 'SELECTED LISTING'}
                  </span>
                  <span className="text-xs font-medium text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D9F935]" />
                    {activeProperty.locality ? `${activeProperty.locality}, ${activeProperty.city}` : activeProperty.city}
                  </span>
                  <span className="text-xs text-[#9E9E98]">
                    · {activeProperty.bhk} BHK ({activeProperty.area_sqft || 0} sqft)
                  </span>
                </div>
                <h3 className="font-display text-base font-medium text-white line-clamp-1">
                  {activeProperty.title}
                </h3>
                <p className="text-xs text-[#A3A39E] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#9E9E98]" />
                  <span>
                    Society: <strong className="text-white">{activeProperty.society || 'Standalone Property'}</strong>
                  </span>
                  {activeProperty.furnishing && <span>· {activeProperty.furnishing}</span>}
                  {activeProperty.status && <span>· {activeProperty.status}</span>}
                </p>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-white/[0.1] pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-1">
                <div>
                  <span className="text-[11px] uppercase text-[#9E9E98] block sm:text-right">Quoted Asking Price</span>
                  <span className="text-lg font-bold font-mono text-white tabular-nums">
                    {formatInr(activeProperty.seller_asking_price || activeProperty.price_inr)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-[#D9F935] tabular-nums">
                    Model: {formatInr(activeProperty.estimated_price_inr)} (
                    {activeProperty.difference_percent >= 0 ? '+' : ''}
                    {activeProperty.difference_percent}%)
                  </span>
                </div>
                {activeProperty.listing_url && (
                  <a
                    href={cleanListingUrl(activeProperty.listing_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#E5E5DF] hover:text-[#D9F935] mt-0.5"
                  >
                    <span>Portal Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {isComparisonActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-3xl bg-[#141513] text-white border border-white/[0.08] p-5 sm:p-6 shadow-[0_16px_40px_rgba(17,18,16,0.12)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#D9F935] text-[#111210] inline-block">
                  COMPARISON MODE · {activeProperty.properties_count} LISTINGS
                </span>
                <h3 className="font-display text-base font-medium text-white">
                  Side-by-Side Portfolio Comparison
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeProperty.properties.map((p: any) => (
                  <span
                    key={p.id}
                    className="text-xs font-mono bg-white/[0.08] border border-white/[0.1] px-3 py-1 rounded-full text-[#E5E5DF]"
                  >
                    {p.id} · {formatInr(p.asking_price)}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages Thread (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] flex flex-col h-[610px] overflow-hidden">
          {/* Role Selector & Conversation Bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-black/[0.07] dark:border-white/[0.08] bg-[#F4F3EF]/60 dark:bg-[#141513] flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#111210] border border-black/[0.08] dark:border-white/[0.1]">
              {(
                [
                  { id: 'strategist', label: 'Deal Strategist' },
                  { id: 'negotiator', label: 'Negotiation Coach' },
                  { id: 'auditor', label: 'Due Diligence' },
                ] as const
              ).map((r) => {
                const isSelected = analystRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAnalystRole(r.id)}
                    className={`relative px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap z-0 ${
                      isSelected
                        ? 'text-white dark:text-[#111210] font-semibold'
                        : 'text-[#5E5E5A] dark:text-[#A3A39E] hover:text-[#111210] dark:hover:text-white'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="analyst-role-pill"
                        transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[#111210] dark:bg-[#D9F935] -z-10"
                      />
                    )}
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleResetChat}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5E5E5A] dark:text-[#9E9E98] hover:text-[#111210] dark:hover:text-white px-2.5 py-1 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40"
              title="Start a fresh conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>New Thread</span>
            </button>
          </div>

          {/* Scrollable messages */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-start gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        m.isError
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-[#111210] dark:bg-[#D9F935] text-[#D9F935] dark:text-[#111210]'
                      }`}
                    >
                      {m.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                  )}

                  <div
                    className={`max-w-[86%] rounded-2xl p-4 text-xs leading-relaxed group relative ${
                      m.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                        : isAssistant
                        ? 'bg-[#F4F3EF] dark:bg-[#1E201C] text-[#111210] dark:text-[#E5E5DF]'
                        : 'bg-[#111210] dark:bg-[#D9F935] text-white dark:text-[#111210] font-medium'
                    }`}
                  >
                    {isAssistant && !m.isError && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="absolute right-3 top-3 text-[#5E5E5A] dark:text-[#9E9E98] hover:text-[#111210] dark:hover:text-white opacity-60 hover:opacity-100 transition-opacity p-1 cursor-pointer"
                        title="Copy analysis"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#D9F935]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {isAssistant ? (
                      <FormattedMessage content={m.content} />
                    ) : (
                      <div className="whitespace-pre-line">{m.content}</div>
                    )}

                    <div
                      className={`mt-2.5 pt-1.5 border-t flex items-center justify-between text-[10px] ${
                        isAssistant
                          ? 'border-black/[0.06] dark:border-white/[0.08] text-[#8C8C86]'
                          : 'border-white/[0.12] dark:border-black/[0.1] text-white/60 dark:text-black/60'
                      }`}
                    >
                      <span>{m.timestamp}</span>
                      {m.isError && (
                        <button
                          type="button"
                          onClick={() => handleRetryError(m.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-200 hover:underline cursor-pointer disabled:opacity-40"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-[#F4F3EF] dark:bg-white/[0.1] text-[#111210] dark:text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#5E5E5A] dark:text-[#9E9E98] italic p-3.5 bg-[#F4F3EF] dark:bg-[#111210] rounded-2xl w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#111210] dark:text-[#D9F935]" />
                <span>{loadingStage}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-3.5 border-t border-black/[0.07] dark:border-white/[0.08] bg-[#F4F3EF]/70 dark:bg-[#141513]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  activeProperty && !isComparisonActive
                    ? `Ask about ${activeProperty.locality || activeProperty.title}: counter-offers, rate per sqft, overpricing reasons...`
                    : 'Ask about Mumbai/Pune rates, tolerance corridor, or counter-offer strategy...'
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 text-xs border border-black/[0.08] dark:border-white/[0.1] rounded-full px-4 py-3 bg-white dark:bg-[#111210] text-[#111210] dark:text-white placeholder:text-[#8C8C86] focus:outline-none focus:ring-2 focus:ring-[#111210] dark:focus:ring-[#D9F935]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="bg-[#111210] dark:bg-[#D9F935] hover:bg-[#232520] dark:hover:bg-[#cae92b] disabled:opacity-40 text-white dark:text-[#111210] px-5 py-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97] cursor-pointer shrink-0 group"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar: Quick Prompt Chips (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#171815] border border-black/[0.08] dark:border-white/[0.08] p-6 space-y-4">
            <h2 className="font-display font-medium text-sm text-[#111210] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#111210] dark:text-[#D9F935]" />
              <span>{activeProperty ? 'Recommended Inquiries' : 'Market Analysis Prompts'}</span>
            </h2>
            <div className="space-y-2.5">
              {propertyQuickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left p-3.5 rounded-2xl bg-[#F4F3EF] dark:bg-[#111210] border border-transparent hover:border-black/20 dark:hover:border-[#D9F935]/40 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-xs text-[#111210] dark:text-[#E5E5DF] cursor-pointer disabled:opacity-50 flex items-center justify-between gap-2 group"
                >
                  <span className="leading-snug">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5E5E5A] group-hover:text-[#111210] dark:group-hover:text-[#D9F935] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {activeProperty && (
            <button
              type="button"
              onClick={() => {
                setActiveProperty(null);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `reset-${Date.now()}`,
                    role: 'assistant',
                    content: `Switched back to general market analysis for Mumbai and Pune. You can select another property from the Comparable Listings tab at any time.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="w-full py-3 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#171815] text-xs font-medium text-[#111210] dark:text-white hover:bg-[#F4F3EF] dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-center"
            >
              Clear Property Context (General Mode)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
