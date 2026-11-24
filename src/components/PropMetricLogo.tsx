import React from 'react';

interface PropMetricLogoProps {
  /** Force dark palette even when page is in light mode (e.g., on #141513 footer) */
  forceDarkSurface?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export const PropMetricLogo: React.FC<PropMetricLogoProps> = ({
  forceDarkSurface = false,
  size = 'md',
  showWordmark = true,
}) => {
  const iconDims =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8 sm:w-9 sm:h-9';
  const textSize =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : 'text-lg sm:text-[19px]';

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {/* Geometric Skyline Architectural Mark matched to site color scheme */}
      <svg
        viewBox="0 0 46 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDims} shrink-0`}
        aria-hidden="true"
      >
        {/* Outer Left Architectural Frame & High Peak Ridge */}
        <path
          d="M4 38V15.5L21 3L24.5 5.6L21.5 8.5L10.2 16.8V38H4Z"
          className={
            forceDarkSurface
              ? 'fill-white'
              : 'fill-[#111210] dark:fill-white'
          }
        />

        {/* Subtle Inner Architectural Bevel Highlight */}
        <path
          d="M4 15.5L21 3V6.4L6.8 16.8V38H4V15.5Z"
          className={
            forceDarkSurface
              ? 'fill-[#D4D4CE]'
              : 'fill-[#3A3C36] dark:fill-[#D4D4CE]'
          }
        />

        {/* First Ascending Skyline Bar (Warm Stone) */}
        <path
          d="M13 38V27.5L19 23.8V38H13Z"
          className={
            forceDarkSurface
              ? 'fill-[#9E9E98]'
              : 'fill-[#5E5E5A] dark:fill-[#9E9E98]'
          }
        />

        {/* Second Taller Ascending Skyline Bar (Chartreuse-Lime Accent) */}
        <path
          d="M22 38V22L28.5 18.8V38H22Z"
          className={
            forceDarkSurface
              ? 'fill-[#D9F935]'
              : 'fill-[#D9F935] stroke-[#111210] dark:stroke-none'
          }
          strokeWidth={forceDarkSurface ? 0 : 1}
          strokeLinejoin="round"
        />

        {/* Right Architectural Wing & Sloped Roof Canopy (Chartreuse-Lime Accent) */}
        <path
          d="M22.5 6L41.5 20L39.5 22.8V38H32.5V20.5L22.5 13V6Z"
          className={
            forceDarkSurface
              ? 'fill-[#D9F935]'
              : 'fill-[#D9F935] stroke-[#111210] dark:stroke-none'
          }
          strokeWidth={forceDarkSurface ? 0 : 1}
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-display font-semibold ${textSize} tracking-[-0.03em] whitespace-nowrap leading-none`}
        >
          <span
            className={
              forceDarkSurface ? 'text-white' : 'text-[#111210] dark:text-white'
            }
          >
            Prop
          </span>
          <span
            className={
              forceDarkSurface
                ? 'text-[#D9F935]'
                : 'text-[#5E5E5A] dark:text-[#D9F935]'
            }
          >
            Metric
          </span>
        </span>
      )}
    </span>
  );
};
