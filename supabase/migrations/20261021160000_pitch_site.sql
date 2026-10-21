-- Isolated pitch location (#113, ADR-015). Regular reads never include test rows.
alter table public.regbez add column is_test boolean not null default false;
alter table public.kreise add column is_test boolean not null default false;
alter table public.schools add column is_test boolean not null default false;
alter table public.regbez drop constraint regbez_id_check;
alter table public.regbez add check (is_test or id ~ '^05[1-9]$');
alter table public.kreise drop constraint kreise_id_check;
alter table public.kreise add check (is_test or id ~ '^05[0-9]{3}$');
alter table public.schools drop constraint schools_lat_check;
alter table public.schools drop constraint schools_lon_check;
alter table public.schools add check (lat between -90 and 90 and (is_test or lat between 50 and 53));
alter table public.schools add check (lon between -180 and 180 and (is_test or lon between 5 and 10));

create function public.validate_test_parent() returns trigger
  language plpgsql set search_path = '' as $$
declare parent_test boolean;
begin
  if tg_table_name = 'kreise' then
    select is_test into parent_test from public.regbez where id = new.regbez_id;
  else
    select is_test into parent_test from public.kreise where id = new.kreis_id;
  end if;
  if parent_test is distinct from new.is_test then
    raise exception 'test location must have a test parent' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger kreise_test_parent before insert or update on public.kreise
  for each row execute function public.validate_test_parent();
create trigger schools_test_parent before insert or update on public.schools
  for each row execute function public.validate_test_parent();

-- The school list/map and regional master data stay NRW-only, even for direct REST reads.
alter policy "public read" on public.regbez using (not is_test);
alter policy "public read" on public.kreise using (not is_test);
alter policy "public read" on public.schools using (not is_test);
grant select (is_test) on public.schools to anon, authenticated;

-- Only a server/admin can change the single pitch site. No target ID comes from the browser.
create function public.configure_pitch_site(name text, city text, lat double precision,
  lon double precision, join_code text default 'PITCH') returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if name is null or char_length(btrim(name)) not between 1 and 120
    or city is null or char_length(btrim(city)) not between 1 and 120
    or lat is null or lat not between -90 and 90 or lon is null or lon not between -180 and 180
    or join_code is null or upper(btrim(join_code)) !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'invalid pitch location' using errcode = '22023';
  end if;
  insert into public.regbez (id, name, is_test) values ('TEST', 'Pitch-Testregion', true)
    on conflict (id) do nothing;
  insert into public.kreise (id, name, regbez_id, type, is_test)
    values ('TEST-PITCH', 'Pitch-Testregion', 'TEST', 'kreisfreie_stadt', true)
    on conflict (id) do nothing;
  insert into public.schools (id, name, school_form, kreis_id, city, lat, lon, join_code, is_test)
    values ('pitch-test', btrim(name), 'gesamtschule', 'TEST-PITCH', btrim(city), lat, lon,
      upper(btrim(join_code)), true)
    on conflict (id) do update set name = excluded.name, city = excluded.city,
      lat = excluded.lat, lon = excluded.lon, join_code = excluded.join_code;
end;
$$;
-- Explicitly synthetic default outside NRW; replace with the humans' venue before the pitch (#118).
select public.configure_pitch_site('Pitch-Test (synthetisch)', 'Teststandort · Berlin', 52.52, 13.405);

-- Resolving the dedicated QR code is the public entry to the isolated test location.
create or replace function public.get_school_by_code(code text) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'schoolForm', s.school_form, 'kreisId', s.kreis_id, 'city', s.city,
    'lat', s.lat, 'lon', s.lon, 'studentCount', s.student_count, 'joinCode', s.join_code,
    'isTest', s.is_test
  ) from public.schools s where s.join_code = upper(btrim(code))
$$;

-- Anonymous users cannot reset via REST. The PIN gate lives in the Edge Function.
create function public.reset_pitch_test() returns jsonb
  language plpgsql volatile security definer set search_path = '' as $$
