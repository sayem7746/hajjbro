import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Rituals
  const rituals = await Promise.all([
    prisma.ritual.upsert({
      where: { slug: 'ihram' },
      create: { slug: 'ihram', nameEn: 'Ihram', nameAr: 'الإحرام', order: 1, dayOfHajj: 1, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'tawaf' },
      create: { slug: 'tawaf', nameEn: 'Tawaf', nameAr: 'الطواف', order: 2, dayOfHajj: 1, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'sai' },
      create: { slug: 'sai', nameEn: "Sa'i", nameAr: 'السعي', order: 3, dayOfHajj: 1, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'wuquf-arafat' },
      create: { slug: 'wuquf-arafat', nameEn: "Wuquf at Arafat", nameAr: 'الوقوف بعرفة', order: 4, dayOfHajj: 2, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'muzdalifah' },
      create: { slug: 'muzdalifah', nameEn: 'Muzdalifah', nameAr: 'مزدلفة', order: 5, dayOfHajj: 2, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'ramy-jamarat' },
      create: { slug: 'ramy-jamarat', nameEn: 'Ramy al-Jamarat', nameAr: 'رمي الجمرات', order: 6, dayOfHajj: 3, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'tawaf-al-ifadah' },
      create: { slug: 'tawaf-al-ifadah', nameEn: 'Tawaf al-Ifadah', nameAr: 'طواف الإفاضة', order: 7, dayOfHajj: 3, isRequired: true },
      update: {},
    }),
    prisma.ritual.upsert({
      where: { slug: 'halq-taqsir' },
      create: { slug: 'halq-taqsir', nameEn: 'Halq or Taqsir', nameAr: 'الحلق أو التقصير', order: 8, dayOfHajj: 3, isRequired: true },
      update: {},
    }),
  ]);

  // Locations – major Hajj sites (GPS coordinates)
  await Promise.all([
    prisma.location.upsert({
      where: { slug: 'makkah' },
      create: { slug: 'makkah', nameEn: 'Makkah', nameAr: 'مكة', type: 'makkah', latitude: 21.4225, longitude: 39.8262, description: 'The holy city of Makkah' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'kaaba' },
      create: { slug: 'kaaba', nameEn: 'Kaaba', nameAr: 'الكعبة', type: 'makkah', latitude: 21.4225, longitude: 39.8262, description: 'The House of Allah at the centre of Masjid al-Haram' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'masjid-al-haram' },
      create: { slug: 'masjid-al-haram', nameEn: 'Masjid al-Haram', nameAr: 'المسجد الحرام', type: 'makkah', latitude: 21.4225, longitude: 39.8262, description: 'The Grand Mosque surrounding the Kaaba' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'mina' },
      create: { slug: 'mina', nameEn: 'Mina', nameAr: 'منى', type: 'mina', latitude: 21.4133, longitude: 39.8933, description: 'Tent city for pilgrims during the days of Tashreeq' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'jamarat' },
      create: { slug: 'jamarat', nameEn: 'Jamarat (Pillars)', nameAr: 'الجمرات', type: 'mina', latitude: 21.4211, longitude: 39.8686, description: 'Site of the stoning of the devil (Ramy al-Jamarat)' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'arafat' },
      create: { slug: 'arafat', nameEn: 'Arafat', nameAr: 'عرفة', type: 'arafat', latitude: 21.355, longitude: 39.9942, description: 'Plain of Arafat – standing here is the pinnacle of Hajj' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'jabal-al-rahmah' },
      create: { slug: 'jabal-al-rahmah', nameEn: 'Jabal al-Rahmah', nameAr: 'جبل الرحمة', type: 'arafat', latitude: 21.3542, longitude: 39.9842, description: 'Mount of Mercy in Arafat' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'muzdalifah' },
      create: { slug: 'muzdalifah', nameEn: 'Muzdalifah', nameAr: 'مزدلفة', type: 'muzdalifah', latitude: 21.3983, longitude: 39.92, description: 'Pilgrims spend the night and collect pebbles here' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'medina' },
      create: { slug: 'medina', nameEn: 'Madinah', nameAr: 'المدينة المنورة', type: 'medina', latitude: 24.4672, longitude: 39.6111, description: 'The city of the Prophet (peace be upon him)' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'masjid-an-nabawi' },
      create: { slug: 'masjid-an-nabawi', nameEn: 'Masjid an-Nabawi', nameAr: 'المسجد النبوي', type: 'medina', latitude: 24.4672, longitude: 39.6111, description: 'The Prophet\'s Mosque in Madinah' },
      update: {},
    }),
    prisma.location.upsert({
      where: { slug: 'safa-marwa' },
      create: { slug: 'safa-marwa', nameEn: 'Safa and Marwa', nameAr: 'الصفا والمروة', type: 'makkah', latitude: 21.4222, longitude: 39.8267, description: 'Hills for Sa\'i between Safa and Marwa' },
      update: {},
    }),
  ]);

  // Checklists
  await Promise.all([
    prisma.checklist.upsert({
      where: { slug: 'passport-visa' },
      create: { slug: 'passport-visa', titleEn: 'Passport & Visa', category: 'documents', order: 1, isRequired: true },
      update: {},
    }),
    prisma.checklist.upsert({
      where: { slug: 'vaccination' },
      create: { slug: 'vaccination', titleEn: 'Vaccination certificate', category: 'documents', order: 2, isRequired: true },
      update: {},
    }),
    prisma.checklist.upsert({
      where: { slug: 'pack-ihram' },
      create: { slug: 'pack-ihram', titleEn: 'Ihram clothing', category: 'packing', order: 1 },
      update: {},
    }),
    prisma.checklist.upsert({
      where: { slug: 'pack-medication' },
      create: { slug: 'pack-medication', titleEn: 'Medications & first aid', category: 'packing', order: 2 },
      update: {},
    }),
  ]);

  // Sample Duas (generic, not ritual-specific)
  const tawafRitual = await prisma.ritual.findUnique({ where: { slug: 'tawaf' } });
  if (tawafRitual) {
    await prisma.dua.upsert({
      where: { slug: 'dua-tawaf-start' },
      create: {
        slug: 'dua-tawaf-start',
        ritualId: tawafRitual.id,
        titleEn: 'Dua when starting Tawaf',
        textAr: 'بسم الله والله أكبر',
        textEn: 'In the name of Allah, and Allah is the Greatest',
        transliteration: 'Bismillahi wa Allahu Akbar',
        order: 1,
      },
      update: {},
    });
  }

  await prisma.dua.upsert({
    where: { slug: 'dua-hajj-general' },
    create: {
      slug: 'dua-hajj-general',
      titleEn: 'Dua for Hajj',
      textAr: 'رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
      textEn: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.',
      transliteration: 'Rabbana taqabbal minna innaka antas Samee\'ul Aleem',
      source: 'Quran 2:127',
      order: 0,
    },
    update: {},
  });

  console.log('Seed completed. Rituals:', rituals.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
