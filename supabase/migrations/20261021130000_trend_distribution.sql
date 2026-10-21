-- Trend + choice distributions (#80, part of #22). Same semantics as getTrend/getChoiceDistribution in
-- src/data/mockSource.ts; parity-tested in supabase/tests/trend-distribution.test.ts.

-- input: TrendQuery (AggregateQuery with required waveIds) → TrendPoint[].
-- One aggregation per selected wave (in calendar order) without a previous period, like the mock.
create function public.get_trend(query jsonb) returns jsonb
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

-- Distribution of a choice question in one wave → Distribution | null (docs/PRIVACY.md §2):
-- null below K_MIN distinct responses; options with fewer than 3 mentions are masked (count = null).
-- Internal; get_choice_distribution passes the current wave.
create function public.choice_distribution(question_id text, scope jsonb, wave_id text) returns jsonb
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
    where a.question_id = q.id
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

-- input: question id + Scope → Distribution | null for the current wave.
create function public.get_choice_distribution(question_id text, scope jsonb) returns jsonb
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select public.choice_distribution(question_id, scope, public.current_wave_id())
$$;

grant execute on function public.get_trend(jsonb) to anon, authenticated;
grant execute on function public.get_choice_distribution(text, jsonb) to anon, authenticated;
