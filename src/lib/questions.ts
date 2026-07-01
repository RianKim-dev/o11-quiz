import type { Question } from "@/types/question";
import { BLUEPRINT } from "@/lib/blueprint";

// Content is authored as JSON under /content/questions and bundled at build time.
// Add a new import + spread here when a new subtopic file is created.
import aggregates from "@content/questions/aggregates.json";
import logicFlows from "@content/questions/logic-flows-exceptions.json";
import screenWidgets from "@content/questions/screen-widgets.json";

export const ALL_QUESTIONS: Question[] = [
  ...(aggregates as unknown as Question[]),
  ...(logicFlows as unknown as Question[]),
  ...(screenWidgets as unknown as Question[]),
];

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

/** Count of available questions per subtopic. */
export function subtopicCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) counts[q.subtopic] = (counts[q.subtopic] ?? 0) + 1;
  return counts;
}

/**
 * Assemble a mock exam that follows the blueprint distribution.
 * If a subtopic has fewer questions than the blueprint asks for, takes what exists.
 * Returns the (shortfall) info so the UI can be honest about coverage.
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
