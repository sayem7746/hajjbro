import React from 'react';
import { Sparkles } from 'lucide-react';
import { Dua } from '../types';

type DuaBlockProps = {
  dua: Dua;
};

/** Sacred-text card from the Stitch Tawaf screen: centered Arabic, gold rule, transliteration, translation. */
const DuaBlock: React.FC<DuaBlockProps> = ({ dua }) => {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-stitch-surface-low px-6 py-8 text-center shadow-ambient">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-stitch-gold/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center">
        <Sparkles className="mb-6 h-6 w-6 text-[#735c00]" aria-hidden />
        <p dir="rtl" className="mb-8 font-arabic text-[1.7rem] leading-[1.8] text-stitch-on-surface">
          {dua.arabic}
        </p>
        <div className="mb-8 h-0.5 w-12 bg-stitch-gold/40" />
        <p className="mb-4 text-lg font-medium italic leading-relaxed text-[#466270]">{dua.transliteration}</p>
        <p className="max-w-sm text-sm leading-relaxed text-stitch-on-variant">&quot;{dua.translation}&quot;</p>
      </div>
    </div>
  );
};

export default DuaBlock;
