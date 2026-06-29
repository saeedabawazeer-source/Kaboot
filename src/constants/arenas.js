export const ARENAS = [
  {
    id: 'riyadh',
    nameAr: 'الرياض',
    nameEn: 'Riyadh',
    icon: '🏜️',
    desc: 'ساحة الصحراء',
    min: 0,
    max: 300,
    colors: ['#6b3a2a', '#c4862a'],
  },
  {
    id: 'jeddah',
    nameAr: 'جدة',
    nameEn: 'Jeddah',
    icon: '🌊',
    desc: 'ساحة البحر الأحمر',
    min: 300,
    max: 600,
    colors: ['#1a4a6e', '#2196f3'],
  },
  {
    id: 'dubai',
    nameAr: 'دبي',
    nameEn: 'Dubai',
    icon: '🏙️',
    desc: 'ساحة الأبراج',
    min: 600,
    max: 1000,
    colors: ['#1a1a2e', '#b8960c'],
  },
  {
    id: 'kuwait',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    icon: '⛽',
    desc: 'ساحة الخليج',
    min: 1000,
    max: 1500,
    colors: ['#2e3b1a', '#8bc34a'],
  },
  {
    id: 'bahrain',
    nameAr: 'البحرين',
    nameEn: 'Bahrain',
    icon: '🏝️',
    desc: 'ساحة اللؤلؤ',
    min: 1500,
    max: 2000,
    colors: ['#3a1a3a', '#9c27b0'],
  },
  {
    id: 'qatar',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    icon: '🌟',
    desc: 'ساحة الأبطال',
    min: 2000,
    max: 9999,
    colors: ['#3a1a1a', '#800020'],
  },
];

export function getArena(trophies) {
  for (let i = ARENAS.length - 1; i >= 0; i--) {
    if (trophies >= ARENAS[i].min) return ARENAS[i];
  }
  return ARENAS[0];
}
