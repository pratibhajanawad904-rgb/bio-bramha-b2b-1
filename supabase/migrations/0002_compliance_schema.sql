-- =============================================================================
-- COMPLIANCE SCHEMA
-- =============================================================================
-- Tables backing: versioned legal documents, consent records, itemised data-usage
-- notice, grievance contact, saved addresses, and the audit trails required for
-- account deletion and profile changes.
--
-- Design notes:
--   * Legal document versions are append-only. A dispute about "which policy
--     applied on date X" cannot be answered if versions are overwritten.
--   * Consent is append-only for the same reason: re-consent creates a new row.
--   * account_deletions is keyed by a hash of the phone, not the phone itself, so
--     the audit trail survives deletion without re-introducing the PII that was
--     just erased.
--   * PDFs are never stored in these tables, only a storage path. Files live in a
--     private Storage bucket and are served via short-lived signed URLs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_accounts: add the email column that is currently missing.
-- A named-column select on it previously failed with 42703 and broke login, so
-- application reads use select('*') for drift tolerance. Adding it properly here.
-- -----------------------------------------------------------------------------
alter table public.user_accounts add column if not exists email text;

-- Deletion support: an account can be disabled without dropping the row, so
-- past-order anonymisation and audit references stay intact.
alter table public.user_accounts add column if not exists is_deleted boolean not null default false;
alter table public.user_accounts add column if not exists deleted_at timestamptz;

