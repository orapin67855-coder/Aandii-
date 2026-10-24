import { PageHeader } from "@/components/ui/PageHeader";
import { TutorChat } from "@/features/tutor/TutorChat";
import { currentUser } from "@/lib/auth/http";
import { SAMPLE_QUESTIONS } from "@/lib/questions";

export default async function TutorPage() {
  const user = await currentUser();
  const cards = SAMPLE_QUESTIONS.map(({ id, subject, topic, prompt, review }) => ({ id, subject, topic, prompt, review }));
  return (
    <div className="grid gap-5">
      <PageHeader title="ติวเตอร์" subtitle="แชตอิสระถามได้ทุกวิชา ส่วนเฉลยในคลังเปิดเมื่อข้อนั้นตรวจแล้ว" />
      <TutorChat cards={cards} signedIn={Boolean(user)} />
    </div>
  );
}
