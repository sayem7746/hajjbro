import { ChecklistItem } from '../types';

export const defaultChecklist: ChecklistItem[] = [
  // Documents
  { id: 'doc-1', category: 'documents', label: 'Valid passport (6+ months validity)', checked: false },
  { id: 'doc-2', category: 'documents', label: 'Hajj visa obtained', checked: false },
  { id: 'doc-3', category: 'documents', label: 'Vaccination certificates (Meningitis, COVID)', checked: false },
  { id: 'doc-4', category: 'documents', label: 'Travel insurance documents', checked: false },
  { id: 'doc-5', category: 'documents', label: 'Hotel & flight booking confirmations', checked: false },
  { id: 'doc-6', category: 'documents', label: 'Emergency contact list printed', checked: false },
  { id: 'doc-7', category: 'documents', label: 'Copies of all documents (physical & digital)', checked: false },

  // Packing
  { id: 'pack-1', category: 'packing', label: 'Ihram garments (2 sets for men)', checked: false },
  { id: 'pack-2', category: 'packing', label: 'Comfortable walking shoes / sandals', checked: false },
  { id: 'pack-3', category: 'packing', label: 'Unscented soap, shampoo & toiletries', checked: false },
  { id: 'pack-4', category: 'packing', label: 'Sunscreen (unscented)', checked: false },
  { id: 'pack-5', category: 'packing', label: 'Prayer mat (lightweight)', checked: false },
  { id: 'pack-6', category: 'packing', label: 'Quran / dua book', checked: false },
  { id: 'pack-7', category: 'packing', label: 'Waist pouch / money belt', checked: false },
  { id: 'pack-8', category: 'packing', label: 'Reusable water bottle', checked: false },
  { id: 'pack-9', category: 'packing', label: 'Umbrella for sun protection', checked: false },
  { id: 'pack-10', category: 'packing', label: 'Small backpack / day bag', checked: false },

  // Health
  { id: 'health-1', category: 'health', label: 'Visit doctor for health check-up', checked: false },
  { id: 'health-2', category: 'health', label: 'Required vaccinations completed', checked: false },
  { id: 'health-3', category: 'health', label: 'Prescription medications (extra supply)', checked: false },
  { id: 'health-4', category: 'health', label: 'First aid kit (band-aids, painkillers)', checked: false },
  { id: 'health-5', category: 'health', label: 'Electrolyte sachets / rehydration salts', checked: false },

  // Spiritual preparation
  { id: 'spirit-1', category: 'spiritual', label: 'Learn Hajj rituals and their sequence', checked: false },
  { id: 'spirit-2', category: 'spiritual', label: 'Memorize the Talbiyah', checked: false },
  { id: 'spirit-3', category: 'spiritual', label: 'Learn essential duas for each ritual', checked: false },
  { id: 'spirit-4', category: 'spiritual', label: 'Repent and seek forgiveness from others', checked: false },
  { id: 'spirit-5', category: 'spiritual', label: 'Settle all debts and write a will', checked: false },
  { id: 'spirit-6', category: 'spiritual', label: 'Make sincere niyyah (intention) for Hajj', checked: false },
  { id: 'spirit-7', category: 'spiritual', label: 'Prepare a personal dua list', checked: false },

  // Before travel
  { id: 'travel-1', category: 'before_travel', label: 'Confirm all bookings (flights, hotel, transport)', checked: false },
  { id: 'travel-2', category: 'before_travel', label: 'Arrange affairs at home', checked: false },
  { id: 'travel-3', category: 'before_travel', label: 'Inform family and seek their duas', checked: false },
  { id: 'travel-4', category: 'before_travel', label: 'Exchange currency to Saudi Riyals', checked: false },
  { id: 'travel-5', category: 'before_travel', label: 'Download offline maps of Makkah & Madinah', checked: false },
  { id: 'travel-6', category: 'before_travel', label: 'Charge devices and bring power bank', checked: false },
];

export const categoryLabels: Record<ChecklistItem['category'], string> = {
  documents: 'Documents',
  packing: 'Packing Essentials',
  health: 'Health & Medical',
  spiritual: 'Spiritual Preparation',
  before_travel: 'Before Travel',
};

export const categoryIcons: Record<ChecklistItem['category'], string> = {
  documents: 'document-text-outline',
  packing: 'bag-outline',
  health: 'medkit-outline',
  spiritual: 'book-outline',
  before_travel: 'airplane-outline',
};
