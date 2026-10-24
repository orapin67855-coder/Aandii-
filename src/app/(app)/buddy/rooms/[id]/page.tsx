import { StudyRoom } from "@/features/rooms/StudyRoom";

export default async function RoomPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  return <StudyRoom roomId={id} invite={query.invite ?? null} />;
}
