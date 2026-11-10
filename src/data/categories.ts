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
  }
];

export const MOSUL_DISTRICTS = [
  'حي الزهور',
  'المجموعة الثقافية',
  'حي المهندسين',
  'الدواسة (الجانب الأيمن)',
  'حي المصارف',
  'حي السكر',
  'حي النور',
  'حي اليرموك (الجانب الأيمن)',
  'حي الجامعة',
  'سوق النبي يونس',
  'الغزلاني',
  'الحدباء',
  'الرشيدية',
  'حي المثنى'
];

export const CURRENCIES = [
  { code: 'IQD', symbol: 'د.ع', nameAr: 'دينار عراقي' },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي' }
];
