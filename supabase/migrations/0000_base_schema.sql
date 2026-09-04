-- =============================================================================
-- BASE SCHEMA
-- =============================================================================
-- The hosted project's tables were created ad hoc through the dashboard and REST
-- API and were never captured in migrations, so a fresh database (local or a new
-- environment) had no schema at all. This file reconstructs them so the stack is
-- reproducible and the later migrations have something to apply to.
--
-- Reconstructed from the live hosted schema by inspecting REST responses and
-- constraint errors. Once hosted credentials are available, run
-- `supabase db pull` and reconcile: that is authoritative, this is best-effort.
--
-- Deliberate choices:
--   * `id` columns are text, not uuid: existing rows use readable keys such as
--     'prod-azospirillum' and 'ORD-267485'.
--   * `orders.date` is text: live rows hold both '2026-08-13' and
--     '2026-08-11 16:17', so the column is not uniformly a date or timestamp.
--   * No RLS is enabled here. 0001_lock_down_rls.sql owns that, so the security
--     posture lives in exactly one place.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catalog
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id                     text primary key,
  name                   text not null,
  strain                 text,
  category               text not null,
  crops                  text[],
  benefit                text,
  price                  numeric not null,
  pack_size              text,
  image                  text,
  images                 text[],
  stock                  integer not null default 0,
  badge                  text,
  details                jsonb,
  main_category          text,
  -- Legacy single-tag column, superseded by secondary_category_ids. Retained
  -- because the hosted table still has it and old rows may reference it.
  secondary_category_id  text,
  secondary_category_ids text[] default '{}'::text[],
  moq                    integer
);

create table if not exists public.secondary_categories (
  id         text primary key default gen_random_uuid()::text,
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id                  text primary key,
  title               text not null,
  discount_percentage numeric not null default 0,
  active              boolean not null default true,
  product_ids         text[] default '{}'::text[]
);

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id             text primary key,
  date           text,
  buyer_id       text,
  buyer_name     text,
  buyer_email    text,
  phone          text,
  address        text,
  city           text,
  state          text,
  pincode        text,
  warehouse_id   text,
  items          jsonb,
  subtotal       numeric,
  total          numeric,
  payment_method text,
  status         text not null default 'placed',
  timeline       jsonb
);

create index if not exists orders_phone_idx on public.orders (phone);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_status_idx on public.orders (status);

-- -----------------------------------------------------------------------------
-- Accounts and settings
-- -----------------------------------------------------------------------------
create table if not exists public.user_accounts (
  phone                 text primary key,
  name                  text,
  role                  text not null default 'buyer',
  assigned_warehouse_id text,
  updated_at            timestamptz not null default now()
);

create table if not exists public.app_settings (
  id               text primary key default 'global',
  helpline_number  text,
  helpline_email   text,
  payment_settings jsonb default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Role grants.
--
-- Tables created by raw SQL do not pick up the default privileges that the
-- Supabase dashboard applies, so service_role must be granted explicitly or the
-- server gets "permission denied" (42501) on every query. Being explicit here
-- also means a fresh environment reproduces the hosted behaviour exactly instead
-- of depending on whichever default privileges happen to be configured.
--
-- anon is granted nothing at this stage; 0001_lock_down_rls.sql decides precisely
-- what anonymous callers may read.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on public.products             to service_role;
grant all privileges on public.secondary_categories to service_role;
grant all privileges on public.offers               to service_role;
grant all privileges on public.orders               to service_role;
grant all privileges on public.user_accounts        to service_role;
grant all privileges on public.app_settings         to service_role;
