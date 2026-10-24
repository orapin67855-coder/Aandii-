import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { loadJson, saveJson } from "@/lib/persist";
import { applyTick, bangkokDayKey, mergeSubjects, MAX_ROOM_SEATS, MAX_ROOM_SUBJECTS, type NamedSubject, type Seat, type SubjectId } from "@/lib/rooms/rules";
import { todayFocusMap } from "@/lib/study/store";

export type RoomRecord = {
  id: string;
  name: string;
  isPublic: boolean;
  passwordSalt: string | null;
  passwordHash: string | null;
  inviteToken?: string;
  ownerId?: string;
  showRank: boolean;
  subjects?: NamedSubject[];
  seats: Seat[];
};

type Db = { rooms: RoomRecord[] };

let chain: Promise<unknown> = Promise.resolve();

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function sameToken(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function ensureInvite(room: RoomRecord): void {
  if (!room.inviteToken) room.inviteToken = randomBytes(18).toString("base64url");
  if (!room.ownerId) room.ownerId = room.seats.find((seat) => seat.userId)?.userId;
}

function sameHash(left: string, right: string): boolean {
  return sameToken(left, right);
}

async function readDb(): Promise<Db> {
  const raw = await loadJson("rooms.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  return { rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [] };
}

async function writeDb(db: Db): Promise<void> {
  await saveJson("rooms.json", db);
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

function freshDay(seats: Seat[], dayKey: string): Seat[] {
  return seats.map((seat) => {
    if (seat.dayKey === dayKey) return seat;
    return { ...seat, dayKey, todaySeconds: 0, subjectSeconds: {}, reading: false, lastTickAt: null };
  });
}

export type RoomSummary = { id: string; name: string; isPublic: boolean; readers: number; seats: number; capacity: number; todaySeconds: number };
export type PublicSeat = Omit<Seat, "lastTickAt">;
export type PublicRoom = { id: string; name: string; isPublic: boolean; showRank: boolean; capacity: number; subjects: NamedSubject[]; seats: PublicSeat[] };

const NAME_TO_SUBJECT: Record<string, SubjectId> = {
  ภาษาไทย: "thai",
  ภาษาอังกฤษ: "english",
  คณิตศาสตร์: "math",
  วิทยาศาสตร์: "science",
  สังคมศึกษา: "social",
};

async function withFocus(room: PublicRoom): Promise<PublicRoom> {
  const ids = room.seats.flatMap((seat) => seat.userId ? [seat.userId] : []);
  if (!ids.length) return room;
  const totals = await todayFocusMap(ids);
  return {
    ...room,
    seats: room.seats.map((seat) => {
      if (!seat.userId) return seat;
      const focus = totals.get(seat.userId);
      if (!focus) return { ...seat, bySubject: [] };
      const subjectSeconds = { ...seat.subjectSeconds };
      for (const item of focus.bySubject) {
        const id = NAME_TO_SUBJECT[item.name];
        if (id) subjectSeconds[id] = item.seconds;
      }
      return { ...seat, todaySeconds: focus.total, subjectSeconds, bySubject: focus.bySubject, reading: seat.reading || focus.reading };
    }),
  };
}

function publish(room: RoomRecord): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    isPublic: room.isPublic,
    showRank: room.showRank !== false,
    capacity: MAX_ROOM_SEATS,
    subjects: mergeSubjects(room.subjects),
    seats: room.seats.map(({ lastTickAt: _tick, ...seat }) => seat),
  };
}

export function listRooms(): Promise<RoomSummary[]> {
  return update((db) => {
    const dayKey = bangkokDayKey();
    return db.rooms.map((room) => {
      room.seats = freshDay(room.seats, dayKey);
      return {
        id: room.id,
        name: room.name,
        isPublic: room.isPublic,
        readers: room.seats.filter((seat) => seat.reading).length,
        seats: room.seats.length,
        capacity: MAX_ROOM_SEATS,
        todaySeconds: room.seats.reduce((sum, seat) => sum + seat.todaySeconds, 0),
      };
    });
  });
}

export function createRoom(input: { name: string; isPublic: boolean; password: string | null; displayName: string; showRank?: boolean; userId?: string }): Promise<{ room: PublicRoom; seatId: string; inviteToken: string }> {
  return update((db) => {
    const dayKey = bangkokDayKey();
    const salt = input.isPublic ? null : randomBytes(16).toString("hex");
    const seatId = randomUUID();
    const room: RoomRecord = {
      id: randomUUID(),
      name: input.name,
      isPublic: input.isPublic,
      passwordSalt: salt,
      passwordHash: salt && input.password ? hashPassword(input.password, salt) : null,
      inviteToken: randomBytes(18).toString("base64url"),
      ownerId: input.userId,
      showRank: input.showRank !== false,
      seats: [{ id: seatId, userId: input.userId, displayName: input.displayName, subjectId: null, reading: false, todaySeconds: 0, subjectSeconds: {}, dayKey, lastTickAt: null }],
    };
    db.rooms.push(room);
    return { room: publish(room), seatId, inviteToken: room.inviteToken ?? "" };
  }).then(async (created) => ({ ...created, room: await withFocus(created.room) }));
}

export function ownerInvite(id: string, userId: string): Promise<string | null> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return null;
    ensureInvite(room);
    return room.ownerId === userId ? room.inviteToken ?? null : null;
  });
}

