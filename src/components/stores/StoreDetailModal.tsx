import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { StoreProfile, Listing, UserAccount } from '../../types';
import { fetchPostsByStoreId } from '../../lib/supabase';

interface StoreDetailModalProps {
  store: StoreProfile;
  listings: Listing[];
  currentUser?: UserAccount | null;
  onClose: () => void;
  onSelectListing: (listing: Listing) => void;
  onRequireAuth?: (action: () => void, message?: string) => void;
  lang?: 'ar' | 'en';
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  listings,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 select-none">
      <div className="bg-[#FFFDF9] w-full max-w-2xl mx-auto sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-amber-200/80">
        {/* Grab affordance on mobile */}
        <div className="sm:hidden w-10 h-1 bg-amber-200/90 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

        {/* Store Header */}
        <div className="p-4 border-b border-amber-200/70 flex items-center justify-between gap-3 bg-[#FFFDF9] sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] text-[#1E293B] hover:bg-[#FEF9E7] rounded-xl transition-colors flex items-center justify-center shrink-0"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 border border-teal-100">
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
              className="min-h-[40px] px-3.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold tabular-nums flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{storePhone}</span>
            </a>
          )}
        </div>

        {/* Store Ads Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FDFBF7]">
          {isLoadingPosts && storePosts.length === 0 ? (
            <div className="py-16 flex items-center justify-center text-[#0D9488]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : storePosts.length === 0 ? (
            <div className="py-14 px-6 text-center bg-[#FFFDF9] rounded-2xl border border-amber-200/80">
              <p className="text-sm font-semibold text-[#64748B]">
                {isAr ? 'لا توجد إعلانات في هذا المتجر بعد' : 'No ads in this store yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {storePosts.map((item) => {
                const cardImg = item.thumbnailUrl || item.mediaUrls?.[0];
                const locationText = item.district || item.city;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onSelectListing(item);
                    }}
                    className="group bg-[#FFFDF9] rounded-2xl overflow-hidden border border-amber-200/75 shadow-[0_3px_12px_rgba(13,148,136,0.05)] hover:shadow-[0_10px_24px_rgba(13,148,136,0.10)] hover:border-amber-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 active:scale-[0.99] flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-[#FEF9E7]/80 overflow-hidden flex items-center justify-center">
                      {cardImg ? (
                        <img
                          src={cardImg}
                          alt={item.title || 'منتج'}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-amber-300" />
                      )}
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-[#1E293B] line-clamp-2 leading-relaxed">
                        {item.title || (isAr ? 'إعلان بدون عنوان' : 'Untitled')}
                      </h3>

                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-[#0F766E] tabular-nums">
                          {item.hidePrice
                            ? (isAr ? 'عند التواصل' : 'Contact')
                            : `${Number(item.price ?? 0).toLocaleString()} ${item.currency || 'د.ع'}`}
                        </p>

                        {locationText && (
                          <p className="text-[11px] text-[#64748B] flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#0D9488]/70 shrink-0" />
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
