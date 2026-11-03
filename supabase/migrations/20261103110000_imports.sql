-- Survey imports (#268, #271, #274, ADR-018): staging → atomic commit → audit → rollback, plus provider
-- aggregates. Every RPC here is for the service role only (import CLI with the key from .env.local);
-- anon/authenticated can execute none of them and still cannot read raw data.

-- ── Audit + staging ─────────────────────────────────────────────────────────

alter table private.import_runs
  drop constraint import_runs_status_check,
  add constraint import_runs_status_check check (status in ('staging', 'committed', 'rolled_back', 'failed')),
  alter column status set default 'staging',
  add column granularity text not null default 'response' check (granularity in ('response', 'aggregate')),
  -- Written on commit: new rows vs. rows skipped because the same external key was imported before.
  add column rows_inserted integer check (rows_inserted >= 0),
  add column rows_skipped integer check (rows_skipped >= 0);

create table private.import_staging (
  run_id uuid not null references private.import_runs (id) on delete cascade,
  row_no integer not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (run_id, row_no)
);

-- Provider aggregates (#274): one delivered cell per level × region × topic × wave. Cells below K_MIN
-- are rejected by the CLI and by this check (PRIVACY §9.5).
create table private.imported_aggregates (
  source_id text not null references public.data_sources (id),
  import_run_id uuid not null references private.import_runs (id),
  level text not null check (level in ('nrw', 'regbez', 'kreis', 'school')),
  region_id text not null,
  topic text not null,
  wave_id text not null references public.waves (id),
  n integer not null check (n >= 10),
  score double precision check (score between 0 and 100),
  distribution jsonb check (distribution is null or jsonb_typeof(distribution) = 'object'),
  primary key (source_id, level, region_id, topic, wave_id)
);

create index imported_aggregates_run_idx on private.imported_aggregates (import_run_id);

grant select, insert, update, delete on private.import_staging, private.imported_aggregates to service_role;

-- ISO wave for imports of older periods. Same boundaries as supabase/seed.sql (Europe/Berlin).
create function private.ensure_wave(wave_id text) returns void
  language sql
  volatile
  set search_path = ''
as $$
  insert into public.waves (id, starts_at, ends_at)
  select wave_id,
    (to_date(wave_id || '-1', 'IYYY-"W"IW-ID')::timestamp) at time zone 'Europe/Berlin',
    ((to_date(wave_id || '-1', 'IYYY-"W"IW-ID') + 7)::timestamp) at time zone 'Europe/Berlin'
  on conflict (id) do nothing
$$;

-- ── Sources ─────────────────────────────────────────────────────────────────

-- Creates or updates an import source. New sources start as draft (PRIVACY §9.7): visible only after
-- import_set_source_status(id, 'active'). App sources (live, live-pitch, demo-seed) cannot be touched.
create function public.import_upsert_source(input jsonb) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_source public.data_sources;
begin
  if exists (select 1 from public.data_sources where id = input ->> 'id' and kind <> 'import') then
    raise exception 'source % is not an import source', input ->> 'id' using errcode = '42501';
  end if;
  insert into public.data_sources (id, label, kind, period_start, period_end, visibility, status)
  values (
    input ->> 'id', input ->> 'label', 'import',
    (input ->> 'periodStart')::date, (input ->> 'periodEnd')::date,
    coalesce(input ->> 'visibility', 'ministry'), 'draft'
  )
  on conflict (id) do update set
    label = excluded.label,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    visibility = excluded.visibility
  returning * into v_source;
  return to_jsonb(v_source);
end;
$$;

create function public.import_set_source_status(source_id text, status text) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_source public.data_sources;
begin
  update public.data_sources d set status = import_set_source_status.status
  where d.id = import_set_source_status.source_id and d.kind = 'import'
  returning * into v_source;
  if not found then
    raise exception 'unknown import source %', source_id using errcode = '22023';
  end if;
  return to_jsonb(v_source);
end;
$$;

-- ── Runs ────────────────────────────────────────────────────────────────────

-- meta: { sourceId, granularity, fileSha256, mappingId, mappingVersion, rowsTotal, rowsAccepted,
--         rowsRejected, errors, importer } – counts and codes from the dry-run report, no contents.
create function public.import_begin(meta jsonb) returns uuid
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.data_sources where id = meta ->> 'sourceId' and kind = 'import' and status <> 'archived'
  ) then
    raise exception 'imports need an import source that is not archived' using errcode = '22023';
  end if;
  insert into private.import_runs (
    source_id, granularity, file_sha256, mapping_id, mapping_version,
    rows_total, rows_accepted, rows_rejected, errors, importer, status
  ) values (
    meta ->> 'sourceId', coalesce(meta ->> 'granularity', 'response'), meta ->> 'fileSha256',
    meta ->> 'mappingId', (meta ->> 'mappingVersion')::integer,
    (meta ->> 'rowsTotal')::integer, (meta ->> 'rowsAccepted')::integer, (meta ->> 'rowsRejected')::integer,
    coalesce(meta -> 'errors', '{}'::jsonb), meta ->> 'importer', 'staging'
  ) returning id into v_id;
  return v_id;
end;
$$;

-- rows: [{ rowNo, ...canonical row }] – called in chunks; nothing is visible before import_finalize.
create function public.import_stage(run_id uuid, rows jsonb) returns integer
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (select 1 from private.import_runs r where r.id = run_id and r.status = 'staging') then
    raise exception 'run % is not staging', run_id using errcode = '22023';
  end if;
  insert into private.import_staging (run_id, row_no, payload)
  select import_stage.run_id, (e ->> 'rowNo')::integer, e - 'rowNo'
  from jsonb_array_elements(rows) e;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Writes all staged rows in one transaction (a function call is atomic): on any error nothing is
-- imported. Re-importing the same participations into the same source skips them (idempotent).
create function public.import_finalize(run_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_run private.import_runs;
  v_staged integer;
  v_inserted integer;
  v_wave text;
begin
  select * into v_run from private.import_runs r where r.id = run_id for update;
  if not found or v_run.status <> 'staging' then
    raise exception 'run % is not staging', run_id using errcode = '22023';
  end if;
  select count(*) into v_staged from private.import_staging s where s.run_id = v_run.id;

  for v_wave in
    select distinct s.payload ->> 'waveId' from private.import_staging s where s.run_id = v_run.id
  loop
    perform private.ensure_wave(v_wave);
  end loop;

  if v_run.granularity = 'response' then
    with inserted as (
      insert into public.responses (
        school_id, wave_id, role, grade_band, created_at, source_id, import_run_id, external_key_hash
      )
      select
        s.payload ->> 'schoolId',
        s.payload ->> 'waveId',
        s.payload ->> 'role',
        s.payload ->> 'gradeBand',
        coalesce((s.payload ->> 'date')::date, to_date((s.payload ->> 'waveId') || '-1', 'IYYY-"W"IW-ID')),
        v_run.source_id,
        v_run.id,
        s.payload ->> 'externalKeyHash'
      from private.import_staging s
      where s.run_id = v_run.id
      order by s.row_no
      on conflict (source_id, external_key_hash) do nothing
      returning id, external_key_hash
    ),
    answers as (
      insert into public.answers (response_id, question_id, value, choice)
      select
        i.id,
        a ->> 'questionId',
        (a ->> 'value')::smallint,
        case when a ? 'choice' then array(select jsonb_array_elements_text(a -> 'choice')) end
      from inserted i
      join private.import_staging s
        on s.run_id = v_run.id and s.payload ->> 'externalKeyHash' = i.external_key_hash
      cross join jsonb_array_elements(s.payload -> 'answers') a
      returning 1
    )
    select count(*) into v_inserted from inserted;
  else
    insert into private.imported_aggregates (
      source_id, import_run_id, level, region_id, topic, wave_id, n, score, distribution
    )
    select
      v_run.source_id, v_run.id, s.payload ->> 'level', s.payload ->> 'regionId', s.payload ->> 'topic',
      s.payload ->> 'waveId', (s.payload ->> 'n')::integer, (s.payload ->> 'score')::double precision,
      case when jsonb_typeof(s.payload -> 'distribution') = 'array' then jsonb_build_object(
        '1', s.payload -> 'distribution' -> 0, '2', s.payload -> 'distribution' -> 1,
        '3', s.payload -> 'distribution' -> 2, '4', s.payload -> 'distribution' -> 3,
        '5', s.payload -> 'distribution' -> 4) end
    from private.import_staging s
    where s.run_id = v_run.id
    -- A newer delivery of the same cell replaces the old one.
    on conflict (source_id, level, region_id, topic, wave_id) do update set
      import_run_id = excluded.import_run_id, n = excluded.n, score = excluded.score,
      distribution = excluded.distribution;
    get diagnostics v_inserted = row_count;
    update public.data_sources set aggregated_by_provider = true where id = v_run.source_id;
  end if;

  delete from private.import_staging s where s.run_id = v_run.id;
  update private.import_runs r set
    status = 'committed', rows_inserted = v_inserted, rows_skipped = v_staged - v_inserted
  where r.id = v_run.id;
  return jsonb_build_object('runId', v_run.id, 'inserted', v_inserted, 'skipped', v_staged - v_inserted);
end;
$$;

create function public.import_abort(run_id uuid) returns void
  language sql
  volatile
  security definer
  set search_path = ''
as $$
  delete from private.import_staging s where s.run_id = import_abort.run_id;
  update private.import_runs r set status = 'failed' where r.id = import_abort.run_id and r.status = 'staging';
$$;

-- Removes exactly the rows of one run (answers first, in one statement, for large imports).
create function public.import_rollback(run_id uuid) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_responses integer;
  v_aggregates integer;
begin
  if not exists (select 1 from private.import_runs r where r.id = run_id and r.status = 'committed') then
    raise exception 'run % is not committed', run_id using errcode = '22023';
  end if;
  delete from public.answers a using public.responses r
    where a.response_id = r.id and r.import_run_id = import_rollback.run_id;
  delete from public.responses r where r.import_run_id = import_rollback.run_id;
  get diagnostics v_responses = row_count;
  delete from private.imported_aggregates g where g.import_run_id = import_rollback.run_id;
  get diagnostics v_aggregates = row_count;
  update private.import_runs r set status = 'rolled_back', rolled_back_at = now() where r.id = import_rollback.run_id;
  return jsonb_build_object('runId', run_id, 'responses', v_responses, 'aggregates', v_aggregates);
end;
$$;

revoke all on function public.import_upsert_source(jsonb), public.import_set_source_status(text, text),
  public.import_begin(jsonb), public.import_stage(uuid, jsonb), public.import_finalize(uuid),
  public.import_abort(uuid), public.import_rollback(uuid), private.ensure_wave(text)
  from public, anon, authenticated;
grant execute on function public.import_upsert_source(jsonb), public.import_set_source_status(text, text),
  public.import_begin(jsonb), public.import_stage(uuid, jsonb), public.import_finalize(uuid),
  public.import_abort(uuid), public.import_rollback(uuid)
  to service_role;

-- ── Provider aggregates in the aggregate RPCs (#274) ────────────────────────

-- The rollup implementation keeps its arithmetic; aggregate_rows becomes a dispatcher by source.
alter function public.aggregate_rows(jsonb, text[], text[]) rename to rollup_aggregate_rows;

-- AggregateRow[] from delivered cells only. Nothing is estimated (ADR-018 §5):
--   * filters the provider did not aggregate by (school form, grade band, role) → no data;
--   * several selected waves are only shown when exactly one of them was delivered;
--   * topicScores/distribution/delta only from delivered cells, all with K_MIN.
create function public.provider_aggregate_rows(
  query jsonb, wave_ids text[], previous_wave_ids text[], source_id text
) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_level text := query ->> 'level';
  v_topic text := query ->> 'topic';
  v_parent text := query ->> 'parentId';
  v_k integer := public.k_min();
  v_filtered boolean := cardinality(public.jsonb_text_array(query, 'schoolForm')) > 0
    or cardinality(public.jsonb_text_array(query, 'gradeBand')) > 0
    or query ->> 'role' is not null;
  v_rows jsonb;
begin
  with groups as (
    select distinct
      case v_level when 'nrw' then 'nrw' when 'regbez' then left(s.kreis_id, 3) when 'kreis' then s.kreis_id else s.id end as id
    from public.schools s
    where not s.is_test
      and (v_level = 'nrw' or v_parent is null
        or (case when v_level = 'school' then s.kreis_id else left(s.kreis_id, 3) end) = v_parent)
  ),
  cells as (
    select g.region_id, g.topic, g.wave_id, g.n, g.score, g.distribution,
      g.wave_id = any (wave_ids) as is_current
    from private.imported_aggregates g
    where g.source_id = provider_aggregate_rows.source_id and g.level = v_level and not v_filtered
      and (g.wave_id = any (wave_ids) or g.wave_id = any (previous_wave_ids))
  ),
  -- One delivered wave per period, otherwise the period has no value.
  picked as (
    select region_id, topic, is_current, min(n) as n,
      case when min(n) < v_k then null else min(score) end as score,
      case when min(n) < v_k then null else (array_agg(distribution))[1] end as distribution
    from cells
    group by region_id, topic, is_current
    having count(*) = 1
  )
  select coalesce(jsonb_agg(row_json order by id collate "C"), '[]'::jsonb) into v_rows
  from (
    select g.id,
      jsonb_build_object(
        'id', g.id,
        'n', coalesce(cur.n, 0),
        'score', cur.score,
        'delta', case when cur.score is not null and prev.score is not null
          then public.round1(cur.score - prev.score) end,
        'topicScores', coalesce((
          select jsonb_object_agg(t.topic, t.score) from picked t
          where t.region_id = g.id and t.is_current and t.topic <> 'all'
        ), '{}'::jsonb)
      ) || case when v_topic = 'all' then '{}'::jsonb
        else jsonb_build_object('distribution', cur.distribution) end as row_json,
      coalesce(cur.n, 0) as n
    from groups g
    left join picked cur on cur.region_id = g.id and cur.topic = v_topic and cur.is_current
    left join picked prev on prev.region_id = g.id and prev.topic = v_topic and not prev.is_current
  ) r
  -- Like the rollup path: school rows without data are omitted.
  where v_level <> 'school' or r.n > 0;
  return v_rows;
end;
$$;

create function public.aggregate_rows(query jsonb, wave_ids text[], previous_wave_ids text[])
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_source text;
begin
  if query ->> 'level' is distinct from 'pitch' then
    v_source := public.resolve_source(query);
    if exists (select 1 from public.data_sources where id = v_source and aggregated_by_provider) then
      if query ->> 'level' not in ('nrw', 'regbez', 'kreis', 'school') or query ->> 'topic' is null then
        raise exception 'level must be nrw, regbez, kreis or school' using errcode = '22023';
      end if;
      return public.provider_aggregate_rows(query, wave_ids, previous_wave_ids, v_source);
    end if;
  end if;
  return public.rollup_aggregate_rows(query, wave_ids, previous_wave_ids);
end;
$$;

revoke all on function public.provider_aggregate_rows(jsonb, text[], text[], text),
  public.aggregate_rows(jsonb, text[], text[]), public.rollup_aggregate_rows(jsonb, text[], text[])
  from public, anon, authenticated;

-- Participations per source: provider sources report the n of their NRW 'all' cells.
create or replace function public.get_data_sources() returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  with counts as (
    select source_id, sum(answered)::integer as n
    from private.response_rollup
    where topic_slug = '*'
    group by source_id
    union all
    select source_id, max(n)
    from private.imported_aggregates
    where topic = 'all'
    group by source_id
  ),
  totals as (select source_id, sum(n)::integer as n from counts group by source_id)
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
        'n', coalesce(c.n, 0)
      )
      order by d.is_default desc, d.kind = 'demo', d.label
    ),
    '[]'::jsonb
  )
  from public.data_sources d
  left join totals c on c.source_id = d.id
  where d.status = 'active' and d.id <> 'live-pitch' and public.can_read_source(d.visibility)
    and (d.is_default or coalesce(c.n, 0) > 0)
$$;