declare deleted integer;
begin
  delete from public.responses r using public.schools s
    where r.school_id = s.id and s.id = 'pitch-test' and s.is_test;
  get diagnostics deleted = row_count;
  -- answers and response-linked moderated text cascade; device hashes are part of responses.
  return jsonb_build_object('ok', true, 'deletedResponses', deleted);
end;
$$;
revoke all on function public.configure_pitch_site(text, text, double precision, double precision, text)
  from public, anon, authenticated;
revoke all on function public.reset_pitch_test() from public, anon, authenticated;
revoke all on function public.validate_test_parent() from public, anon, authenticated;
grant execute on function public.configure_pitch_site(text, text, double precision, double precision, text)
  to service_role;
grant execute on function public.reset_pitch_test() to service_role;

-- Same score arithmetic as #81; only school selection gains test isolation/private pitch level.
-- Public levels follow the DataLevel contract from #140; pitch stays private to get_pitch_aggregate.
create or replace function public.assert_public_level(query jsonb) returns void
  language plpgsql immutable set search_path = '' as $$
begin
  if query ->> 'level' is null or query ->> 'level' not in ('nrw', 'regbez', 'kreis', 'school') then
    raise exception 'level must be nrw, regbez, kreis or school' using errcode = '22023';
  end if;
end;
$$;

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
  if v_level is null or v_level not in ('nrw', 'regbez', 'kreis', 'school', 'pitch') then
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
      case v_level when 'pitch' then s.id when 'school' then s.id when 'kreis' then s.kreis_id when 'nrw' then 'nrw' else left(s.kreis_id, 3) end as group_id
    from public.schools s
    where ((v_level = 'pitch' and s.is_test and s.id = 'pitch-test')
        or (v_level <> 'pitch' and not s.is_test))
      and (cardinality(v_forms) = 0 or s.school_form = any (v_forms))
      and (v_level = 'nrw' or v_parent is null or (case when v_level = 'school' then s.kreis_id else left(s.kreis_id, 3) end) = v_parent)
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

-- Public choice distributions never include pitch responses, even for a test-school scope.
create or replace function public.choice_distribution(question_id text, scope jsonb, wave_id text) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_level text := scope ->> 'level';
  v_id text := scope ->> 'id';
  q public.questions%rowtype;
  v_n integer;
  v_result jsonb;
begin
  if jsonb_typeof(scope) is distinct from 'object' or v_level is null
    or v_level not in ('nrw', 'regbez', 'kreis', 'school') then
    raise exception 'scope.level must be nrw, regbez, kreis or school' using errcode = '22023';
  end if;
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

-- Separate test participation from normal NRW participation on the same device/wave.
create or replace function public.submit_response(input jsonb) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_school_id text := input ->> 'schoolId';
  v_wave_id text := input ->> 'waveId';
  v_role text := input ->> 'role';
  v_grade_band text := input ->> 'gradeBand';
  v_token text := input ->> 'deviceToken';
  v_answers jsonb := input -> 'answers';
  v_response_id uuid;
  a jsonb;
  q public.questions%rowtype;
  v_value jsonb;
  v_choice text[];
