"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [help, setHelp] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) {
      setHelp("บนคอมพิวเตอร์เปิดด้วย Chrome แล้วเลือกติดตั้ง Aandii จากเมนูเบราว์เซอร์ บน Android เปิดด้วย Chrome แล้วเลือกติดตั้งแอป ปุ่มนี้ยังไม่ใช่ร้านแอป");
      return;
    }
    await prompt.prompt();
    setPrompt(null);
  };

  return (
    <div className="grid gap-2">
      <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-600 px-5 font-semibold text-white" onClick={() => void install()}>
        ดาวน์โหลดแอปบนเครื่องนี้
      </button>
      {help && <p role="status" className="text-sm leading-6 text-ink-soft">{help}</p>}
    </div>
  );
}
