/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  ListOrdered,
  Smartphone,
  Maximize2,
  Globe,
  Home,
  User,
  MapPin,
  Store,
  Sparkles,
  Users
} from 'lucide-react';
import { Listing, AppView, UserAccount, StoreProfile, CategoryId } from './types';
import {
  getStoredListings,
  saveListings,
  getStoredUser,
  saveUserAccount,
  clearUserAccount,
  fetchDatabaseListings,
  deleteListingFromDb
} from './data/mockListings';
import { getStoredStores, saveStores, addOrUpdateStore, fetchDatabaseStores } from './data/mockStores';
import {
  supabase,
  fetchUserProfile,
  mapAuthUserToAccount,
  upsertUserProfile,
  logSupabaseVisitor,
  fetchSupabaseVisitors
} from './lib/supabase';
import { ZeroBarrierEntry } from './components/onboarding/ZeroBarrierEntry';
import { ListingWizard } from './components/listing-wizard/ListingWizard';
import { MarketplaceFeed } from './components/marketplace/MarketplaceFeed';
import { ListingDetailModal } from './components/marketplace/ListingDetailModal';
import { ChatModal } from './components/chat/ChatModal';
import { MyListingsModal } from './components/profile/MyListingsModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { StoresDirectoryView } from './components/stores/StoresDirectoryView';
import { StoreDetailModal } from './components/stores/StoreDetailModal';
import { CreateStoreModal } from './components/stores/CreateStoreModal';
import { VisitorLogModal } from './components/visitors/VisitorLogModal';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  // Device Simulator Mode: 'mobile_frame' vs 'full_screen'
  const [simulatorMode, setSimulatorMode] = useState<'mobile_frame' | 'full_screen'>('mobile_frame');

  // Core App Flow State
  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [listings, setListings] = useState<Listing[]>(getStoredListings());
  const [stores, setStores] = useState<StoreProfile[]>(getStoredStores());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [newlyPublishedId, setNewlyPublishedId] = useState<string | null>(null);

  // Visitor Counter & Log State (عداد سجل الزوار)
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [showVisitorLogModal, setShowVisitorLogModal] = useState<boolean>(false);
  const [resetFeedTrigger, setResetFeedTrigger] = useState<number>(0);

  // Active Modals & Selected Entities
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(null);
  const [chatListing, setChatListing] = useState<Listing | null>(null);
  const [showMyListings, setShowMyListings] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState<boolean>(false);

  // Buyer Auth Gate state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authPurposeMessage, setAuthPurposeMessage] = useState<string | undefined>(undefined);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<(() => void) | null>(null);

  // Sync with Supabase + Local Cache on mount
  useEffect(() => {
    // 1. Fetch live listings
    fetchDatabaseListings().then((dbListings) => {
      if (dbListings && dbListings.length > 0) {
        setListings(dbListings);
      }
    });

    // 2. Fetch live stores
    fetchDatabaseStores().then((dbStores) => {
      if (dbStores && dbStores.length > 0) {
        setStores(dbStores);
      }
    });

    // 3. Restore Supabase Auth Session & subscribe to changes
    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;
      if (authUser) {
        const profile = await fetchUserProfile(authUser.id);
        const mapped = mapAuthUserToAccount(authUser, profile);
        setCurrentUser(mapped);
        saveUserAccount(mapped);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearUserAccount();
        setCurrentUser(null);
      } else if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const mapped = mapAuthUserToAccount(session.user, profile);
        setCurrentUser(mapped);
        saveUserAccount(mapped);
      }
    });

    // 4. Record visitor log in Supabase (with Express API fallback)
    const vid =
      (typeof window !== 'undefined' && localStorage.getItem('mosul_visitor_id')) ||
      `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (typeof window !== 'undefined') localStorage.setItem('mosul_visitor_id', vid);

    const deviceType =
      typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop';

    logSupabaseVisitor({
      visitorId: vid,
      page: currentView,
      city: 'الموصل',
      device: deviceType,
    })
      .then((count) => {
        if (typeof count === 'number') {
          setVisitorCount(count);
        } else {
          // Fallback to Express API
          fetch('/api/visitors/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitorId: vid,
              page: currentView,
              city: 'الموصل',
              device: deviceType,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data && typeof data.totalVisitors === 'number') {
                setVisitorCount(data.totalVisitors);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    fetchSupabaseVisitors().then((res) => {
      if (res && typeof res.totalVisitors === 'number') {
        setVisitorCount(res.totalVisitors);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Update HTML dir and lang attributes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  // 1. "عن الضغط على شراء. لا يعمل. يجب عرض جميع الإعلانات المضافة"
  // Ensures switching to BUY clears filters, refreshes from Cloud SQL DB and displays all items
  const handleSelectBuy = async () => {
    setCurrentView('feed');
    setResetFeedTrigger((prev) => prev + 1);

    // Refresh from Cloud SQL
    const latest = await fetchDatabaseListings();
    if (latest && latest.length > 0) {
      setListings(latest);
    } else {
      setListings(getStoredListings());
    }
  };

  const handleSelectSell = () => {
    setCurrentView('create');
  };

  const handleSelectStores = () => {
    const latestStores = getStoredStores();
    setStores(latestStores);
    setCurrentView('stores');
  };

  // When seller publishes listing:
  const handleListingPublished = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev.filter((item) => item.id !== newListing.id)]);
    setNewlyPublishedId(newListing.id);
    setCurrentView('feed');

    setTimeout(() => {
      setNewlyPublishedId(null);
    }, 8000);
  };

  // Fast-seed 30 approved, non-spam sample listings for the current user to easily test unlocking and creating their store:
  // "يجب على المستخدمين نشر 30 إعلاناً حقيقياً غير مكرر لفتح متجر مجاني"
  const handleFastSeedListings = () => {
    const phone = currentUser?.phoneNumber || '07701234567';
    const SEED_TITLES_DATA: { title: string; category: CategoryId; desc: string; price: number; media: string; dist: string }[] = [
      { title: 'آيفون 15 برو ماكس تيتانيوم أزرق 256 كفالة رسمية', category: 'electronics', desc: 'جهاز نظيف جداً استخدام أسبوعين فقط مع الكرتونة والشاحن الأصلي وكفالة سنة كاملة.', price: 1450000, media: '/src/assets/images/listing_iphone_pro_1794306234850.jpg', dist: 'حي الزهور' },
      { title: 'لابتوب ديل كور اي 7 جيل حديث للمصممين والمهندسين', category: 'electronics', desc: 'مواصفات عالية رام 16 جيجا وقرص إس إس دي 512 مع كرت شاشة منفصل قوي.', price: 780000, media: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80', dist: 'المجموعة الثقافية' },
      { title: 'دراجة ياماها ياباني نظيفة وارد شركة حي المصارف', category: 'vehicles', desc: 'محرك بحالة بلاد واقتصادية جداً بالبنزين مع أوراق تسجيل نظامية وجاهزة للتحويل.', price: 950000, media: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=500&q=80', dist: 'حي المصارف' },
      { title: 'طقم كنب تركي فاخر 8 مقاعد قماش مخمل عالي الجودة', category: 'furniture', desc: 'طقم صالون راقي جداً إسفنج ضغط عالي مع طاولة وسطية خشب زان بحالة كالجديد.', price: 650000, media: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80', dist: 'حي البلديات' },
      { title: 'مفرش موصلي تراثي تطريز يدوي أصلي من الحرفيين', category: 'handcrafts', desc: 'عمل يدوي متقن من التراث الموصلي العريق بخيوط حريرية ممتازة للصالونات والمجالس.', price: 85000, media: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=500&q=80', dist: 'الموصل القديمة' },
      { title: 'كاميرا سوني احترافية ألفا مع عدسة تقريب 85 مم', category: 'electronics', desc: 'تصوير فيديو فور كي بدقة فائقة ومستشعر إطار كامل مع حامل ثلاثي وحقيبة واقية.', price: 1200000, media: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80', dist: 'حي النور' },
      { title: 'ساعة رولكس رجالية كلاسيك ستانلس مقاومة للماء', category: 'fashion', desc: 'ساعة يد فاخرة ماكينة أوتوماتيك زجاج ضد الخدش مع العلبة وكارت الضمان.', price: 190000, media: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=500&q=80', dist: 'حي السكر' },
      { title: 'طاولة طعام خشب زان صلب مع 6 كراسي حي الزهور', category: 'furniture', desc: 'طاولة متينة بتشطيب عصري ومقاومة للحرارة والخدوش مناسبة لكافة غرف المعيشة.', price: 420000, media: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=500&q=80', dist: 'حي الزهور' },
      { title: 'حذاء جلد طبيعي صناعة موصلية يدوية مريحة جداً', category: 'fashion', desc: 'صناعة محلية فاخرة بنعل طبي مبطن ومقاوم للانزلاق مقاسات متوفرة من 40 إلى 45.', price: 45000, media: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80', dist: 'سوق باب السراي' },
      { title: 'شاشة سامسونج سمارت 55 بوصة بدقة فور كي UHD', category: 'electronics', desc: 'شاشة ذكية تدعم يوتيوب ونتفلكس وتوصيل الهاتف بالواي فاي مع جهاز تحكم عن بعد ذكي.', price: 540000, media: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80', dist: 'حي الوحدة' },
      { title: 'ثلاجة بيكو حديثة نو فروست توفير طاقة كفالة 5 سنوات', category: 'electronics', desc: 'سعة 18 قدم بنظام تبريد ثنائي وتدفق هواء متعدد وموفرة لاستهلاك الكهرباء.', price: 620000, media: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=500&q=80', dist: 'حي الرفاعي' },
      { title: 'غسالة هاير أوتوماتيك 8 كيلو ببرامج غسيل ذكية', category: 'electronics', desc: 'محرك دفع مباشر هادئ مع ميزة الغسيل بالبخار وحماية متقدمة من تذبذب التيار.', price: 480000, media: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80', dist: 'حي الجامعة' },
      { title: 'لوحة نحاسية موصلية منقوشة يدوياً لمنارة الحدباء', category: 'handcrafts', desc: 'تحفة فنية أصيلة نقش يدوي على النحاس الخالص بإطار خشبي ملكي فاخر.', price: 110000, media: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=500&q=80', dist: 'الموصل القديمة' },
      { title: 'سبليت توسوت طن ونصف تدفئة وتبريد انفيرتر اقتصادي', category: 'electronics', desc: 'تبريد سريع تي 3 يتحمل درجات الحرارة العالية غاز 410 صديق للبيئة مع ضمان الشركة.', price: 510000, media: 'https://images.unsplash.com/photo-1614633833026-0820552978b6?auto=format&fit=crop&w=500&q=80', dist: 'حي الضباط' },
      { title: 'سيارة هيونداي النترا موديل 2022 بحالة الوكالة', category: 'vehicles', desc: 'فول مواصفات بصمة وشاشة وكاميرا وحساسات المسافة المقطوعة 35 ألف كيلو فقط.', price: 21500000, media: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=500&q=80', dist: 'حي الشرطة' },
      { title: 'طباخ تركي 5 عيون ستانلس ستيل مع شواية كهربائية', category: 'electronics', desc: 'أمان كامل مع إشعال ذاتي ومروحة لتوزيع الحرارة داخل الفرن وزجاج حراري مزدوج.', price: 340000, media: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=500&q=80', dist: 'حي المثنى' },
      { title: 'آيباد برو إم 2 شاشة 11 بوصة مع قلم أبل الأصلي', category: 'electronics', desc: 'ذاكرة 128 جيجا يدعم شريحة واي فاي بحالة ممتازة وبطارية 98 بالمئة.', price: 920000, media: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=500&q=80', dist: 'حي المهندسين' },
      { title: 'طقم دلال قهوة نحاسية عربية موصلية أصيلة مع فناجين', category: 'handcrafts', desc: 'طقم ضيافة تراثي تقليدي مصنوع يدوياً من النحاس الأصفر اللامع عالي النقاوة.', price: 95000, media: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80', dist: 'حي الحدباء' },
      { title: 'فستان زفاف ومناسبات راقي تصميم خاص تطريز يدوي', category: 'fashion', desc: 'فستان أنيق ملبوس لمرة واحدة فقط بحالة جديدة مع الطرحة والملحقات الكاملة.', price: 280000, media: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=500&q=80', dist: 'حي البريد' },
      { title: 'دريل شحن بوش احترافي مع حقيبة عدة متكاملة', category: 'services', desc: 'قوة 18 فولت مع بطاريتين ليثيوم وشاحن سريع ورؤوس حفر متعددة للمعادن والخرسانة.', price: 135000, media: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&q=80', dist: 'الصناعة القديمة' },
      { title: 'طقم سرير نوم مفردين خشب طبيعي مع مرتبة طبية', category: 'furniture', desc: 'هيكل متين من الخشب المعالج ضد الرطوبة مع دروج تخزين جانبية مرتبة.', price: 380000, media: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=500&q=80', dist: 'حي الصديق' },
      { title: 'سماعات سوني لاسلكية عازلة للضوضاء تدعم الصوت النقي', category: 'electronics', desc: 'بطارية تدوم 30 ساعة متواصلة مع ميكروفون نقي للمكالمات وبلوتوث سريع الاستجابة.', price: 160000, media: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80', dist: 'حي الزهور' },
      { title: 'عطر فرنسي شرقي فاخر وثابت لمدة 48 ساعة متواصلة', category: 'fashion', desc: 'تركيبة دهن عود وعنبر مميزة بعبوة سعة 100 مل أصلية ومضمونة الثبات والفوحان.', price: 65000, media: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=500&q=80', dist: 'حي المصارف' },
      { title: 'ماكينة خياطة وتطريز براذر يابانية بحالة ممتازة', category: 'services', desc: 'محرك قوي تدعم أكثر من 25 غرزة خياطة وتطريز أوتوماتيكي مع كافة ملحقاتها.', price: 210000, media: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?auto=format&fit=crop&w=500&q=80', dist: 'حي الرسالة' },
      { title: 'شاحن سيارة كهربائية متنقل سريع مع كيبل أصلي', category: 'vehicles', desc: 'قدرة شحن 32 أمبير مع شاشة رقمية لعرض الفولتية وحماية من ارتفاع الحرارة.', price: 175000, media: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=500&q=80', dist: 'حي الميثاق' },
      { title: 'صينية خشبية موصلية مبيتة ومزخرفة يدوي للأفراح', category: 'handcrafts', desc: 'صناعة تراثية يدوية بنقوش أرابيسك موصلية مطعمة بالصدف الطبيعي للأعراس.', price: 75000, media: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=500&q=80', dist: 'الموصل القديمة' },
      { title: 'مكنسة كهربائية هيتاشي برميل قوة 2000 واط ممتازة', category: 'electronics', desc: 'سعة 21 لتر مع فلتر قماشي قابل للغسل ومحرك جبار لشفط الأتربة والسجاد.', price: 145000, media: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=500&q=80', dist: 'حي النور' },
      { title: 'كرسي ألعاب ومكتب مريح ومتحرك هيدروليك مع مسند', category: 'furniture', desc: 'مسند ظهر مريح للجلوس الطويل وساعات العمل مع وسادة قطنية وطبقة جلد صناعي.', price: 165000, media: 'https://images.unsplash.com/photo-1580481077195-c3a82145d875?auto=format&fit=crop&w=500&q=80', dist: 'حي الزهور' },
      { title: 'مايكروفون احترافي للبودكاست والبث المباشر مع حامل', category: 'electronics', desc: 'توصيل يو إس بي فوري عازل للضوضاء المحيطة مع فلتر هواء وكيبل طويل مضفر.', price: 85000, media: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=500&q=80', dist: 'المجموعة الثقافية' },
      { title: 'هاتف سامسونج جالاكسي إس 24 ألترا ذاكرة 512 جيجا', category: 'electronics', desc: 'لون رمادي تيتانيوم مع قلم إس بين وكاميرا 200 ميجابكسل بتقنيات الذكاء الاصطناعي.', price: 1390000, media: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=500&q=80', dist: 'حي الزهور' }
    ];

    const sampleItems: Listing[] = SEED_TITLES_DATA.map((item, i) => ({
      id: `item-seed-30-${Date.now()}-${i}`,
      title: item.title,
      description: item.desc,
      price: item.price,
      currency: 'د.ع',
      hidePrice: false,
      category: item.category,
      condition: i % 3 === 0 ? 'good' : 'new',
      sellerType: 'commercial',
      sellerName: currentUser?.name || 'عمر الموصلي',
      sellerPhone: phone,
      city: 'الموصل',
      district: item.dist,
      deliveryAvailable: true,
      deliveryNotes: 'توصيل متوفر لكافة أحياء الموصل',
      mediaUrls: [item.media],
      contactOptions: {
        directChat: true,
        whatsapp: true,
        phoneCall: true,
        whatsappNumber: phone,
        phoneNumber: phone
      },
      createdAt: 'اليوم',
      createdTimestamp: Date.now() - i * 1000 * 60 * 15,
      viewsCount: 20 + i * 3
    }));

    const updated = [...sampleItems, ...listings];
    setListings(updated);
    saveListings(updated);

    // If user has no account, create one with seller privileges
    if (!currentUser) {
      const newAcc: UserAccount = {
        id: `user-${Date.now()}`,
        name: 'عمر الموصلي',
        phoneNumber: phone,
        isSeller: true,
        createdAt: Date.now()
      };
      saveUserAccount(newAcc);
      setCurrentUser(newAcc);
    }
  };

  // Require Buyer Authentication before contacting seller:
  const handleRequireAuth = (action: () => void, message?: string) => {
    if (currentUser) {
      action();
    } else {
      setPendingActionAfterAuth(() => action);
      setAuthPurposeMessage(message);
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = (registeredUser: UserAccount) => {
    setCurrentUser(registeredUser);
    setShowAuthModal(false);
    if (pendingActionAfterAuth) {
      const act = pendingActionAfterAuth;
      setPendingActionAfterAuth(null);
      act();
    }
  };

  const handleDeleteListing = (id: string) => {
    const updated = listings.filter((item) => item.id !== id);
    setListings(updated);
    saveListings(updated);
    deleteListingFromDb(id);
  };

  const handleStoreCreated = (newStore: StoreProfile) => {
    setStores((prev) => [newStore, ...prev.filter((s) => s.id !== newStore.id)]);
    setShowCreateStoreModal(false);
    setSelectedStore(newStore);

    if (currentUser) {
      const updatedAcc: UserAccount = {
        ...currentUser,
        hasCustomStore: true,
        customStoreId: newStore.id
      };
      setCurrentUser(updatedAcc);
      saveUserAccount(updatedAcc);
      upsertUserProfile(updatedAcc).catch(() => {});
    }
  };

  // Filter listings of current user
  const userPhone = currentUser?.phoneNumber;
  const userListings = listings.filter((it) => it.sellerPhone === userPhone);

  return (
    <div className={`min-h-screen bg-slate-200/90 flex flex-col items-center justify-center font-sans ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Top Simulator Header */}
      <header className="w-full max-w-4xl px-3 py-1.5 flex items-center justify-between text-xs text-slate-700 bg-white/85 backdrop-blur-md border-b border-slate-300 shadow-2xs z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('feed')}
            className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs hover:text-emerald-700 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>سوق بلحظة</span>
          </button>
          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
            الموصل
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Visitor Counter Button (عداد سجل الزوار) */}
          <button
            type="button"
            onClick={() => setShowVisitorLogModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title={isAr ? 'عداد وسجل الزوار' : 'Visitor Log'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-mono tabular-nums">{visitorCount > 0 ? visitorCount.toLocaleString() : '...'}</span>
            <span className="hidden xs:inline text-[9px] text-emerald-700">{isAr ? 'زائر' : 'visits'}</span>
          </button>

          {/* Account / Control Panel */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all shadow-2xs"
            title="لوحة التحكم وتعديل الحساب"
          >
            <User className="w-3 h-3 text-emerald-700" />
            <span>
              {currentUser ? currentUser.name.slice(0, 14) : (isAr ? 'حسابي' : 'Account')}
            </span>
          </button>

          {/* Viewport Frame Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSimulatorMode('mobile_frame')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                simulatorMode === 'mobile_frame'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>{isAr ? 'هاتف' : 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulatorMode('full_screen')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                simulatorMode === 'full_screen'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>{isAr ? 'كامل' : 'Full'}</span>
            </button>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
          >
            <Globe className="w-3 h-3 text-slate-500" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </header>

      {/* Main Container / Mobile App Shell */}
      <main className="w-full flex-1 flex items-center justify-center p-0 sm:p-2 md:p-3 overflow-hidden">
        <div
          className={`bg-white shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${
            simulatorMode === 'mobile_frame'
              ? 'w-full max-w-[400px] h-[92vh] max-h-[860px] sm:rounded-[38px] sm:border-[8px] sm:border-slate-800 sm:ring-1 sm:ring-black/20'
              : 'w-full max-w-3xl h-[92vh] rounded-2xl border border-slate-300'
          }`}
        >
          {/* Mobile Top Status Bar */}
          {simulatorMode === 'mobile_frame' && (
            <div className="h-5 bg-slate-900 text-white px-5 flex items-center justify-between text-[10px] font-mono select-none shrink-0">
              <span className="font-bold">9:41</span>
              <div className="w-20 h-3 bg-black rounded-full mx-auto my-0.5"></div>
              <div className="flex items-center gap-1 text-[9px]">
                <span>5G</span>
                <span className="w-3.5 h-1.5 rounded-2xs border border-white flex items-center p-0.5">
                  <span className="w-full h-full bg-white rounded-2xs"></span>
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE SCREEN DISPLAY */}
          <div className="flex-1 overflow-y-auto relative flex flex-col bg-slate-50">
            {/* View 1: Zero-Barrier Entrance */}
            {currentView === 'onboarding' && (
              <ZeroBarrierEntry
                onSelectBuy={handleSelectBuy}
                onSelectSell={handleSelectSell}
                onSelectStores={handleSelectStores}
                onOpenVisitorLog={() => setShowVisitorLogModal(true)}
                visitorCount={visitorCount}
                onToggleLang={toggleLanguage}
                lang={lang}
              />
            )}

            {/* View 2: Marketplace Feed (The "BUY" Path - تفعيل زر شراء لعرض الإعلانات المضافة) */}
            {currentView === 'feed' && (
              <MarketplaceFeed
                listings={listings}
                currentUser={currentUser}
                onSelectListing={(item) => setSelectedListing(item)}
                onOpenChat={(item) => setChatListing(item)}
                onOpenCreate={() => setCurrentView('create')}
                onRequireAuth={handleRequireAuth}
                newlyPublishedId={newlyPublishedId}
                resetTrigger={resetFeedTrigger}
                lang={lang}
              />
            )}

            {/* View 3: Stores Directory (المتاجر المعتمدة في الموصل - إضافة زر متاجر للقائمة الرئيسية) */}
            {currentView === 'stores' && (
              <StoresDirectoryView
                stores={stores}
                listings={listings}
                currentUser={currentUser}
                onSelectStore={(st) => setSelectedStore(st)}
                onOpenCreateStore={() => setShowCreateStoreModal(true)}
                onRequireAuth={handleRequireAuth}
                lang={lang}
              />
            )}

            {/* View 4: Step-by-Step Listing Wizard (The "SELL" Path) */}
            {currentView === 'create' && (
              <ListingWizard
                currentUser={currentUser}
                onUserCreated={(usr) => setCurrentUser(usr)}
                onCancel={() => setCurrentView('feed')}
                onPublished={handleListingPublished}
                lang={lang}
              />
            )}
          </div>

          {/* PERSISTENT BOTTOM TAB BAR WITH STORES & BUY */}
          {currentView !== 'onboarding' && currentView !== 'create' && (
            <nav className="h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1 select-none shrink-0 z-30 pb-safe">
              {/* Tab 1: Home / Feed (BUY / شراء) */}
              <button
                type="button"
                onClick={handleSelectBuy}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  currentView === 'feed'
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShoppingBag className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'شراء' : 'Buy'}
                </span>
              </button>

              {/* Tab 2: Stores Directory (متاجر / Stores) - CRITICAL NEW FEATURE */}
              <button
                type="button"
                onClick={handleSelectStores}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  currentView === 'stores'
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Store className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'متاجر' : 'Stores'}
                </span>
              </button>

              {/* Tab 3: Primary SELL Center CTA (بيع) */}
              <button
                type="button"
                onClick={() => setCurrentView('create')}
                className="flex flex-col items-center justify-center -mt-3 group active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center border-2 border-white group-hover:bg-emerald-700 transition-colors">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold text-emerald-800 mt-0.5">
                  {isAr ? 'بيع' : 'Sell'}
                </span>
              </button>

              {/* Tab 4: My Listings (إعلاناتي) */}
              <button
                type="button"
                onClick={() => setShowMyListings(true)}
                className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ListOrdered className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'إعلاناتي' : 'My Items'}
                </span>
              </button>

              {/* Tab 5: Control Panel / Profile (حسابي) */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <User className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] tracking-tight">
                  {isAr ? 'حسابي' : 'Profile'}
                </span>
              </button>
            </nav>
          )}

          {/* Home Indicator */}
          {simulatorMode === 'mobile_frame' && (
            <div className="h-3 bg-white flex items-center justify-center shrink-0">
              <div className="w-20 h-1 bg-slate-300 rounded-full"></div>
            </div>
          )}
        </div>
      </main>

      {/* POPUP MODALS */}

      {/* 1. Full Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUser={currentUser}
          onClose={() => setSelectedListing(null)}
          onOpenChat={(item) => setChatListing(item)}
          onRequireAuth={handleRequireAuth}
          lang={lang}
        />
      )}

      {/* 2. Store Catalog & Single Store Showcase Modal */}
      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          listings={listings}
          currentUser={currentUser}
          onClose={() => setSelectedStore(null)}
          onSelectListing={(item) => setSelectedListing(item)}
          onRequireAuth={handleRequireAuth}
          lang={lang}
        />
      )}

      {/* 3. In-App Direct Messaging Modal */}
      {chatListing && (
        <ChatModal
          listing={chatListing}
          currentUser={currentUser}
          onClose={() => setChatListing(null)}
          lang={lang}
        />
      )}

      {/* 4. My Listings & Store Unlock Progress Modal */}
      {showMyListings && (
        <MyListingsModal
          listings={userListings.length > 0 ? userListings : listings}
          onClose={() => setShowMyListings(false)}
          onOpenCreate={() => {
            setShowMyListings(false);
            setCurrentView('create');
          }}
          onOpenCreateStore={() => {
            setShowMyListings(false);
            setShowCreateStoreModal(true);
          }}
          onDeleteListing={handleDeleteListing}
          onSelectListing={(item) => setSelectedListing(item)}
          onFastSeedListings={handleFastSeedListings}
          lang={lang}
        />
      )}

      {/* 5. Custom Store Creation Modal (When Seller has 30+ approved listings) */}
      {showCreateStoreModal && (
        <CreateStoreModal
          currentUser={currentUser}
          listingsCount={Math.max(userListings.length, listings.length)}
          userListings={userListings.length > 0 ? userListings : listings}
          onStoreCreated={handleStoreCreated}
          onClose={() => setShowCreateStoreModal(false)}
          onFastSeedListings={handleFastSeedListings}
          lang={lang}
        />
      )}

      {/* 6. User Profile & Control Panel Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          onUpdateUser={(usr) => setCurrentUser(usr)}
          onOpenAuth={() => {
            setAuthPurposeMessage(undefined);
            setShowAuthModal(true);
          }}
          onClose={() => setShowProfileModal(false)}
          lang={lang}
        />
      )}

      {/* 7. Buyer Registration Gate Modal */}
      {showAuthModal && (
        <AuthModal
          purposeMessage={authPurposeMessage}
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setShowAuthModal(false);
            setPendingActionAfterAuth(null);
          }}
          lang={lang}
        />
      )}

      {/* 8. Live Visitor Counter & Log Modal */}
      {showVisitorLogModal && (
        <VisitorLogModal
          onClose={() => setShowVisitorLogModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
