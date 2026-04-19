import React from 'react';
import { Dua } from '../types';

type DuaBlockProps = {
  dua: Dua;
};

const DuaBlock: React.FC<DuaBlockProps> = ({ dua }) => {
  return (
    <div className="rounded-2xl bg-stitch-surface-low px-4 py-4 shadow-ambient">
      <p
        dir="rtl"
        className="font-arabic text-right text-[1.25rem] leading-[1.8] text-stitch-primary-mid md:text-[1.35rem]"
      >
        {dua.arabic}
      </p>
      <div className="mt-3 space-y-2 border-t border-stitch-outline/20 pt-3">
        <p className="text-[0.95rem] italic leading-relaxed text-stitch-on-variant">{dua.transliteration}</p>
        <p className="font-sans text-body text-stitch-on-surface">{dua.translation}</p>
      </div>
    </div>
  );
};

export default DuaBlock;
