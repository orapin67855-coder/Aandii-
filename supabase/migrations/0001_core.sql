-- Aandii core schema: focus sessions, rewards, readiness, study rooms
-- Run in a Supabase project (dev first). Review every policy before production.
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  grade smallint check (grade between 4 and 6),
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- subjects / tasks / exams ----------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#8FA8E0',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index on public.subjects (user_id);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  exam_date date not null,
  created_at timestamptz not null default now()
);
create index on public.exams (user_id, exam_date);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  exam_id uuid references public.exams(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  note text check (char_length(note) <= 1000),
  due_date date,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (user_id, status, due_date);
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- focus sessions (server-timed, tamper-resistant) ----------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  client_request_id uuid not null,
  status text not null check (status in ('running','paused','completed','cancelled')),
  started_at timestamptz not null default now(),
  running_since timestamptz,
  accumulated_seconds integer not null default 0 check (accumulated_seconds >= 0),
  ended_at timestamptz,
  unique (user_id, client_request_id)
);
-- one active session per user
create unique index one_active_session on public.study_sessions (user_id)
  where status in ('running','paused');
create index on public.study_sessions (user_id, started_at desc);

-- ---------- rewards (append-only, idempotent) ----------
create table public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null check (reason in ('focus','review','rest','streak')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, source_id)
);
create index on public.reward_ledger (user_id, created_at desc);

create view public.my_star_balance with (security_invoker = true) as
  select user_id, coalesce(sum(amount),0)::int as stars
  from public.reward_ledger group by user_id;

-- ---------- sleep + readiness (health-adjacent: keep minimal, owner-only) ----------
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  hours numeric(3,1) not null check (hours between 0 and 14),
  quality smallint not null check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

create table public.readiness_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  energy smallint not null check (energy between 1 and 5),
  mood smallint not null check (mood between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  score smallint not null check (score between 0 and 100),
  level text not null check (level in ('high','medium','low'))
);
create index on public.readiness_checks (user_id, checked_at desc);

-- ---------- study rooms ----------
create table public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  invite_code text not null unique default substr(encode(gen_random_bytes(6),'hex'),1,8),
  max_members smallint not null default 8 check (max_members between 2 and 30),
  created_at timestamptz not null default now()
);
create table public.room_members (
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index on public.room_members (user_id);

create or replace function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members where room_id = p_room and user_id = auth.uid());
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.exams enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.readiness_checks enable row level security;
alter table public.study_rooms enable row level security;
alter table public.room_members enable row level security;

create policy profiles_own on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy subjects_own on public.subjects for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exams_own on public.exams for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_own on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sleep_own on public.sleep_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy readiness_own on public.readiness_checks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sessions and rewards: read-only for clients; writes only via RPC below
create policy sessions_read on public.study_sessions for select to authenticated using (user_id = auth.uid());
create policy rewards_read on public.reward_ledger for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.study_sessions from authenticated, anon;
revoke insert, update, delete on public.reward_ledger from authenticated, anon;

create policy rooms_member_read on public.study_rooms for select to authenticated
  using (owner_id = auth.uid() or public.is_room_member(id));
create policy rooms_owner_insert on public.study_rooms for insert to authenticated
  with check (owner_id = auth.uid());
create policy rooms_owner_update on public.study_rooms for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy rooms_owner_delete on public.study_rooms for delete to authenticated
  using (owner_id = auth.uid());
create policy members_read on public.room_members for select to authenticated
  using (public.is_room_member(room_id));
create policy members_leave on public.room_members for delete to authenticated
  using (user_id = auth.uid());
revoke insert, update on public.room_members from authenticated, anon;

