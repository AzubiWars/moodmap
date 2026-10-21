-- submit_response accepts an empty answers array (#214), like the MockDataSource: someone who skipped
-- every question still takes part (one response per device and wave), but counts in no score.
-- Copied from 20261021160000_pitch_site.sql; only the answers-length check and its message change.

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
  if jsonb_typeof(v_answers) is distinct from 'array' or jsonb_array_length(v_answers) not between 0 and 100 then
    raise exception 'answers must be an array with at most 100 entries' using errcode = '22023';
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
