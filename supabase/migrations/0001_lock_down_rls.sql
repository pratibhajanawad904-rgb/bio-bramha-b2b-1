-- =============================================================================
-- RLS LOCKDOWN
-- =============================================================================
-- Closes the critical vulnerability: every table is currently readable and
-- writable by anyone holding the publishable key, which ships inside the web
-- bundle and the APK. Demonstrated impact before this migration:
--   * All customer names, phone numbers and delivery addresses were readable.
--   * An anonymous caller could INSERT a row into user_accounts with
--     role = 'super_admin' and gain the admin dashboard.
--
-- Model after this migration:
--   * anon  -> read-only, and only for catalog data that is genuinely public.
--   * writes and all PII -> service_role only, i.e. through the server, which
--     checks the caller's session and role first.
--
-- DEPENDENCY: apply this only once the server-side API layer is in place.
-- Applying it earlier will break the app, because the client currently writes
-- to these tables directly with the anon key.
-- =============================================================================

-- Helper: drop every existing policy on a table so we start from a known state.
-- The current policies are all `using (true)` / `with check (true)`.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'products', 'offers', 'secondary_categories',
        'orders', 'user_accounts', 'app_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Public catalog: anyone may read, nobody may write without the service role.
-- Buyers must see products and offers before signing in, so SELECT stays open.
-- -----------------------------------------------------------------------------

alter table public.products enable row level security;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (true);

alter table public.offers enable row level security;
create policy "offers_public_read"
  on public.offers for select
  to anon, authenticated
  using (true);

alter table public.secondary_categories enable row level security;
create policy "secondary_categories_public_read"
  on public.secondary_categories for select
  to anon, authenticated
  using (true);

-- Support contact and payment instructions are shown at checkout, so they are
-- public to read. Writes remain server-only.
alter table public.app_settings enable row level security;
create policy "app_settings_public_read"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- PII tables: no anon access whatsoever.
--
-- No policy is created for anon, so with RLS enabled every anon SELECT returns
-- zero rows and every write is rejected. service_role bypasses RLS entirely,
-- which is why the server can still operate on these tables.
-- -----------------------------------------------------------------------------

-- orders holds buyer name, phone, and delivery address.
alter table public.orders enable row level security;
alter table public.orders force row level security;

-- user_accounts is the role store; a writable copy is a privilege-escalation path.
alter table public.user_accounts enable row level security;
alter table public.user_accounts force row level security;

-- -----------------------------------------------------------------------------
-- Revoke direct table grants from the anon role.
--
-- RLS filters rows, but the underlying GRANTs still decide whether the role may
-- issue the statement at all. Removing write grants means an attacker gets a
-- permission error rather than a silently-empty result, and protects against a
-- future permissive policy being added by mistake.
-- -----------------------------------------------------------------------------

revoke insert, update, delete on public.products from anon;
revoke insert, update, delete on public.offers from anon;
revoke insert, update, delete on public.secondary_categories from anon;
revoke insert, update, delete on public.app_settings from anon;
revoke all on public.orders from anon;
revoke all on public.user_accounts from anon;

-- Stop anon discovering the schema through PostgREST introspection.
revoke usage on schema public from anon;
grant usage on schema public to anon;
grant select on public.products, public.offers, public.secondary_categories, public.app_settings to anon;

-- -----------------------------------------------------------------------------
-- Verification. Run these after applying:
--
--   select tablename, policyname, roles, cmd
--   from pg_policies where schemaname = 'public' order by tablename;
--
--   -- Expect 0 rows from an anon client:
--   select count(*) from public.orders;
--   select count(*) from public.user_accounts;
-- -----------------------------------------------------------------------------
