-- Level 'nrw' is public since #147 (AggregateQuery.level = DataLevel): one row { id: 'nrw' } over all
-- answers, parentId ignored – exactly like the MockDataSource (#158). aggregate_rows is otherwise unchanged.

create or replace function public.aggregate_rows(query jsonb, wave_ids text[], previous_wave_ids text[])
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
  if v_level is null or v_level not in ('nrw', 'regbez', 'kreis', 'school') then
    raise exception 'level must be nrw, regbez, kreis or school' using errcode = '22023';
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
      case v_level when 'school' then s.id when 'kreis' then s.kreis_id when 'nrw' then 'nrw' else left(s.kreis_id, 3) end as group_id
    from public.schools s
    where (cardinality(v_forms) = 0 or s.school_form = any (v_forms))
      and (v_parent is null or v_level = 'nrw' or (case when v_level = 'school' then s.kreis_id else left(s.kreis_id, 3) end) = v_parent)
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

-- All DataLevel values are public now. Kept (as a no-op) because get_aggregates, get_trend and
-- get_tension_index call it; aggregate_rows still rejects unknown levels.
create or replace function public.assert_public_level(query jsonb) returns void
  language plpgsql
  immutable
  set search_path = ''
as $$
begin
  return;
end;
$$;
