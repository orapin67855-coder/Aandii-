import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { loadJson, saveJson } from "@/lib/persist";
import {
  ageError,
  educationError,
  codeError,
  confirmPasswordError,
  emailError,
  normalizeEmail,
  normalizeUsername,
  passwordError,
  usernameError,
  type EducationLevel,
  type PublicUser,
} from "@/lib/auth/rules";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 14;
const LOCK_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

export type { PublicUser };

type UserRecord = PublicUser & {
  passwordSalt: string | null;
  passwordHash: string | null;
  provider: "password" | "google" | "apple";
  providerSubject: string | null;
  createdAt: string;
  updatedAt: string;
};

type SessionRecord = { id: string; userId: string; tokenHash: string; expiresAt: string };
type Attempt = { email: string; fails: number; lockedUntil: string | null };
type PendingOAuth = { id: string; provider: "google" | "apple"; subject: string; email: string; expiresAt: string };
type ResetCode = { email: string; salt: string; codeHash: string; expiresAt: string; tries: number };

type Db = { users: UserRecord[]; sessions: SessionRecord[]; attempts: Attempt[]; pending: PendingOAuth[]; resets: ResetCode[] };

let chain: Promise<unknown> = Promise.resolve();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function same(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const buf = (await scryptAsync(password, salt, 32)) as Buffer;
  return buf.toString("hex");
}

function publish(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    educationLevel: user.educationLevel,
    age: user.age,
  };
}

async function readDb(): Promise<Db> {
  const raw = await loadJson("accounts.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    pending: Array.isArray(parsed.pending) ? parsed.pending : [],
    resets: Array.isArray(parsed.resets) ? parsed.resets : [],
  };
}

async function writeDb(db: Db): Promise<void> {
  await saveJson("accounts.json", { ...db, users: db.users.map((user) => ({ ...user })) });
}

function update<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}

function issueSession(db: Db, userId: string): string {
  const token = randomBytes(32).toString("base64url");
  db.sessions.push({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
  });
  return token;
}

export function userFromToken(token: string | undefined): Promise<PublicUser | null> {
  if (!token) return Promise.resolve(null);
  return update((db) => {
    const now = Date.now();
    db.sessions = db.sessions.filter((session) => Date.parse(session.expiresAt) > now);
    const session = db.sessions.find((item) => same(item.tokenHash, hashToken(token)));
    const user = session ? db.users.find((item) => item.id === session.userId) : undefined;
    return user ? publish(user) : null;
  });
}

