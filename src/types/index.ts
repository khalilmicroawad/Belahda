/**
 * Core type definitions for Souq Belahdha (سوق بلحظة)
 * Peer-to-Peer & B2C Marketplace - Iraqi Market (Currently serving Mosul مدينة الموصل)
 */

export type SellerType = 'personal' | 'commercial';

export type ItemCondition = 'new' | 'good' | 'acceptable';

export type CategoryId = 
  | 'electronics'
  | 'vehicles'
  | 'furniture'
  | 'fashion'
  | 'real_estate'
  | 'appliances'
  | 'hobbies'
  | 'handcrafts'
  | 'services';

export interface StoreLocation {
  lat: number;
  lng: number;
  addressName: string;
  city: string;
  district?: string;
}

export interface ContactPreferences {
  directChat: boolean;
  whatsapp: boolean;
  phoneCall: boolean;
  whatsappNumber?: string;
  phoneNumber?: string;
}

export interface StoreSocialLinks {
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface StoreProfile {
  id: string;
  name: string;
  ownerId?: string;
  ownerPhone: string;
  description: string;
  logoUrl?: string;
  coverUrl?: string;
  district: string;
  city: string;
  address: string;
  category: CategoryId;
  whatsappNumber: string;
  phoneNumber: string;
  socialLinks?: StoreSocialLinks;
  deliveryAvailable: boolean;
  deliveryNotes?: string;
  isVerified: boolean;
  totalListingsCount: number;
  rating?: number;
  lat?: number;
  lng?: number;
  lastActiveAt?: number;
  isArchived?: boolean;
  createdAt: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string; // 'د.ع' (IQD) or '$' (USD)
  hidePrice: boolean;
  category: CategoryId;
  condition: ItemCondition;
  sellerType: SellerType;
  storeId?: string;
  storeName?: string;
  storeLocation?: StoreLocation;
  city: string; // 'الموصل' (Mosul)
  district: string; // e.g. 'حي الزهور', 'المجموعة الثقافية', 'الدواسة', etc.
  deliveryAvailable: boolean; // متوفر توصيل أو غير متوفر
  deliveryNotes?: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  fullImageUrl?: string;
  contactOptions: ContactPreferences;
  createdAt: string; // Relative display text
  createdTimestamp: number;
  viewsCount: number;
  sellerId?: string;
  sellerName: string;
  sellerPhone: string;
  sellerAvatar?: string;
  isVerified?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  phoneNumber: string;
  password?: string; // 8 characters minimum (letters or numbers)
  email?: string;
  avatarUrl?: string;
  isSeller: boolean;
  hasCustomStore?: boolean;
  customStoreId?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  offerAmount?: number;
}

export type AppView = 
  | 'onboarding'   // Zero-barrier entrance: BUY or SELL
  | 'feed'         // Main marketplace browse (BUY)
  | 'stores'       // Stores Directory (متاجر)
  | 'store_detail' // Single store catalog view
  | 'create'       // Step-by-step listing wizard (SELL)
  | 'detail'       // Listing detail view
  | 'chat'         // In-app direct messaging
  | 'my_listings'  // User's own posted items & store unlock progress
  | 'profile';     // Control panel to edit account (email, 8-char password, custom store)
