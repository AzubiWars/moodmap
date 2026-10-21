-- Early-warning radar + "Politik antwortet" (#81, part of #22). Same semantics as getTensionIndex and
-- the policy functions in src/data/mockPolicy.ts; parity-tested in supabase/tests/tension-policy.test.ts.

-- ── aggregate_rows: internal 'nrw' level ────────────────────────────────────
-- The effect of an NRW-wide policy answer needs one total over all schools. Only internal callers use
-- level 'nrw'; get_aggregates/get_trend/get_tension_index keep rejecting it (AggregateQuery has no
-- 'nrw' level). Otherwise unchanged from 20261021120000_aggregates.sql.

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
      case v_level when 'school' then s.id when 'kreis' then s.kreis_id when 'nrw' then 'nrw' else left(s.kreis_id, 3) end as group_id
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

-- Public entry points accept only the AggregateQuery levels.
create function public.assert_public_level(query jsonb) returns void
  language plpgsql
  immutable
  set search_path = ''
as $$
begin
  if query ->> 'level' = 'nrw' then
    raise exception 'level must be regbez, kreis or school' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.get_aggregates(query jsonb) returns jsonb
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
  perform public.assert_public_level(query);
  v_waves := case
    when jsonb_typeof(query -> 'waveIds') is distinct from 'null' and query ? 'waveIds'
      then public.jsonb_text_array(query, 'waveIds')
    else array_remove(array[public.current_wave_id()], null)
  end;
  return public.aggregate_rows(query, v_waves, public.previous_wave_ids(v_waves));
end;
$$;

create or replace function public.get_trend(query jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_selected text[];
  v_wave text;
  v_points jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(query) is distinct from 'object' then
    raise exception 'query must be an object' using errcode = '22023';
  end if;
  perform public.assert_public_level(query);
  if jsonb_typeof(query -> 'waveIds') is distinct from 'array' then
    raise exception 'waveIds is required for a trend' using errcode = '22023';
  end if;
  v_selected := public.jsonb_text_array(query, 'waveIds');

  for v_wave in
    select id from public.waves where id = any (v_selected) order by starts_at, id
  loop
    v_points := v_points || coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', r -> 'id', 'waveId', v_wave, 'n', r -> 'n', 'score', r -> 'score')
          order by ord
        )
        from jsonb_array_elements(public.aggregate_rows(query, array[v_wave], '{}')) with ordinality as e (r, ord)
      ),
      '[]'::jsonb
    );
  end loop;
  return v_points;
end;
$$;

-- ── Early-warning radar ─────────────────────────────────────────────────────

-- tensionIndex() in score.ts for one row's topicScores → { index, level, drivers }.
-- Weights are summed in the order of TENSION_WEIGHTS: 0.15 and 0.1 are not exact binary fractions,
-- so the order matters for bit-identical results. Needs voice + at least 2 more topics with a score.
create function public.tension_of(topic_scores jsonb, voice_declining boolean, safety_declining boolean)
  returns jsonb
  language plpgsql
  immutable
  set search_path = ''
as $$
declare
  v_slugs text[] := array['voice', 'safety', 'community', 'wellbeing', 'participation', 'teachers'];
  v_weights double precision[] := array[0.3, 0.2, 0.15, 0.15, 0.1, 0.1]::double precision[];
  v_score double precision;
  v_total_weight double precision := 0;
  v_weighted double precision := 0;
  v_present integer := 0;
  v_has_voice boolean := false;
  v_contrib jsonb := '[]'::jsonb;
  v_index double precision;
begin
  for i in 1 .. cardinality(v_slugs) loop
    v_score := (topic_scores ->> v_slugs[i])::double precision;
    if v_score is not null then
      v_present := v_present + 1;
      v_has_voice := v_has_voice or v_slugs[i] = 'voice';
      v_total_weight := v_total_weight + v_weights[i];
      v_weighted := v_weighted + v_score * v_weights[i];
      v_contrib := v_contrib || jsonb_build_object('slug', v_slugs[i], 'c', (100 - v_score) * v_weights[i], 'i', i);
    end if;
  end loop;

  if not v_has_voice or v_present < 3 then
    return jsonb_build_object('index', null, 'level', null, 'drivers', '[]'::jsonb);
  end if;

  v_index := 100 - v_weighted / v_total_weight;
  if voice_declining or safety_declining then
    v_index := v_index + 10;
  end if;
  v_index := greatest(0, least(100, public.round1(v_index)));

  return jsonb_build_object(
    'index', v_index,
    'level', case when v_index < 45 then 'stable' when v_index < 60 then 'watch' else 'talk' end,
    -- The 2 topics with the largest contribution; ties keep the weight order (stable sort in JS).
    'drivers', (
      select jsonb_agg(top.slug order by top.c desc, top.i)
      from (
        select e ->> 'slug' as slug, (e ->> 'c')::double precision as c, (e ->> 'i')::integer as i
        from jsonb_array_elements(v_contrib) e
        order by 2 desc, 3
        limit 2
      ) top
    )
  );
