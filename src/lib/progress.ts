// Unified progress data layer. When a user is logged in AND Supabase is configured,
// reads/writes go to Supabase (synced across devices, RLS-isolated per user).
// Otherwise they fall back to this browser's localStorage (guest mode).

import { getSupabase } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/authStore";
import {
  getAnswers as localGetAnswers,
  appendAnswers as localAppendAnswers,
  clearAnswers as localClearAnswers,
  getBookmarks as localGetBookmarks,
  setBookmark as localSetBookmark,
  type AnswerRecord,
} from "@/lib/storage";

function remote() {
  const uid = currentUserId();
  const sb = getSupabase();
  return uid && sb ? { uid, sb } : null;
}

export async function loadAnswers(): Promise<AnswerRecord[]> {
  const r = remote();
  if (!r) return localGetAnswers();
  const { data, error } = await r.sb
    .from("answers")
    .select("question_id,chosen,correct,subtopic,category,mode,created_at")
    .eq("user_id", r.uid);
  if (error || !data) return [];
  return data.map((row) => ({
    questionId: row.question_id as string,
    chosen: (row.chosen as string) ?? "",
    correct: Boolean(row.correct),
    subtopic: row.subtopic as string,
    category: row.category as string,
    mode: row.mode as string,
    ts: new Date(row.created_at as string).getTime(),
  }));
}

export async function saveAnswers(records: AnswerRecord[]): Promise<void> {
  const r = remote();
  if (!r) {
    localAppendAnswers(records);
    return;
  }
  const rows = records.map((rec) => ({
    user_id: r.uid,
    question_id: rec.questionId,
    chosen: rec.chosen,
    correct: rec.correct,
    subtopic: rec.subtopic,
    category: rec.category,
    mode: rec.mode,
  }));
  await r.sb.from("answers").insert(rows);
}

export async function clearAnswers(): Promise<void> {
  const r = remote();
  if (!r) {
    localClearAnswers();
    return;
  }
  await r.sb.from("answers").delete().eq("user_id", r.uid);
}

export async function loadBookmarks(): Promise<Set<string>> {
  const r = remote();
  if (!r) return localGetBookmarks();
  const { data, error } = await r.sb
    .from("bookmarks")
    .select("question_id")
    .eq("user_id", r.uid);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.question_id as string));
}

/** Set bookmark on/off; returns the new state. */
export async function setBookmark(id: string, on: boolean): Promise<boolean> {
  const r = remote();
  if (!r) {
    localSetBookmark(id, on);
    return on;
  }
  if (on) {
    await r.sb.from("bookmarks").upsert({ user_id: r.uid, question_id: id });
  } else {
    await r.sb.from("bookmarks").delete().eq("user_id", r.uid).eq("question_id", id);
  }
  return on;
}

export type { AnswerRecord };
