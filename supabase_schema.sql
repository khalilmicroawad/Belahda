-- ============================================================================
-- Souq Belahdha (سوق بلحظة) - Complete Supabase Setup SQL
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- 2A. User Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone_number text default '',
  email text,
  avatar_url text,
  is_seller boolean not null default false,
  has_custom_store boolean not null default false,
  custom_store_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2B. Marketplace Listings
create table if not exists public.listings (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  price numeric not null default 0,
  currency text not null default 'د.ع',
  hide_price boolean not null default false,
  category text not null,
  condition text not null default 'new',
  seller_type text not null default 'personal',
  store_id text,
  store_name text,
  store_location jsonb,
  city text not null default 'الموصل',
  district text not null default 'حي الزهور',
  delivery_available boolean not null default true,
  delivery_notes text,
  media_urls jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  full_image_url text,
  contact_options jsonb not null default '{}'::jsonb,
  created_at_label text not null default 'اليوم',
  created_timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint,
  views_count integer not null default 1,
  seller_name text not null default '',
  seller_phone text not null default '',
  seller_avatar text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2B-2. Posts Table (shared public marketplace posts with dual-image URLs)
create table if not exists public.posts (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  price numeric not null default 0,
  currency text not null default 'د.ع',
  hide_price boolean not null default false,
  category text not null default 'electronics',
  condition text not null default 'new',
  seller_type text not null default 'personal',
  store_id text,
  store_name text,
  store_location jsonb,
  city text not null default 'الموصل',
  district text not null default 'حي الزهور',
  delivery_available boolean not null default true,
  delivery_notes text,
  media_urls jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  full_image_url text,
  contact_options jsonb not null default '{}'::jsonb,
  seller_name text not null default '',
  seller_phone text not null default '',
  seller_avatar text,
  is_verified boolean not null default false,
  views_count integer not null default 1,
  created_at timestamptz not null default now()
);

-- Ensure all columns exist if public.posts was created earlier with fewer columns
alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.posts add column if not exists description text not null default '';
alter table public.posts add column if not exists price numeric not null default 0;
alter table public.posts add column if not exists currency text not null default 'د.ع';
alter table public.posts add column if not exists hide_price boolean not null default false;
alter table public.posts add column if not exists category text not null default 'electronics';
alter table public.posts add column if not exists condition text not null default 'new';
alter table public.posts add column if not exists seller_type text not null default 'personal';
alter table public.posts add column if not exists store_id text;
alter table public.posts add column if not exists store_name text;
alter table public.posts add column if not exists store_location jsonb;
alter table public.posts add column if not exists city text not null default 'الموصل';
alter table public.posts add column if not exists district text not null default 'حي الزهور';
alter table public.posts add column if not exists delivery_available boolean not null default true;
alter table public.posts add column if not exists delivery_notes text;
alter table public.posts add column if not exists media_urls jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists thumbnail_url text;
alter table public.posts add column if not exists full_image_url text;
alter table public.posts add column if not exists contact_options jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists seller_name text not null default '';
alter table public.posts add column if not exists seller_phone text not null default '';
alter table public.posts add column if not exists seller_avatar text;
alter table public.posts add column if not exists is_verified boolean not null default false;
alter table public.posts add column if not exists views_count integer not null default 1;
alter table public.posts add column if not exists ad_type text not null default 'personal';
alter table public.posts add column if not exists latitude double precision;
alter table public.posts add column if not exists longitude double precision;
alter table public.posts add column if not exists maps_url text;
alter table public.posts add column if not exists created_at timestamptz not null default now();

-- 2C. Verified Stores Directory
create table if not exists public.stores (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  owner_phone text not null default '',
  description text not null default '',
  logo_url text,
  cover_url text,
  district text not null default 'حي الزهور',
  city text not null default 'الموصل',
  address text not null default '',
  category text not null default 'electronics',
  whatsapp_number text not null default '',
  phone_number text not null default '',
  social_links jsonb,
  delivery_available boolean not null default true,
  delivery_notes text,
  is_verified boolean not null default true,
  total_listings_count integer not null default 1,
  rating numeric not null default 5.0,
  lat double precision,
  lng double precision,
  last_active_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  is_archived boolean not null default false,
  created_at_ts bigint not null default (extract(epoch from now()) * 1000)::bigint,
  created_at timestamptz not null default now()
);

alter table public.stores add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.stores add column if not exists store_name text;
alter table public.stores add column if not exists phone text;

-- 2D. Visitor Logs & Counter
create table if not exists public.visitor_logs (
  id bigserial primary key,
  session_id text,
  visitor_id text not null default '',
  page text not null default 'home',
  city text not null default 'الموصل',
  device text not null default 'mobile',
  user_id uuid references auth.users(id) on delete set null,
  visited_at timestamptz not null default now()
);

alter table public.visitor_logs add column if not exists session_id text;

-- Helpful indexes
create index if not exists idx_listings_created_ts on public.listings (created_timestamp desc);
create index if not exists idx_listings_category on public.listings (category);
create index if not exists idx_stores_category on public.stores (category);
create index if not exists idx_visitor_logs_visited_at on public.visitor_logs (visited_at desc);

-- ============================================================================
-- 3. AUTO-CREATE PROFILE ON SIGN-UP TRIGGER
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone_number, email, is_seller)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'is_seller')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.posts enable row level security;
alter table public.stores enable row level security;
alter table public.visitor_logs enable row level security;

