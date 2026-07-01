// Generates a lightweight manifest of the question bank so the dashboard can show
// per-subtopic counts WITHOUT importing all question content into the home-page bundle.
// The full question JSON is only loaded inside the /quiz route.
// Runs automatically on `predev` / `prebuild`; can also be run manually.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const qDir = join(root, "content", "questions");
const outDir = join(root, "src", "generated");

const files = (await readdir(qDir)).filter((f) => f.endsWith(".json"));

/** @type {Record<string, { category: string, count: number }>} */
const subtopics = {};
let total = 0;
const ids = new Set();

for (const f of files) {
  const arr = JSON.parse(await readFile(join(qDir, f), "utf8"));
  for (const q of arr) {
    if (ids.has(q.id)) throw new Error(`Duplicate question id: ${q.id} (in ${f})`);
    ids.add(q.id);
    total += 1;
    const s = (subtopics[q.subtopic] ??= { category: q.category, count: 0 });
    s.count += 1;
  }
}

await mkdir(outDir, { recursive: true });
await writeFile(
  join(outDir, "manifest.json"),
  JSON.stringify({ total, subtopics }, null, 2) + "\n"
);

console.log(
  `✓ manifest: ${total} questions across ${Object.keys(subtopics).length} subtopics (${files.length} files)`
);
