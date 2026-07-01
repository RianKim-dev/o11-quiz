"use client";

import { useLang, type Lang } from "@/lib/i18n";

const LABELS: Record<Lang, string> = { ko: "한국어", en: "EN" };

export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs">
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-0.5 ${
            lang === l ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
