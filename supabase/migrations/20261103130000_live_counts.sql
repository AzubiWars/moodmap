-- Light-weight endpoints on top of the rollup (ADR-019/ADR-020):
--   * count_active_schools (#252): Lagebild needs one number, not a list of all school rows.
--   * get_live_counts (#253): live pulses poll a version first; school counts travel only when
--     something changed. n per school is the same number get_aggregates(school, 'all') returns.

-- Schools (not the test site) with at least one scored response in the default waves of the source.
create function public.count_active_schools(query jsonb) returns integer
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select count(distinct r.school_id)::integer
  from private.response_rollup r
  join public.schools s on s.id = r.school_id and not s.is_test
  where r.source_id = public.resolve_source(query)
    and r.wave_id = any (public.default_wave_ids(query))
    and r.topic_slug = '*'
    and r.counted > 0
$$;

-- input: { sourceId?, knownVersion? } → { version, rows: [{ id, n }] | null }.
-- rows is null when the caller already has this version, so an idle live map costs a few bytes.
create function public.get_live_counts(query jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_source text := public.resolve_source(query);
  v_wave text := public.current_wave_id();
  v_version text;
  v_rows jsonb;
begin
  with counts as (
    select r.school_id as id, sum(r.counted)::integer as n
    from private.response_rollup r
    join public.schools s on s.id = r.school_id and not s.is_test
    where r.source_id = v_source and r.wave_id = v_wave and r.topic_slug = '*'
    group by r.school_id
    having sum(r.counted) > 0
  )
  select
    coalesce(v_wave, '-') || ':' || coalesce(sum(n), 0) || ':' || count(*),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', n) order by id collate "C"), '[]'::jsonb)
  into v_version, v_rows
  from counts;
  return jsonb_build_object(
    'version', v_version,
    'rows', case when query ->> 'knownVersion' = v_version then null else v_rows end
  );
end;
$$;

grant execute on function public.count_active_schools(jsonb), public.get_live_counts(jsonb) to anon, authenticated;
