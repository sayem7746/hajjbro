import React from 'react';
import { MapPin } from 'lucide-react';

/** Stitch-style map preview: dark frame, topo-like texture, location pill overlay. */
const HomeMapPreview: React.FC = () => (
  <div className="relative h-[200px] w-full overflow-hidden rounded-2xl bg-[#0c0f0d] shadow-inner">
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="home-map-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#1e3d32" strokeWidth="0.4" opacity={0.5} />
        </pattern>
        <linearGradient id="home-map-fade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14261f" />
          <stop offset="100%" stopColor="#0a0f0d" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#home-map-fade)" />
      <rect width="400" height="200" fill="url(#home-map-grid)" opacity={0.85} />
      <ellipse cx="210" cy="72" rx="140" ry="48" fill="rgba(45, 90, 84, 0.35)" />
      <ellipse cx="120" cy="130" rx="90" ry="35" fill="rgba(30, 58, 48, 0.5)" />
      <path
        d="M 0 120 Q 100 100 200 115 T 400 125 L 400 200 L 0 200 Z"
        fill="rgba(19, 66, 61, 0.25)"
      />
    </svg>
    <p className="pointer-events-none absolute bottom-10 left-3 right-3 text-center text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-white/35">
      Makkah region
    </p>
    <div className="absolute bottom-3 left-3 right-3 flex justify-center">
      <div className="flex max-w-[min(100%,340px)] items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2d5a54] text-white">
          <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#6b7280]">Your location</p>
          <p className="text-sm font-bold leading-tight text-[#1a1a1a]">Near Safa &amp; Marwa Hills</p>
        </div>
      </div>
    </div>
  </div>
);

export default HomeMapPreview;
