"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalculatorIcon, CameraIcon, HistoryIcon, ImageIcon, TrashIcon } from "@/components/icons";
import { Mascot } from "@/components/mascot/Mascot";

type Card = { id: string; subject: string; topic: string; prompt: string; review: "pending" | "verified" };
type Message = { id: string; role: "user" | "tutor"; text: string; steps: string[]; calculated?: boolean; imgs?: string[] };
type Thread = { id: string; title: string; createdAt: string };

const MAX_IMAGES = 3;
const inputClass = "min-h-12 flex-1 rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";
const tool = "inline-flex min-h-12 items-center gap-3 rounded-2xl bg-white pl-2 pr-4 font-semibold text-brand-700 ring-1 ring-brand-100";
const disc = "grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700";

async function toJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("canvas");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function TutorChat({ cards, signedIn }: { cards: Card[]; signedIn: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!signedIn) return;
    void fetch("/api/tutor", { cache: "no-store" }).then((res) => res.json()).then((data: { messages?: Message[]; threadId?: string | null }) => {
      setMessages(data.messages ?? []);
      setThreadId(data.threadId ?? null);
    }).catch(() => setError("เปิดประวัติคำถามไม่ได้"));
  }, [signedIn]);

  async function addFiles(files: FileList | null) {
    if (!files?.length || !signedIn) return;
    setError("");
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES) {
        setError(`แนบได้ไม่เกิน ${MAX_IMAGES} รูป`);
        break;
      }
      if (!file.type.startsWith("image/") || file.size > 20_000_000) {
        setError("ไฟล์ต้องเป็นรูปภาพ ขนาดไม่เกิน 20MB");
        continue;
      }
      try {
        next.push(await toJpeg(file));
      } catch {
        setError("เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่หรือเลือกไฟล์ JPG/PNG");
      }
    }
    setImages(next);
  }

  const send = async (event: FormEvent | null, questionId: string | null, prompt: string, sentImages: string[] = []) => {
    event?.preventDefault();
    if (!signedIn || sending) return;
    if (!questionId && !prompt.trim() && sentImages.length === 0) return;
    setError("");
    setSending(true);
    const localImages = sentImages;
    setText("");
    setImages([]);
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: prompt, questionId, images: questionId ? [] : localImages, threadId }),
    });
    const data = await res.json() as { error?: string; requestId?: string; message?: Message; threadId?: string };
    setSending(false);
    if (!res.ok || !data.message) {
      setError(`${data.error ?? "ส่งคำถามไม่ได้"}${data.requestId ? ` (รหัสอ้างอิง ${data.requestId})` : ""}`);
      if (!questionId) {
        setText(prompt);
        setImages(localImages);
      }
      return;
    }
    if (data.threadId) setThreadId(data.threadId);
    const userText = prompt.trim() || "ช่วยดูโจทย์ในรูปให้หน่อย";
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: "user", text: userText, steps: [], imgs: localImages },
      data.message as Message,
    ]);
  };

  async function toggleHistory() {
    const open = !showHistory;
    setShowHistory(open);
    if (!open || !signedIn) return;
    try {
      const data = await (await fetch("/api/tutor/threads", { cache: "no-store" })).json() as { threads?: Thread[]; error?: string };
      setThreads(data.threads ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("โหลดประวัติไม่สำเร็จ");
    }
  }

  async function openThread(id: string) {
    try {
      const res = await fetch(`/api/tutor/threads/${id}`, { cache: "no-store" });
      const data = await res.json() as { messages?: Message[]; error?: string };
      if (!res.ok || !data.messages) {
        setError(data.error ?? "เปิดไม่ได้");
        return;
      }
      setMessages(data.messages);
      setThreadId(id);
      setShowHistory(false);
      setError("");
    } catch {
      setError("เปิดบทสนทนาไม่สำเร็จ");
    }
  }

  async function removeThread(id: string) {
    if (!window.confirm("ลบบทสนทนานี้ถาวร?")) return;
    const res = await fetch(`/api/tutor/threads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("ลบไม่สำเร็จ");
      return;
    }
    setThreads((current) => current.filter((item) => item.id !== id));
    if (id === threadId) {
      setMessages([]);
      setThreadId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <section className="grid items-center gap-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-brand-100 sm:grid-cols-[auto_1fr]">
        <Mascot state="idea" size={120} />
        <div>
          <h2 className="font-bold text-brand-700">ติวเตอร์ในแอป</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">แชตอิสระถามได้ทุกวิชา ข้อที่ยังรอคนตรวจ กดแล้วให้น้องไข่ช่วยคิดได้ แต่ยังไม่ใช่เฉลยที่คนตรวจแล้ว</p>
        </div>
      </section>
      {!signedIn && <p className="text-sm text-ink-soft">เข้าสู่ระบบก่อนคุยกับติวเตอร์ <Link href="/login" className="font-semibold text-brand-700">เข้าสู่ระบบ</Link></p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void toggleHistory()} aria-expanded={showHistory} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink ring-1 ring-brand-100" disabled={!signedIn}><HistoryIcon width={20} height={20} />ประวัติ</button>
        <button type="button" className="min-h-11 rounded-2xl bg-white px-4 text-sm font-semibold text-ink ring-1 ring-brand-100" disabled={!signedIn} onClick={() => { setMessages([]); setThreadId(null); setError(""); setShowHistory(false); }}>แชตใหม่</button>
      </div>
      {showHistory && (
        <ul className="grid gap-1 rounded-3xl bg-white p-2 ring-1 ring-brand-100">
          {threads.length === 0 && <li className="p-3 text-sm text-ink-soft">ยังไม่มีประวัติ</li>}
          {threads.map((thread) => (
            <li key={thread.id} className="flex items-center gap-1">
              <button type="button" onClick={() => void openThread(thread.id)} className="min-h-11 flex-1 truncate rounded-2xl px-3 text-left hover:bg-brand-50">{thread.title || "บทสนทนา"}</button>
              <button type="button" onClick={() => void removeThread(thread.id)} aria-label={`ลบ ${thread.title || "บทสนทนา"}`} className="grid h-11 w-11 place-items-center rounded-2xl text-red-700 hover:bg-red-50"><TrashIcon width={20} height={20} /></button>
            </li>
          ))}
        </ul>
      )}
      <ul className="grid gap-2">
        {cards.map((card) => (
          <li key={card.id}>
            <button type="button" disabled={!signedIn} className="w-full rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-brand-100 disabled:opacity-60" onClick={() => void send(null, card.id, card.prompt)}>
              <span className="text-xs font-semibold text-brand-700">{card.subject} · {card.topic} · {card.review === "verified" ? "ตรวจแล้ว" : "รอตรวจ"}</span>
              <span className="mt-1 block font-semibold">{card.prompt}</span>
            </button>
          </li>
        ))}
      </ul>
      <ol className="grid gap-3" aria-live="polite">
        {messages.map((message) => (
          <li key={message.id} className={message.role === "user" ? "ml-8 grid gap-2" : "mr-8 flex items-end gap-2"}>
            {message.role === "user" ? (
              <>
                {message.imgs && message.imgs.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {message.imgs.map((src, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src.slice(0, 32) + index} src={src} alt={`รูปโจทย์ ${index + 1}`} className="h-24 rounded-2xl object-cover ring-1 ring-brand-100" />
                    ))}
                  </div>
                )}
                <p className="rounded-3xl bg-brand-600 px-4 py-3 text-white">{message.text}</p>
              </>
            ) : (
              <>
                <Mascot state="reading" size={44} bob={false} />
                <div className="rounded-3xl bg-white px-4 py-3 text-ink ring-1 ring-brand-100">
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.calculated && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs text-mint-700"><CalculatorIcon width={16} height={16} />คำนวณด้วยเครื่องคิดเลขหลังบ้าน</p>}
                  {message.steps.length > 0 && (
                    <ol className="mt-3 grid gap-2">
                      {message.steps.map((step, index) => <li key={step} className="rounded-2xl bg-sun-100 px-3 py-2 text-sm text-ink">{index + 1}. {step}</li>)}
                    </ol>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
        {sending && <li className="flex items-center gap-2 text-sm text-ink-soft"><Mascot state="curious" size={44} bob={false} />น้องไข่กำลังคิด…</li>}
      </ol>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {images.length > 0 && (
        <div className="grid gap-2 rounded-3xl bg-mint-100 p-3" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-mint-700"><Mascot state="idea" size={36} bob={false} />✓ รูปมาแล้ว {images.length} รูป น้องไข่พร้อมดูโจทย์</p>
          <div className="flex flex-wrap gap-2">
            {images.map((src, index) => (
              <div key={src.slice(0, 48) + index} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`รูปที่แนบ ${index + 1}`} className="h-20 w-20 rounded-2xl object-cover ring-1 ring-brand-100" />
                <button type="button" onClick={() => setImages((current) => current.filter((_, item) => item !== index))} aria-label={`เอารูปที่ ${index + 1} ออก`} className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-red-700 shadow-soft ring-1 ring-red-200">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <form className="flex gap-2" onSubmit={(event) => void send(event, null, text, images)}>
        <input className={inputClass} value={text} onChange={(event) => setText(event.target.value)} placeholder="ถามได้ทุกวิชา เช่น หาอนุพันธ์ของ x^3*sin(x)" disabled={!signedIn || sending} maxLength={2000} aria-label="พิมพ์คำถาม" />
        <button type="submit" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-4 font-semibold text-ink disabled:opacity-60" disabled={!signedIn || sending || (text.trim().length === 0 && images.length === 0)}>ส่ง</button>
      </form>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tool} disabled={!signedIn || sending} onClick={() => camera.current?.click()}><span className={disc}><CameraIcon /></span>ถ่ายรูป</button>
        <button type="button" className={tool} disabled={!signedIn || sending} onClick={() => picker.current?.click()}><span className={disc}><ImageIcon /></span>แนบรูป</button>
        <input ref={camera} className="sr-only" type="file" accept="image/*" capture="environment" disabled={!signedIn} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
        <input ref={picker} className="sr-only" type="file" accept="image/*" multiple disabled={!signedIn} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
      </div>
      <p className="text-xs leading-5 text-ink-soft">AI อาจพลาดได้ เช็กกับครูหรือเฉลยก่อนใช้ในข้อสอบจริง ข้อความและรูปจะถูกส่งไปยังผู้ให้บริการ AI ภายนอกเพื่อตอบคำถาม อย่าถ่ายติดใบหน้าหรือข้อมูลส่วนตัว ถ้าติดปัญหา แจ้งรหัสอ้างอิงที่ขึ้นในข้อความสีแดงได้</p>
    </div>
  );
}