begin
  if jsonb_typeof(input) is distinct from 'object' then
    raise exception 'input must be an object' using errcode = '22023';
  end if;
  if not exists (select 1 from public.schools where id = v_school_id) then
    raise exception 'unknown school' using errcode = '22023';
  end if;
  if v_wave_id is null or v_wave_id is distinct from public.current_wave_id() then
    raise exception 'wave % is not the current wave', v_wave_id using errcode = '22023';
  end if;
  if v_role is null or v_role not in ('student', 'teacher') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  -- Random token from localStorage (docs/PRIVACY.md §3). Never stored, only its hash per wave.
  if v_token is null or char_length(v_token) not between 16 and 200 then
    raise exception 'invalid device token' using errcode = '22023';
  end if;
  if jsonb_typeof(v_answers) is distinct from 'array' or jsonb_array_length(v_answers) not between 1 and 100 then
    raise exception 'answers must be a non-empty array' using errcode = '22023';
  end if;
  if (select count(distinct e ->> 'questionId') from jsonb_array_elements(v_answers) e) <> jsonb_array_length(v_answers) then
    raise exception 'duplicate or missing questionId' using errcode = '22023';
  end if;

  -- One response per device and wave; atomic, so concurrent retries cannot create a second one.
  insert into public.responses (school_id, wave_id, role, grade_band, device_hash)
  values (
    v_school_id, v_wave_id, v_role, v_grade_band,
    encode(extensions.digest(v_token || ':' || v_wave_id ||
      case when (select is_test from public.schools where id = v_school_id) then ':pitch' else '' end,
      'sha256'), 'hex')
  )
  on conflict (device_hash, wave_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    return jsonb_build_object('ok', false, 'reason', 'already_submitted');
  end if;

  for a in select * from jsonb_array_elements(v_answers) loop
    select * into q from public.questions where id = a ->> 'questionId';
    if not found then
      raise exception 'unknown question %', a ->> 'questionId' using errcode = '22023';
    end if;
    if q.audience is not null and q.audience <> v_role then
      raise exception 'question % is not for role %', q.id, v_role using errcode = '22023';
    end if;

    if q.type = 'choice' then
      if jsonb_typeof(a -> 'choice') is distinct from 'array' or a ? 'value' then
        raise exception 'answer % needs a choice array', q.id using errcode = '22023';
      end if;
      select array_agg(c) into v_choice from jsonb_array_elements_text(a -> 'choice') c;
      insert into public.answers (response_id, question_id, choice) values (v_response_id, q.id, v_choice);
    else
      v_value := a -> 'value';
      if jsonb_typeof(v_value) is distinct from 'number' or a ? 'choice'
        or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) then
        raise exception 'answer % needs an integer value', q.id using errcode = '22023';
      end if;
      -- Ranges per type are enforced by the validate_answer trigger (#77).
      insert into public.answers (response_id, question_id, value)
      values (v_response_id, q.id, (v_value #>> '{}')::smallint);
    end if;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- One public pitch aggregate, separate from every NRW endpoint. K_MIN is enforced by aggregate_rows.
create function public.get_pitch_aggregate() returns jsonb
  language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'school', jsonb_build_object('id', s.id, 'name', s.name, 'city', s.city,
      'lat', s.lat, 'lon', s.lon, 'isTest', true),
    'waveId', public.current_wave_id(),
    'n', (select count(*) from public.responses r where r.school_id = s.id
      and r.wave_id = public.current_wave_id()),
    'scoredN', coalesce((a.row ->> 'n')::integer, 0),
    'score', a.row -> 'score', 'topicScores', coalesce(a.row -> 'topicScores', '{}'::jsonb)
  )
  from public.schools s
  left join lateral (
    select value as row from jsonb_array_elements(public.aggregate_rows(
      '{"level":"pitch","topic":"all"}'::jsonb,
      array[public.current_wave_id()], '{}'::text[]))
  ) a on true
  where s.id = 'pitch-test' and s.is_test
$$;
grant execute on function public.get_pitch_aggregate() to anon, authenticated;

-- Same moderated-text contract as #126, with the test participation hash namespace.
create or replace function public.record_freetext(input jsonb) returns jsonb
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
    and r.device_hash = encode(extensions.digest(v_token || ':' || v_wave_id ||
      case when (select is_test from public.schools where id = v_school_id) then ':pitch' else '' end,
      'sha256'), 'hex');

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

-- Regional free-text output excludes test entries; the Beamer explicitly selects pitch-test.
create or replace function public.get_freetext_clusters(scope jsonb) returns jsonb
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
      -- Test clusters require an explicit test-school scope; no regional scope includes them.
      and (not s.is_test or (v_level = 'school' and v_id = 'pitch-test'))
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