export function getRoom(id: string): Promise<PublicRoom | null> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return null;
    room.seats = freshDay(room.seats, bangkokDayKey());
    return publish(room);
  }).then(async (room) => room ? withFocus(room) : null);
}

export function joinRoom(id: string, displayName: string, password: string | null, userId?: string, invite?: string | null): Promise<{ ok: true; room: PublicRoom; seatId: string } | { ok: false; status: number; message: string }> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return { ok: false as const, status: 404, message: "ไม่พบห้องนี้" };
    ensureInvite(room);
    const invited = Boolean(invite && room.inviteToken && sameToken(invite, room.inviteToken));
    if (!room.isPublic && !invited) {
      if (!password || !room.passwordSalt || !room.passwordHash || !sameHash(hashPassword(password, room.passwordSalt), room.passwordHash)) {
        return { ok: false as const, status: 401, message: "รหัสผ่านไม่ถูกต้อง" };
      }
    }
    room.seats = freshDay(room.seats, bangkokDayKey());
    if (room.seats.length >= MAX_ROOM_SEATS) return { ok: false as const, status: 409, message: "ห้องนี้เต็มแล้ว" };
    const seatId = randomUUID();
    room.seats.push({ id: seatId, userId, displayName, subjectId: null, reading: false, todaySeconds: 0, subjectSeconds: {}, dayKey: bangkokDayKey(), lastTickAt: null });
    return { ok: true as const, room: publish(room), seatId };
  }).then(async (result) => result.ok ? { ...result, room: await withFocus(result.room) } : result);
}

export function tickRoom(id: string, seatId: string, reading: boolean, subjectId: string | null, userId?: string): Promise<{ ok: true; room: PublicRoom } | { ok: false; status: number; message: string }> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return { ok: false as const, status: 404, message: "ไม่พบห้องนี้" };
    const index = room.seats.findIndex((seat) => seat.id === seatId);
    if (index < 0) return { ok: false as const, status: 404, message: "ไม่พบที่นั่ง เข้าห้องใหม่อีกครั้ง" };
    const allowed = new Set(mergeSubjects(room.subjects).map((subject) => subject.id));
    const chosen = subjectId && allowed.has(subjectId) ? subjectId : null;
    if (reading && !chosen) return { ok: false as const, status: 400, message: "เลือกวิชาก่อนเริ่มอ่าน" };
    const seat = applyTick(room.seats[index], Date.now(), reading, chosen, bangkokDayKey());
    if (userId) seat.userId = userId;
    room.seats[index] = seat;
    return { ok: true as const, room: publish(room) };
  }).then(async (result) => result.ok ? { ...result, room: await withFocus(result.room) } : result);
}

export function setShowRank(id: string, seatId: string, showRank: boolean): Promise<{ ok: true; room: PublicRoom } | { ok: false; status: number; message: string }> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return { ok: false as const, status: 404, message: "ไม่พบห้องนี้" };
    if (!room.seats.some((seat) => seat.id === seatId)) return { ok: false as const, status: 404, message: "ไม่พบที่นั่ง เข้าห้องใหม่อีกครั้ง" };
    room.showRank = showRank;
    return { ok: true as const, room: publish(room) };
  }).then(async (result) => result.ok ? { ...result, room: await withFocus(result.room) } : result);
}

export function addRoomSubject(id: string, seatId: string, rawName: string): Promise<{ ok: true; room: PublicRoom; subject: NamedSubject } | { ok: false; status: number; message: string }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 30) return Promise.resolve({ ok: false, status: 400, message: "ชื่อวิชาต้องมี 1–30 ตัวอักษร" });
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return { ok: false as const, status: 404, message: "ไม่พบห้องนี้" };
    if (!room.seats.some((seat) => seat.id === seatId)) return { ok: false as const, status: 404, message: "ไม่พบที่นั่ง เข้าห้องใหม่อีกครั้ง" };
    const subjects = mergeSubjects(room.subjects);
    if (subjects.some((subject) => subject.name === name)) return { ok: false as const, status: 400, message: "มีวิชานี้แล้ว" };
    if (subjects.length >= MAX_ROOM_SUBJECTS) return { ok: false as const, status: 400, message: "เพิ่มได้ไม่เกิน 20 วิชา" };
    const subject = { id: `c${randomBytes(4).toString("hex")}`, name };
    room.subjects = [...(room.subjects ?? []), subject];
    return { ok: true as const, room: publish(room), subject };
  }).then(async (result) => result.ok ? { ...result, room: await withFocus(result.room) } : result);
}

export function leaveRoom(id: string, seatId: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  return update((db) => {
    const room = db.rooms.find((item) => item.id === id);
    if (!room) return { ok: false as const, status: 404, message: "ไม่พบห้องนี้" };
    const index = room.seats.findIndex((seat) => seat.id === seatId);
    if (index < 0) return { ok: false as const, status: 404, message: "ไม่พบที่นั่ง เข้าห้องใหม่อีกครั้ง" };
    const paused = applyTick(room.seats[index], Date.now(), false, room.seats[index].subjectId, bangkokDayKey());
    room.seats[index] = paused;
    room.seats.splice(index, 1);
    return { ok: true as const };
  });
}
