import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Store,
  User,
  Plus,
  Sparkles,
  Truck,
  Heart,
  Calendar,
  Filter,
  X,
  ChevronDown,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { Listing, CategoryId, ItemCondition, UserAccount } from '../../types';
import { CATEGORIES, MOSUL_DISTRICTS } from '../../data/categories';

interface MarketplaceFeedProps {
  listings: Listing[];
  currentUser: UserAccount | null;
  onSelectListing: (listing: Listing) => void;
  onOpenChat: (listing: Listing) => void;
  onOpenCreate: () => void;
  onRequireAuth: (pendingAction: () => void, message?: string) => void;
  newlyPublishedId?: string | null;
  lang?: 'ar' | 'en';
}

export const MarketplaceFeed: React.FC<MarketplaceFeedProps> = ({
  listings,
  currentUser,
  onSelectListing,
  onOpenChat,
  onOpenCreate,
  onRequireAuth,
  newlyPublishedId,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '3days' | 'week'>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleWhatsAppClick = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = () => {
      const phone = listing.contactOptions.whatsappNumber || listing.sellerPhone || '07700000000';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formatted = cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : cleanPhone;
      const message = isAr
        ? `السلام عليكم، أنا مهتم بإعلانك على سوق بلحظة: "${listing.title}". هل لا يزال متوفراً؟`
        : `Hello, interested in your listing on Souq Belahdha: "${listing.title}". Is it available?`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${formatted}?text=${encoded}`, '_blank');
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للتواصل عبر واتساب مع البائع، يرجى تسجيل حسابك السريع برقمك ورمز سري' : 'Register to contact seller');
    } else {
      action();
    }
  };

  const handlePhoneClick = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = () => {
      const phone = listing.contactOptions.phoneNumber || listing.sellerPhone;
      if (phone) window.location.href = `tel:${phone}`;
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'للاتصال الهاتفي بالبائع، يرجى تسجيل حسابك برقمك ورمز سري' : 'Register to call seller');
    } else {
      action();
    }
  };

  const handleChatClick = (listing: Listing, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = () => {
      onOpenChat(listing);
    };

    if (!currentUser) {
      onRequireAuth(action, isAr ? 'لبدء محادثة فورية مع البائع، يرجى تسجيل حسابك أولاً' : 'Register to chat with seller');
    } else {
      action();
    }
  };

  const isAnyFilterActive =
    selectedCategory !== 'all' ||
    selectedDistrict !== 'all' ||
    dateFilter !== 'all' ||
    deliveryFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDistrict('all');
    setDateFilter('all');
    setDeliveryFilter('all');
    setSortOrder('newest');
  };

  // Filter listings based on Date, City/District (Mosul), Category, and Delivery
  const filteredListings = useMemo(() => {
    const now = Date.now();
    let result = listings.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesStore = item.storeName?.toLowerCase().includes(q);
        const matchesDistrict = item.district?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesStore && !matchesDistrict) return false;
      }
      // Category (الصنف)
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // City & District in Mosul (المدينة والحي)
      if (selectedDistrict !== 'all' && item.district !== selectedDistrict) {
        return false;
      }
      // Date classification (التاريخ)
      if (dateFilter === 'today') {
        const diffHours = (now - item.createdTimestamp) / (1000 * 60 * 60);
        if (diffHours > 24) return false;
      } else if (dateFilter === '3days') {
        const diffDays = (now - item.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (diffDays > 3) return false;
      } else if (dateFilter === 'week') {
        const diffDays = (now - item.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      }
      // Delivery option
      if (deliveryFilter === 'delivery' && !item.deliveryAvailable) {
        return false;
      }
      if (deliveryFilter === 'pickup' && item.deliveryAvailable) {
        return false;
      }
      return true;
    });

    // Sorting
    if (sortOrder === 'price_low') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price_high') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else {
      result = [...result].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    }

    return result;
  }, [listings, searchQuery, selectedCategory, selectedDistrict, dateFilter, deliveryFilter, sortOrder]);

  return (
    <div className="flex flex-col min-h-full bg-slate-100 select-none pb-24 text-xs">
      {/* STICKY TOP FILTER BAR WITH CITY (MOSUL), CATEGORY, AND DATE CLASSIFICATIONS */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 pt-2.5 pb-2.5 shadow-2xs space-y-2">
        {/* Row 1: Search Input + Sell CTA Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في إعلانات الموصل (موبايل، سيارة، أثاث...)' : 'Search in Mosul...'}
              className="w-full h-9 pr-9 pl-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenCreate}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'أضف إعلانك' : 'Sell Item'}</span>
          </button>
        </div>

        {/* Row 2: Top Categorization Strip (الصنف) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {isAr ? 'كافة الأصناف' : 'All Categories'}
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat.nameAr}
              </button>
            );
          })}
        </div>

        {/* Row 3: Prominent Triple Dropdown Filter Bar: City (Mosul Districts) + Date + Delivery */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
          {/* Filter 1: City & Mosul Districts (المدينة والحي) */}
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full h-8 pr-2 pl-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none truncate transition-colors text-[10px] sm:text-[11px]"
            >
              <option value="all">{isAr ? '📍 كل الموصل' : 'All Mosul'}</option>
              {MOSUL_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>

          {/* Filter 2: Date Classification (التاريخ) */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full h-8 pr-2 pl-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none truncate transition-colors text-[10px] sm:text-[11px]"
            >
              <option value="all">{isAr ? '📅 كل التواريخ' : 'Any Date'}</option>
              <option value="today">{isAr ? 'إعلانات اليوم' : 'Today'}</option>
              <option value="3days">{isAr ? 'آخر 3 أيام' : 'Last 3 Days'}</option>
              <option value="week">{isAr ? 'هذا الأسبوع' : 'This Week'}</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>

          {/* Filter 3: Delivery Options & Sorting */}
          <div className="relative">
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value as any)}
              className="w-full h-8 pr-2 pl-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none truncate transition-colors text-[10px] sm:text-[11px]"
            >
              <option value="all">{isAr ? '🛵 التوصيل: الكل' : 'Delivery: All'}</option>
              <option value="delivery">{isAr ? 'متوفر توصيل' : 'Delivery'}</option>
              <option value="pickup">{isAr ? 'استلام مباشر' : 'Pickup'}</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Row 4: Active Filter Tags & Reset Action (Visible if any filter is active) */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-1 text-[10px]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-slate-400 shrink-0 font-medium">{isAr ? 'فلاتر نشطة:' : 'Active:'}</span>

              {selectedDistrict !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  <span>{selectedDistrict}</span>
                  <button type="button" onClick={() => setSelectedDistrict('all')}>
                    <X className="w-2.5 h-2.5 hover:text-red-600" />
                  </button>
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.nameAr}</span>
                  <button type="button" onClick={() => setSelectedCategory('all')}>
                    <X className="w-2.5 h-2.5 hover:text-red-600" />
                  </button>
                </span>
              )}

              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  <span>{dateFilter === 'today' ? 'اليوم' : dateFilter === '3days' ? 'آخر 3 أيام' : 'هذا الأسبوع'}</span>
                  <button type="button" onClick={() => setDateFilter('all')}>
                    <X className="w-2.5 h-2.5 hover:text-red-600" />
                  </button>
                </span>
              )}

              {deliveryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  <span>{deliveryFilter === 'delivery' ? 'متوفر توصيل' : 'استلام مباشر'}</span>
                  <button type="button" onClick={() => setDeliveryFilter('all')}>
                    <X className="w-2.5 h-2.5 hover:text-red-600" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors shrink-0"
            >
              {isAr ? 'مسح الكل' : 'Clear'}
            </button>
          </div>
        )}
      </div>

      {/* MAIN LISTINGS STREAM WITH ORGANIZED TEXT SPACING & CLEAN HIERARCHY */}
      <div className="p-3 sm:p-4 space-y-3.5">
        {/* Instant Publishing Banner */}
        {newlyPublishedId && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold leading-tight">
                  {isAr ? 'تم نشر إعلانك فوراً في صدارة سوق الموصل!' : 'Listing published at top!'}
                </p>
                <p className="text-[10px] text-emerald-100 leading-normal">
                  {isAr ? 'مرتبط بحسابك برقم الهاتف ويمكنك إدارته من لوحة التحكم' : 'Linked to your account'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white text-emerald-800 px-2.5 py-0.5 rounded-full shrink-0">
              {isAr ? 'منشور الآن' : 'Live'}
            </span>
          </div>
        )}

        {/* Counter & Sorting Control Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>
              {selectedDistrict !== 'all'
                ? `${selectedDistrict} (${filteredListings.length})`
                : `${isAr ? 'إعلانات الموصل' : 'Mosul'} (${filteredListings.length})`}
            </span>
          </div>

          {/* Quick Sort Toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setSortOrder('newest')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                sortOrder === 'newest' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'الأحدث' : 'Newest'}
            </button>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'price_low' ? 'price_high' : 'price_low')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center gap-0.5 ${
                sortOrder !== 'newest' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>{sortOrder === 'price_low' ? (isAr ? 'الأقل سعراً' : 'Price: Low') : sortOrder === 'price_high' ? (isAr ? 'الأعلى سعراً' : 'Price: High') : (isAr ? 'السعر' : 'Price')}</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredListings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3 my-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-800">
                {isAr ? 'لا توجد إعلانات مطابقة لهذه الفلاتر' : 'No matching listings found'}
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                {isAr ? 'جرب اختيار حي آخر بالموصل أو مسح فلاتر التاريخ والتصنيف' : 'Try clearing filters or selecting another district'}
              </p>
            </div>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
            >
              {isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset All Filters'}
            </button>
          </div>
        ) : (
          /* High-Contrast Organized Product Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredListings.map((item) => {
              const isFav = !!favorites[item.id];
              const isHighlight = item.id === newlyPublishedId;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectListing(item)}
                  className={`rounded-3xl overflow-hidden bg-white border cursor-pointer hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between group ${
                    isHighlight
                      ? 'border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Visual Header */}
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    <img
                      src={item.mediaUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    {/* Top Right Badges: Delivery and Shop Flag */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {item.deliveryAvailable ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{isAr ? 'توصيل' : 'Delivery'}</span>
                        </span>
                      ) : (
                        <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          <span>{isAr ? 'استلام' : 'Pickup'}</span>
                        </span>
                      )}

                      {item.sellerType === 'commercial' && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                          <Store className="w-3 h-3" />
                          <span>{isAr ? 'متجر' : 'Shop'}</span>
                        </span>
                      )}
                    </div>

                    {/* Top Left: Favorite Toggle */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-2.5 left-2.5 w-7.5 h-7.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 hover:text-red-500 flex items-center justify-center shadow-2xs transition-transform active:scale-90"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>

                    {/* Bottom Right: District Pill */}
                    <div className="absolute bottom-2 right-2.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{item.district || 'الموصل'}</span>
                    </div>

                    {/* Photo Count if Multiple */}
                    {item.mediaUrls.length > 1 && (
                      <div className="absolute bottom-2 left-2.5 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                        +{item.mediaUrls.length - 1} {isAr ? 'صور' : 'photos'}
                      </div>
                    )}
                  </div>

                  {/* Body Content with Organized Text Spacing */}
                  <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      {/* Price and Date Line */}
                      <div className="flex items-center justify-between">
                        {item.hidePrice ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {isAr ? 'السعر عند التواصل' : 'Contact for Price'}
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-1 text-emerald-800">
                            <span className="text-base sm:text-lg font-black font-mono tabular-nums leading-none">
                              {item.price.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-bold">
                              {item.currency}
                            </span>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{item.createdAt}</span>
                        </span>
                      </div>

                      {/* Title with Balanced Leading */}
                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 line-clamp-2 leading-relaxed group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h3>
                    </div>

                    {/* Metadata Footer: Seller Info & Condition */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700 truncate max-w-[140px] flex items-center gap-1">
                        {item.sellerType === 'commercial' ? (
                          <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.sellerType === 'commercial' ? item.storeName : item.sellerName}</span>
                      </span>

                      <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                        {item.condition === 'new' ? (isAr ? 'جديد' : 'New') : (isAr ? 'بحالة جيدة' : 'Good')}
                      </span>
                    </div>

                    {/* Contact Action Buttons */}
                    <div className="pt-1.5 grid grid-cols-2 gap-2">
                      {item.contactOptions.whatsapp ? (
                        <button
                          type="button"
                          onClick={(e) => handleWhatsAppClick(item, e)}
                          className="h-8.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handlePhoneClick(item, e)}
                          className="h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{isAr ? 'اتصال' : 'Call'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleChatClick(item, e)}
                        className="h-8.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isAr ? 'دردشة' : 'Chat'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-16 left-3 z-40">
        <button
          type="button"
          onClick={onOpenCreate}
          className="h-11 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg shadow-emerald-600/30 border-2 border-white flex items-center gap-1.5 transition-all text-xs font-extrabold"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'بيع سلعة' : 'Sell'}</span>
        </button>
      </div>
    </div>
  );
};
