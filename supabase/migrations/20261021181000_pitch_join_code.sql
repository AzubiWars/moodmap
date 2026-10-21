-- The Beamer must use the configured public participation code, not assume PITCH (#199/#116).
create or replace function public.get_pitch_aggregate() returns jsonb
  language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'school', jsonb_build_object('id', s.id, 'name', s.name, 'city', s.city,
      'lat', s.lat, 'lon', s.lon, 'isTest', true, 'joinCode', s.join_code),
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
