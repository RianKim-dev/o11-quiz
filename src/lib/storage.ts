// Local progress store (localStorage). Will be augmented with Supabase later so
// progress syncs across devices/users. Keep the shape stable.

export interface AnswerRecord {
  questionId: string;
  chosen: string; // "" when left unanswered
  correct: boolean;
  subtopic: string;
  category: string;
  mode: string; // "mock" | "topic" | "review" | "bookmark" | "all"
  ts: number;
}

const KEY = "o11quiz.answers.v1";
const BM_KEY = "o11quiz.bookmarks.v1";

/* ---------------- answers ---------------- */

export function getAnswers(): AnswerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as AnswerRecord[];
  } catch {
    return [];
  }
}

export function appendAnswers(records: AnswerRecord[]): void {
  if (typeof window === "undefined") return;
  const current = getAnswers();
  localStorage.setItem(KEY, JSON.stringify([...current, ...records]));
}

export function clearAnswers(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/** Most recent answer per question (latest ts wins) → current mastery. */
export function latestByQuestion(
  answers: AnswerRecord[] = getAnswers()
): Map<string, AnswerRecord> {
  const map = new Map<string, AnswerRecord>();
  for (const a of answers) {
    const prev = map.get(a.questionId);
    if (!prev || a.ts > prev.ts) map.set(a.questionId, a);
  }
  return map;
}

/** Questions whose most recent answer (in the given set) was wrong or left blank. */
export function wrongIdsFrom(answers: AnswerRecord[]): Set<string> {
  const wrong = new Set<string>();
  for (const [qid, rec] of latestByQuestion(answers)) {
    if (!rec.correct) wrong.add(qid);
  }
  return wrong;
}

/* ---------------- bookmarks (⭐ revisit later) ---------------- */

export function getBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(BM_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().has(id);
}

/** Set a bookmark on/off explicitly. */
export function setBookmark(id: string, on: boolean): void {
  if (typeof window === "undefined") return;
  const set = getBookmarks();
  if (on) set.add(id);
  else set.delete(id);
  localStorage.setItem(BM_KEY, JSON.stringify([...set]));
}
