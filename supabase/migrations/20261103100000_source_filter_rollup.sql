-- Source filter for all aggregate RPCs (#270, ADR-018) + additive rollup aggregation (ADR-019).
--
-- aggregate_rows used to read every raw answer of the selected waves on each call (and
-- get_tension_index calls it up to eight times). It now sums private.response_rollup, which holds
-- additive totals per school × wave × source × role × grade band × topic. Statement-level triggers
-- keep the rollup exact on every insert/delete/update of answers and responses, so live submissions,
-- imports, own deletions, pitch resets and rollbacks all stay consistent.
--
-- Results stay bit-identical to the MockDataSource: points are multiples of 25 and weights are
-- 0, 0.5 or 1, so all sums are exact binary fractions and the order of summation does not matter.
-- The parity tests in supabase/tests/ remain the yardstick.

-- ── Rollup table ─────────────────────────────────────────────────────────────

create table private.response_rollup (
  source_id text not null,
  wave_id text not null,
  school_id text not null,
  role text not null,
  grade_band text not null, -- '' = no grade band
  topic_slug text not null, -- '*' = the whole response across topics
  answered integer not null default 0, -- responses with ≥ 1 answer in the topic
  counted integer not null default 0, -- responses with ≥ 1 scored answer (points not null, weight > 0)
  sum_pw double precision not null default 0, -- Σ points × weight over scored answers
  sum_w double precision not null default 0, -- Σ weight over scored answers
  d1 integer not null default 0, -- mood5 answers per mood level, inverted questions flipped
  d2 integer not null default 0,
  d3 integer not null default 0,
  d4 integer not null default 0,
  d5 integer not null default 0,
  primary key (source_id, wave_id, school_id, role, grade_band, topic_slug)
);

grant select on private.response_rollup to service_role;

-- Per response and topic (plus '*'): what a set of answers contributes. The arrays describe the answer
-- set (one entry per answer), so triggers can pass "before" and "after" states of the same responses.
create function private.response_contrib(response_ids uuid[], question_ids text[], vals smallint[])
  returns table (
    response_id uuid, topic_slug text, answered integer, counted integer,
    sum_pw double precision, sum_w double precision,
    d1 integer, d2 integer, d3 integer, d4 integer, d5 integer
  )
  language sql
  stable
  set search_path = ''
as $$
  with a as (
    select
      x.response_id,
      q.topic_slug,
      public.answer_points(q.type, x.val, q.invert) as points,
      public.answer_weight(q.type, q.weight) as weight,
      case when q.type = 'mood5' and x.val between 1 and 5
        then case when q.invert then 6 - x.val else x.val end end as lvl
    from unnest(response_ids, question_ids, vals) as x (response_id, question_id, val)
    join public.questions q on q.id = x.question_id
  ),
  per_topic as (
    select
      a.response_id,
      a.topic_slug,
      1 as answered,
      (bool_or(a.points is not null and a.weight > 0))::integer as counted,
      coalesce(sum(a.points * a.weight) filter (where a.points is not null and a.weight > 0), 0) as sum_pw,
      coalesce(sum(a.weight) filter (where a.points is not null and a.weight > 0), 0) as sum_w,
      (count(*) filter (where a.lvl = 1))::integer as d1,
      (count(*) filter (where a.lvl = 2))::integer as d2,
      (count(*) filter (where a.lvl = 3))::integer as d3,
      (count(*) filter (where a.lvl = 4))::integer as d4,
      (count(*) filter (where a.lvl = 5))::integer as d5
    from a
    group by a.response_id, a.topic_slug
  )
  select * from per_topic
  union all
  select p.response_id, '*', 1, max(p.counted), 0, 0, 0, 0, 0, 0, 0
  from per_topic p
  group by p.response_id
$$;

-- Adds (sign = 1) or removes (sign = -1) contributions under the given response keys.
create function private.rollup_apply(
  sign integer, response_ids uuid[], question_ids text[], vals smallint[], keys jsonb
) returns void
  language sql
  volatile
  set search_path = ''
as $$
  insert into private.response_rollup as r (
    source_id, wave_id, school_id, role, grade_band, topic_slug,
    answered, counted, sum_pw, sum_w, d1, d2, d3, d4, d5
  )
  select
    k.source_id, k.wave_id, k.school_id, k.role, coalesce(k.grade_band, ''), c.topic_slug,
    sign * sum(c.answered), sign * sum(c.counted), sign * sum(c.sum_pw), sign * sum(c.sum_w),
    sign * sum(c.d1), sign * sum(c.d2), sign * sum(c.d3), sign * sum(c.d4), sign * sum(c.d5)
  from private.response_contrib(response_ids, question_ids, vals) c
  join jsonb_to_recordset(keys) as k (
    id uuid, source_id text, wave_id text, school_id text, role text, grade_band text
  ) on k.id = c.response_id
  group by 1, 2, 3, 4, 5, 6
  on conflict (source_id, wave_id, school_id, role, grade_band, topic_slug) do update set
    answered = r.answered + excluded.answered,
    counted = r.counted + excluded.counted,
    sum_pw = r.sum_pw + excluded.sum_pw,
    sum_w = r.sum_w + excluded.sum_w,
    d1 = r.d1 + excluded.d1,
    d2 = r.d2 + excluded.d2,
    d3 = r.d3 + excluded.d3,
    d4 = r.d4 + excluded.d4,
    d5 = r.d5 + excluded.d5
$$;

-- Statement trigger on answers: for every touched response, subtract its contribution before the
-- statement and add the one after it. Works for multi-row inserts and ON CONFLICT DO NOTHING
-- (transition tables only hold rows that were really written).
create function private.rollup_answers_changed() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_touched uuid[];
  v_keys jsonb;
  b_ids uuid[]; b_q text[]; b_v smallint[];
  a_ids uuid[]; a_q text[]; a_v smallint[];
begin
  -- Touched responses (still present on delete: responses delete their answers first).
  if tg_op = 'INSERT' then
    v_touched := array(select distinct response_id from new_rows);
  elsif tg_op = 'DELETE' then
    v_touched := array(select distinct response_id from old_rows);
  else
    v_touched := array(select response_id from new_rows union select response_id from old_rows);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'source_id', r.source_id, 'wave_id', r.wave_id, 'school_id', r.school_id,
      'role', r.role, 'grade_band', r.grade_band)), '[]'::jsonb)
    into v_keys
  from public.responses r
  where r.id = any (v_touched);

  -- After: the answers as they are now.
  select coalesce(array_agg(x.response_id), '{}'), coalesce(array_agg(x.question_id), '{}'),
         coalesce(array_agg(x.value), '{}')
    into a_ids, a_q, a_v
  from public.answers x
  where x.response_id = any (v_touched);

  -- Before: now minus the written rows plus the removed rows.
  if tg_op = 'INSERT' then
    select coalesce(array_agg(x.response_id), '{}'), coalesce(array_agg(x.question_id), '{}'),
           coalesce(array_agg(x.value), '{}')
      into b_ids, b_q, b_v
    from public.answers x
    where x.response_id = any (v_touched)
      and not exists (select 1 from new_rows n where n.response_id = x.response_id and n.question_id = x.question_id);
  elsif tg_op = 'DELETE' then
    select coalesce(array_agg(x.response_id), '{}'), coalesce(array_agg(x.question_id), '{}'),
           coalesce(array_agg(x.value), '{}')
      into b_ids, b_q, b_v
    from (
      select response_id, question_id, value from public.answers where response_id = any (v_touched)
      union all
      select response_id, question_id, value from old_rows
    ) x;
  else
    select coalesce(array_agg(x.response_id), '{}'), coalesce(array_agg(x.question_id), '{}'),
           coalesce(array_agg(x.value), '{}')
      into b_ids, b_q, b_v
    from (
      select a.response_id, a.question_id, a.value from public.answers a
      where a.response_id = any (v_touched)
        and not exists (select 1 from new_rows n where n.response_id = a.response_id and n.question_id = a.question_id)
      union all
      select response_id, question_id, value from old_rows
    ) x;
  end if;

  perform private.rollup_apply(-1, b_ids, b_q, b_v, v_keys);
  perform private.rollup_apply(1, a_ids, a_q, a_v, v_keys);
  return null;
