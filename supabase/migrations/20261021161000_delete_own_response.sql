-- Withdraw one's own response (#161): the Supabase side of DataSource.deleteOwnResponse.
-- The only link between a device and its response is device_hash = sha256(token:wave), exactly as
-- stored by submit_response (#78). So only the device that still holds its random token can find and
-- delete its response, and only in the current wave (the one it can take part in again).

-- input: OwnResponseInput { waveId, deviceToken } → DeleteResult.
-- Invalid input raises (the data source maps that to { ok: false, reason: 'error' }), like submit_response.
create function public.delete_own_response(input jsonb) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_wave_id text := input ->> 'waveId';
  v_token text := input ->> 'deviceToken';
  v_deleted uuid;
begin
  if jsonb_typeof(input) is distinct from 'object' then
    raise exception 'input must be an object' using errcode = '22023';
  end if;
  if v_wave_id is null or v_wave_id is distinct from public.current_wave_id() then
    raise exception 'wave % is not the current wave', v_wave_id using errcode = '22023';
  end if;
  if v_token is null or char_length(v_token) not between 16 and 200 then
    raise exception 'invalid device token' using errcode = '22023';
  end if;

  -- Answers follow via on delete cascade (#77).
  delete from public.responses
  where wave_id = v_wave_id
    and device_hash = encode(extensions.digest(v_token || ':' || v_wave_id, 'sha256'), 'hex')
  returning id into v_deleted;

  if v_deleted is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.delete_own_response(jsonb) to anon, authenticated;
