# Aandii (อ่านดิ)

แอปผู้ช่วยอ่านหนังสือสำหรับนักเรียนไทย — Next.js (App Router) + TypeScript + Tailwind v3 + Supabase

## วิธีรัน
1. ติดตั้ง Node.js 20 ขึ้นไป
2. `npm install`
3. คัดลอก `.env.example` เป็น `.env.local` (ใส่ค่า Supabase ภายหลังได้ หน้าข้อมูลสาธิตรันได้ก่อน)
4. `npm run dev` แล้วเปิด h[ttp://localhost:3000](https://aandii.vercel.app/buddy)
5. ตรวจโค้ด: `npm run typecheck` และ `npm run lint`

## ฐานข้อมูล
รันไฟล์ `supabase/migrations/0001_core.sql` ใน Supabase SQL Editor (ลองใน dev ก่อน)

## สถานะ
- มีแล้ว: Home, Planner, Focus, Progress, Buddy, Learn, Readiness, Flashcards, Settings (ข้อมูลสาธิตมีป้ายกำกับ)
- ยังไม่มี: Auth, ปฏิทิน, แบบทดสอบ/ผลคะแนน, โน้ต, กลุ่มอ่านหนังสือ, AI Planner/Tutor
