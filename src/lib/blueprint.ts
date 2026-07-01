// Official O11 Associate Developer exam blueprint (from the Certification Detail Sheet).
// Used to assemble a full-length mock exam that mirrors the real topic distribution.

import type { Category } from "@/types/question";

export interface SubtopicSpec {
  category: Category;
  subtopic: string;
  count: number;
}

export const BLUEPRINT: SubtopicSpec[] = [
  { category: "Reactive Apps in OutSystems", subtopic: "Client Variables", count: 1 },
  { category: "Reactive Apps in OutSystems", subtopic: "Screen Lifecycle", count: 3 },
  { category: "Reactive Apps in OutSystems", subtopic: "Debugging and Monitoring", count: 2 },
  { category: "Data Modeling", subtopic: "Entities & Data Types", count: 4 },
  { category: "Data Modeling", subtopic: "Data Relationships", count: 2 },
  { category: "Fetching Data", subtopic: "Aggregates", count: 6 },
  { category: "Fetching Data", subtopic: "Fetching Data on Screens", count: 4 },
  { category: "Logic", subtopic: "Client and Server Actions", count: 2 },
  { category: "Logic", subtopic: "Form Validations", count: 4 },
  { category: "Logic", subtopic: "Logic Flows & Exception Handling", count: 5 },
  { category: "UI Design", subtopic: "Screen Widgets", count: 9 },
  { category: "UI Design", subtopic: "Blocks and Events", count: 4 },
  { category: "Architecture & Security", subtopic: "Modular Dependencies", count: 2 },
  { category: "Architecture & Security", subtopic: "Role-based Security", count: 2 },
];

export const TOTAL_QUESTIONS = 50;
export const PASSING_SCORE = 35; // 70%

export const CATEGORY_ORDER: Category[] = [
  "Reactive Apps in OutSystems",
  "Data Modeling",
  "Fetching Data",
  "Logic",
  "UI Design",
  "Architecture & Security",
];
