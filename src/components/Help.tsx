"use client";

import { useEffect, useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="space-y-1 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export default function Help() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-400 hover:text-rose-600"
      >
        ❓ 사용법
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">사용법 &amp; FAQ</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100"
              >
                닫기 ✕
              </button>
            </div>

            <div className="space-y-5">
              <Section title="이 앱은 뭔가요?">
                <p>
                  OutSystems 11 <b>Associate Reactive Developer</b> 자격증 대비 예상문제집이에요. 실제
                  시험은 <b>50문항 · 120분 · 70% 합격</b>입니다. 여기 문제 은행에서 시험 비율 그대로
                  뽑아 연습할 수 있어요.
                </p>
              </Section>

              <Section title="핵심: 문항마다 '내 상태' 하나">
                <p>정답을 자동 채점해 진도를 매기지 않아요. 대신 <b>스스로</b> 표시합니다:</p>
                <ul className="ml-1 space-y-0.5">
                  <li>⚪ <b>미확인</b> — 아직 표시 안 함 (기본)</li>
                  <li>🟢 <b>알아요</b> — 이 문항은 안다</li>
                  <li>🟡 <b>몰라요</b> — 다시 볼 것 (→ '다시 볼 목록'에 모임)</li>
                </ul>
                <p className="text-slate-500">
                  문제 화면 아래 <b>알아요 / 몰라요</b> 버튼으로 표시하고, 같은 버튼을 다시 누르면
                  해제돼요. 진도바의 초록은 '알아요' 비율이에요.
                </p>
              </Section>

              <Section title="모드 4가지">
                <ul className="space-y-1.5">
                  <li>
                    <b>모의고사</b> — 시험처럼 50문항·120분, 다 풀고 <b>제출→채점</b>. 풀면서도
                    알아요/몰라요를 눌러둘 수 있고(선택), 채점 후 <b>일괄 표시</b>(틀린 것→몰라요 등)도
                    가능해요. <span className="text-slate-500">점수는 그 자리에서만 보이고 저장 안 함.</span>
                  </li>
                  <li>
                    <b>📖 연습 모드</b> — 모의고사와 <b>똑같이 비율대로 50문항</b>을 뽑되, <b>타이머 없이</b>
                    각 문항의 <b>정답·해설</b>을 열어보며 풀어요.
                  </li>
                  <li>
                    <b>🔖 다시 볼 목록</b> — '몰라요'로 표시한 문항만 모아서 다시 풀기.
                  </li>
                  <li>
                    <b>⚪ 미확인 목록</b> — 아직 아무 표시도 안 한 문항만 모아 풀기.
                  </li>
                </ul>
                <p className="text-slate-500">
                  홈 아래 <b>주제별 연습</b>에서 과목 이름을 누르면 그 과목만 연습 모드로 열려요.
                </p>
              </Section>

              <Section title="어떤 순서로 나오나요?">
                <p>
                  모의고사·연습 모드는 <b>아직 '알아요' 안 한 문항을 먼저</b> 냅니다. 아는 걸 알아요로
                  표시할수록, 모르는 것 위주로 계속 연습하게 돼요.
                </p>
              </Section>

              <Section title="해설 속 '참고' 박스">
                <p>
                  많은 해설 끝에 <b>개념 정리</b> 박스가 있어요. 선택지 종류(예: Join 종류 전체)나 기초
                  부품(예: For Each 루프가 뭔지)을 비개발자도 알기 쉽게 풀어뒀습니다.
                </p>
              </Section>

              <Section title="언어">
                <p>
                  헤더의 <b>한국어 / EN</b> 토글로 지문·보기 언어를 바꿔요. OutSystems 용어는 실제
                  시험처럼 영어로 두되, 도메인 단어는 <b>고객(Customer)</b>처럼 병기합니다.
                </p>
              </Section>

              <Section title="자주 묻는 것">
                <p>
                  <b>진도가 저장되나요?</b> — 로그인하면 계정에 동기화돼 기기가 바뀌어도 유지돼요.
                  '알아요/몰라요' 표시가 곧 진도입니다.
                </p>
                <p>
                  <b>틀리면 자동으로 몰라요가 되나요?</b> — 아니요, 직접 표시해요. 대신 모의고사 채점지에
                  '틀린 것 → 몰라요' 같은 <b>일괄 버튼</b>이 있어요.
                </p>
                <p>
                  <b>모의고사 점수는 남나요?</b> — 그 회차 결과로만 보여주고 저장하지 않아요. 대신
                  아는 문항 수(진도바)가 실력의 지표예요.
                </p>
                <p>
                  <b>표시를 다 지우려면?</b> — 홈 맨 아래 <b>진도 초기화</b>를 누르면 돼요.
                </p>
              </Section>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              알겠어요
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
