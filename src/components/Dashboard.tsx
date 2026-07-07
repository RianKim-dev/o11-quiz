"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MANIFEST } from "@/lib/manifest";
import { BLUEPRINT, CATEGORY_ORDER } from "@/lib/blueprint";
import { ALL_QUESTIONS } from "@/lib/questions";
import { loadStatuses, clearStatuses, type QStatus } from "@/lib/progress";
import { useAuth } from "@/lib/auth";
import Help from "@/components/Help";

interface SubStat {
  known: number;
  review: number;
  total: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Record<string, SubStat>>({});
  const [overall, setOverall] = useState({ known: 0, review: 0, total: 0 });
  const { userId } = useAuth();

  const load = async () => {
    const statuses: Map<string, QStatus> = await loadStatuses();
    const s: Record<string, SubStat> = {};
    let known = 0;
    let review = 0;
    let total = 0;
    for (const q of ALL_QUESTIONS) {
      const cur = (s[q.subtopic] ??= { known: 0, review: 0, total: 0 });
      cur.total += 1;
      total += 1;
      const st = statuses.get(q.id);
      if (st === "known") {
        cur.known += 1;
        known += 1;
      } else if (st === "review") {
        cur.review += 1;
        review += 1;
      }
    }
    setStats(s);
    setOverall({ known, review, total });
  };

  useEffect(() => {
    setMounted(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const knownPct = overall.total > 0 ? Math.round((overall.known / overall.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* overall */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">예상문제집 대시보드</h1>
          <Help />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          현재 문제 은행: <b>{MANIFEST.total}</b>문항 · 실제 시험은 50문항(합격 70%)
        </p>
        {mounted ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                아는 문항 <b className="text-emerald-600">{overall.known}</b> / {overall.total}
              </span>
              <span className="text-slate-500">{knownPct}%</span>
            </div>
            <div className="mt-1 flex h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${knownPct}%` }} />
              <div
                className="h-full bg-amber-400"
                style={{ width: `${(overall.review / overall.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              🟢 알아요 {overall.known} · 🟡 몰라요 {overall.review} · ⚪ 미확인{" "}
              {overall.total - overall.known - overall.review}
            </p>
          </div>
        ) : null}
      </section>

      {/* actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/quiz?mode=mock"
          className="rounded-xl bg-rose-600 p-4 text-white shadow-sm transition-colors hover:bg-rose-700"
        >
          <div className="text-base font-semibold">모의고사</div>
          <div className="mt-1 text-xs text-rose-100">
            시험 비율대로 50문항 · 120분 · 아직 모르는 문항 우선
          </div>
        </Link>
        <Link
          href="/quiz?mode=practice"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">📖 연습 모드</div>
          <div className="mt-1 text-xs text-slate-500">
            시험 비율 그대로 50문항 · 해설 보며 · 타이머 없음
          </div>
        </Link>
        <Link
          href="/quiz?mode=review"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition-colors hover:bg-amber-100"
        >
          <div className="text-base font-semibold text-amber-800">
            🔖 다시 볼 목록
            {mounted && overall.review > 0 ? (
              <span className="ml-1 text-sm font-normal text-amber-600">
                {overall.review}개
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-amber-700">'몰라요'로 표시한 문항만 모아 연습</div>
        </Link>
        <Link
          href="/quiz?mode=unknown"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">
            ⚪ 미확인 목록
            {mounted && overall.total - overall.known - overall.review > 0 ? (
              <span className="ml-1 text-sm font-normal text-slate-500">
                {overall.total - overall.known - overall.review}개
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">아직 표시 안 한 문항만 모아 연습</div>
        </Link>
      </section>

      {/* per-subtopic practice */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">주제별 연습 &amp; 진도</h2>
        <p className="mb-3 mt-1 text-xs text-slate-400">
          주제 이름을 누르면 그 과목 전체를 연습해요. 오른쪽 숫자
          <span className="text-emerald-600"> 알아요</span> /
          <span className="text-amber-600"> 몰라요</span> /
          <span className="text-slate-500"> 미확인</span>을 누르면 그 상태의 문항만 골라 풀 수 있어요.
        </p>
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const specs = BLUEPRINT.filter((b) => b.category === cat);
            return (
              <div key={cat}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cat}
                </div>
                <div className="space-y-1">
                  {specs.map((spec) => {
                    const st = stats[spec.subtopic] ?? { known: 0, review: 0, total: 0 };
                    const disabled = st.total === 0;
                    const kp = st.total ? (st.known / st.total) * 100 : 0;
                    const rp = st.total ? (st.review / st.total) * 100 : 0;
                    return (
                      <div key={spec.subtopic} className="flex items-center gap-3 text-sm">
                        {disabled ? (
                          <span className="w-52 shrink-0 truncate text-slate-300">
                            {spec.subtopic}
                          </span>
                        ) : (
                          <Link
                            href={`/quiz?mode=practice&subtopic=${encodeURIComponent(
                              spec.subtopic
                            )}`}
                            title="연습 모드 (해설 보며, 성적 미반영)"
                            className="w-52 shrink-0 truncate text-slate-700 underline decoration-slate-300 hover:decoration-rose-500"
                          >
                            {spec.subtopic}
                          </Link>
                        )}
                        <div className="flex h-2 flex-1 overflow-hidden rounded bg-slate-100">
                          {mounted ? (
                            <>
                              <div className="h-full bg-emerald-500" style={{ width: `${kp}%` }} />
                              <div className="h-full bg-amber-400" style={{ width: `${rp}%` }} />
                            </>
                          ) : null}
                        </div>
                        {mounted ? (
                          <span className="flex w-28 shrink-0 justify-end gap-1 text-xs tabular-nums">
                            {(
                              [
                                ["known", st.known, "bg-emerald-100 text-emerald-700"],
                                ["review", st.review, "bg-amber-100 text-amber-700"],
                                [
                                  "unknown",
                                  st.total - st.known - st.review,
                                  "bg-slate-100 text-slate-500",
                                ],
                              ] as const
                            ).map(([key, count, cls]) =>
                              count > 0 ? (
                                <Link
                                  key={key}
                                  href={`/quiz?mode=practice&subtopic=${encodeURIComponent(
                                    spec.subtopic
                                  )}&filter=${key}`}
                                  title={
                                    key === "known"
                                      ? "알아요 문항만 연습"
                                      : key === "review"
                                        ? "몰라요 문항만 연습"
                                        : "미확인 문항만 연습"
                                  }
                                  className={`rounded px-1.5 py-0.5 ${cls} hover:ring-1 hover:ring-rose-400`}
                                >
                                  {count}
                                </Link>
                              ) : (
                                <span
                                  key={key}
                                  className={`rounded px-1.5 py-0.5 ${cls} opacity-40`}
                                >
                                  {count}
                                </span>
                              )
                            )}
                          </span>
                        ) : (
                          <span className="w-28 shrink-0 text-right text-xs text-slate-400">
                            –
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {mounted && overall.known + overall.review > 0 ? (
        <div className="text-center">
          <button
            onClick={async () => {
              if (!confirm("모든 '알아요/몰라요' 표시를 지울까요? (되돌릴 수 없어요)")) return;
              await clearStatuses();
              load();
            }}
            className="text-xs text-slate-400 underline hover:text-rose-500"
          >
            진도 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}
