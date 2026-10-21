-- What a fresh Supabase project provides before our migrations run (test-only).
-- Mirrors Supabase's permissive defaults, so the tests prove that our migrations lock things down.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Supabase installs extensions into their own schema.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- auth.jwt() as in Supabase: the claims of the request's JWT (PostgREST sets request.jwt.claims).
create schema if not exists auth;
create function auth.jwt() returns jsonb
  language sql
  stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
