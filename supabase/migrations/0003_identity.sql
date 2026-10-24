-- ขยายโปรไฟล์ให้ตรงกับบัญชีที่แอปใช้: ชื่อผู้ใช้ ระดับการศึกษา อายุ
-- ไม่สร้างตารางคอร์ส การชำระเงิน หรือคลังข้อสอบในไฟล์นี้
-- รันหลัง 0001_core.sql ในโปรเจกต์ Supabase จริง แล้วนำนโยบายไปตรวจก่อนใช้งานจริง

alter table public.profiles
  add column if not exists username text,
  add column if not exists age smallint,
  add column if not exists education_level text;

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles
  add constraint profiles_age_check check (age is null or age between 10 and 100);

alter table public.profiles drop constraint if exists profiles_education_check;
alter table public.profiles
  add constraint profiles_education_check check (
    education_level is null or education_level in ('ม.4', 'ม.5', 'ม.6', 'อื่นๆ')
  );

create unique index if not exists profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;
