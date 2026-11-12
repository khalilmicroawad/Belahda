import { pgTable, serial, text, integer, boolean, timestamp, jsonb, bigint } from 'drizzle-orm/pg-core';

// 1. Visitors Log & Counter (عداد وسجل الزوار)
export const visitors = pgTable('visitors', {
  id: serial('id').primaryKey(),
  visitorId: text('visitor_id').notNull(),
  page: text('page').default('home'),
  city: text('city').default('الموصل'),
  device: text('device').default('mobile'),
  visitedAt: timestamp('visited_at').defaultNow(),
});

// 2. Marketplace Listings (جميع الإعلانات المضافة)
export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull().default(0),
  currency: text('currency').notNull().default('د.ع'),
  hidePrice: boolean('hide_price').notNull().default(false),
  category: text('category').notNull(),
  condition: text('condition').notNull().default('new'),
  sellerType: text('seller_type').notNull().default('personal'),
  sellerName: text('seller_name').notNull(),
  sellerPhone: text('seller_phone').notNull(),
  city: text('city').notNull().default('الموصل'),
  district: text('district').notNull(),
  deliveryAvailable: boolean('delivery_available').notNull().default(true),
  deliveryNotes: text('delivery_notes'),
  storeName: text('store_name'),
  storeLocation: jsonb('store_location'),
  mediaUrls: jsonb('media_urls'),
  contactOptions: jsonb('contact_options'),
  createdAt: text('created_at').notNull(),
  createdTimestamp: bigint('created_timestamp', { mode: 'number' }).notNull(),
  viewsCount: integer('views_count').default(1),
  isVerified: boolean('is_verified').default(false),
});

// 3. Registered Stores (متاجر ومعارض الموصل)
export const stores = pgTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerPhone: text('owner_phone').notNull(),
  description: text('description').notNull(),
  district: text('district').notNull(),
  city: text('city').notNull().default('الموصل'),
  address: text('address').notNull(),
  category: text('category').notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  phoneNumber: text('phone_number').notNull(),
  deliveryAvailable: boolean('delivery_available').default(true),
  deliveryNotes: text('delivery_notes'),
  isVerified: boolean('is_verified').default(true),
  totalListingsCount: integer('total_listings_count').default(1),
  rating: text('rating').default('5.0'),
  coverUrl: text('cover_url'),
  lat: text('lat'),
  lng: text('lng'),
  createdAt: bigint('created_at', { mode: 'number' }),
});

// 4. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name'),
  phoneNumber: text('phone_number'),
  email: text('email'),
  isSeller: boolean('is_seller').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
