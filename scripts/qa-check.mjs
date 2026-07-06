// Structural / rendering QA over the whole question bank. Deterministic, no LLM.
// Run: node scripts/qa-check.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "content/questions";
const SUBTOPICS = new Set([
  "Screen Widgets", "Blocks and Events", "Client and Server Actions",
  "Form Validations", "Logic Flows & Exception Handling", "Aggregates",
  "Fetching Data on Screens", "Entities & Data Types", "Data Relationships",
  "Screen Lifecycle", "Client Variables", "Debugging and Monitoring",
  "Modular Dependencies", "Role-based Security",
]);
const KEYS = ["A", "B", "C", "D"];
const VI = /[đĐưƯơƠăĂâÂêÊôÔ]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

const issues = []; // {id, file, sev, code, detail}
const add = (q, file, sev, code, detail) => issues.push({ id: q.id, file, sev, code, detail });

const all = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  const arr = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  for (const q of arr) all.push([q, f]);
}

const stemSeen = new Map();
for (const [q, f] of all) {
  // options
  if (!Array.isArray(q.options) || q.options.length !== 4) add(q, f, "ERR", "opt-count", `options=${q.options?.length}`);
  else {
    const keys = q.options.map((o) => o.key);
    if (KEYS.some((k) => !keys.includes(k))) add(q, f, "ERR", "opt-keys", keys.join(""));
    if (q.options.some((o) => !o.text || !o.text.trim())) add(q, f, "ERR", "opt-empty", "blank option text");
    if (q.options.some((o) => /^[A-D][.)]\s/.test(o.text || ""))) add(q, f, "WARN", "opt-label-leak", "option text has A./B) prefix");
    const texts = q.options.map((o) => norm(o.text));
    if (new Set(texts).size < 4) add(q, f, "WARN", "opt-dup", "duplicate option text");
  }
  if (!q.answer || !KEYS.includes(q.answer)) add(q, f, "ERR", "answer", String(q.answer));
  else if (Array.isArray(q.options) && !q.options.some((o) => o.key === q.answer)) add(q, f, "ERR", "answer-nomatch", q.answer);

  // explanation
  const ex = q.explanation || "";
  if (!ex.trim()) add(q, f, "ERR", "expl-missing", "");
  else {
    if (!/[가-힣]/.test(ex)) add(q, f, "ERR", "expl-not-korean", ex.slice(0, 40));
    if (ex.replace(/\s/g, "").length < 60) add(q, f, "WARN", "expl-thin", `${ex.replace(/\s/g, "").length} chars`);
    // does it reference why-distractors-are-wrong? (heuristic)
    if (!/(오답|틀리|아니|않|없|잘못|거짓|불가|A[는은 ]|B[는은 ]|C[는은 ]|D[는은 ])/.test(ex) && ex.replace(/\s/g, "").length < 140)
      add(q, f, "INFO", "expl-no-distractor-rationale", "");
  }

  // i18n.ko
  const ko = q.i18n && q.i18n.ko;
  if (!ko) add(q, f, "WARN", "ko-missing", "no Korean version");
  else {
    if (!ko.stem || !ko.stem.trim()) add(q, f, "ERR", "ko-stem", "");
    if (!Array.isArray(ko.options) || ko.options.length !== 4) add(q, f, "ERR", "ko-opt-count", `${ko.options?.length}`);
    else if (ko.options.some((o) => typeof o === "string")) add(q, f, "ERR", "ko-opt-string", "ko.options are strings (blank in UI!)");
    else if (ko.options.some((o) => !o || typeof o !== "object" || !o.text || !o.text.trim())) add(q, f, "ERR", "ko-opt-empty", "");
  }

  // distractors format
  if (q.distractors !== undefined && typeof q.distractors !== "string") {
    if (typeof q.distractors !== "object" || Array.isArray(q.distractors)) add(q, f, "WARN", "distractor-format", typeof q.distractors);
  }

  // stem artifacts
  const st = q.stem || "";
  if (!st.trim()) add(q, f, "ERR", "stem-missing", "");
  if (/은주과장|확인필요|yourAns|answerKey|Question\s+\d+\s*:/.test(st)) add(q, f, "ERR", "stem-artifact", st.slice(0, 40));
  if (/^\s*\d+\.\s/.test(st)) add(q, f, "WARN", "stem-leading-number", st.slice(0, 25));
  if (VI.test(st) || VI.test(ex) || (q.options || []).some((o) => VI.test(o.text || ""))) add(q, f, "ERR", "vietnamese", "");

  // metadata
  if (!SUBTOPICS.has(q.subtopic)) add(q, f, "ERR", "subtopic", String(q.subtopic));
  if (!q.source || !String(q.source).trim()) add(q, f, "INFO", "source-missing", "");
  if (q.tags && !Array.isArray(q.tags)) add(q, f, "WARN", "tags-format", "");
  if (!["verified", "flagged", "draft"].includes(q.status)) add(q, f, "WARN", "status", String(q.status));

  // dup stems
  const k = norm(st);
  if (k) { if (stemSeen.has(k)) add(q, f, "WARN", "dup-stem", `same as ${stemSeen.get(k)}`); else stemSeen.set(k, q.id); }
}

// report
const bySev = { ERR: [], WARN: [], INFO: [] };
for (const i of issues) bySev[i.sev].push(i);
const byCode = {};
for (const i of issues) (byCode[i.sev + ":" + i.code] ??= []).push(i);

console.log(`\n=== QA over ${all.length} questions ===`);
console.log(`ERR ${bySev.ERR.length} | WARN ${bySev.WARN.length} | INFO ${bySev.INFO.length}\n`);
console.log("--- by code (count) ---");
for (const [code, arr] of Object.entries(byCode).sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${String(arr.length).padStart(4)}  ${code}`);
console.log("\n--- all ERR + first 15 WARN ---");
for (const i of [...bySev.ERR, ...bySev.WARN.slice(0, 15)])
  console.log(`  [${i.sev}] ${i.id} ${i.code} ${i.detail ? "— " + i.detail : ""}`);