-- ---------- RPC: focus timer ----------
create or replace function public.focus_start(p_subject uuid, p_task uuid, p_request uuid)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.study_sessions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into s from study_sessions where user_id = uid and client_request_id = p_request;
  if found then return s; end if;  -- idempotent retry
  if p_subject is not null and not exists (select 1 from subjects where id = p_subject and user_id = uid)
    then raise exception 'invalid_subject'; end if;
  if p_task is not null and not exists (select 1 from tasks where id = p_task and user_id = uid)
    then raise exception 'invalid_task'; end if;
  begin
    insert into study_sessions(user_id, subject_id, task_id, client_request_id, status, running_since)
    values (uid, p_subject, p_task, p_request, 'running', now()) returning * into s;
  exception when unique_violation then
    raise exception 'active_session_exists';
  end;
  return s;
end $$;

create or replace function public.focus_pause(p_session uuid)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.study_sessions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  update study_sessions
     set accumulated_seconds = accumulated_seconds + greatest(0, extract(epoch from now() - running_since)::int),
         running_since = null, status = 'paused'
   where id = p_session and user_id = uid and status = 'running'
   returning * into s;
  if not found then raise exception 'invalid_state'; end if;
  return s;
end $$;

create or replace function public.focus_resume(p_session uuid)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.study_sessions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  update study_sessions set running_since = now(), status = 'running'
   where id = p_session and user_id = uid and status = 'paused'
   returning * into s;
  if not found then raise exception 'invalid_state'; end if;
  return s;
end $$;

create or replace function public.focus_cancel(p_session uuid)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.study_sessions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  update study_sessions set status = 'cancelled', running_since = null, ended_at = now()
   where id = p_session and user_id = uid and status in ('running','paused')
   returning * into s;
  if not found then raise exception 'invalid_state'; end if;
  return s;
end $$;

-- Complete: totals time on the server, caps a session at 4h, awards stars once.
-- Rule: 1 star per full 25 min (max 4 per session, max 12 per day). Resting never deducts.
create or replace function public.focus_complete(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); s public.study_sessions; total int; stars int := 0;
  day_start timestamptz; today_stars int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into s from study_sessions where id = p_session and user_id = uid for update;
  if not found then raise exception 'not_found'; end if;
  if s.status = 'completed' then
    return to_jsonb(s) || jsonb_build_object('stars_awarded', 0, 'already_completed', true);
  end if;
  if s.status = 'cancelled' then raise exception 'invalid_state'; end if;

  total := s.accumulated_seconds;
  if s.status = 'running' then
    total := total + greatest(0, extract(epoch from now() - s.running_since)::int);
  end if;
  total := least(total, 4 * 3600);

  update study_sessions set status = 'completed', running_since = null,
         accumulated_seconds = total, ended_at = now()
   where id = s.id returning * into s;

  day_start := date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok';
  select coalesce(sum(amount),0) into today_stars from reward_ledger
   where user_id = uid and reason = 'focus' and created_at >= day_start;
  stars := least(4, total / 1500, greatest(0, 12 - today_stars));
  if stars > 0 then
    insert into reward_ledger(user_id, amount, reason, source_id)
    values (uid, stars, 'focus', s.id) on conflict do nothing;
  end if;
  return to_jsonb(s) || jsonb_build_object('stars_awarded', stars);
end $$;

-- ---------- RPC: join room by invite code ----------
create or replace function public.join_room(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.study_rooms; n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into r from study_rooms where invite_code = lower(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;
  select count(*) into n from room_members where room_id = r.id;
  if n >= r.max_members then raise exception 'room_full'; end if;
  insert into room_members(room_id, user_id) values (r.id, uid) on conflict do nothing;
  return r.id;
end $$;

revoke all on function public.focus_start, public.focus_pause, public.focus_resume,
  public.focus_cancel, public.focus_complete, public.join_room from public, anon;
grant execute on function public.focus_start, public.focus_pause, public.focus_resume,
  public.focus_cancel, public.focus_complete, public.join_room to authenticated;

-- ---------- Realtime: private room channels "room:<uuid>" (verify in your project) ----------
create policy room_channel_read on realtime.messages for select to authenticated
  using (realtime.topic() ~ '^room:[0-9a-f-]{36}$'
         and public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid));
create policy room_channel_write on realtime.messages for insert to authenticated
  with check (realtime.topic() ~ '^room:[0-9a-f-]{36}$'
         and public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid));
