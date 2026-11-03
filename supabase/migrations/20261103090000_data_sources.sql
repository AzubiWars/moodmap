-- Data sources (#267, ADR-018): every response belongs to exactly one source (demo, live, import).
-- Analysis logic stays unchanged; #270 adds the source filter to the aggregate RPCs.
--
-- Access model (unchanged from #77):
--   * anon/authenticated still cannot read or write responses/answers.
--   * data_sources is read only through get_data_sources(), which applies the visibility rule.
--   * Schema `private` (import audit) is not exposed through the API at all.

-- ── Registry ─────────────────────────────────────────────────────────────────

create table public.data_sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  label text not null check (char_length(label) between 1 and 80),
  kind text not null check (kind in ('demo', 'live', 'import')),
  period_start date,
  period_end date,
  visibility text not null default 'public' check (visibility in ('public', 'ministry')),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  is_default boolean not null default false,
  -- Imports of provider aggregates (#274) cannot show distributions/trends that were not delivered.
  aggregated_by_provider boolean not null default false,
  created_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start),
  -- The default source must be usable by everyone.
  check (not is_default or (status = 'active' and visibility = 'public'))
);

-- At most one default source.
create unique index data_sources_single_default on public.data_sources (is_default) where is_default;

alter table public.data_sources enable row level security;
revoke all on public.data_sources from anon, authenticated;

insert into public.data_sources (id, label, kind, status, is_default) values
  ('live', 'Live-Abgaben', 'live', 'active', true),
  ('live-pitch', 'Pitch-Teststandort', 'live', 'active', false),
  ('demo-seed', 'Demo-Daten (synthetisch)', 'demo', 'active', false);

-- ── Import audit (service role only) ────────────────────────────────────────

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.data_sources (id),
  -- sha256 of the imported file; never the file or any cell content (PRIVACY §9.6).
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  mapping_id text not null,
  mapping_version integer not null check (mapping_version > 0),
  rows_total integer not null check (rows_total >= 0),
  rows_accepted integer not null check (rows_accepted >= 0),
  rows_rejected integer not null check (rows_rejected >= 0),
  -- Error codes with counts, e.g. {"unknown_school": 3}. No cell values.
  errors jsonb not null default '{}' check (jsonb_typeof(errors) = 'object'),
  importer text not null check (char_length(importer) between 1 and 40),
  status text not null default 'committed' check (status in ('committed', 'rolled_back')),
  created_at timestamptz not null default now(),
  rolled_back_at timestamptz
);

grant select, insert, update on private.import_runs to service_role;

-- ── Responses get a source ──────────────────────────────────────────────────

alter table public.responses
  add column source_id text not null default 'live' references public.data_sources (id),
  add column import_run_id uuid references private.import_runs (id),
  -- sha256(salt:source:external id) for idempotent re-imports (PRIVACY §9.2).
  add column external_key_hash text check (external_key_hash ~ '^[0-9a-f]{64}$'),
  alter column device_hash drop not null,
  -- App submissions are identified by device; imported rows by their import run.
  add constraint responses_identity_check check (
    (device_hash is not null and import_run_id is null and external_key_hash is null)
    or (device_hash is null and import_run_id is not null and external_key_hash is not null)
  );

alter table public.responses
  add constraint responses_source_external_key unique (source_id, external_key_hash);

create index responses_source_wave_idx on public.responses (source_id, wave_id);
create index responses_import_run_idx on public.responses (import_run_id) where import_run_id is not null;

-- Existing data: pitch test site → live-pitch, synthetic demo schools (9xxxxx) → demo-seed.
update public.responses r set source_id = 'live-pitch'
  from public.schools s where s.id = r.school_id and s.is_test;
update public.responses set source_id = 'demo-seed' where school_id ~ '^9[0-9]{5}$';

-- A dedicated demo database only holds synthetic answers: then demo-seed is its default.
do $$
begin
  if exists (select 1 from public.responses where source_id = 'demo-seed')
    and not exists (select 1 from public.responses where source_id = 'live') then
    update public.data_sources set is_default = false where is_default;
    update public.data_sources set is_default = true where id = 'demo-seed';
  end if;
end $$;

-- New app submissions at the pitch test site always land in live-pitch (ADR-015), so they can
-- never reach the NRW sources, whatever the caller passes.
create function public.assign_response_source() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if exists (select 1 from public.schools where id = new.school_id and is_test) then
    new.source_id := 'live-pitch';
  end if;
  return new;
end;
$$;

create trigger responses_assign_source
  before insert on public.responses
  for each row execute function public.assign_response_source();

revoke execute on function public.assign_response_source() from public, anon, authenticated;

-- ── Visibility (server-side; the demo role switch grants nothing) ───────────

-- True when the caller may read a source with this visibility. `ministry` needs a signed-in account
-- whose app_metadata.moodmap_role is set by an admin, like publish_policy_answer (#81).
create function public.can_read_source(visibility text) returns boolean
  language sql
  stable
  set search_path = ''
as $$
  select visibility = 'public'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'moodmap_role', '') in ('ministerium', 'bezreg')
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
$$;

-- Resolves query.sourceId (or the default source) to a readable, active source id.
-- Unknown, inactive or hidden sources raise instead of silently falling back (ADR-017/018).
create function public.resolve_source(query jsonb) returns text
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_id text := query ->> 'sourceId';
  v_source public.data_sources%rowtype;
begin
  if v_id is null then
    select * into v_source from public.data_sources where is_default;
  else
    select * into v_source from public.data_sources where id = v_id;
  end if;
  if not found or v_source.status <> 'active' or not public.can_read_source(v_source.visibility) then
    raise exception 'unknown data source %', coalesce(v_id, '(default)') using errcode = '22023';
  end if;
  return v_source.id;
end;
$$;

-- DataSourceInfo[] (src/types): active sources the caller may read, default first.
-- n = number of participations in the source (whole source, not a cell, so no K_MIN needed).
create function public.get_data_sources() returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'label', d.label,
        'kind', d.kind,
        'periodStart', d.period_start,
        'periodEnd', d.period_end,
        'visibility', d.visibility,
        'isDefault', d.is_default,
        'aggregatedByProvider', d.aggregated_by_provider,
        'n', (select count(*) from public.responses r where r.source_id = d.id)
      )
      order by d.is_default desc, d.kind = 'demo', d.label
    ),
    '[]'::jsonb
  )
  from public.data_sources d
  -- The pitch test site has its own beamer view; it is never a selectable map source.
  -- Empty sources (e.g. demo-seed in a live database) are hidden, except the default.
  where d.status = 'active' and d.id <> 'live-pitch' and public.can_read_source(d.visibility)
    and (d.is_default or exists (select 1 from public.responses r where r.source_id = d.id))
$$;

revoke execute on function public.can_read_source(text) from public, anon, authenticated;
revoke execute on function public.resolve_source(jsonb) from public, anon, authenticated;
grant execute on function public.get_data_sources() to anon, authenticated;
