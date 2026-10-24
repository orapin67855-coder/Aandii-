import { PageHeader } from "@/components/ui/PageHeader";
import { FocusTracker } from "@/features/focus/FocusTracker";

export default function FocusPage() {
  return (
    <>
      <PageHeader title="Focus" subtitle="กดเริ่มแล้วนับเวลาไปเรื่อยๆ เลือกวิชาได้ พักได้เสมอ" />
      <FocusTracker />
    </>
  );
}