end;
$$;

-- period() in mockPolicy.ts: tension per row of the given waves, with the trend bonus when voice or
-- safety fell over the 3 calendar waves ending at the last given wave.
create function public.tension_rows(query jsonb, wave_ids text[]) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_all jsonb := query || '{"topic": "all"}'::jsonb;
  v_end integer;
  v_history text[];
  v_histories jsonb[] := '{}';
  v_wave text;
  v_rows jsonb := '[]'::jsonb;
  r jsonb;
  v_values double precision[];
  v_voice boolean;
  v_safety boolean;
  h jsonb;
  t text;
begin
  select max(o.rn) into v_end
  from (select id, row_number() over (order by starts_at, id) as rn from public.waves) o
  where o.id = any (wave_ids);

  select coalesce(array_agg(o.id order by o.rn), '{}') into v_history
  from (select id, row_number() over (order by starts_at, id) as rn from public.waves) o
  where v_end is not null and o.rn between greatest(1, v_end - 2) and v_end;

  -- The voice/safety score of a row in one wave equals its topicScores entry of the 'all' query.
  foreach v_wave in array v_history loop
    v_histories := v_histories || public.aggregate_rows(v_all, array[v_wave], '{}');
  end loop;

  for r in select * from jsonb_array_elements(public.aggregate_rows(v_all, wave_ids, '{}')) loop
    v_voice := false;
    v_safety := false;
    if cardinality(v_history) = 3 then
      foreach t in array array['voice', 'safety'] loop
        v_values := '{}';
        foreach h in array v_histories loop
          v_values := v_values || (
            select (x -> 'topicScores' ->> t)::double precision
            from jsonb_array_elements(h) x
            where x ->> 'id' = r ->> 'id'
          );
        end loop;
        if cardinality(array_remove(v_values, null)) = 3
          and v_values[1] > v_values[2] and v_values[2] > v_values[3] then
          if t = 'voice' then v_voice := true; else v_safety := true; end if;
        end if;
      end loop;
    end if;
    v_rows := v_rows || jsonb_build_array(
      jsonb_build_object('id', r -> 'id') || public.tension_of(r -> 'topicScores', v_voice, v_safety)
    );
  end loop;
  return v_rows;
end;
$$;

