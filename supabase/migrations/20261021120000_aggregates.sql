-- Score logic + get_aggregates (#79, part of #22).
-- Must compute exactly what src/lib/score.ts + src/data/mockAggregates.ts compute (ADR-003); the parity
-- test in supabase/tests/aggregates.test.ts runs both on the same fixtures. Arithmetic is done in
-- double precision with the same operation order as JavaScript, and Math.round(x) is written as
-- floor(x + 0.5) (Postgres' round() rounds halves away from zero, e.g. -1.5 → -2 instead of -1).

-- ── Score helpers (internal; not exposed to API roles, see #77 default privileges) ──
-- The per-row helpers are single-expression SQL functions without `set search_path`, so Postgres can
-- inline them (a SET clause prevents inlining). They reference no tables, and they are only called
-- from security-definer functions with search_path = ''.

-- K_MIN, enforced on the server (docs/PRIVACY.md §2). The client value can only be stricter.
create function public.k_min() returns integer
  language sql
  immutable
as $$ select 10 $$;

-- Math.round(x * 10) / 10 – like round1() in score.ts.
create function public.round1(x double precision) returns double precision
  language sql
  immutable
as $$ select floor(x * 10 + 0.5) / 10 $$;

-- scoreAnswer(): mood5 (v-1)*25, swipe 100/0, choice and invalid values → null, invert → 100 - points.
create function public.answer_points(question_type text, value smallint, invert boolean)
  returns double precision
  language sql
  immutable
as $$
  select case
    when question_type = 'mood5' and value between 1 and 5
      then case when invert then 100 - (value - 1) * 25.0 else (value - 1) * 25.0 end
    when question_type = 'swipe' and value = 1 then case when invert then 0.0 else 100.0 end
    when question_type = 'swipe' and value = 0 then case when invert then 100.0 else 0.0 end
  end::double precision
$$;

-- question.weight ?? defaultWeight(type): core 1.0, swipe 0.5, choice 0.
create function public.answer_weight(question_type text, weight real) returns double precision
  language sql
  immutable
as $$
  select coalesce(
    weight::double precision,
    case question_type when 'mood5' then 1.0 when 'swipe' then 0.5 else 0.0 end
  )
$$;

-- Optional string array field of a query object.
create function public.jsonb_text_array(j jsonb, key text) returns text[]
  language plpgsql
  immutable
  set search_path = ''
as $$
begin
  if j -> key is null or jsonb_typeof(j -> key) = 'null' then
    return '{}';
  end if;
  if jsonb_typeof(j -> key) <> 'array' then
    raise exception '% must be an array', key using errcode = '22023';
  end if;
  return array(select jsonb_array_elements_text(j -> key));
end;
$$;

-- previousWaves() in mockSource.ts: as many waves as selected, directly before the first selected one.
create function public.previous_wave_ids(selected text[]) returns text[]
  language sql
  stable
  set search_path = ''
as $$
  with ordered as (
    select id, row_number() over (order by starts_at, id) as rn from public.waves
  ),
  first_selected as (
    select min(rn) as idx from ordered where id = any (selected)
  )
  select coalesce(array_agg(o.id order by o.rn), '{}')
  from ordered o, first_selected f
  where o.rn >= greatest(1, f.idx - cardinality(selected)) and o.rn < f.idx
$$;

-- ── Aggregation ─────────────────────────────────────────────────────────────

-- aggregateRows() in mockAggregates.ts → AggregateRow[] for explicit current/previous waves.
-- Groups raw answers directly on the requested level (no mean of school means), K_MIN per cell.
-- Internal building block for get_aggregates and get_trend (#80).
create function public.aggregate_rows(query jsonb, wave_ids text[], previous_wave_ids text[])
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_level text := query ->> 'level';
  v_topic text := query ->> 'topic';
  v_role text := query ->> 'role';
  v_parent text := query ->> 'parentId';
  v_forms text[] := public.jsonb_text_array(query, 'schoolForm');
  v_bands text[] := public.jsonb_text_array(query, 'gradeBand');
  v_k integer := public.k_min();
  v_rows jsonb;
begin
  if v_level is null or v_level not in ('regbez', 'kreis', 'school') then
    raise exception 'level must be regbez, kreis or school' using errcode = '22023';
  end if;
  if v_topic is null then
    raise exception 'topic is required (slug or "all")' using errcode = '22023';
  end if;
  if v_role is not null and v_role not in ('student', 'teacher') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  with selected_schools as (
    select
      s.id,
      case v_level when 'school' then s.id when 'kreis' then s.kreis_id else left(s.kreis_id, 3) end as group_id
    from public.schools s
    where (cardinality(v_forms) = 0 or s.school_form = any (v_forms))
      and (v_parent is null or (case when v_level = 'school' then s.kreis_id else left(s.kreis_id, 3) end) = v_parent)
  ),
  -- scoreInputs(): one row per answer of a matching response.
  scored as (
    select
      ss.group_id,
      r.wave_id = any (wave_ids) as is_current,
      r.id as response_id,
      q.topic_slug,
      public.answer_points(q.type, a.value, q.invert) as points,
      public.answer_weight(q.type, q.weight) as weight
    from selected_schools ss
    join public.responses r on r.school_id = ss.id
    join public.answers a on a.response_id = r.id
    join public.questions q on q.id = a.question_id
    where (r.wave_id = any (wave_ids) or r.wave_id = any (previous_wave_ids))
      and (v_role is null or r.role = v_role)
      and (cardinality(v_bands) = 0 or r.grade_band = any (v_bands))
  ),
  -- Only answers that count (scored and weight > 0) feed n and the means.
  counted as (
    select * from scored where points is not null and weight > 0
  ),
  -- topicScore(): n = distinct responses with a scored answer; weighted mean; null below K_MIN.
  topic_raw as (
    select
      group_id,
      is_current,
      topic_slug,
      count(distinct response_id) as n,
      sum(points * weight) / sum(weight) as mean
    from counted
    group by group_id, is_current, topic_slug
  ),
  -- topicScores of a row list every topic answered in the cell, also choice-only ones (→ null).
  topic_scores as (
    select
      s.group_id,
      s.is_current,
      s.topic_slug,
      coalesce(t.n, 0) as n,
      case when coalesce(t.n, 0) < v_k then null else public.round1(t.mean) end as score
    from (select distinct group_id, is_current, topic_slug from scored) s
    left join topic_raw t using (group_id, is_current, topic_slug)
  ),
  -- Overall mood: distinct responses over all topics; overallScore() = mean in whole tenths.
  period_n as (
    select group_id, is_current, count(distinct response_id) as n
    from counted
    group by group_id, is_current
  ),
  period_overall as (
    select group_id, is_current, floor(sum(floor(score * 10 + 0.5)) / count(*) + 0.5) / 10 as overall
    from topic_scores
    where score is not null
    group by group_id, is_current
  ),
  period_totals as (
    select n.group_id, n.is_current, n.n, o.overall
    from period_n n
    left join period_overall o using (group_id, is_current)
  ),
  topic_json as (
    select group_id, jsonb_object_agg(topic_slug, score) as scores
    from topic_scores
    where is_current
    group by group_id
  ),
  periods as (
    select g.group_id, p.is_current
    from (select distinct group_id from selected_schools) g
    cross join (values (true), (false)) as p (is_current)
  ),
  totals as (
    select
      p.group_id,
      p.is_current,
      case when v_topic = 'all' then coalesce(pt.n, 0) else coalesce(ts.n, 0) end as n,
      case
        when v_topic = 'all' then case when coalesce(pt.n, 0) < v_k then null else pt.overall end
        else ts.score
      end as score
    from periods p
    left join period_totals pt on pt.group_id = p.group_id and pt.is_current = p.is_current
    left join topic_scores ts on ts.group_id = p.group_id and ts.is_current = p.is_current and ts.topic_slug = v_topic
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cur.group_id,
        'n', cur.n,
        'score', cur.score,
        -- delta(): only when both periods reach K_MIN and have a score.
        'delta', case
          when cur.n >= v_k and prev.n >= v_k and cur.score is not null and prev.score is not null
          then public.round1(cur.score - prev.score)
        end,
        'topicScores', coalesce(tj.scores, '{}'::jsonb)
      )
      order by cur.group_id collate "C"
    ),
    '[]'::jsonb
  )
  into v_rows
  from totals cur
  join totals prev on prev.group_id = cur.group_id and not prev.is_current
  left join topic_json tj on tj.group_id = cur.group_id
  where cur.is_current;

  return v_rows;
end;
$$;

-- input: AggregateQuery (src/types/aggregates.ts) → AggregateRow[] (already k-anonymised).
-- Without waveIds the current wave is used; the previous period has the same number of waves.
create function public.get_aggregates(query jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_waves text[];
begin
  if jsonb_typeof(query) is distinct from 'object' then
    raise exception 'query must be an object' using errcode = '22023';
  end if;
  v_waves := case
    when jsonb_typeof(query -> 'waveIds') is distinct from 'null' and query ? 'waveIds'
      then public.jsonb_text_array(query, 'waveIds')
    else array_remove(array[public.current_wave_id()], null)
  end;
  return public.aggregate_rows(query, v_waves, public.previous_wave_ids(v_waves));
end;
$$;

grant execute on function public.get_aggregates(jsonb) to anon, authenticated;