end;
$$;

create trigger answers_rollup_insert
  after insert on public.answers
  referencing new table as new_rows
  for each statement execute function private.rollup_answers_changed();
create trigger answers_rollup_delete
  after delete on public.answers
  referencing old table as old_rows
  for each statement execute function private.rollup_answers_changed();
create trigger answers_rollup_update
  after update on public.answers
  referencing old table as old_rows new table as new_rows
  for each statement execute function private.rollup_answers_changed();

-- Deleting a response removes its answers first, while the response (and so its key) still exists.
-- The cascade then has nothing left to delete.
create function private.rollup_response_deleting() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  delete from public.answers where response_id = old.id;
  return old;
end;
$$;

create trigger responses_rollup_delete
  before delete on public.responses
  for each row execute function private.rollup_response_deleting();

-- A response whose key changes (school, wave, source, role, grade band) moves its contribution.
create function private.rollup_responses_rekeyed() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_ids uuid[]; v_q text[]; v_v smallint[];
  v_old jsonb; v_new jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) into v_old
  from old_rows o join new_rows n on n.id = o.id
  where (o.source_id, o.wave_id, o.school_id, o.role, coalesce(o.grade_band, ''))
    is distinct from (n.source_id, n.wave_id, n.school_id, n.role, coalesce(n.grade_band, ''));
  if v_old = '[]'::jsonb then
    return null;
  end if;
  select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) into v_new
  from new_rows n where n.id in (select (e ->> 'id')::uuid from jsonb_array_elements(v_old) e);

  select coalesce(array_agg(a.response_id), '{}'), coalesce(array_agg(a.question_id), '{}'),
         coalesce(array_agg(a.value), '{}')
    into v_ids, v_q, v_v
  from public.answers a
  where a.response_id in (select (e ->> 'id')::uuid from jsonb_array_elements(v_old) e);

  perform private.rollup_apply(-1, v_ids, v_q, v_v, v_old);
  perform private.rollup_apply(1, v_ids, v_q, v_v, v_new);
  return null;
