"use client";
import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import type { Question } from "@/lib/questions";

export function QuestionCard({ q }: { q: Question }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [help, setHelp] = useState("");
  const [asking, setAsking] = useState(false);
  const done = picked !== null;
  const verified = q.review === "verified";

  async function ask() {
    setAsking(true);
    setHelp("");
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: q.prompt, questionId: q.id }),
      });
      const data = await res.json() as { error?: string; requestId?: string; message?: { text?: string } };
      if (!res.ok) setHelp(`${data.error ?? "ถามไม่ได้"}${data.requestId ? ` (รหัสอ้างอิง ${data.requestId})` : ""}`);
      else setHelp(data.message?.text ?? "ยังไม่มีคำอธิบาย");
    } catch {
      setHelp("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setAsking(false);
    }
  }
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">{q.subject} · {q.topic}</span>
        <span className="rounded-full bg-sun-100 px-3 py-1 text-sun-600">{q.difficulty}</span>
        <span className="rounded-full bg-mint-100 px-3 py-1 text-mint-700">{verified ? "ตรวจแล้ว" : "รอผู้ตรวจทาน"}</span>
      </div>
      <p className="font-semibold">{q.prompt}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <button key={i} type="button" disabled={done} onClick={() => setPicked(i)}
            className={clsx("min-h-[48px] rounded-2xl px-4 text-left ring-1 transition",
              !done && "bg-white ring-brand-100 hover:bg-brand-50",
              done && verified && i === q.answer && "bg-mint-100 ring-mint-400",
              done && verified && i === picked && i !== q.answer && "bg-red-50 ring-red-200",
              done && !verified && i === picked && "bg-brand-50 ring-brand-300",
              done && verified && i !== q.answer && i !== picked && "opacity-60 ring-brand-100")}>
            {String.fromCharCode(65 + i)}. {o}
          </button>
        ))}
      </div>
      {done && verified && (
        <p role="status" className="rounded-2xl bg-brand-50 p-3 text-sm">
          {picked === q.answer ? "ถูกต้อง! " : "ยังไม่ใช่ ไม่เป็นไรนะ "}{q.explanation}
        </p>
      )}
      {done && !verified && (
        <div className="grid gap-2">
          <p role="status" className="rounded-2xl bg-brand-50 p-3 text-sm">ข้อนี้ยังไม่มีเฉลยที่คนตรวจ ให้น้องไข่ช่วยคิดทีละขั้นได้ แต่ยังไม่ใช่เฉลยทางการ</p>
          <button type="button" className="min-h-11 rounded-2xl bg-sun-400 px-4 text-sm font-semibold text-ink disabled:opacity-60" disabled={asking} onClick={() => void ask()}>{asking ? "น้องไข่กำลังคิด…" : "ให้น้องไข่ช่วยอธิบาย"}</button>
          {help && <p className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm ring-1 ring-brand-100">{help}</p>}
        </div>
      )}
    </Card>
  );
}
