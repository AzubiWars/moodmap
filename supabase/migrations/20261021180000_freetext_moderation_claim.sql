-- A stored text is not a cost limit: concurrent/rejected requests may never store a row (#170).
-- Claim the single moderation attempt atomically before invoking OpenRouter. No text or timestamp.
create table public.freetext_moderation_claims (
  response_id uuid primary key references public.responses(id) on delete cascade
);
alter table public.freetext_moderation_claims enable row level security;
revoke all on public.freetext_moderation_claims from public, anon, authenticated;

-- Existing moderated entries have already used their allowance.
insert into public.freetext_moderation_claims(response_id)
  select response_id from public.freetext_entries on conflict do nothing;

create function public.claim_freetext_moderation(response_id uuid) returns boolean
  language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into public.freetext_moderation_claims(response_id)
    select r.id from public.responses r
    where r.id = $1 and r.wave_id = public.current_wave_id()
      and not exists(select 1 from public.freetext_entries e where e.response_id = r.id)
    on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.claim_freetext_moderation(uuid) from public, anon, authenticated;
grant execute on function public.claim_freetext_moderation(uuid) to service_role;