end;
$$;

create trigger responses_rollup_update
  after update on public.responses
  referencing old table as old_rows new table as new_rows
  for each statement execute function private.rollup_responses_rekeyed();

-- Rebuilds the rollup from scratch (service role / admin). Also used for the initial backfill.
create function private.rebuild_response_rollup() returns integer
  language plpgsql
  volatile
  set search_path = ''
as $$
declare
  v_ids uuid[]; v_q text[]; v_v smallint[];
  v_keys jsonb;
  v_rows integer;
begin
  truncate private.response_rollup;
  select coalesce(array_agg(a.response_id), '{}'), coalesce(array_agg(a.question_id), '{}'),
         coalesce(array_agg(a.value), '{}')
    into v_ids, v_q, v_v
  from public.answers a;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'source_id', r.source_id, 'wave_id', r.wave_id, 'school_id', r.school_id,
      'role', r.role, 'grade_band', r.grade_band)), '[]'::jsonb)
    into v_keys
  from public.responses r;
  perform private.rollup_apply(1, v_ids, v_q, v_v, v_keys);
  select count(*) into v_rows from private.response_rollup;
  return v_rows;
end;
$$;

select private.rebuild_response_rollup();

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.rebuild_response_rollup() to service_role;

-- ── Aggregation from the rollup ──────────────────────────────────────────────

-- Same contract and arithmetic as 20261021200000_aggregate_school_rows_distribution.sql; reads the
-- rollup instead of raw answers and filters by data source (query.sourceId or the default source).
-- The private pitch level ignores sources (it only ever contains the isolated test site).
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
  v_source text;
  v_rows jsonb;
