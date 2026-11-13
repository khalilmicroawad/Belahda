import { Listing, UserAccount } from '../types';

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'item-101',
    title: 'آيفون 16 برو 256GB تيتانيوم طبيعي نظيف جداً كارتون وملحقات',
    description: 'الجهاز مستعمل خفيف جداً، نسبة البطارية 100% مع كامل أغراضه الأصلية والكرتون، شغال سيم كارت عراقي وضمان ساري. متوفر معاينة في المحل أو توصيل داخل الموصل.',
    price: 1350000,
    currency: 'د.ع',
    hidePrice: false,
    category: 'electronics',
    condition: 'good',
    sellerType: 'personal',
    sellerName: 'عمر الموصلي',
    sellerPhone: '07701234567',
    city: 'الموصل',
    district: 'المجموعة الثقافية',
    deliveryAvailable: true,
    deliveryNotes: 'توصيل مجاني لكافة مناطق الجانب الأيسر بالموصل',
    storeLocation: {
      lat: 36.3725,
      lng: 43.1412,
      addressName: 'المجموعة الثقافية - قرب دورة الجامعة، الموصل',
      city: 'الموصل',
      district: 'المجموعة الثقافية'
    },
    mediaUrls: [
      '/src/assets/images/listing_iphone_pro_1794306234850.jpg'
    ],
    contactOptions: {
      directChat: true,
      whatsapp: true,
      phoneCall: true,
      whatsappNumber: '07701234567',
      phoneNumber: '07701234567'
    },
    createdAt: 'اليوم · منذ ساعتين',
    createdTimestamp: Date.now() - 1000 * 60 * 120,
    viewsCount: 65,
    isVerified: true
  },
  {
    id: 'item-102',
    title: 'مرسيدس بنز GLE 450 موديل 2024 زيرو رقم بغداد معوقين أو فحص',
    description: 'معرض الفارس للسيارات في الموصل يقدم لكم سيارة مرسيدس GLE فل أوبشن بانوراما، رادار أمامي، كاميرات 360، نظام صوت بروماستر، أكياس الوكالة لازالت عليها. استلام مباشر من المعرض.',
    price: 88000,
    currency: '$',
    hidePrice: true, // "السعر عند التواصل"
    category: 'vehicles',
    condition: 'new',
    sellerType: 'commercial',
    storeName: 'معرض الفارس للسيارات الحديثة',
    sellerName: 'معرض الفارس',
    sellerPhone: '07509876543',
    city: 'الموصل',
    district: 'حي المهندسين',
    deliveryAvailable: false,
    deliveryNotes: 'استلام مباشر ومعاينة داخل المعرض',
    storeLocation: {
      lat: 36.3639,
      lng: 43.1495,
      addressName: 'شارع المصارف قرب دورة اليرموك، الموصل',
      city: 'الموصل',
      district: 'حي المهندسين'
    },
    mediaUrls: [
      '/src/assets/images/listing_suv_car_1794306236554.jpg'
    ],
    contactOptions: {
      directChat: true,
      whatsapp: true,
      phoneCall: true,
      whatsappNumber: '07509876543',
      phoneNumber: '07509876543'
    },
    createdAt: 'اليوم · منذ 4 ساعات',
    createdTimestamp: Date.now() - 1000 * 60 * 240,
    viewsCount: 180,
    isVerified: true
  },
  {
    id: 'item-103',
    title: 'كرسي استرخاء مفرد قماش بوكليه تركي مع أرجل خشب زان',
    description: 'مفروشات النور في حي الزهور بالموصل. تصميم مودرن حديث ومريح جداً للقراءة وغرف الجلوس، الإسفنج ضغط عالي وقماش تركي درجة أولى قابل للتنظيف بسهولة.',
    price: 185000,
    currency: 'د.ع',
    hidePrice: false,
    category: 'furniture',
    condition: 'new',
    sellerType: 'commercial',
    storeName: 'مفروشات النور الحديثة',
    sellerName: 'مفروشات النور',
    sellerPhone: '07703344556',
    city: 'الموصل',
    district: 'حي الزهور',
    deliveryAvailable: true,
    deliveryNotes: 'توصيل متوفر لجميع أحياء الموصل بقيمة 5,000 دينار فقط',
    storeLocation: {
      lat: 36.3575,
      lng: 43.1558,
      addressName: 'شارع الزهور التجاري قرب مصرف الرشيد',
      city: 'الموصل',
      district: 'حي الزهور'
    },
    mediaUrls: [
      '/src/assets/images/listing_modern_armchair_1794306236545.jpg'
    ],
    contactOptions: {
      directChat: true,
      whatsapp: true,
      phoneCall: false,
      whatsappNumber: '07703344556'
    },
    createdAt: 'أمس',
    createdTimestamp: Date.now() - 1000 * 60 * 1440,
    viewsCount: 94,
    isVerified: true
  },
  {
    id: 'item-104',
    title: 'ساعة يد رجالية أوتوماتيك كوارتز فاخرة ضد الماء',
    description: 'ساعة فخمة أصلية مينا كحلي وسوار ستانلس ستيل غير قابل للصدأ، زجاج مضاد للخدوش مع علبة وكارت الضمان. نظيفة جداً واستعمال مناسبات قليلة.',
    price: 65000,
    currency: 'د.ع',
    hidePrice: false,
    category: 'fashion',
    condition: 'good',
    sellerType: 'personal',
    sellerName: 'حسين الخزرجي',
    sellerPhone: '07802233445',
    city: 'الموصل',
    district: 'الدواسة (الجانب الأيمن)',
    deliveryAvailable: false,
    deliveryNotes: 'المعاينة والاستلام قرب شارع الدواسة',
    storeLocation: {
      lat: 36.3382,
      lng: 43.1315,
      addressName: 'الدواسة - شارع الدواسة القديم، الجانب الأيمن',
      city: 'الموصل',
      district: 'الدواسة'
    },
    mediaUrls: [
      '/src/assets/images/listing_luxury_watch_1794306236996.jpg'
    ],
    contactOptions: {
      directChat: true,
      whatsapp: true,
      phoneCall: true,
      whatsappNumber: '07802233445',
      phoneNumber: '07802233445'
    },
    createdAt: 'منذ يومين',
    createdTimestamp: Date.now() - 1000 * 60 * 2880,
    viewsCount: 142,
    isVerified: false
  }
];

import {
  fetchSupabasePosts,
  saveSupabasePost,
  deleteSupabasePost,
  FetchPostsResult,
} from '../lib/supabase';

const USER_KEY = 'souq_belahdha_user_account';

export async function fetchDatabaseListings(): Promise<FetchPostsResult> {
  return fetchSupabasePosts();
}

export function addListingToTop(newListing: Listing): Listing[] {
  if (typeof window !== 'undefined') {
    saveSupabasePost(newListing).catch(() => {});
  }
  return [newListing];
}

export function deleteListingFromDb(id: string): void {
  if (typeof window !== 'undefined') {
    deleteSupabasePost(id).catch(() => {});
  }
}

// User Account Management
export function getStoredUser(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserAccount(user: UserAccount): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user account:', err);
  }
}

export function clearUserAccount(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}
