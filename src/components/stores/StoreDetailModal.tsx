import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Heart
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';
import { fetchPostsByStoreId } from '../../lib/supabase';

interface StoreDetailModalProps {
  store: StoreProfile;
  listings: Listing[];
  currentUser?: UserAccount | null;
  favoriteIds?: string[];
  onToggleFavorite?: (postId: string) => void;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
  onRequireAuth?: (action: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  listings,
  favoriteIds = [],
  onToggleFavorite,
  onClose,
  onSelectListing,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [remoteStorePosts, setRemoteStorePosts] = useState<Listing[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoadingPosts(true);
    fetchPostsByStoreId(store.id)
      .then((rows) => {
        if (active) setRemoteStorePosts(rows);
      })
      .finally(() => {
        if (active) setIsLoadingPosts(false);
      });

    return () => {
      active = false;
    };
  }, [store.id]);

  // Merge remote posts matching store_id with in-memory listings belonging to this store
  const storePosts = useMemo(() => {
    const merged = new Map<string, Listing>();
    remoteStorePosts.forEach((p) => merged.set(p.id, p));

    listings.forEach((item) => {
      const matchesByStoreId = item.storeId && String(item.storeId) === String(store.id);
      const matchesByOwner =
        store.ownerId &&
        item.sellerId === store.ownerId &&
        (item.adType === 'commercial' || item.sellerType === 'commercial');
      if (matchesByStoreId || matchesByOwner) {
        if (!merged.has(item.id)) merged.set(item.id, item);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)
    );
  }, [remoteStorePosts, listings, store.id, store.ownerId]);

  const storePhone = store.phoneNumber || store.ownerPhone || '';

  const [isClosing, setIsClosing] = useState(false);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
    }, 150);
  };

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 select-none ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full max-w-2xl mx-auto sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#D9AF91] ${
          isClosing ? 'animate-modal-down' : 'animate-modal-up'
        }`}
      >
        {/* Grab affordance on mobile */}
        <div className="sm:hidden w-10 h-1 bg-[#D9AF91] rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Store Header */}
        <div className="p-4 border-b border-[#D9AF91]/80 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="group min-w-[40px] min-h-[40px] text-[#1E293B] hover:bg-[#EDC9AF]/70 active:scale-95 rounded-xl transition-all flex items-center justify-center shrink-0"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              {isAr ? (
                <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              )}
            </button>

            <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#008080] flex items-center justify-center shrink-0 border border-teal-100">
              <Store className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#1E293B] truncate">
                {store.name}
              </h2>
              <p className="text-xs text-[#64748B] tabular-nums">
                {storePosts.length} {isAr ? 'إعلان' : 'ads'}
              </p>
            </div>
          </div>

          {storePhone && (
            <a
              href={`tel:${storePhone}`}
              dir="ltr"
              className="group min-h-[40px] px-3.5 rounded-xl bg-[#008080] hover:bg-[#006666] active:scale-95 text-white text-xs font-bold tabular-nums flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110" />
              <span>{storePhone}</span>
            </a>
          )}
        </div>

        {/* Store Ads Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#EDC9AF]/45">
          {isLoadingPosts && storePosts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-[#D9AF91]/80 overflow-hidden"
                >
                  <div className="aspect-[4/3] skeleton-shimmer" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 skeleton-shimmer rounded-lg w-4/5" />
                    <div className="h-4 skeleton-shimmer rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : storePosts.length === 0 ? (
            <div className="py-14 px-6 text-center bg-white rounded-2xl border border-[#D9AF91]">
              <p className="text-sm font-semibold text-[#64748B]">
                {isAr ? 'لا توجد إعلانات في هذا المتجر بعد' : 'No ads in this store yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {storePosts.map((item) => {
                const cardImg = item.thumbnailUrl || item.mediaUrls?.[0];
                const locationText = item.district || item.city;
                const isFav = favoriteIds.includes(item.id);
                const isPopping = poppedCardId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onSelectListing(item);
                    }}
                    className="group bg-white rounded-2xl overflow-hidden border border-[#D9AF91]/85 shadow-[0_3px_12px_rgba(180,120,60,0.08)] hover:shadow-[0_14px_30px_rgba(0,128,128,0.16)] hover:border-[#C89875] hover:-translate-y-1 cursor-pointer transition-all duration-200 active:scale-[0.98] flex flex-col"
                  >
                    <div className="relative aspect-[4/3] bg-[#EDC9AF]/50 overflow-hidden flex items-center justify-center">
                      {cardImg ? (
                        <img
                          src={cardImg}
                          alt={item.title || 'منتج'}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                        />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-[#C69363]" />
                      )}

                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPoppedCardId(item.id);
                            window.setTimeout(() => {
                              setPoppedCardId((prev) => (prev === item.id ? null : prev));
                            }, 320);
                            onToggleFavorite(item.id);
                          }}
                          aria-label={
                            isFav
                              ? (isAr ? 'إزالة من المفضلة' : 'Remove from favorites')
                              : (isAr ? 'إضافة إلى المفضلة' : 'Add to favorites')
                          }
                          className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xs shadow-xs transition-all duration-200 active:scale-125 ${
                            isFav
                              ? 'bg-white/95 text-rose-500 border border-rose-200/80'
                              : 'bg-white/85 hover:bg-white text-[#1E293B]/80 border border-[#D9AF91]/80'
                          } ${isPopping ? 'animate-heart-pop' : ''}`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors duration-150 ${
                              isFav ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                        {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                      </h3>

                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-[#006666] tabular-nums">
                          {item.hidePrice
                            ? (isAr ? 'عند التواصل' : 'Contact')
                            : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                        </p>

                        {locationText && (
                          <p className="text-[11px] text-[#64748B] flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#008080]/70 shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
