import Image from "next/image";
import clsx from "clsx";
import type { MascotMood } from "@/lib/mascot-messages";

/** สถานะเดิมของระบบ (ready/focused/celebrating/resting) ยังใช้ได้ และเพิ่มอารมณ์ใหม่ทั้งหมดได้ตรงๆ */
export type MascotState = "ready" | "focused" | "celebrating" | "resting" | MascotMood;
const LEGACY: Record<string, MascotMood> = { ready: "cheer", focused: "reading", celebrating: "yay", resting: "sleepy" };

export function Mascot({ state = "ready", size = 140, className, bob = true }: { state?: MascotState; size?: number; className?: string; bob?: boolean }) {
  const mood = (LEGACY[state] ?? state) as MascotMood;
  return (
    <Image
      src={`/mascot/${mood}.png`} alt="น้องไข่" width={size} height={size}
      style={{ width: size, height: "auto" }}
      className={clsx("select-none object-contain", bob && mood !== "sleepy" && mood !== "rest" && "animate-bob", className)}
    />
  );
}
