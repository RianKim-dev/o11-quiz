"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Question, QuestionOption } from "@/types/question";

export type Lang = "en" | "ko";
const KEY = "o11quiz.lang.v1";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ko",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (s === "en" || s === "ko") setLangState(s);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(KEY, l);
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/**
 * Pick the question's presentation text for the active language.
 * Korean falls back per-field to the English base when i18n.ko is missing,
 * so untranslated questions still render (in English) without breaking.
 */
export function localizeQuestion(
  q: Question,
  lang: Lang
): { stem: string; options: QuestionOption[]; diagram?: string } {
  const ko = q.i18n?.ko;
  if (lang === "ko" && ko) {
    return {
      stem: ko.stem ?? q.stem,
      options: ko.options ?? q.options,
      diagram: ko.diagram ?? q.diagram,
    };
  }
  return { stem: q.stem, options: q.options, diagram: q.diagram };
}
