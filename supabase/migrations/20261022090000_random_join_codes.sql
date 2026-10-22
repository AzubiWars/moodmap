-- Join codes of real schools never come from the public repo (#257).
-- The repo and public/data/schools.real.json are public, so a committed code would let anyone vote
-- for that school. Instead the database draws a random code on first insert; re-seeding upserts all
-- other columns and keeps the existing code (scripts/lib/supabase-seed.ts).

-- 8 characters from 31 unambiguous symbols (~8.5e11 combinations): not guessable, still typeable.
create function public.new_join_code() returns text
  language plpgsql
  volatile
  set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, 1 + get_byte(bytes, i) % length(alphabet), 1);
    end loop;
    exit when not exists (select 1 from public.schools where join_code = code);
  end loop;
  return code;
end;
$$;

revoke execute on function public.new_join_code() from public, anon, authenticated;

alter table public.schools alter column join_code set default public.new_join_code();
