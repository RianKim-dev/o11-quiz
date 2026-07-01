import type { Question } from "@/types/question";
import { RAW_QUESTIONS } from "@/generated/all-questions";
import { BLUEPRINT } from "@/lib/blueprint";

// Only verified questions are served; "flagged" ones stay in the repo for review
// but never appear in quizzes. RAW_QUESTIONS is auto-generated from every
// content/questions/*.json by scripts/gen-manifest.mjs.
export const ALL_QUESTIONS: Question[] = RAW_QUESTIONS.filter(
  (q) => q.status === "verified"
);

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getBySubtopic(subtopic: string): Question[] {
  return ALL_QUESTIONS.filter((q) => q.subtopic === subtopic);
}

/** Count of available (verified) questions per subtopic. */
export function subtopicCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) counts[q.subtopic] = (counts[q.subtopic] ?? 0) + 1;
  return counts;
}

/**
 * Assemble a mock exam that follows the blueprint distribution.
 * If a subtopic has fewer questions than the blueprint asks for, takes what exists.
 */
export function assembleMock(): { questions: Question[]; shortfall: number } {
  const out: Question[] = [];
  let shortfall = 0;
  for (const spec of BLUEPRINT) {
    const pool = shuffle(getBySubtopic(spec.subtopic));
    out.push(...pool.slice(0, spec.count));
    shortfall += Math.max(0, spec.count - pool.length);
  }
  return { questions: shuffle(out), shortfall };
}