export async function signup(input: {
  email: string;
  password: string;
  username: string;
  educationLevel: string;
  age: number;
}): Promise<{ ok: true; token: string; user: PublicUser } | { ok: false; message: string }> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const message = emailError(email) || passwordError(input.password) || usernameError(username) || educationError(input.educationLevel) || ageError(input.age);
  if (message) return { ok: false, message };
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(input.password, salt);
  return update((db) => {
    if (db.users.some((user) => user.email === email)) return { ok: false as const, message: "อีเมลนี้มีบัญชีแล้ว" };
    if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { ok: false as const, message: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" };
    const user: UserRecord = {
      id: randomUUID(),
      email,
      username,
      educationLevel: input.educationLevel as EducationLevel,
      age: input.age,
      passwordSalt: salt,
      passwordHash,
      provider: "password",
      providerSubject: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    return { ok: true as const, token: issueSession(db, user.id), user: publish(user) };
  });
}

export async function login(emailInput: string, password: string): Promise<{ ok: true; token: string; user: PublicUser } | { ok: false; message: string; status: number }> {
  const email = normalizeEmail(emailInput);
  if (emailError(email) || !password) return { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", status: 401 };
  const salt = await update((db) => db.users.find((user) => user.email === email)?.passwordSalt ?? null);
  const passwordHash = salt ? await hashPassword(password, salt) : await hashPassword(password, "missing-user");
  return update((db) => {
    const attempt = db.attempts.find((item) => item.email === email) ?? { email, fails: 0, lockedUntil: null };
    if (!db.attempts.includes(attempt)) db.attempts.push(attempt);
    if (attempt.lockedUntil && Date.parse(attempt.lockedUntil) > Date.now()) {
      return { ok: false as const, message: "ลองหลายครั้งเกินไป รอ 10 นาทีแล้วค่อยเข้าใหม่", status: 429 };
    }
    const user = db.users.find((item) => item.email === email);
    const matches = Boolean(user?.passwordHash && user.passwordSalt && same(user.passwordHash, passwordHash));
    if (!user || !matches) {
      attempt.fails += 1;
      if (attempt.fails >= LOCK_FAILS) {
        attempt.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
        attempt.fails = 0;
      }
      return { ok: false as const, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", status: 401 };
    }
    attempt.fails = 0;
    attempt.lockedUntil = null;
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    return { ok: true as const, token: issueSession(db, user.id), user: publish(user) };
  });
}

export function logout(token: string | undefined): Promise<void> {
  if (!token) return Promise.resolve();
  const tokenHash = hashToken(token);
  return update((db) => {
    db.sessions = db.sessions.filter((session) => !same(session.tokenHash, tokenHash));
  });
}

export async function updateProfile(userId: string, input: { username: string; educationLevel: string; age: number }): Promise<{ ok: true; user: PublicUser } | { ok: false; message: string }> {
  const username = normalizeUsername(input.username);
  const message = usernameError(username) || educationError(input.educationLevel) || ageError(input.age);
  if (message) return { ok: false, message };
  return update((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user) return { ok: false as const, message: "ไม่พบบัญชี" };
    if (db.users.some((item) => item.id !== userId && item.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false as const, message: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" };
    }
    user.username = username;
    user.educationLevel = input.educationLevel as EducationLevel;
    user.age = input.age;
    user.updatedAt = new Date().toISOString();
    return { ok: true as const, user: publish(user) };
  });
}

export async function changePassword(userId: string, current: string, next: string): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const message = passwordError(next);
  if (message) return { ok: false, message };
  const salt = await update((db) => db.users.find((user) => user.id === userId)?.passwordSalt ?? null);
  const currentHash = salt ? await hashPassword(current, salt) : "";
  const nextSalt = randomBytes(16).toString("hex");
  const nextHash = await hashPassword(next, nextSalt);
  return update((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user?.passwordHash || !user.passwordSalt || !same(user.passwordHash, currentHash)) {
      return { ok: false as const, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
    }
    user.passwordSalt = nextSalt;
    user.passwordHash = nextHash;
    user.updatedAt = new Date().toISOString();
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
    return { ok: true as const, token: issueSession(db, user.id) };
  });
}

export function savePendingOAuth(provider: "google" | "apple", subject: string, email: string): Promise<string> {
  return update((db) => {
    const now = Date.now();
    db.pending = db.pending.filter((item) => Date.parse(item.expiresAt) > now);
    const id = randomUUID();
    db.pending.push({ id, provider, subject, email: normalizeEmail(email), expiresAt: new Date(now + 15 * 60 * 1000).toISOString() });
    return id;
  });
}

export async function completeOAuth(pendingId: string, input: { username: string; educationLevel: string; age: number }): Promise<{ ok: true; token: string; user: PublicUser } | { ok: false; message: string }> {
  const username = normalizeUsername(input.username);
  const message = usernameError(username) || educationError(input.educationLevel) || ageError(input.age);
  if (message) return { ok: false, message };
  return update((db) => {
    const pending = db.pending.find((item) => item.id === pendingId && Date.parse(item.expiresAt) > Date.now());
    if (!pending) return { ok: false as const, message: "คำขอยืนยันตัวตนหมดอายุแล้ว ลองเข้าด้วย Google หรือ Apple ใหม่" };
    const existing = db.users.find((user) => user.email === pending.email || (user.provider === pending.provider && user.providerSubject === pending.subject));
    if (existing) {
      db.pending = db.pending.filter((item) => item.id !== pendingId);
      return { ok: true as const, token: issueSession(db, existing.id), user: publish(existing) };
    }
    if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { ok: false as const, message: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" };
    const user: UserRecord = {
      id: randomUUID(),
      email: pending.email,
      username,
      educationLevel: input.educationLevel as EducationLevel,
      age: input.age,
      passwordSalt: null,
      passwordHash: null,
      provider: pending.provider,
      providerSubject: pending.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.pending = db.pending.filter((item) => item.id !== pendingId);
    return { ok: true as const, token: issueSession(db, user.id), user: publish(user) };
  });
}

export function pendingEmail(id: string): Promise<string | null> {
  return update((db) => {
    const pending = db.pending.find((item) => item.id === id && Date.parse(item.expiresAt) > Date.now());
    return pending?.email ?? null;
  });
}

export function requestReset(emailInput: string): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const email = normalizeEmail(emailInput);
  if (emailError(email)) return Promise.resolve({ ok: false, message: "ใส่อีเมลให้ถูกต้อง" });
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const codeHash = createHash("sha256").update(`${salt}:${code}`).digest("hex");
  return update((db) => {
    const user = db.users.find((item) => item.email === email);
    if (!user?.passwordHash) return { ok: false as const, message: "ไม่พบบัญชีรหัสผ่านของอีเมลนี้" };
    db.resets = db.resets.filter((item) => item.email !== email && Date.parse(item.expiresAt) > Date.now());
    db.resets.push({ email, salt, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), tries: 0 });
    return { ok: true as const, code };
  });
}

export async function resetPassword(emailInput: string, code: string, password: string, confirm: string): Promise<{ ok: true; token: string; user: PublicUser } | { ok: false; message: string }> {
  const email = normalizeEmail(emailInput);
  const message = emailError(email) || codeError(code) || passwordError(password) || confirmPasswordError(password, confirm);
  if (message) return { ok: false, message };
  const nextSalt = randomBytes(16).toString("hex");
  const nextHash = await hashPassword(password, nextSalt);
  return update((db) => {
    const reset = db.resets.find((item) => item.email === email);
    const user = db.users.find((item) => item.email === email);
    if (!reset || !user || Date.parse(reset.expiresAt) <= Date.now()) {
      return { ok: false as const, message: "รหัสหมดอายุแล้ว ขอรหัสใหม่" };
    }
    const codeHash = createHash("sha256").update(`${reset.salt}:${code}`).digest("hex");
    if (!same(reset.codeHash, codeHash)) {
      reset.tries += 1;
      if (reset.tries >= 5) db.resets = db.resets.filter((item) => item.email !== email);
      return { ok: false as const, message: reset.tries >= 5 ? "กรอกผิดหลายครั้ง ขอรหัสใหม่" : "รหัส 6 หลักไม่ถูกต้อง" };
    }
    user.passwordSalt = nextSalt;
    user.passwordHash = nextHash;
    user.provider = "password";
    user.updatedAt = new Date().toISOString();
    db.resets = db.resets.filter((item) => item.email !== email);
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    return { ok: true as const, token: issueSession(db, user.id), user: publish(user) };
  });
}

export function loginWithProvider(provider: "google" | "apple", subject: string, email: string): Promise<{ user: PublicUser; token: string } | { pendingId: string }> {
  const normalized = normalizeEmail(email);
  return update((db) => {
    const user = db.users.find((item) => (item.provider === provider && item.providerSubject === subject) || item.email === normalized);
    if (!user) {
      const id = randomUUID();
      db.pending.push({ id, provider, subject, email: normalized, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
      return { pendingId: id };
    }
    return { user: publish(user), token: issueSession(db, user.id) };
  });
}
