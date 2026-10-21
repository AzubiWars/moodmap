-- Moodmap schema, RLS and grants (#77, part of #22).
-- Data model: docs/ARCHITECTURE.md §4 · privacy rules: docs/PRIVACY.md · TS contract: src/types.
--
-- Access model:
--   * Master data, survey config and policy answers are readable by anon/authenticated.
--   * Raw survey data (responses, answers, policy_answer_ratings) is never readable or writable
--     directly. Writes go through validating security-definer RPCs (#78, #81), reads only through
--     k-anonymised aggregate RPCs (#79–#81).
--   * schools.join_code is not readable; codes are resolved only via get_school_by_code (#78).
-- Supabase grants ALL on new tables to anon/authenticated by default, so this migration revokes
-- everything first and grants back explicitly. RLS is enabled on every table as a second line.

-- ── Master data ──────────────────────────────────────────────────────────────

create table public.regbez (
  id text primary key check (id ~ '^05[1-9]$'),
  name text not null
);

create table public.kreise (
  id text primary key check (id ~ '^05[0-9]{3}$'), -- AGS
  name text not null,
  regbez_id text not null references public.regbez (id),
  type text not null check (type in ('kreis', 'kreisfreie_stadt'))
);

create table public.schools (
  id text primary key, -- Schulnummer (synthetic: 9xxxxx)
  name text not null,
  school_form text not null check (
    school_form in (
      'grundschule', 'hauptschule', 'realschule', 'sekundarschule',
      'gesamtschule', 'gymnasium', 'foerderschule', 'berufskolleg'
    )
  ),
  kreis_id text not null references public.kreise (id),
  city text not null,
  lat double precision not null check (lat between 50 and 53),
  lon double precision not null check (lon between 5 and 10),
  student_count integer check (student_count > 0),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{4,12}$')
);

create index schools_kreis_id_idx on public.schools (kreis_id);

-- ── Survey configuration (seeded from src/data/topics.ts) ────────────────────

create table public.topics (
  slug text primary key,
  title text not null,
  icon text not null,
  audience text[] not null check (audience <@ array['student', 'teacher'] and cardinality(audience) > 0),
  mandatory boolean not null default false,
  sort integer not null,
  priority text not null check (priority in ('P0', 'P1', 'P2'))
);

create table public.questions (
  id text primary key,
  topic_slug text not null references public.topics (slug),
  type text not null check (type in ('mood5', 'swipe', 'choice')), -- no freetext (PRIVACY §1)
  text text not null,
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  multiple boolean not null default false,
  invert boolean not null default false,
  weight real check (weight >= 0), -- null = default per type, like defaultWeight() in score.ts
  audience text check (audience in ('student', 'teacher')),
  check ((type = 'choice') = (options is not null)),
  check (type = 'choice' or not multiple)
);

create index questions_topic_slug_idx on public.questions (topic_slug);

create table public.waves (
  id text primary key check (id ~ '^[0-9]{4}-W[0-9]{2}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

-- ── Raw survey data (anonymous; never directly accessible) ───────────────────

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools (id),
  wave_id text not null references public.waves (id),
  role text not null check (role in ('student', 'teacher')),
  grade_band text check (grade_band in ('5-7', '8-10', 'oberstufe', 'berufskolleg')),
  -- sha256(device token || wave id), hex. Only used to prevent double participation (PRIVACY §3).
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  -- Day precision on purpose (PRIVACY §1.4). No IP, user agent or other client metadata columns.
  created_at date not null default current_date,
  unique (device_hash, wave_id)
);

create index responses_school_wave_idx on public.responses (school_id, wave_id);
create index responses_wave_idx on public.responses (wave_id);

create table public.answers (
  response_id uuid not null references public.responses (id) on delete cascade,
  question_id text not null references public.questions (id),
  value smallint check (value between 0 and 5),
  choice text[] check (cardinality(choice) between 1 and 20),
  primary key (response_id, question_id),
  check ((value is null) <> (choice is null))
);

create index answers_question_idx on public.answers (question_id);

-- Type-specific checks need the question row, so they live in a trigger (defense in depth for #78).
create function public.validate_answer() returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  q public.questions%rowtype;
  allowed text[];
begin
  select * into q from public.questions where id = new.question_id;
  if not found then
    raise exception 'unknown question %', new.question_id using errcode = '23503';
  end if;

  if q.type = 'mood5' and (new.value is null or new.value not between 1 and 5) then
    raise exception 'mood5 answer for % must be 1–5', q.id using errcode = '23514';
  elsif q.type = 'swipe' and (new.value is null or new.value not in (0, 1)) then
    raise exception 'swipe answer for % must be 0 or 1', q.id using errcode = '23514';
  elsif q.type = 'choice' then
    if new.choice is null then
      raise exception 'choice answer for % needs options', q.id using errcode = '23514';
    end if;
    if not q.multiple and cardinality(new.choice) <> 1 then
      raise exception 'choice answer for % allows exactly one option', q.id using errcode = '23514';
    end if;
    select array_agg(o ->> 'value') into allowed from jsonb_array_elements(q.options) as o;
    if not new.choice <@ allowed then
      raise exception 'invalid option for %', q.id using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger answers_validate
  before insert or update on public.answers
  for each row execute function public.validate_answer();

-- ── Dialog channel „Politik antwortet" ──────────────────────────────────────

create table public.policy_answers (
  id uuid primary key default gen_random_uuid(),
  topic_slug text not null references public.topics (slug),
  scope text not null check (scope in ('nrw', 'regbez', 'kreis')),
  region_id text,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 400),
  status text not null default 'listening' check (status in ('listening', 'reviewing', 'planned', 'done')),
  published_at date not null default current_date,
  author_role text not null check (author_role in ('ministerium', 'bezreg')),
  check ((scope = 'nrw') = (region_id is null)),
  check (scope <> 'regbez' or region_id ~ '^05[1-9]$'),
  check (scope <> 'kreis' or region_id ~ '^05[0-9]{3}$')
);

create index policy_answers_region_idx on public.policy_answers (scope, region_id);

create table public.policy_answer_ratings (
  answer_id uuid not null references public.policy_answers (id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  value smallint not null check (value between 1 and 5),
  created_at date not null default current_date,
  primary key (answer_id, device_hash)
);

-- ── Grants & RLS ─────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Secure by default for later migrations: new tables/functions are not exposed until a migration
-- grants them explicitly (e.g. `grant execute on function public.submit_response(jsonb) to anon`).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
-- EXECUTE for PUBLIC is a global (not per-schema) default in Postgres, so it can only be revoked globally.
-- RPCs are security definer and run as their owner, so this does not affect what they can call.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

grant select on public.regbez, public.kreise, public.topics, public.questions, public.waves,
  public.policy_answers to anon, authenticated;
-- Everything except join_code.
grant select (id, name, school_form, kreis_id, city, lat, lon, student_count)
  on public.schools to anon, authenticated;

alter table public.regbez enable row level security;
alter table public.kreise enable row level security;
alter table public.schools enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.waves enable row level security;
alter table public.policy_answers enable row level security;
-- No policies on purpose: with RLS on and no grants, raw data is unreachable for anon/authenticated.
alter table public.responses enable row level security;
alter table public.answers enable row level security;
alter table public.policy_answer_ratings enable row level security;

create policy "public read" on public.regbez for select to anon, authenticated using (true);
create policy "public read" on public.kreise for select to anon, authenticated using (true);
create policy "public read" on public.schools for select to anon, authenticated using (true);
create policy "public read" on public.topics for select to anon, authenticated using (true);
create policy "public read" on public.questions for select to anon, authenticated using (true);
create policy "public read" on public.waves for select to anon, authenticated using (true);
create policy "public read" on public.policy_answers for select to anon, authenticated using (true);

-- Internal trigger function, not an API.
revoke execute on function public.validate_answer() from public, anon, authenticated;
