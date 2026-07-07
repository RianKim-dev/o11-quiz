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
import {
  getStatusMap,
  setStatusLocal,
  setStatusBulkLocal,
  clearStatusLocal,
  type QStatus,
} from "@/lib/status";

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

/* ---------------- question status (알아요 / 몰라요) ---------------- */

export async function loadStatuses(): Promise<Map<string, QStatus>> {
  const r = remote();
  if (!r) return new Map(Object.entries(getStatusMap()));
  const { data, error } = await r.sb
    .from("question_status")
    .select("question_id,status")
    .eq("user_id", r.uid);
  if (error || !data) return new Map();
  return new Map(data.map((row) => [row.question_id as string, row.status as QStatus]));
}

/** Set a question's status; pass null to clear it back to 미확인. */
export async function setStatus(id: string, status: QStatus | null): Promise<void> {
  const r = remote();
  if (!r) {
    setStatusLocal(id, status);
    return;
  }
  if (status) {
    await r.sb
      .from("question_status")
      .upsert({ user_id: r.uid, question_id: id, status, updated_at: new Date().toISOString() });
  } else {
    await r.sb.from("question_status").delete().eq("user_id", r.uid).eq("question_id", id);
  }
}

export async function setStatusBulk(
  entries: { id: string; status: QStatus | null }[]
): Promise<void> {
  if (entries.length === 0) return;
  const r = remote();
  if (!r) {
    setStatusBulkLocal(entries);
    return;
  }
  const toSet = entries.filter((e) => e.status);
  const toClear = entries.filter((e) => !e.status).map((e) => e.id);
  if (toSet.length) {
    await r.sb.from("question_status").upsert(
      toSet.map((e) => ({
        user_id: r.uid,
        question_id: e.id,
        status: e.status,
        updated_at: new Date().toISOString(),
      }))
    );
  }
  if (toClear.length) {
    await r.sb.from("question_status").delete().eq("user_id", r.uid).in("question_id", toClear);
  }
}

export async function clearStatuses(): Promise<void> {
  const r = remote();
  if (!r) {
    clearStatusLocal();
    return;
  }
  await r.sb.from("question_status").delete().eq("user_id", r.uid);
}

export type { AnswerRecord, QStatus };
