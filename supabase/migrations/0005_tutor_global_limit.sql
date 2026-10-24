-- 0005: นับคำถามติวเตอร์ทั้งระบบวันนี้ (เวลาไทย) เพื่อไม่ให้เกินโควตาฟรีของผู้ให้บริการ AI
-- แอปที่เปิดอยู่ตอนนี้ยังไม่มีโปรเจกต์ Supabase จึงนับใน tutor.json แทน ไฟล์นี้ไว้ตอนย้ายฐานข้อมูล
create index if not exists tutor_messages_user_day_idx on public.tutor_messages (created_at) where role = 'user';
create or replace function public.tutor_usage_today() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from tutor_messages
  where role = 'user' and created_at >= (date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok');
$$;
revoke all on function public.tutor_usage_today from public, anon;
grant execute on function public.tutor_usage_today to authenticated;
