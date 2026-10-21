-- Survey RPCs (#78, part of #22): the only way for API roles to write responses or resolve join codes.
-- All functions are security definer with an empty search_path (everything fully qualified) and are
-- exposed explicitly, because #77 made functions private by default.

-- ── Current wave ────────────────────────────────────────────────────────────

-- The wave covering now(); falls back to the most recently started one so that a gap in the wave
-- calendar can never break the live demo. Shared by get_current_wave and submit_response.
create function public.current_wave_id() returns text
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select id from public.waves
  where starts_at <= now()
  order by (now() < ends_at) desc, starts_at desc
  limit 1
$$;

-- → Wave | null (camelCase, like src/types/domain.ts)
create function public.get_current_wave() returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select jsonb_build_object('id', w.id, 'startsAt', w.starts_at, 'endsAt', w.ends_at)
  from public.waves w
  where w.id = public.current_wave_id()
$$;

-- ── Join codes ──────────────────────────────────────────────────────────────

-- → School | null. The only way to resolve a join code (the column itself is not readable, #77).
create function public.get_school_by_code(code text) returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'schoolForm', s.school_form, 'kreisId', s.kreis_id, 'city', s.city,
    'lat', s.lat, 'lon', s.lon, 'studentCount', s.student_count, 'joinCode', s.join_code
  )
  from public.schools s
  where s.join_code = upper(btrim(code))
$$;

-- ── Submit ──────────────────────────────────────────────────────────────────

-- input: ResponseInput (src/types/survey.ts) → SubmitResult.
-- Expected outcomes are returned ({ ok: true } / already_submitted); invalid input raises, and the
-- data source maps that to { ok: false, reason: 'error' } (#23).
create function public.submit_response(input jsonb) returns jsonb
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
    encode(extensions.digest(v_token || ':' || v_wave_id, 'sha256'), 'hex')
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

-- ── Exposure ────────────────────────────────────────────────────────────────

grant execute on function public.get_current_wave() to anon, authenticated;
grant execute on function public.get_school_by_code(text) to anon, authenticated;
grant execute on function public.submit_response(jsonb) to anon, authenticated;
-- Internal helper; callers use it through the security definer functions above.
revoke execute on function public.current_wave_id() from public, anon, authenticated;
