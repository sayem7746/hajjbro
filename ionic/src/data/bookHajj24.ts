/**
 * Book Hajj 24 — reference content aligned with docs/book-hajj-24.md.
 * English summaries for in-app use; verify rulings with qualified scholars.
 */

export interface BookHajj24Section {
  id: string;
  title: string;
  paragraphs: string[];
  /** HajjBro ritual ids — see data/rituals.ts */
  relatedRitualIds?: string[];
}

export const bookHajj24Meta = {
  title: 'Book Hajj 24',
  subtitle: 'Reference guide (summarized)',
  pages: 25,
  sourceNote:
    'Based on the Book Hajj 24 booklet (Bengali). Contact on original cover: +966 536 842 365.',
};

export const bookHajj24Sections: BookHajj24Section[] = [
  {
    id: 'about',
    title: 'About this guide',
    paragraphs: [
      'Book Hajj 24 is a compact Hajj manual covering method, etiquette, locations, and common questions. The original is written in Bangla with Qur’ān and hadith references.',
      'This app section gives an English overview for planning and study. It is not a substitute for learning from qualified scholars or your group leader.',
    ],
  },
  {
    id: 'overview',
    title: 'Hajj in outline',
    paragraphs: [
      'Hajj brings together intention (niyyah), ihrām at the miqāt, standing at ‘Arafāt, overnight stay at Muzdalifah, stoning at the Jamarāt, sacrifice where required, shaving or trimming, ṭawāf and sa‘y, and the days at Minā.',
      'Umrah can be performed before or separately: ihrām, ṭawāf, sa‘y, and release from ihrām (often by halq/taqsīr for those doing Tamattu‘). Your mahdhhab and package may define the exact sequence.',
    ],
    relatedRitualIds: ['ihram', 'tawaf-qudum', 'sai'],
  },
  {
    id: 'adab',
    title: 'General fiqh and adab',
    paragraphs: [
      'The booklet stresses good character with other pilgrims, patience in crowds, and avoiding harm—speech and action—that breaks ihrām or hurts others.',
      'Learn the prohibitions of ihrām early so mistakes are easier to avoid. When in doubt, ask your scholar rather than guessing.',
    ],
    relatedRitualIds: ['ihram'],
  },
  {
    id: 'ihram-miqat',
    title: 'Ihrām and the miqāt',
    paragraphs: [
      'Enter ihrām before crossing the miqāt boundary en route to al-Masjid al-Ḥarām for Hajj or ‘Umrah. Ghusl, clean clothing, and the talbiyah follow the intention.',
      'Men wear two unstitched cloths; women cover modestly without face or hand covering if that is their usual custom. Perfume is for before ihrām, not after the niyyah.',
    ],
    relatedRitualIds: ['ihram'],
  },
  {
    id: 'arafat-muzdalifah',
    title: '‘Arafāt and Muzdalifah',
    paragraphs: [
      'Wuquf on the Day of ‘Arafah is the heart of Hajj for many pilgrims: stay within the bounds from ẓuhr until maghrib in a state of du‘ā’, dhikr, and reflection.',
      'After sunset, travel to Muzdalifah for maghrib and ‘ishā’ combined and rest. Collect pebbles for stoning according to your instruction set.',
    ],
    relatedRitualIds: ['arafah', 'muzdalifah'],
  },
  {
    id: 'tawaf-sai',
    title: 'Ṭawāf and sa‘y',
    paragraphs: [
      'Ṭawāf is seven circuits of the Ka‘bah beginning at the Black Stone, men doing idṭibā‘ and raml in the first three where prescribed. Follow with two rak‘ahs and Zamzam.',
      'Sa‘y is seven lengths between Ṣafā and Marwah, starting at Ṣafā. The green markers indicate where men jog; women walk normally.',
    ],
    relatedRitualIds: ['tawaf-qudum', 'sai', 'tawaf-ifadah', 'tawaf-wada'],
  },
  {
    id: 'mina-jamarat',
    title: 'Minā and the Jamarāt',
    paragraphs: [
      'Minā is the camp of the days of tashrīq for many pilgrims: stoning, sacrifice (for those who must), and shaving or trimming.',
      'Stoning follows the order and size of pebbles taught by your teachers. Crowds require extra patience; follow official routes when directed.',
    ],
    relatedRitualIds: ['mina-8th', 'rami-10th', 'tashreeq', 'hady', 'halq'],
  },
  {
    id: 'women',
    title: 'Women pilgrims',
    paragraphs: [
      'The booklet includes rulings specific to women: ihrām clothing, companionship (maḥram where required), menstruation and nifās (affecting ṭawāf timing for many madhāhib), and adab in crowded rites.',
      'Practices differ by school; use this app’s ritual steps as a general map and confirm with your scholar for your situation.',
    ],
    relatedRitualIds: ['ihram', 'tawaf-ifadah'],
  },
  {
    id: 'makkah-daily',
    title: 'Makkah routine and maps',
    paragraphs: [
      'Between obligations, pilgrims rest, make extra ṭawāf, and visit the Ḥaram with care for prayer times and crowd safety.',
      'Schematic maps in the booklet show key camps and routes; your group’s live map and security instructions take priority on the ground.',
    ],
    relatedRitualIds: ['tawaf-qudum', 'tawaf-wada'],
  },
  {
    id: 'departure',
    title: 'Farewell and departure',
    paragraphs: [
      'Farewell ṭawāf (ṭawāf al-wadā‘) is required for those leaving Makkah after Hajj, with sa‘y not repeated if already done with an earlier ṭawāf.',
      'Review common mistakes—missing wuquf timing, incorrect stoning order, or ṭawāf before ḥalāl state where applicable—and seek expiation when your scholar advises it.',
    ],
    relatedRitualIds: ['tawaf-wada', 'halq'],
  },
  {
    id: 'official',
    title: 'Official information',
    paragraphs: [
      'The printed booklet includes organizational lists and contact-style information relevant to the issuing authority. Always follow current Saudi Hajj Ministry rules, your mutawwif, and embassy travel advice.',
      'For medical or legal emergencies, use contacts provided by your group and local emergency services.',
    ],
  },
];
