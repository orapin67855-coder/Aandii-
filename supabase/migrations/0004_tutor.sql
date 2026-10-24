-- ประวัติติวเตอร์แยกตามบัญชี ส่วนคลังโจทย์และเฉลยเป็นข้อมูลกลางชุดเดียวกัน
-- รันหลังมี auth.users ยังไม่เปิดโมเดลที่ตอบเอง

create table if not exists public.tutor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.tutor_threads(id) on delete cascade,
  role text not null check (role in ('user', 'tutor')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.tutor_threads enable row level security;
alter table public.tutor_messages enable row level security;

create policy tutor_threads_own on public.tutor_threads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tutor_messages_own on public.tutor_messages for all to authenticated
  using (exists (select 1 from public.tutor_threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.tutor_threads t where t.id = thread_id and t.user_id = auth.uid()));
