import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="grid gap-5">
      <PageHeader title="ตั้งค่า" subtitle="บัญชีและความเป็นส่วนตัว" />
      <Card>
        <p className="text-ink-soft">รหัสผ่านถูกเข้ารหัสก่อนเก็บ คุกกี้เซสชันอ่านจากสคริปต์ในหน้าเว็บไม่ได้</p>
        <p className="mt-3 text-ink-soft">ข้อความที่ถามติวเตอร์ถูกส่งไปยังผู้ให้บริการ AI เพื่อสร้างคำตอบ และเก็บบทสนทนาไว้ในบัญชีนี้ รูปโจทย์ถูกย่อในเครื่องก่อนส่ง ไม่เก็บตัวรูปลงฐานข้อมูล อย่าถ่ายติดใบหน้าหรือข้อมูลส่วนตัว</p>
        <p className="mt-3 text-ink-soft">ถ้าใช้ชั้นฟรีของผู้ให้บริการ ข้อความและรูปที่ส่งไปอาจถูกนำไปปรับปรุงผลิตภัณฑ์ของเจ้าของบริการ ก่อนเปิดให้นักเรียนทั่วไปใช้ ควรย้ายไปชั้นที่ระบุว่าไม่นำข้อมูลไปฝึกโมเดล</p>
        <Link href="/account" className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-brand-600 px-5 font-semibold text-white">แก้ไขบัญชี</Link>
      </Card>
    </div>
  );
}
