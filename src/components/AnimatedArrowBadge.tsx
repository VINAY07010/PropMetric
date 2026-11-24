import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useInView } from 'motion/react';

interface CircleArrowProps {
  className?: string;
  iconClassName?: string;
}

/**
 * Hestora-style circular badge with dual overlapping arrows that glide
 * diagonally top-right on parent `.group:hover`.
 */
export const CircleArrow: React.FC<CircleArrowProps> = ({
  className = 'w-7 h-7 bg-[#D9F935] text-[#111210]',
  iconClassName = 'w-3.5 h-3.5',
}) => {
  return (
    <span
      aria-hidden="true"
      className={`relative rounded-full flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] ${className}`}
    >
      <ArrowUpRight className={`${iconClassName} circle-arrow-icon-primary`} />
      <ArrowUpRight className={`${iconClassName} absolute circle-arrow-icon-secondary`} />
    </span>
  );
};

interface CountUpNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}

/**
 * Viewport-triggered tabular numeric count-up respecting reduced-motion preference.
 */
export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 950,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const [displayValue, setDisplayValue] = useState<number>(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayValue(value);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();
    const startVal = value * 0.25;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Smooth quintic ease-out
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplayValue(startVal + (value - startVal) * eased);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isInView, value, durationMs]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString('en-IN');

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
