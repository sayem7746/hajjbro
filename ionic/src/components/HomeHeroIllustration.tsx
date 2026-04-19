import React from 'react';

/** Stitch-style sacred emblem: muted brand circle, gold mihrab line art, Kaaba. */
const HomeHeroIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`relative mx-auto flex aspect-square w-[min(72vw,280px)] max-w-[280px] items-center justify-center ${className}`}
    aria-hidden
  >
    <div
      className="absolute inset-0 rounded-full shadow-[0_8px_32px_rgba(19,66,61,0.18)]"
      style={{
        background: 'radial-gradient(circle at 30% 25%, #3d726b 0%, #2d5a54 42%, #234a45 100%)',
        border: '2px solid rgba(212, 175, 55, 0.45)',
      }}
    />
    <svg
      viewBox="0 0 200 200"
      className="relative z-[1] h-[78%] w-[78%]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mihrab arch */}
      <path
        d="M 40 145 Q 100 55 160 145"
        stroke="#D4AF37"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
        opacity={0.95}
      />
      <path
        d="M 48 138 Q 100 68 152 138"
        stroke="#D4AF37"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.45}
      />
      {/* Crescent + star */}
      <path
        d="M 100 38 C 88 38 78 46 78 56 C 78 66 88 72 100 72 C 94 68 92 62 92 56 C 92 46 96 38 100 38 Z"
        fill="#D4AF37"
        opacity={0.95}
      />
      <circle cx={108} cy={48} r={2.2} fill="#D4AF37" />
      {/* Kaaba */}
      <rect
        x={82}
        y={108}
        width={36}
        height={40}
        rx={1.5}
        fill="#1A1A1A"
        stroke="#D4AF37"
        strokeWidth={1.5}
      />
      <rect x={93} y={118} width={14} height={18} rx={0.5} fill="none" stroke="#D4AF37" strokeWidth={1.25} />
      <line x1={82} y1={118} x2={118} y2={118} stroke="#D4AF37" strokeWidth={1} opacity={0.85} />
      <line x1={82} y1={128} x2={118} y2={128} stroke="#D4AF37" strokeWidth={0.75} opacity={0.5} />
    </svg>
  </div>
);

export default HomeHeroIllustration;
