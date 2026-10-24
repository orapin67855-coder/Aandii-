-- 0002_rooms.sql : ห้องอ่านแข่งกัน (ตั้งชื่อ/ล็อกด้วยรหัสผ่าน/สาธารณะ) + อันดับรายวัน (เขตเวลา Asia/Bangkok)
-- ต้องรันหลัง 0001_core.sql  ·  รหัสผ่านห้องเก็บเป็น bcrypt hash เท่านั้น ไม่ส่งออกไป client

alter table public.study_rooms add column if not exists password_hash text;
alter table public.study_sessions add column if not exists room_id uuid references public.study_rooms(id) on delete set null;
create index if not exists study_sessions_room_day_idx on public.study_sessions (room_id, started_at);

-- จำกัดการเดารหัสผ่าน (ไม่มี policy = client เข้าถึงตรงไม่ได้)
create table public.room_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index on public.room_join_attempts (user_id, room_id, created_at desc);
alter table public.room_join_attempts enable row level security;
revoke all on public.room_join_attempts from anon, authenticated;

create or replace function public.create_room(p_name text, p_password text default null, p_max int default 8)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 50 then raise exception 'invalid_name'; end if;
  if p_password is not null and char_length(p_password) not between 4 and 32 then raise exception 'invalid_password'; end if;
  insert into study_rooms(owner_id, name, max_members, password_hash)
  values (uid, trim(p_name), least(greatest(p_max, 2), 30),
          case when p_password is null then null else crypt(p_password, gen_salt('bf')) end)
  returning id into rid;
  insert into room_members(room_id, user_id) values (rid, uid);
  return rid;
end $$;

-- รายการห้อง: ไอคอนแม่กุญแจมาจาก has_password (ไม่คืน hash)
create or replace function public.list_rooms()
returns table (id uuid, name text, has_password boolean, max_members smallint,
               member_count bigint, studying_now bigint, is_member boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.password_hash is not null, r.max_members,
    (select count(*) from room_members m where m.room_id = r.id) as member_count,
    (select count(distinct s.user_id) from study_sessions s where s.room_id = r.id and s.status = 'running') as studying_now,
    exists (select 1 from room_members m where m.room_id = r.id and m.user_id = auth.uid())
  from study_rooms r order by studying_now desc, r.created_at desc limit 100;
$$;

-- คืนสถานะเป็นข้อความ (ไม่ raise) เพื่อให้บันทึกความพยายามที่ผิดได้จริง
create or replace function public.join_room(p_room uuid, p_password text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); r public.study_rooms; n int; fails int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into r from study_rooms where id = p_room;
  if not found then return 'room_not_found'; end if;
  if exists (select 1 from room_members where room_id = p_room and user_id = uid) then return 'joined'; end if;
  select count(*) into fails from room_join_attempts
   where user_id = uid and room_id = p_room and not ok and created_at > now() - interval '10 minutes';
  if fails >= 5 then return 'too_many_attempts'; end if;
  if r.password_hash is not null and (p_password is null or crypt(p_password, r.password_hash) <> r.password_hash) then
    insert into room_join_attempts(user_id, room_id, ok) values (uid, p_room, false);
    return 'wrong_password';
  end if;
  select count(*) into n from room_members where room_id = p_room;
  if n >= r.max_members then return 'room_full'; end if;
  insert into room_members(room_id, user_id) values (p_room, uid) on conflict do nothing;
  insert into room_join_attempts(user_id, room_id, ok) values (uid, p_room, true);
  return 'joined';
end $$;
drop function if exists public.join_room(text);

-- อันดับวันนี้ (รีเซ็ตทุกเที่ยงคืนเวลาไทย) เฉพาะสมาชิกห้อง
create or replace function public.room_leaderboard(p_room uuid)
returns table (user_id uuid, display_name text, today_seconds int, studying boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name,
    coalesce(sum(s.accumulated_seconds + case when s.status = 'running'
      then greatest(0, extract(epoch from now() - s.running_since)::int) else 0 end), 0)::int as today_seconds,
    coalesce(bool_or(s.status = 'running'), false)
  from room_members m
  join profiles p on p.id = m.user_id
  left join study_sessions s on s.user_id = m.user_id and s.room_id = p_room
       and s.status in ('running','paused','completed')
       and s.started_at >= (date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')
  where m.room_id = p_room and public.is_room_member(p_room)
  group by m.user_id, p.display_name order by today_seconds desc;
$$;

-- focus_start รับ room_id (ต้องเป็นสมาชิกห้อง) — API เดิมที่ไม่ส่ง p_room ยังใช้ได้
drop function if exists public.focus_start(uuid, uuid, uuid);
create or replace function public.focus_start(p_subject uuid, p_task uuid, p_request uuid, p_room uuid default null)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.study_sessions;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into s from study_sessions where user_id = uid and client_request_id = p_request;
  if found then return s; end if;
  if p_subject is not null and not exists (select 1 from subjects where id = p_subject and user_id = uid) then raise exception 'invalid_subject'; end if;
  if p_task is not null and not exists (select 1 from tasks where id = p_task and user_id = uid) then raise exception 'invalid_task'; end if;
  if p_room is not null and not public.is_room_member(p_room) then raise exception 'not_room_member'; end if;
  begin
    insert into study_sessions(user_id, subject_id, task_id, room_id, client_request_id, status, running_since)
    values (uid, p_subject, p_task, p_room, p_request, 'running', now()) returning * into s;
  exception when unique_violation then raise exception 'active_session_exists';
  end;
  return s;
end $$;

revoke all on function public.create_room, public.list_rooms, public.join_room,
  public.room_leaderboard, public.focus_start from public, anon;
grant execute on function public.create_room, public.list_rooms, public.join_room,
  public.room_leaderboard, public.focus_start to authenticated;
