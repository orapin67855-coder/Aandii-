import { PageHeader } from "@/components/ui/PageHeader";
import { RoomLobby } from "@/features/rooms/RoomLobby";

export default function BuddyPage() {
  return (
    <div className="grid gap-5">
      <PageHeader title="ห้อง" subtitle="ห้องที่สร้างจะขึ้นให้ทุกบัญชีเห็น ห้องล็อกต้องใช้รหัส เว้นแต่เข้าจากลิงก์เชิญ" />
      <RoomLobby />
    </div>
  );
}