-- Profiles Policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Listings Policies (Public browse, open/auth publish & owner manage)
drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone"
  on public.listings for select using (true);

drop policy if exists "Anyone or authenticated users can create listings" on public.listings;
create policy "Anyone or authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can update own listings" on public.listings;
create policy "Users can update own listings"
  on public.listings for update
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete own listings" on public.listings;
create policy "Users can delete own listings"
  on public.listings for delete
  using (auth.uid() = user_id or user_id is null);

-- Posts Policies (Public read for anon & authenticated; Insert restricted to authenticated users)
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone or authenticated users can create posts" on public.posts;
drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable Realtime on posts table
alter publication supabase_realtime add table public.posts;

-- Stores Policies
drop policy if exists "Stores are viewable by everyone" on public.stores;
create policy "Stores are viewable by everyone"
  on public.stores for select using (true);

drop policy if exists "Authenticated users can create stores" on public.stores;
create policy "Authenticated users can create stores"
  on public.stores for insert
  with check (auth.uid() = owner_id or owner_id is null);

drop policy if exists "Store owners can update their store" on public.stores;
create policy "Store owners can update their store"
  on public.stores for update
  using (auth.uid() = owner_id or owner_id is null);

-- Visitor Logs Policies
drop policy if exists "Visitor logs are readable" on public.visitor_logs;
create policy "Visitor logs are readable"
  on public.visitor_logs for select using (true);

drop policy if exists "Anyone can insert visitor logs" on public.visitor_logs;
create policy "Anyone can insert visitor logs"
  on public.visitor_logs for insert
  with check (true);

-- ============================================================================
-- 5. STORAGE BUCKET ('app-uploads') & STORAGE POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-uploads',
  'app-uploads',
  true,
  5242880, -- 5MB limit per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set public = true;

drop policy if exists "Public read access for app-uploads" on storage.objects;
create policy "Public read access for app-uploads"
  on storage.objects for select
  using (bucket_id = 'app-uploads');

drop policy if exists "Authenticated and guest upload to app-uploads" on storage.objects;
create policy "Authenticated and guest upload to app-uploads"
  on storage.objects for insert
  with check (bucket_id = 'app-uploads');

drop policy if exists "Users can update own uploads in app-uploads" on storage.objects;
create policy "Users can update own uploads in app-uploads"
  on storage.objects for update
  using (bucket_id = 'app-uploads' and (auth.uid() = owner or owner is null));

drop policy if exists "Users can delete own uploads in app-uploads" on storage.objects;
create policy "Users can delete own uploads in app-uploads"
  on storage.objects for delete
  using (bucket_id = 'app-uploads' and (auth.uid() = owner or owner is null));

-- ============================================================================
-- 6. STORAGE BUCKET ('thumbnails') FOR LIGHTWEIGHT PRODUCT THUMBNAILS
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  524288, -- 512KB limit for compressed thumbnails
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = true;

drop policy if exists "Public read access for thumbnails" on storage.objects;
create policy "Public read access for thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

drop policy if exists "Anyone can upload thumbnails" on storage.objects;
create policy "Anyone can upload thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'thumbnails');

-- Refresh PostgREST schema cache immediately
notify pgrst, 'reload schema';
