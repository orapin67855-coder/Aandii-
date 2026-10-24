"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import type { PublicQuestion } from "@/lib/placement/bank";
import type { SavedPlacement } from "@/lib/placement/store";

type ItemResult = { id: string; correct: boolean };

export function PlacementTest({ questions }: { questions: PublicQuestion[] }) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SavedPlacement | null>(null);
  const [items, setItems] = useState<ItemResult[]>([]);
  const [help, setHelp] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState("");

  const current = questions[index];
  const answered = Object.keys(picks).length;
  const done = result !== null;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/placement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: questions.map((question) => ({ id: question.id, choice: picks[question.id] })) }),
      });
      const data = await res.json() as { error?: string; result?: SavedPlacement; items?: ItemResult[] };
      if (!res.ok || !data.result || !data.items) {
        setError(data.error ?? "ส่งคำตอบไม่ได้");
        return;
      }
      setResult(data.result);
      setItems(data.items);
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function ask(question: PublicQuestion) {
    setAsking(question.id);
    try {
      const text = `ช่วยอธิบายโจทย์นี้ทีละขั้น โดยยังไม่มีเฉลยที่คนตรวจแล้ว\n${question.prompt}\n${question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")}`;
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json() as { error?: string; requestId?: string; message?: { text?: string } };
      const line = res.ok ? (data.message?.text ?? "ยังไม่มีคำอธิบาย") : `${data.error ?? "ถามไม่ได้"}${data.requestId ? ` (รหัสอ้างอิง ${data.requestId})` : ""}`;
      setHelp((prev) => ({ ...prev, [question.id]: line }));
    } catch {
      setHelp((prev) => ({ ...prev, [question.id]: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" }));
    } finally {
      setAsking("");
    }
  }

  if (done && result) {
    return (
      <div className="grid gap-4">
        <Card className="grid gap-2">
          <p className="text-sm text-ink-soft">ผลของชุดนี้</p>
          <p className="text-2xl font-bold text-brand-700">{result.level}</p>
          <p className="text-sm">ถูก {result.correct} จาก {result.total} ข้อ · {result.note}</p>
          <p className="text-xs text-ink-soft">บอกแค่ว่าข้อที่เลือกถูกหรือยังไม่ถูก ไม่เปิดเฉลย และยังไม่ใช่เกณฑ์ของโรงเรียนหรือกระทรวง</p>
        </Card>
        {questions.map((question) => {
          const mark = items.find((item) => item.id === question.id);
          const picked = picks[question.id];
          return (
            <Card key={question.id} className="grid gap-2">
              <p className="text-xs font-semibold text-brand-700">{question.subject} · {question.topic}</p>
              <p className="font-semibold">{question.prompt}</p>
              <p className="text-sm">เลือก {picked === undefined ? "—" : `${String.fromCharCode(65 + picked)}. ${question.options[picked]}`}</p>
              <p className={clsx("rounded-2xl p-3 text-sm", mark?.correct ? "bg-mint-100 text-mint-700" : "bg-sun-100 text-ink")}>
                {mark?.correct ? "ข้อนี้ถูก" : "ข้อนี้ยังไม่ถูก"}
              </p>
              {!mark?.correct && (
                <button type="button" className="min-h-11 w-fit rounded-2xl bg-sun-400 px-4 text-sm font-semibold text-ink disabled:opacity-60" disabled={asking === question.id} onClick={() => void ask(question)}>
                  {asking === question.id ? "น้องไข่กำลังคิด…" : "ให้น้องไข่ช่วยอธิบาย"}
                </button>
              )}
              {help[question.id] && <p className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm ring-1 ring-brand-100">{help[question.id]}</p>}
            </Card>
          );
        })}
      </div>
    );
  }

  if (!current) return null;
  const picked = picks[current.id];
  const last = index === questions.length - 1;
  return (
    <Card className="grid gap-4">
      <p className="text-sm text-ink-soft">ข้อ {index + 1} จาก {questions.length} · ตอบแล้ว {answered} ข้อ</p>
      <p className="text-xs font-semibold text-brand-700">{current.subject} · {current.topic}</p>
      <p className="text-lg font-bold">{current.prompt}</p>
      <div className="grid gap-2">
        {current.options.map((option, optionIndex) => (
          <button
            key={option}
            type="button"
            onClick={() => setPicks((prev) => ({ ...prev, [current.id]: optionIndex }))}
            className={clsx(
              "min-h-12 rounded-2xl px-4 text-left ring-1",
              picked === optionIndex ? "bg-brand-50 ring-brand-300 font-semibold" : "bg-white ring-brand-100",
            )}
          >
            {String.fromCharCode(65 + optionIndex)}. {option}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-12 rounded-2xl bg-white px-5 font-semibold text-brand-700 ring-1 ring-brand-100 disabled:opacity-50" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>ข้อก่อนหน้า</button>
        {last ? (
          <button type="button" className="min-h-12 rounded-2xl bg-sun-400 px-5 font-semibold text-ink disabled:opacity-60" disabled={busy || answered < questions.length} onClick={() => void submit()}>
            {busy ? "กำลังคิดคะแนน…" : "ส่งแบบวัด"}
          </button>
        ) : (
          <button type="button" className="min-h-12 rounded-2xl bg-sun-400 px-5 font-semibold text-ink disabled:opacity-60" disabled={picked === undefined} onClick={() => setIndex((value) => value + 1)}>ข้อถัดไป</button>
        )}
      </div>
    </Card>
  );
}
