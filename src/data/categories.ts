import { CategoryId } from '../types';

export interface CategoryDef {
  id: CategoryId;
  nameAr: string;
  nameEn: string;
  iconName: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'electronics',
    nameAr: 'موبايل وإلكترونيات',
    nameEn: 'Mobiles & Tech',
    iconName: 'Smartphone'
  },
  {
    id: 'vehicles',
    nameAr: 'سيارات ودراجات',
    nameEn: 'Vehicles',
    iconName: 'Car'
  },
  {
    id: 'appliances',
    nameAr: 'أجهزة كهربائية',
    nameEn: 'Appliances',
    iconName: 'Zap'
  },
  {
    id: 'furniture',
    nameAr: 'أثاث وغرف نوم',
    nameEn: 'Furniture',
    iconName: 'Armchair'
  },
  {
    id: 'fashion',
    nameAr: 'ملابس وساعات',
    nameEn: 'Fashion',
    iconName: 'Watch'
  },
  {
    id: 'real_estate',
    nameAr: 'عقارات وإيجار',
    nameEn: 'Real Estate',
    iconName: 'Building2'
  },
  {
    id: 'hobbies',
    nameAr: 'ألعاب ومستلزمات',
    nameEn: 'Hobbies',
    iconName: 'Package'
  },
  {
    id: 'handcrafts',
    nameAr: 'حرف يدوية وتراثيات',
    nameEn: 'Handcrafts',
    iconName: 'Sparkles'
  },
  {
    id: 'services',
    nameAr: 'خدمات وصيانة',
    nameEn: 'Services',
    iconName: 'Wrench'
  }
];

export interface MosulNeighborhoodGroup {
  id: 'left_bank' | 'right_bank' | 'other';
  labelAr: string;
  labelEn: string;
  neighborhoods: string[];
}

export const MOSUL_NEIGHBORHOOD_GROUPS: MosulNeighborhoodGroup[] = [
  {
    id: 'left_bank',
    labelAr: 'الساحل الأيسر',
    labelEn: 'Left Bank (East Mosul)',
    neighborhoods: [
      'حي الزهور',
      'حي المهندسين',
      'حي المجموعة الثقافية',
      'حي المثنى',
      'حي الكفاءات',
      'حي البكر',
      'حي الجامعة',
      'حي القادسية',
      'حي النور',
      'حي التأميم',
      'حي القدس',
      'حي الكرامة',
      'حي الانتصار',
      'حي سومر',
      'حي فلسطين',
      'حي الوحدة',
      'حي الرفاق',
      'حي الصديق',
      'حي الحدباء',
      'حي السكر',
      'حي البلديات',
      'حي العربي',
      'حي المصارف',
      'حي التحرير',
      'حي محاربين',
      'حي النبي يونس',
      'حي الجزائر',
      'حي الفيصلية',
      'حي الضباط',
      'حي البعث',
      'حي الشهداء',
      'حي المزارع',
      'حي الرشيدية'
    ]
  },
  {
    id: 'right_bank',
    labelAr: 'الساحل الأيمن',
    labelEn: 'Right Bank (West Mosul)',
    neighborhoods: [
      'حي الدواسة',
      'حي النبي شيت',
      'حي باب الطوب',
      'حي السرچخانة',
      'حي الشفاء',
      'حي الزنجيلي',
      'حي الرفاعي',
      'حي النجار',
      'حي المشاهدة',
      'حي الثورة',
      'حي 17 تموز',
      'حي الإصلاح الزراعي',
      'حي العريبي',
      'حي التنك',
      'حي اليابسات',
      'حي المنصور',
      'حي الشهداء',
      'حي وادي حجر',
      'حي تل الرمان',
      'حي المأمون',
      'حي الغزلاني',
      'حي الطيران',
      'حي الجوسق',
      'حي الدندان',
      'حي باب لكش',
      'حي باب البيض',
      'حي باب الجديد',
      'حي الميدان',
      'حي القليعات',
      'حي الخزرج',
      'حي رأس الكور'
    ]
  },
  {
    id: 'other',
    labelAr: 'مناطق أخرى',
    labelEn: 'Other Areas',
    neighborhoods: ['أخرى / خارج الموصل']
  }
];

export const MOSUL_DISTRICTS: string[] = Array.from(
  new Set(MOSUL_NEIGHBORHOOD_GROUPS.flatMap((group) => group.neighborhoods))
);

export const CURRENCIES = [
  { code: 'IQD', symbol: 'د.ع', nameAr: 'دينار عراقي' },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي' }
];
