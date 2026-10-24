# คำสั่งสำหรับ Cursor: ห้องอ่านแข่งกัน + ปรับโครงฐานข้อมูลให้เข้ากับ Aandii

คุณคือ Senior Full-stack Engineer ของ Aandii (Next.js App Router, TypeScript, Tailwind v3, Supabase)
ทำทีละขั้น ห้ามสร้างทุกอย่างพร้อมกัน ก่อนแก้ไฟล์ให้ตรวจโปรเจกต์จริง สรุปแผนและไฟล์ที่จะเปลี่ยน แล้วรอผลตรวจแต่ละขั้น

## ขั้น A: ห้องอ่านหนังสือ (ทำก่อน)
ต้นแบบหน้าตา/พฤติกรรมอยู่ที่ `aandii-rooms.html` (แปลงเป็น React ตามโครงเดิม ใช้ UI kit ใน `src/components/ui`)
1. รัน `supabase/migrations/0002_rooms.sql` ใน dev แล้วเขียนเทสต์ SQL: ผู้ใช้ B อ่านห้องที่ไม่ได้เป็นสมาชิกไม่ได้, `list_rooms()` ไม่คืน password_hash, ใส่รหัสผิด 5 ครั้งแล้ว join ไม่ได้ 10 นาที, `room_leaderboard` ใช้ได้เฉพาะสมาชิก
2. API (server เท่านั้น): `POST /api/rooms` (create_room), `GET /api/rooms` (list_rooms), `POST /api/rooms/[id]/join`, `GET /api/rooms/[id]/leaderboard` ตรวจ input ด้วย zod
3. หน้า: `(app)/rooms/page.tsx` (รายการ มีไอคอนแม่กุญแจ 🔒 / สาธารณะ), `(app)/rooms/[id]/page.tsx` (ห้อง: เลือกวิชา, ตัวจับเวลา, อันดับวันนี้)
4. ต่อ `features/focus` ให้ส่ง `roomId` และวิชาไป `focus_start`; ชั่วโมงรีเซ็ตทุกวันตามเวลาไทย (คำนวณฝั่งฐานข้อมูล)
5. แอนิเมชันภาพเทา→มีแสง: ใช้ `Mascot` (`reading` ตอนอ่าน, `sleepy` ตอนพัก) + CSS grayscale transition + glow (เคารพ prefers-reduced-motion)
6. อันดับเรียลไทม์: ใช้ `useRoomPresence` (เฉพาะสถานะ กำลังอ่าน/พัก) ส่วนเวลาอ่านดึงจาก `room_leaderboard` ทุก 15–30 วินาที
7. อย่าอ้างว่า "ล็อกแอปอื่น" ได้บนเว็บ เว็บทำได้แค่เต็มจอ + ตรวจจับ `visibilitychange` แล้วพักเวลา การล็อกแอปจริงต้องเป็นแอปมือถือ (Android screen pinning / iOS Guided Access หรือ Screen Time API ผ่านแอป native) ใส่ไว้ใน ROADMAP เป็นงานแยก
8. ห้ามแข่งแค่จำนวนชั่วโมง: ใส่ตัวเลือกเปิด/ปิดอันดับของห้อง และข้อความพักต้องไม่ทำให้รู้สึกผิด

## ขั้น B: ปรับแผนฐานข้อมูลที่ ChatGPT ร่างมาให้เข้ากับของเดิม
อย่าสร้างตารางซ้ำ ใช้ตารางด้านล่างเป็นข้อตัดสินใจ:

| ตารางในแผนใหม่ | ของเดิมในโปรเจกต์ | ให้ทำ |
|---|---|---|
| profiles, user_preferences | `profiles` มีแล้ว | เพิ่ม `user_preferences` อย่างเดียว |
| user_roles, student_profiles, parent_student_links | ไม่มี | เพิ่ม; ห้าม policy ให้ผู้ใช้แก้ role ตัวเอง; ผู้ปกครองเห็นข้อมูลเมื่อ status = active เท่านั้น |
| subjects (ส่วนกลาง) | `subjects` เดิมเป็นของผู้ใช้ (มี user_id) | เปลี่ยนชื่อเดิมเป็น `user_subjects` สร้าง `subjects` ส่วนกลางตามแผน แล้ว migrate `study_sessions.subject_id`, `tasks`, `exams` ให้อ้างอิงอย่างปลอดภัย (ทำใน migration แยก ไม่ลบข้อมูล) |
| study_sessions | มีแล้ว (จับเวลาฝั่ง server + room_id) | ใช้ต่อ ห้ามสร้างซ้ำ |
| xp_ledger, missions, achievements, rewards | `reward_ledger` (ดาว) | เก็บ `reward_ledger` เป็นดาว/เหรียญ และเพิ่ม `xp_ledger` แยก ไม่รวมกัน |
| mascots, user_mascots | ไม่มี | เพิ่ม; `default_asset_path` ชี้ `/mascot/*.jpg` |
| courses, modules, lessons, enrollments, lesson_progress | ไม่มี | เลื่อนไปหลัง MVP (Phase 3) |
| questions, question_versions, choices, sources, source_links | `lib/questions.ts` (ตัวอย่าง) | เพิ่มตามแผน แต่ย้าย `answer_key`/`grading_config` ไปตาราง `question_answer_keys` ที่ไม่ให้สิทธิ์ SELECT แก่ client |
| exams, exam_*, attempts, attempt_answers | ไม่มี | เพิ่ม; ตรวจคะแนนด้วย RPC ฝั่ง server เท่านั้น |
| plans, subscriptions, payments, webhooks | ไม่มี | เลื่อนไปท้ายสุด (แอปยังไม่คิดเงิน) |
| notifications, bookmarks, feedback_reports, audit_logs | ไม่มี | เพิ่ม `feedback_reports`, `audit_logs` ก่อน |

กติกา: ตั้งชื่อไฟล์ migration ต่อจากเลขเดิม (`0003_...`), ทุกตารางเปิด RLS พร้อม grants, ห้ามใส่ service role key ใน client, เขียนเทสต์ RLS (anon/student/parent/teacher/editor/admin) และเทสต์ธุรกรรมสำคัญก่อนอ้างว่าพร้อมใช้งานจริง รายงานสิ่งที่ผ่านและไม่ผ่านทุกขั้น
