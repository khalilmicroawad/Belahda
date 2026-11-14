import { Listing, StoreProfile } from '../types';

export interface GeoCoords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Computes great-circle distance in kilometers using the Haversine formula.
 */
export function calculateHaversineKm(from: GeoCoords, to: GeoCoords): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function isValidCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function getListingCoords(
  listing: Listing,
  storeMap?: Map<string, StoreProfile>
): GeoCoords | null {
  const isRep = listing.adType === 'representative' || listing.sellerType === 'representative';
  if (isRep) return null;

  if (isValidCoords(listing.latitude, listing.longitude)) {
    return { lat: listing.latitude!, lng: listing.longitude! };
  }
  if (isValidCoords(listing.storeLocation?.lat, listing.storeLocation?.lng)) {
    return { lat: listing.storeLocation!.lat, lng: listing.storeLocation!.lng };
  }
  if (listing.storeId && storeMap) {
    const store = storeMap.get(String(listing.storeId));
    if (store && isValidCoords(store.lat, store.lng)) {
      return { lat: store.lat!, lng: store.lng! };
    }
  }
  return null;
}

export function getStoreCoords(
  store: StoreProfile,
  storePosts?: Listing[]
): GeoCoords | null {
  if (isValidCoords(store.lat, store.lng)) {
    return { lat: store.lat!, lng: store.lng! };
  }
  if (storePosts && storePosts.length > 0) {
    for (const post of storePosts) {
      const coords = getListingCoords(post);
      if (coords) return coords;
    }
  }
  return null;
}

export function formatDistanceValue(distanceKm: number, isAr: boolean): string {
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 10) * 10);
    return isAr ? `${meters} م` : `${meters} m`;
  }
  if (distanceKm < 10) {
    return isAr ? `${distanceKm.toFixed(1)} كم` : `${distanceKm.toFixed(1)} km`;
  }
  return isAr ? `${Math.round(distanceKm)} كم` : `${Math.round(distanceKm)} km`;
}

export function formatDistanceAwayLabel(distanceKm: number, isAr: boolean): string {
  const formatted = formatDistanceValue(distanceKm, isAr);
  return isAr ? `يبعد ${formatted}` : `${formatted} away`;
}
