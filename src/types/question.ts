// Source-of-truth shape for every practice question.
// Questions are authored as JSON in /content/questions/*.json and imported at build time.

export type OptionKey = "A" | "B" | "C" | "D";
export type Difficulty = "easy" | "medium" | "hard";

/** Top-level exam categories, matching the official O11 Detail Sheet blueprint. */
export type Category =
  | "Reactive Apps in OutSystems"
  | "Data Modeling"
  | "Fetching Data"
  | "Logic"
  | "UI Design"
  | "Architecture & Security";

export interface QuestionOption {
  key: OptionKey;
  text: string;
}

export interface QuestionI18n {
  stem?: string;
  options?: QuestionOption[];
  diagram?: string;
}

export interface Question {
  /** Stable unique id, e.g. "AGG-001". Used as the key for stored answers. */
  id: string;
  category: Category;
  /** Sub-topic label, e.g. "Aggregates", "Logic Flows & Exception Handling". */
  subtopic: string;
  difficulty: Difficulty;
  tags?: string[];
  /** Question text (Markdown). */
  stem: string;
  /** Optional diagram: a Markdown table or fenced code block (flowchart). */
  diagram?: string;
  options: QuestionOption[];
  answer: OptionKey;
  /** Full Korean explanation of the correct answer (Markdown). */
  explanation: string;
  /** Optional "why the wrong options are wrong". Either keyed per option
   * ({A: "...", B: "..."}) or a single Markdown prose string. */
  distractors?: Partial<Record<OptionKey, string>> | string;
  /** Where the answer is grounded (workbook chapter / official doc). */
  source: string;
  status: "draft" | "verified" | "flagged";
  verifyNote?: string;
  /** Reserved for a future Korean-exam-authored version (not a translation). */
  i18n?: { ko?: QuestionI18n };
}