begin
  if v_level is null or v_level not in ('nrw', 'regbez', 'kreis', 'school', 'pitch') then
    raise exception 'level must be regbez, kreis or school' using errcode = '22023';
  end if;
  if v_topic is null then
    raise exception 'topic is required (slug or "all")' using errcode = '22023';
  end if;
  if v_role is not null and v_role not in ('student', 'teacher') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  v_source := case when v_level = 'pitch' then null else public.resolve_source(query) end;

  with selected_schools as (
    select
      s.id,
      case v_level when 'pitch' then s.id when 'school' then s.id when 'kreis' then s.kreis_id when 'nrw' then 'nrw' else left(s.kreis_id, 3) end as group_id
    from public.schools s
    where ((v_level = 'pitch' and s.is_test and s.id = 'pitch-test')
        or (v_level <> 'pitch' and not s.is_test))
      and (cardinality(v_forms) = 0 or s.school_form = any (v_forms))
      and (v_level = 'nrw' or v_parent is null or (case when v_level = 'school' then s.kreis_id else left(s.kreis_id, 3) end) = v_parent)
  ),
  -- Additive cells per group, period and topic ('*' = whole responses).
  cells as (
    select
      ss.group_id,
      rr.wave_id = any (wave_ids) as is_current,
      rr.topic_slug,
      sum(rr.answered) as answered,
      sum(rr.counted) as counted,
      sum(rr.sum_pw) as sum_pw,
      sum(rr.sum_w) as sum_w,
      sum(rr.d1) as d1, sum(rr.d2) as d2, sum(rr.d3) as d3, sum(rr.d4) as d4, sum(rr.d5) as d5
    from selected_schools ss
    join private.response_rollup rr on rr.school_id = ss.id
    where (v_source is null or rr.source_id = v_source)
      and (rr.wave_id = any (wave_ids) or rr.wave_id = any (previous_wave_ids))
      and (v_role is null or rr.role = v_role)
      and (cardinality(v_bands) = 0 or rr.grade_band = any (v_bands))
    group by 1, 2, 3
  ),
  -- topicScore(): n = distinct responses with a scored answer; weighted mean; null below K_MIN.
  -- topicScores list every topic answered in the cell, also choice-only ones (→ null).
  topic_scores as (
    select
      group_id,
      is_current,
      topic_slug,
      counted as n,
      case when counted < v_k then null else public.round1(sum_pw / sum_w) end as score
    from cells
    where topic_slug <> '*' and answered > 0
  ),
  -- Overall mood: distinct responses over all topics; overallScore() = mean in whole tenths.
  period_overall as (
    select group_id, is_current, floor(sum(floor(score * 10 + 0.5)) / count(*) + 0.5) / 10 as overall
    from topic_scores
    where score is not null
    group by group_id, is_current
  ),
  period_totals as (
    select c.group_id, c.is_current, c.counted as n, o.overall
    from cells c
    left join period_overall o using (group_id, is_current)
    where c.topic_slug = '*'
  ),
  -- Real mood5 distribution for the selected topic (#222).
  distribution_json as (
    select
      group_id,
      jsonb_build_object('1', d1, '2', d2, '3', d3, '4', d4, '5', d5) as distribution
    from cells
    where is_current and topic_slug = v_topic and v_topic <> '*'
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
      ) || case
        when v_topic = 'all' then '{}'::jsonb
        else jsonb_build_object(
          'distribution',
          case when cur.n >= v_k then dj.distribution end
        )
      end
      order by cur.group_id collate "C"
    ),
    '[]'::jsonb
  )
  into v_rows
  from totals cur
  join totals prev on prev.group_id = cur.group_id and not prev.is_current
  left join topic_json tj on tj.group_id = cur.group_id
  left join distribution_json dj on dj.group_id = cur.group_id
  where cur.is_current
    -- School rows without any scored answers are omitted (#219); other levels keep their empty rows.
    and (v_level <> 'school' or cur.n > 0);

  return v_rows;
end;
$$;

-- Choice distributions are filtered by source as well (scope.sourceId or the default source).
create or replace function public.choice_distribution(question_id text, scope jsonb, wave_id text) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_level text := scope ->> 'level';
  v_id text := scope ->> 'id';
  v_source text;
  q public.questions%rowtype;
  v_n integer;
  v_result jsonb;
begin
  if jsonb_typeof(scope) is distinct from 'object' or v_level is null
    or v_level not in ('nrw', 'regbez', 'kreis', 'school') then
    raise exception 'scope.level must be nrw, regbez, kreis or school' using errcode = '22023';
  end if;
  v_source := public.resolve_source(scope);
  select * into q from public.questions where id = question_id;
  if not found or q.type <> 'choice' then
    return null;
  end if;

  with dist as (
    select a.response_id, a.choice
    from public.answers a
    join public.responses r on r.id = a.response_id
    join public.schools s on s.id = r.school_id
    where not s.is_test and a.question_id = q.id
      and r.source_id = v_source
      and r.wave_id = choice_distribution.wave_id
      and cardinality(a.choice) > 0
      -- schoolInScope(): NRW only with id = null.
      and case v_level
        when 'nrw' then v_id is null
        when 'school' then s.id = v_id
        when 'kreis' then s.kreis_id = v_id
        else left(s.kreis_id, 3) = v_id
      end
  ),
  options as (
    select
      x.opt ->> 'value' as value,
      x.ord,
      (select count(distinct d.response_id) from dist d where (x.opt ->> 'value') = any (d.choice)) as cnt
    from jsonb_array_elements(q.options) with ordinality as x (opt, ord)
  )
  select
    (select count(distinct response_id) from dist),
    jsonb_build_object(
      'questionId', q.id,
      'n', (select count(distinct response_id) from dist),
      'options', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object('value', o.value, 'count', case when o.cnt < 3 then null else o.cnt end)
            order by o.ord
          )
          from options o
        ),
        '[]'::jsonb
      )
    )
  into v_n, v_result;

  return case when v_n < public.k_min() then null else v_result end;
end;
$$;

-- Participations per source from the rollup instead of counting raw responses.
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
  )
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
  left join counts c on c.source_id = d.id
  -- The pitch test site has its own beamer view; it is never a selectable map source.
  -- Empty sources (e.g. demo-seed in a live database) are hidden, except the default.
  where d.status = 'active' and d.id <> 'live-pitch' and public.can_read_source(d.visibility)
    and (d.is_default or coalesce(c.n, 0) > 0)
$$;