-- input: AggregateQuery → TensionRow[] (index 0–100, high = more tension; null below K_MIN).
-- trend = index − index of the previous period (same number of waves directly before).
create function public.get_tension_index(query jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_waves text[];
  v_previous jsonb;
begin
  if jsonb_typeof(query) is distinct from 'object' then
    raise exception 'query must be an object' using errcode = '22023';
  end if;
  perform public.assert_public_level(query);
  v_waves := case
    when jsonb_typeof(query -> 'waveIds') is distinct from 'null' and query ? 'waveIds'
      then public.jsonb_text_array(query, 'waveIds')
    else array_remove(array[public.current_wave_id()], null)
  end;
  v_previous := public.tension_rows(query, public.previous_wave_ids(v_waves));

  return coalesce((
    select jsonb_agg(
      c.cur || jsonb_build_object('trend', case
        when c.cur ->> 'index' is not null and p.prev ->> 'index' is not null
          then public.round1((c.cur ->> 'index')::double precision - (p.prev ->> 'index')::double precision)
      end)
      order by c.ord
    )
    from jsonb_array_elements(public.tension_rows(query, v_waves)) with ordinality as c (cur, ord)
    left join lateral (
      select x as prev from jsonb_array_elements(v_previous) x where x ->> 'id' = c.cur ->> 'id'
    ) p on true
  ), '[]'::jsonb);
end;
$$;

-- ── "Politik antwortet" ─────────────────────────────────────────────────────

-- policyDelta(): topic score in all waves starting on/after the publication day minus the last wave
-- that ended before it, for the answer's region. The day counts as UTC midnight, like Date.parse().
create function public.policy_topic_delta(answer public.policy_answers) returns double precision
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_published timestamptz := answer.published_at::timestamp at time zone 'UTC';
  v_before text[];
  v_after text[];
begin
  select coalesce(array_agg(b.id), '{}') into v_before
  from (
    select id from public.waves where ends_at <= v_published order by starts_at desc, id desc limit 1
  ) b;
  select coalesce(array_agg(w.id order by w.starts_at, w.id), '{}') into v_after
  from public.waves w
  where w.starts_at >= v_published;

  return (
    select (x ->> 'delta')::double precision
    from jsonb_array_elements(
      public.aggregate_rows(jsonb_build_object('level', answer.scope, 'topic', answer.topic_slug), v_after, v_before)
    ) x
    where x ->> 'id' = coalesce(answer.region_id, 'nrw')
  );
end;
$$;

-- PolicyAnswer JSON (src/types/dialog.ts) with resonance (ratings, from K_MIN on) and effect.
create function public.policy_answer_json(answer public.policy_answers) returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select jsonb_build_object(
    'id', answer.id,
    'topic', answer.topic_slug,
    'scope', answer.scope,
    'regionId', answer.region_id,
    'title', answer.title,
    'body', answer.body,
    'status', answer.status,
    'publishedAt', to_char(answer.published_at, 'YYYY-MM-DD'),
    'resonance', jsonb_build_object(
      'n', r.n,
      'score', case when r.n < public.k_min() then null else public.round1(r.total / r.n) end
    ),
    'topicDeltaSincePublished', public.policy_topic_delta(answer)
  )
  from (
    select count(*)::integer as n, coalesce(sum((value - 1) * 25), 0)::double precision as total
    from public.policy_answer_ratings
    where answer_id = answer.id
  ) r
$$;

-- input: PolicyAnswerFilter → PolicyAnswer[], newest first. NRW-wide answers match every region.
create function public.get_policy_answers(filter jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_topics text[] := public.jsonb_text_array(coalesce(filter, '{}'::jsonb), 'topics');
  v_regions text[] := public.jsonb_text_array(coalesce(filter, '{}'::jsonb), 'regionIds');
begin
  return coalesce((
    select jsonb_agg(public.policy_answer_json(a) order by a.published_at desc, a.id)
    from public.policy_answers a
    where (cardinality(v_topics) = 0 or a.topic_slug = any (v_topics))
      and (cardinality(v_regions) = 0 or a.scope = 'nrw' or a.region_id = any (v_regions))
  ), '[]'::jsonb);
end;
$$;

-- input: PolicyAnswerInput → PolicyAnswer. Only callers whose JWT carries
-- app_metadata.moodmap_role = ministerium | bezreg may publish. app_metadata can only be set by an
-- admin, never by the user, so nobody can post answers in the ministry's name. (The mock has no check.)
create function public.publish_policy_answer(input jsonb) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_role text := auth.jwt() -> 'app_metadata' ->> 'moodmap_role';
  v_scope text := input ->> 'scope';
  v_region text := input ->> 'regionId';
  v_title text := input ->> 'title';
  v_body text := input ->> 'body';
  v_status text := coalesce(input ->> 'status', 'listening');
  v_region_ok boolean;
  v_answer public.policy_answers;
begin
  if v_role is null or v_role not in ('ministerium', 'bezreg') then
    raise exception 'only ministry or district government accounts may publish' using errcode = '42501';
  end if;
  -- Outside the IF: PL/pgSQL ends an IF condition at the first THEN, also one inside a CASE.
  v_region_ok := case v_scope
    when 'nrw' then jsonb_typeof(input -> 'regionId') = 'null'
    when 'kreis' then exists (select 1 from public.schools where kreis_id = v_region)
    else exists (select 1 from public.schools where left(kreis_id, 3) = v_region)
  end;
  if jsonb_typeof(input) is distinct from 'object'
    or not exists (select 1 from public.topics where slug = input ->> 'topic')
    or v_scope is null or v_scope not in ('nrw', 'regbez', 'kreis')
    or v_status not in ('listening', 'reviewing', 'planned', 'done')
    or input ->> 'authorRole' is distinct from v_role
    or v_title is null or btrim(v_title) = '' or char_length(v_title) > 120
    or v_body is null or btrim(v_body) = '' or char_length(v_body) > 400
    or v_region_ok is not true
  then
    raise exception 'invalid policy answer: check topic, region, title, body and author role' using errcode = '22023';
  end if;

  insert into public.policy_answers (topic_slug, scope, region_id, title, body, status, author_role)
  values (input ->> 'topic', v_scope, v_region, btrim(v_title), btrim(v_body), v_status, v_role)
  returning * into v_answer;
  return public.policy_answer_json(v_answer);
end;
$$;

-- "Hilft dir das?" (mood5). One rating per device and answer; a new rating replaces the old one.
-- Stores only sha256(token:policy:answerId). Invalid input → { ok: false }, like the mock.
create function public.rate_policy_answer(answer_id text, value integer, device_token text) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_id uuid;
begin
  if value is null or value not between 1 and 5
    or device_token is null or char_length(device_token) not between 16 and 200
    or answer_id is null
    or answer_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false);
  end if;
  select a.id into v_id from public.policy_answers a where a.id = answer_id::uuid;
  if v_id is null then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.policy_answer_ratings (answer_id, device_hash, value)
  values (v_id, encode(extensions.digest(device_token || ':policy:' || v_id::text, 'sha256'), 'hex'), value)
  on conflict on constraint policy_answer_ratings_pkey
    do update set value = excluded.value, created_at = current_date;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── Exposure ────────────────────────────────────────────────────────────────

grant execute on function public.get_tension_index(jsonb) to anon, authenticated;
grant execute on function public.get_policy_answers(jsonb) to anon, authenticated;
grant execute on function public.rate_policy_answer(text, integer, text) to anon, authenticated;
-- Publishing needs a logged-in account; the role check inside is the actual gate.
grant execute on function public.publish_policy_answer(jsonb) to authenticated;
