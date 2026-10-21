-- Freitext entries + cluster aggregation (#126, ADR-016).
-- PRIVACY §1.3 / §6a: only the moderated text is stored. There is intentionally no raw-text
-- column and no log path in this migration. The client never writes this table directly:
-- the `submit-freetext` Edge Function verifies an existing participation, moderates the text
-- and calls `record_freetext` with the service role.
--
-- Public reads go through `get_freetext_clusters` only (K_MIN per cluster). Entries marked as
-- `concern` are never returned by the public RPC; the client shows help locally instead
-- (PRIVACY §5). The test-location filter (#113) must be added here once `schools.is_test` exists.

create table public.freetext_entries (
  -- One entry per participation; also prevents repeated LLM calls from storing duplicates.
  -- School, wave and day come from the linked response; ON DELETE CASCADE lets the pitch reset
  -- (#113) remove test free texts together with their responses.
  response_id uuid primary key references public.responses (id) on delete cascade,
  cleaned text not null check (char_length(cleaned) between 1 and 280),
  topics text[] not null default '{}' check (cardinality(topics) <= 3),
  cluster text not null check (char_length(cluster) between 1 and 60),
  concern boolean not null default false,
  -- Day precision on purpose (PRIVACY §1.4), like responses.created_at.
  created_at date not null default current_date
);

create index freetext_entries_created_at_idx on public.freetext_entries (created_at);

alter table public.freetext_entries enable row level security;
-- No policies and no grants for anon/authenticated: raw entries are unreachable for API roles.

-- input: { schoolId, waveId, deviceToken, cleaned, topics, cluster, concern } → { ok, reason? }
-- Only callable with the service role (the submit-freetext Edge Function). The device token is
-- hashed exactly like in submit_response (#78), so a text can only be attached to an existing
-- participation of the same device and wave. Raw text is never part of this contract.
create function public.record_freetext(input jsonb) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_school_id text := input ->> 'schoolId';
  v_wave_id text := input ->> 'waveId';
  v_token text := input ->> 'deviceToken';
  v_cleaned text := btrim(input ->> 'cleaned');
  v_cluster text := btrim(input ->> 'cluster');
  v_topics jsonb := input -> 'topics';
  v_concern boolean := false;
  v_response_id uuid;
  v_slug text;
begin
  if jsonb_typeof(input) is distinct from 'object' then
    raise exception 'input must be an object' using errcode = '22023';
  end if;
  if v_school_id is null or not exists (select 1 from public.schools where id = v_school_id) then
    raise exception 'unknown school' using errcode = '22023';
  end if;
  if v_wave_id is null or v_wave_id is distinct from public.current_wave_id() then
    raise exception 'wave % is not the current wave', v_wave_id using errcode = '22023';
  end if;
  if v_token is null or char_length(v_token) not between 16 and 200 then
    raise exception 'invalid device token' using errcode = '22023';
  end if;
  if v_cleaned is null or char_length(v_cleaned) not between 1 and 280 then
    raise exception 'cleaned text must be 1-280 characters' using errcode = '22023';
  end if;
  if v_cluster is null or char_length(v_cluster) not between 1 and 60 then
    raise exception 'cluster must be 1-60 characters' using errcode = '22023';
  end if;
  if jsonb_typeof(v_topics) is distinct from 'array' or jsonb_array_length(v_topics) > 3 then
    raise exception 'topics must be an array with at most 3 entries' using errcode = '22023';
  end if;
  if input ? 'concern' and jsonb_typeof(input -> 'concern') <> 'boolean' then
    raise exception 'concern must be a boolean' using errcode = '22023';
  end if;
  v_concern := coalesce((input ->> 'concern')::boolean, false);

  for v_slug in select jsonb_array_elements_text(v_topics) loop
    if not exists (select 1 from public.topics where slug = v_slug) then
      raise exception 'unknown topic %', v_slug using errcode = '22023';
    end if;
  end loop;

  select r.id into v_response_id
  from public.responses r
  where r.school_id = v_school_id
    and r.wave_id = v_wave_id
    and r.device_hash = encode(extensions.digest(v_token || ':' || v_wave_id, 'sha256'), 'hex');

  if v_response_id is null then
    raise exception 'no response for this device and wave' using errcode = '22023';
  end if;

  insert into public.freetext_entries (response_id, cleaned, topics, cluster, concern)
  values (
    v_response_id,
    v_cleaned,
    coalesce(array(select distinct jsonb_array_elements_text(v_topics)), '{}'),
    v_cluster,
    v_concern
  )
  on conflict (response_id) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'already_submitted');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- input: Scope (src/types/aggregates.ts) → FreetextCluster[] for the current wave.
-- A cluster is shown only if it has at least K_MIN entries; each cluster returns at most 3
-- cleaned examples. `concern` entries are excluded from the public output entirely.
create function public.get_freetext_clusters(scope jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_level text := scope ->> 'level';
  v_id text := scope ->> 'id';
  v_wave text := public.current_wave_id();
  v_result jsonb;
begin
  if jsonb_typeof(scope) is distinct from 'object' or v_level is null
    or v_level not in ('nrw', 'regbez', 'kreis', 'school') then
    raise exception 'scope.level must be nrw, regbez, kreis or school' using errcode = '22023';
  end if;
  if v_level = 'nrw' and v_id is not null then
    raise exception 'nrw scope needs id = null' using errcode = '22023';
  end if;
  if v_level = 'regbez' and (v_id is null or v_id !~ '^05[1-9]$') then
    raise exception 'invalid regbez id' using errcode = '22023';
  end if;
  if v_level = 'kreis' and (v_id is null or v_id !~ '^05[0-9]{3}$') then
    raise exception 'invalid kreis id' using errcode = '22023';
  end if;
  if v_level = 'school' and (v_id is null or v_id = '') then
    raise exception 'invalid school id' using errcode = '22023';
  end if;

  with scoped as (
    select e.cluster, e.topics, e.cleaned, e.created_at, e.response_id
    from public.freetext_entries e
    join public.responses r on r.id = e.response_id
    join public.schools s on s.id = r.school_id
    where r.wave_id = v_wave
      and not e.concern
      -- TODO(#113): add `and not s.is_test` here once the test-location column exists.
      and case v_level
        when 'nrw' then true
        when 'school' then s.id = v_id
        when 'kreis' then s.kreis_id = v_id
        else left(s.kreis_id, 3) = v_id
      end
  ),
  counted as (
    select cluster, count(*)::int as n
    from scoped
    group by cluster
    having count(*) >= public.k_min()
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'cluster', c.cluster,
        'count', c.n,
        'topics', coalesce(
          (select jsonb_agg(distinct t order by t) from scoped s join unnest(s.topics) as t on true
           where s.cluster = c.cluster),
          '[]'::jsonb
        ),
        'examples', coalesce(
          (select jsonb_agg(x.cleaned order by x.created_at, x.response_id)
           from (
             select s.cleaned, s.created_at, s.response_id
             from scoped s
             where s.cluster = c.cluster
             order by s.created_at, s.response_id
             limit 3
           ) x),
          '[]'::jsonb
        )
      )
      order by c.n desc, c.cluster collate "C"
    ),
    '[]'::jsonb
  )
  into v_result
  from counted c;

  return v_result;
end;
$$;

-- Only the Edge Function with the service role may write moderated texts.
grant execute on function public.record_freetext(jsonb) to service_role;
-- Everyone may read aggregated clusters; K_MIN is enforced inside the function.
grant execute on function public.get_freetext_clusters(jsonb) to anon, authenticated;
