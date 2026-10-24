const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function bangkokParts(date: Date) {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    key: `${bag.year}-${bag.month}-${bag.day}`,
    weekday: WEEKDAY[bag.weekday] ?? 0,
  };
}

export function weekDateKeys(now = new Date()): string[] {
  const today = bangkokParts(now);
  const noon = new Date(`${today.key}T12:00:00+07:00`);
  const monday = new Date(noon.getTime() - today.weekday * 86400000);
  return Array.from({ length: 7 }, (_, index) => bangkokParts(new Date(monday.getTime() + index * 86400000)).key);
}

export function minutesFromSeconds(seconds: number): number {
  return Math.floor(Math.max(0, seconds) / 60);
}
