import { createHash, randomUUID } from "node:crypto";
import { loadJson, saveJson } from "@/lib/persist";
import { SAMPLE_QUESTIONS } from "@/lib/questions";
import { tutorReply, type TutorAnswer } from "@/lib/tutor/reply";
import { bangkokMidnight } from "@/lib/study/today";

export type TutorMessage = {
  id: string;
  role: "user" | "tutor";
  text: string;
  steps: string[];
  createdAt: string;
  calculated?: boolean;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: TutorMessage[];
};

type LegacyThread = { userId: string; messages: TutorMessage[] };
type CacheItem = { hash: string; answer: string; trace: unknown[] };
type UsageItem = {
  id: string;
  userId: string;
  requestId: string;
  status: string;
  model?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  httpStatus: number | null;
  createdAt: string;
};
type Db = { conversations: Conversation[]; cache: CacheItem[]; usage: UsageItem[] };

let chain: Promise<unknown> = Promise.resolve();

function fromLegacy(raw: unknown): Conversation[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { threads?: unknown }).threads)) return [];
  return ((raw as { threads: LegacyThread[] }).threads).filter((item) => item && typeof item.userId === "string").map((item) => {
    const messages = Array.isArray(item.messages) ? item.messages : [];
    const first = messages.find((message) => message.role === "user");
    const createdAt = messages[0]?.createdAt ?? new Date().toISOString();
    return {
      id: randomUUID(),
      userId: item.userId,
      title: (first?.text || "บทสนทนา").slice(0, 60),
      createdAt,
      updatedAt: messages.at(-1)?.createdAt ?? createdAt,
      messages,
    };
  });
}

async function readDb(): Promise<Db> {
  const raw = await loadJson("tutor.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  const conversations = Array.isArray(parsed.conversations) ? parsed.conversations : fromLegacy(raw);
  return {
    conversations,
    cache: Array.isArray(parsed.cache) ? parsed.cache : [],
    usage: Array.isArray(parsed.usage) ? parsed.usage : [],
  };
}

function update<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const result = fn(db);
    await saveJson("tutor.json", db);
    return result;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}

function owned(db: Db, userId: string, id: string): Conversation | undefined {
  return db.conversations.find((item) => item.id === id && item.userId === userId);
}

function pushPair(conversation: Conversation, userText: string, tutorText: string, steps: string[], calculated: boolean): TutorMessage {
  const now = new Date().toISOString();
  conversation.messages.push({ id: randomUUID(), role: "user", text: userText.slice(0, 2000), steps: [], createdAt: now });
  const reply: TutorMessage = { id: randomUUID(), role: "tutor", text: tutorText, steps, createdAt: now, calculated };
  conversation.messages.push(reply);
  conversation.messages = conversation.messages.slice(-80);
  conversation.updatedAt = now;
  if (conversation.title === "บทสนทนาใหม่" && userText) conversation.title = userText.slice(0, 60);
  return reply;
}

function openConversation(db: Db, userId: string, conversationId?: string, title = "บทสนทนาใหม่"): Conversation | null {
  if (conversationId) return owned(db, userId, conversationId) ?? null;
  const created: Conversation = { id: randomUUID(), userId, title: title.slice(0, 60) || "บทสนทนาใหม่", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
  db.conversations.push(created);
  db.conversations = db.conversations.slice(-100);
  return created;
}

export function questionHash(subject: string, message: string): string {
  return createHash("sha256").update(`${subject}|${message.toLowerCase().replace(/\s+/g, " ")}`).digest("hex");
}

export function listConversations(userId: string): Promise<{ id: string; title: string; createdAt: string }[]> {
  return update((db) => db.conversations
    .filter((item) => item.userId === userId && item.messages.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20)
    .map(({ id, title, createdAt }) => ({ id, title, createdAt })));
}

export function readConversation(userId: string, id: string): Promise<TutorMessage[] | null> {
  return update((db) => owned(db, userId, id)?.messages ?? null);
}

export function deleteConversation(userId: string, id: string): Promise<boolean> {
  return update((db) => {
    const before = db.conversations.length;
    db.conversations = db.conversations.filter((item) => !(item.id === id && item.userId === userId));
    return db.conversations.length < before;
  });
}

export function latestTutorThread(userId: string): Promise<{ threadId: string | null; messages: TutorMessage[] }> {
  return update((db) => {
    const latest = db.conversations.filter((item) => item.userId === userId && item.messages.length > 0).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? { threadId: latest.id, messages: latest.messages.slice(-40) } : { threadId: null, messages: [] };
  });
}

function userMessagesSince(db: Db, start: number, userId?: string): number {
  return db.conversations.reduce((sum, conversation) => {
    if (userId && conversation.userId !== userId) return sum;
    return sum + conversation.messages.filter((item) => item.role === "user" && Date.parse(item.createdAt) >= start).length;
  }, 0);
}

export function questionsToday(userId: string, now = new Date()): Promise<number> {
  const start = bangkokMidnight(now);
  return update((db) => userMessagesSince(db, start, userId));
}

export function questionsTodayAll(now = new Date()): Promise<number> {
  const start = bangkokMidnight(now);
  return update((db) => userMessagesSince(db, start));
}

export function askBank(userId: string, text: string, questionId: string, conversationId?: string): Promise<{ message: TutorMessage; conversationId: string } | null> {
  const found = SAMPLE_QUESTIONS.find((item) => item.id === questionId);
  const answer: TutorAnswer = tutorReply(found);
  return update((db) => {
    const conversation = openConversation(db, userId, conversationId, text);
    if (!conversation) return null;
    return { message: pushPair(conversation, text, answer.text, answer.steps, false), conversationId: conversation.id };
  });
}

export function cachedTutorAnswer(hash: string): Promise<{ answer: string; trace: unknown[] } | null> {
  return update((db) => {
    const found = db.cache.find((item) => item.hash === hash);
    return found ? { answer: found.answer, trace: found.trace } : null;
  });
}

export function rememberTutorAnswer(hash: string, answer: string, trace: unknown[]): Promise<void> {
  return update((db) => {
    if (db.cache.some((item) => item.hash === hash)) return;
    db.cache.push({ hash, answer, trace });
    db.cache = db.cache.slice(-200);
  });
}

export function saveTutorExchange(
  userId: string,
  userText: string,
  tutorText: string,
  calculated: boolean,
  conversationId?: string,
): Promise<{ message: TutorMessage; conversationId: string } | null> {
  return update((db) => {
    const conversation = openConversation(db, userId, conversationId, userText);
    if (!conversation) return null;
    return { message: pushPair(conversation, userText, tutorText, [], calculated), conversationId: conversation.id };
  });
}

export function recentTurns(userId: string, conversationId?: string): Promise<{ role: "user" | "assistant"; content: string }[]> {
  return update((db) => {
    const conversation = conversationId
      ? owned(db, userId, conversationId)
      : db.conversations.filter((item) => item.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return (conversation?.messages ?? []).slice(-10).map((item) => ({
      role: item.role === "user" ? "user" as const : "assistant" as const,
      content: item.text,
    }));
  });
}

export function logTutorUsage(entry: Omit<UsageItem, "id" | "createdAt">): Promise<void> {
  return update((db) => {
    db.usage.push({ ...entry, id: randomUUID(), createdAt: new Date().toISOString() });
    db.usage = db.usage.slice(-400);
  });
}
