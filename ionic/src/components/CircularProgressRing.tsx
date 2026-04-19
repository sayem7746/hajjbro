import React from 'react';

type CircularProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClass?: string;
  progressClass?: string;
};

const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percent,
  size = 120,
  stroke = 5,
  className = '',
  trackClass = 'text-border-soft',
  progressClass = 'text-brand',
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const dash = (p / 100) * c;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`-rotate-90 ${className}`}
      aria-hidden
    >
      <circle
        className={trackClass}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        cx={size / 2}
        cy={size / 2}
        r={r}
      />
      <circle
        className={progressClass}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        cx={size / 2}
        cy={size / 2}
        r={r}
      />
    </svg>
  );
};

export default CircularProgressRing;
