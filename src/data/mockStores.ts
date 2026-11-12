import { StoreProfile } from '../types';

export const INITIAL_STORES: StoreProfile[] = [
  {
    id: 'store-1',
    name: 'معرض الفارس للسيارات الحديثة',
    ownerPhone: '07509876543',
    description: 'معرض متخصص بتجارة السيارات الفارهة والحديثة بالموصل. وكالات وضمان كامل مع تسهيلات تسجيل وفحص رسمي.',
    district: 'حي المهندسين',
    city: 'الموصل',
    address: 'شارع المصارف قرب دورة اليرموك، الموصل',
    category: 'vehicles',
    whatsappNumber: '07509876543',
    phoneNumber: '07509876543',
    deliveryAvailable: false,
    deliveryNotes: 'معاينة واستلام رسمي داخل المعرض',
    isVerified: true,
    totalListingsCount: 14,
    rating: 4.9,
    coverUrl: '/src/assets/images/listing_suv_car_1794306236554.jpg',
    lat: 36.3639,
    lng: 43.1495,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30
  },
  {
    id: 'store-2',
    name: 'مفروشات النور الحديثة',
    ownerPhone: '07703344556',
    description: 'أرقى أطقم الجلوس وغرف النوم التركية والإسكندنافية بتصاميم حديثة. أخشاب زان طبيعي وأقمشة معالجة.',
    district: 'حي الزهور',
    city: 'الموصل',
    address: 'شارع الزهور التجاري قرب مصرف الرشيد، الموصل',
    category: 'furniture',
    whatsappNumber: '07703344556',
    phoneNumber: '07703344556',
    deliveryAvailable: true,
    deliveryNotes: 'توصيل وتركيب فوري لكافة مناطق الجانبين الأيمن والأيسر بالموصل',
    isVerified: true,
    totalListingsCount: 18,
    rating: 4.8,
    coverUrl: '/src/assets/images/listing_modern_armchair_1794306236545.jpg',
    lat: 36.3575,
    lng: 43.1558,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45
  },
  {
    id: 'store-3',
    name: 'محل الفرات للإلكترونيات والموبايل',
    ownerPhone: '07701234567',
    description: 'بيع وصيانة أحدث أجهزة الآيفون والسامسونج واللابتوبات مع ضمان عراقي رسمي وملحقات أصلية 100%.',
    district: 'المجموعة الثقافية',
    city: 'الموصل',
    address: 'شارع الجامعة التجاري قرب كلية الهندسة، المجموعة',
    category: 'electronics',
    whatsappNumber: '07701234567',
    phoneNumber: '07701234567',
    deliveryAvailable: true,
    deliveryNotes: 'توصيل مجاني داخل الموصل خلال ساعتين',
    isVerified: true,
    totalListingsCount: 12,
    rating: 5.0,
    coverUrl: '/src/assets/images/listing_iphone_pro_1794306234850.jpg',
    lat: 36.3725,
    lng: 43.1412,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15
  }
];

import {
  fetchSupabaseStores,
  saveSupabaseStore,
  supabase
} from '../lib/supabase';

const STORES_STORAGE_KEY = 'souq_belahdha_stores_db';

export function getStoredStores(): StoreProfile[] {
  if (typeof window === 'undefined') return INITIAL_STORES;
  try {
    const raw = localStorage.getItem(STORES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(INITIAL_STORES));
      return INITIAL_STORES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORES;
  } catch {
    return INITIAL_STORES;
  }
}

export async function fetchDatabaseStores(): Promise<StoreProfile[]> {
  try {
    const supaStores = await fetchSupabaseStores();
    if (supaStores && supaStores.length > 0) {
      saveStores(supaStores);
      return supaStores;
    }
  } catch (err) {
    console.warn('Supabase stores fetch error:', err);
  }

  try {
    const res = await fetch('/api/stores');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveStores(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API stores fetch fallback to local:', err);
  }
  return getStoredStores();
}

export function saveStores(stores: StoreProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
  } catch (err) {
    console.error('Failed to save stores:', err);
  }
}

export function addOrUpdateStore(store: StoreProfile): StoreProfile[] {
  const current = getStoredStores();
  const existingIdx = current.findIndex((s) => s.id === store.id || s.ownerPhone === store.ownerPhone);
  let updated: StoreProfile[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = store;
  } else {
    updated = [store, ...current];
  }
  saveStores(updated);

  if (typeof window !== 'undefined') {
    supabase.auth
      .getSession()
      .then(({ data }) => saveSupabaseStore(store, data.session?.user?.id))
      .catch(() => {});

    fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    }).catch((err) => console.warn('Could not sync store to API:', err));
  }

  return updated;
}