-- -----------------------------------------------------------------------------
-- Privacy policy versions (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.privacy_policy_versions (
  id            uuid primary key default gen_random_uuid(),
  version       text not null unique,
  pdf_path      text not null,
  effective_date date not null,
  is_current    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- At most one current version. A partial unique index enforces this at the
-- database level rather than trusting application code to keep it consistent.
create unique index if not exists privacy_policy_only_one_current
  on public.privacy_policy_versions (is_current)
  where is_current;

create index if not exists privacy_policy_effective_date_idx
  on public.privacy_policy_versions (effective_date desc);

-- -----------------------------------------------------------------------------
-- Refund / payment policy (singleton, link or PDF)
-- -----------------------------------------------------------------------------
create table if not exists public.refund_policy (
  id         text primary key default 'global',
  mode       text not null check (mode in ('link', 'pdf')),
  url        text,
  pdf_path   text,
  updated_at timestamptz not null default now(),
  -- Whichever mode is selected must actually carry a value.
  constraint refund_policy_mode_has_value check (
    (mode = 'link' and url is not null and url <> '') or
    (mode = 'pdf'  and pdf_path is not null and pdf_path <> '')
  ),
  -- Links must be https. Defence in depth alongside the application check.
  constraint refund_policy_url_is_https check (
    url is null or url ~* '^https://'
  ),
  constraint refund_policy_is_singleton check (id = 'global')
);

-- -----------------------------------------------------------------------------
-- Consent records (append-only; never updated, never deleted)
-- -----------------------------------------------------------------------------
create table if not exists public.user_consents (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null,
  policy_version text not null,
  -- Server-generated. The client clock is not trusted for a legal record.
  consented_at   timestamptz not null default now(),
  ip             text,
  user_agent     text
);

create index if not exists user_consents_phone_idx on public.user_consents (phone, consented_at desc);

-- -----------------------------------------------------------------------------
-- Itemised data-usage notice (DPDP requires notice at the point of consent,
-- not merely a link to a PDF). Admin-editable so it changes without a release.
-- -----------------------------------------------------------------------------
create table if not exists public.data_usage_notice_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  purpose     text not null,
  shared_with text,
  retention   text,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists data_usage_notice_sort_idx on public.data_usage_notice_items (sort_order);

-- -----------------------------------------------------------------------------
-- Grievance / data protection contact (singleton)
-- -----------------------------------------------------------------------------
create table if not exists public.grievance_contact (
  id         text primary key default 'global',
  name       text not null,
  email      text not null,
  phone      text,
  updated_at timestamptz not null default now(),
  constraint grievance_contact_is_singleton check (id = 'global')
);

-- -----------------------------------------------------------------------------
-- Saved addresses. Captured at first checkout, then managed from the profile.
-- -----------------------------------------------------------------------------
create table if not exists public.user_addresses (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  line1      text not null,
  city       text not null,
  pincode    text not null,
  state      text not null default 'AP',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_addresses_pincode_format check (pincode ~ '^[1-9][0-9]{5}$')
);

create index if not exists user_addresses_phone_idx on public.user_addresses (phone);

-- One default per user, enforced in the database.
create unique index if not exists user_addresses_one_default_per_phone
  on public.user_addresses (phone)
  where is_default;

-- -----------------------------------------------------------------------------
-- Deletion audit trail.
--
-- Keyed by sha256(phone) so the log survives deletion of the account without
-- storing the phone number again. Same input always yields the same hash, so a
-- repeat deletion by the same person is still traceable.
-- -----------------------------------------------------------------------------
create table if not exists public.account_deletions (
  id            uuid primary key default gen_random_uuid(),
  phone_hash    text not null,
  requested_at  timestamptz not null default now(),
  completed_at  timestamptz,
  ip            text,
  orders_anonymised integer not null default 0
);

create index if not exists account_deletions_hash_idx on public.account_deletions (phone_hash);

-- -----------------------------------------------------------------------------
-- Profile change log. Values are stored masked; this is an accountability record,
-- not a second copy of the user's personal data.
-- -----------------------------------------------------------------------------
create table if not exists public.profile_change_log (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  field      text not null,
  old_masked text,
  new_masked text,
  changed_at timestamptz not null default now(),
  ip         text
);

create index if not exists profile_change_log_phone_idx on public.profile_change_log (phone, changed_at desc);

-- -----------------------------------------------------------------------------
-- Order retention support.
--
-- Statutory retention outlives the account: GST 6 years, Income Tax 6 years,
-- Companies Act 8 years, DPDP Rules 2025 Rule 8 a 1 year floor. Deletion strips
-- PII from these rows and flags them, rather than removing them.
-- -----------------------------------------------------------------------------
alter table public.orders add column if not exists is_anonymised boolean not null default false;
alter table public.orders add column if not exists anonymised_at timestamptz;

-- =============================================================================
-- RLS for the new tables.
--
-- Public read is granted only to the legal documents a user must be able to see
-- before signing in. Everything containing personal data is service-role only,
-- meaning it is reachable exclusively through API routes that have verified the
-- caller's session.
-- =============================================================================

-- Publicly readable: users need these before and during signup.
alter table public.privacy_policy_versions enable row level security;
create policy "privacy_policy_public_read"
  on public.privacy_policy_versions for select to anon, authenticated using (true);

alter table public.refund_policy enable row level security;
create policy "refund_policy_public_read"
  on public.refund_policy for select to anon, authenticated using (true);

alter table public.data_usage_notice_items enable row level security;
create policy "data_usage_notice_public_read"
  on public.data_usage_notice_items for select to anon, authenticated using (true);

alter table public.grievance_contact enable row level security;
create policy "grievance_contact_public_read"
  on public.grievance_contact for select to anon, authenticated using (true);

-- Personal data / audit trails: no anon policy at all, so anon sees nothing.
alter table public.user_consents enable row level security;
alter table public.user_consents force row level security;

alter table public.user_addresses enable row level security;
alter table public.user_addresses force row level security;

alter table public.account_deletions enable row level security;
alter table public.account_deletions force row level security;

alter table public.profile_change_log enable row level security;
alter table public.profile_change_log force row level security;

-- Grants: anon may read the legal documents and nothing else.
revoke all on public.privacy_policy_versions from anon;
revoke all on public.refund_policy from anon;
revoke all on public.data_usage_notice_items from anon;
revoke all on public.grievance_contact from anon;
grant select on public.privacy_policy_versions to anon;
grant select on public.refund_policy to anon;
grant select on public.data_usage_notice_items to anon;
grant select on public.grievance_contact to anon;

revoke all on public.user_consents from anon;
revoke all on public.user_addresses from anon;
revoke all on public.account_deletions from anon;
revoke all on public.profile_change_log from anon;

-- service_role must be granted explicitly; see the note in 0000_base_schema.sql.
grant all privileges on public.privacy_policy_versions to service_role;
grant all privileges on public.refund_policy           to service_role;
grant all privileges on public.user_consents           to service_role;
grant all privileges on public.data_usage_notice_items to service_role;
grant all privileges on public.grievance_contact       to service_role;
grant all privileges on public.user_addresses          to service_role;
grant all privileges on public.account_deletions       to service_role;
grant all privileges on public.profile_change_log      to service_role;

-- =============================================================================
-- Seed: a starting data-usage notice so the signup screen has content to show.
-- Admin-editable afterwards.
-- =============================================================================
insert into public.data_usage_notice_items (category, purpose, shared_with, retention, sort_order)
values
  ('Name and phone number', 'To create your account, verify your identity by OTP, and contact you about orders', 'Delivery partners (for fulfilment)', 'Until account deletion; order records retained as required by tax law', 1),
  ('Delivery address', 'To deliver the products you order', 'Delivery partners', 'Until you remove it, or account deletion', 2),
  ('Email address (optional)', 'To send order confirmations and support replies', 'Not shared', 'Until account deletion', 3),
  ('Order and payment records', 'To process orders, issue invoices, and meet statutory record-keeping duties', 'Payment provider; tax authorities where legally required', 'Retained after account deletion as required by GST, Income Tax and Companies Act rules', 4)
on conflict do nothing;
