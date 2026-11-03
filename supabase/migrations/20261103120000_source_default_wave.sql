-- Default period per source (#272): without waveIds, live/demo sources show the current wave (as
-- before); an import source shows its latest wave with data, so a finished survey is not empty.

create function public.default_wave_ids(query jsonb) returns text[]
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_source public.data_sources;
  v_wave text;
begin
  if query ->> 'level' is distinct from 'pitch' then
    select * into v_source from public.data_sources where id = public.resolve_source(query);
    if v_source.kind = 'import' then
      select max(w.wave_id) into v_wave from (
        select r.wave_id from private.response_rollup r where r.source_id = v_source.id and r.answered > 0
        union all
        select g.wave_id from private.imported_aggregates g where g.source_id = v_source.id
      ) w;
      return array_remove(array[v_wave], null);
    end if;
  end if;
  return array_remove(array[public.current_wave_id()], null);
end;
$$;

revoke all on function public.default_wave_ids(jsonb) from public, anon, authenticated;

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
    else public.default_wave_ids(query)
  end;
  return public.aggregate_rows(query, v_waves, public.previous_wave_ids(v_waves));
end;
$$;

create or replace function public.get_tension_index(query jsonb) returns jsonb
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
    else public.default_wave_ids(query)
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
