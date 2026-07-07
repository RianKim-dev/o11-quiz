// Per-question self-assessment status (localStorage layer; Supabase routing in progress.ts).
// "known" = 알아요, "review" = 몰라요(다시 볼 목록). Absence = 미확인(default).

export type QStatus = "known" | "review";

const KEY = "o11quiz.status.v1";

export function getStatusMap(): Record<string, QStatus> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, QStatus>;
  } catch {
    return {};
  }
}

/** Set (or clear, when status is null) a question's status locally. */
export function setStatusLocal(id: string, status: QStatus | null): void {
  if (typeof window === "undefined") return;
  const map = getStatusMap();
  if (status) map[id] = status;
  else delete map[id];
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function setStatusBulkLocal(entries: { id: string; status: QStatus | null }[]): void {
  if (typeof window === "undefined") return;
  const map = getStatusMap();
  for (const { id, status } of entries) {
    if (status) map[id] = status;
    else delete map[id];
  }
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function clearStatusLocal(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
