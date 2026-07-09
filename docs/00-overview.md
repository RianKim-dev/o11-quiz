# 프로젝트 개요 (Overview)

> 범위: o11-quiz 프로젝트의 정체성, 목표, 대상, 실제 시험 스펙, 두 축(웹앱 + 콘텐츠 파이프라인), 현재 상태, 배포 요약을 정리하고, 이 문서 세트의 인덱스 역할을 한다.

이 문서는 리버스 엔지니어링 설계 문서 세트의 첫 페이지다. o11-quiz가 "무엇이고, 누구를 위한 것이며, 지금 어디까지 와 있는지"를 한눈에 파악하고, 세부 주제별 문서로 이동할 수 있도록 안내한다. 세부 구현 근거는 실제 소스 파일 경로와 함수/테이블 이름으로 표기한다.

---

## 1. 제품 정체성과 목표

o11-quiz는 **OutSystems 11 Associate Reactive Developer (O11)** 자격증 대비용 **이중 언어(한국어/English) 연습문제 웹앱**이다.

- **성격**: Concentrix 사내 소규모 스터디 그룹을 위한 **비공개** 학습 도구. 공개 서비스가 아니며 로그인(이메일+비밀번호, `@concentrix.com` 도메인만)이 필수다.
- **목표**: 실제 시험 blueprint 비율에 맞춰 **모의고사**와 **주제별 연습**을 제공하고, 문항마다 한국어 해설을 붙여 개념 이해를 돕는 것.
- **핵심 가치**: 문항 은행의 **정확성**이 제품의 본질적 가치다(브리프 §17-7). 그래서 콘텐츠는 다단계 LLM 리뷰와 적대적 검증, 문서 기반 최종 QA를 거쳐 생성되었다.

## 2. 대상 — 비개발자

앱의 주 사용자는 **개념 시험을 준비하는 한국인 비개발자**다. 이 전제가 거의 모든 콘텐츠 결정을 좌우한다.

- 해설은 전부 **한국어**이며 비개발자 눈높이로 작성된다(브리프 §12).
- 닫힌 선택지 집합에 의존하는 문항에는 검증된 "참고 · …" **개념 참고 박스**(224문항), 원시 개념 자체가 장벽인 문항에는 비유가 담긴 **입문 building-block 카드**(96문항)를 붙였다.
- 채점 기반 자동 판정 대신 **자기평가(self-assessment) 학습 모델**을 채택했다(§7 참고, 자세한 내용은 진도/학습 모델 문서).

## 3. 실제 시험 스펙 (공식 Certification Detail Sheet 기준)

| 항목 | 값 |
|---|---|
| 문항 수 | **50문항** |
| 형식 | 4지선다 단일 정답 |
| 시험 시간 | **120분** |
| 합격 기준 | **70% (35/50)** |
| 오답 감점 | 없음 |
| 시각/스크린샷 문항 비중 | 실제 시험 약 45% |

앱의 blueprint 상수는 이 스펙을 코드로 고정한다: `src/lib/blueprint.ts`의 `TOTAL_QUESTIONS = 50`, `PASSING_SCORE = 35` (= 70%). 모의고사 타이머는 `timeLimitSec = 120 * 60`으로 120분을 반영한다(브리프 §8).

> 참고: 실제 시험은 시각 문항이 약 45%지만, 현재 문항 은행은 시각/스크린샷 문항 비중이 그보다 낮다(브리프 §18의 알려진 갭).

## 4. 프로젝트의 두 축

이 프로젝트는 뚜렷이 구분되는 두 부분으로 이뤄진다.

1. **웹앱** — Next.js 16 App Router + TypeScript + Tailwind v4, Supabase 인증/데이터. 사용자가 문제를 풀고 진도를 관리하는 런타임.
2. **콘텐츠 엔지니어링 파이프라인** — 710문항 은행이 어떻게 생성·임포트·QA·번역·보강되었는가. 다중 에이전트 LLM 워크플로우로 구축했다(브리프 §14, §15).

두 축을 잇는 것은 **레포에 버전 관리되는 JSON 콘텐츠**다. 문항은 DB가 아니라 `content/questions/*.json`(세부주제별 14개 파일)에 저장되어 앱에 번들된다. 빌드 시 `scripts/gen-manifest.mjs`가 `predev`/`prebuild`에서 실행되어 `src/generated/all-questions.ts`(모든 콘텐츠 파일을 자동 import, `status==="verified"`만 노출)와 `src/generated/manifest.json`(홈 화면 경량화를 위한 카운트)을 생성한다(브리프 §3).

## 5. 기술 스택 요약

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16.2.9 (App Router, Turbopack), React 19.2.4 |
| 언어/스타일 | TypeScript 5, Tailwind CSS v4 |
| Markdown 렌더링 | react-markdown 10 + remark-gfm 4 (`src/components/Markdown.tsx`) |
| 인증/데이터 | Supabase (`@supabase/ssr` createBrowserClient) — Postgres + RLS |
| 호스팅 | Vercel (main 푸시 시 자동 배포) |

의존성은 `package.json`에서 확인할 수 있다. Next.js 16 특성상 `searchParams`/`params`는 async이고 `useSearchParams`는 `<Suspense>`가 필요하다(브리프 §3).

## 6. 현재 상태

- **문항 은행**: **710 verified + 3 flagged**, 총 **14개 세부주제**. `status==="verified"`만 앱에 노출되고 `flagged`는 레포에 남되 제외된다(브리프 §5, §6).
- **세부주제별 verified 수** (내림차순):

| Subtopic | 문항 |
|---|---|
| Aggregates | 138 |
| Logic Flows & Exception Handling | 97 |
| Fetching Data on Screens | 96 |
| Entities & Data Types | 71 |
| Data Relationships | 56 |
| Screen Widgets | 49 |
| Client and Server Actions | 45 |
| Blocks and Events | 38 |
| Screen Lifecycle | 37 |
| Role-based Security | 21 |
| Form Validations | 18 |
| Debugging and Monitoring | 16 |
| Modular Dependencies | 16 |
| Client Variables | 15 |

- **모의고사 blueprint**: `src/lib/blueprint.ts`의 `BLUEPRINT` 배열이 6개 대분류에 걸쳐 세부주제별 슬롯 수를 정의하며 합계는 정확히 50이다.

| Category | 문항 | Subtopic (문항) |
|---|---|---|
| Reactive Apps in OutSystems | 6 | Client Variables(1), Screen Lifecycle(3), Debugging and Monitoring(2) |
| Data Modeling | 6 | Entities & Data Types(4), Data Relationships(2) |
| Fetching Data | 10 | Aggregates(6), Fetching Data on Screens(4) |
| Logic | 11 | Client and Server Actions(2), Form Validations(4), Logic Flows & Exception Handling(5) |
| UI Design | 13 | Screen Widgets(9), Blocks and Events(4) |
| Architecture & Security | 4 | Modular Dependencies(2), Role-based Security(2) |

## 7. 라이브 · 레포 · 배포 요약

| 항목 | 값 |
|---|---|
| 라이브 URL | https://o11-quiz.vercel.app |
| 레포 | github.com/RianKim-dev/o11-quiz (private) |
| 배포 | Vercel, `main` 푸시 시 자동 재배포 |
| Supabase project ref | phhlyxxncfxzvwbxkvwn |
| 필수 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon 키는 공개 안전) |

문항 추가 흐름은 "JSON 편집 → `npm run gen`으로 매니페스트 갱신 → 커밋/푸시"이며, 푸시가 곧 배포다(README.md). `service_role` 키와 DB 비밀번호, 사내 워크북 PDF는 절대 커밋하지 않는다(브리프 §13).

## 8. 학습 모델 요지 (자세한 내용은 별도 문서)

현재 진도 모델은 문항별·사용자별 **자기평가 status** 하나로 통일되어 있다: **미확인**(기본, 행 없음) / **알아요**(`status='known'`) / **몰라요**(`status='review'`, "다시 볼 목록"). 정답 여부에서 추론하지 않고 사용자가 직접 지정한다. 로그인 사용자는 Supabase `public.question_status` 테이블(RLS `auth.uid() = user_id`), 게스트는 localStorage(`o11quiz.status.v1`)를 쓴다. 데이터 계층은 `src/lib/progress.ts`가 라우팅한다(브리프 §7).

> 주의: 루트 `README.md`는 이전 설계(자동 채점 + ⭐ 북마크 + 오답 복습, `answers`/`bookmarks` 테이블)를 아직 서술하고 있어 현재 자기평가 모델과 어긋난다. 옛 테이블과 `src/lib/storage.ts` 함수는 유지되지만 **더 이상 사용되지 않는다**(브리프 §7, §17-3). 최신 동작은 이 문서 세트의 진도/학습 모델 문서를 기준으로 삼는다.

## 9. OutSystems 사실 기준선 (문서 검증됨)

콘텐츠 QA 과정에서 초기 에이전트/시드 지식이 3차례 틀렸고, 다음 사실이 공식 문서로 교정되었다(브리프 §16). 문서 작성 시 이 기준을 따른다.

- **On Ready 이벤트는 존재한다** — Screen과 Block 모두 On Initialize / On Ready(첫 렌더 후 1회, DOM 준비) / On Render / On After Fetch 라이프사이클을 가진다.
- **쿼리(Aggregate 또는 Data Action)는 변수/필터/입력 파라미터가 바뀌어도 자동으로 재조회하지 않는다** — **Refresh Data가 항상 필요**하다. 이미 가져온 바인딩 데이터가 바뀌면 UI만 자동 재렌더된다.
- **Aggregate join 종류는 세 가지 + Cartesian**: Only With = INNER, With or Without = LEFT OUTER, With = FULL OUTER, 조인 조건 없음 = Cartesian.

## 10. 알려진 갭 / 백로그 (정직하게)

- `tsc`/build와 결정론적 `scripts/qa-check.mjs` 외 **자동화 테스트 없음**(단위/e2e 없음).
- 비밀번호 재설정(이메일) 미구현.
- 시각/스크린샷 문항 비중이 실제 시험(약 45%)보다 낮고, 일부 세부주제는 암기형에 치우침.
- ENT-058은 속성 rename의 물리 DB 동작에 대한 공식 검증 대기로 flagged 상태.
- 문항 은행에 대한 사람 OutSystems 개발자 최종 리뷰는 아직 미완.

(브리프 §18)

---

## 이 문서 세트 안내 (인덱스)

이 문서(`docs/00-overview.md`)를 시작으로, 세부 주제는 아래 문서로 이어진다. 실제 파일이 확정되면 링크를 채운다.

| 문서 | 다루는 내용 |
|---|---|
| [00 · 프로젝트 개요](./00-overview.md) | 정체성, 시험 스펙, 두 축, 현재 상태 (이 문서) |
| 아키텍처 & 기술 스택 | Next.js 16 App Router 구조, `src/app`·`src/components`·`src/lib` 지도, 빌드/매니페스트 파이프라인 |
| 데이터 모델 & 콘텐츠 계약 | `src/types/question.ts` Question 스키마, `content/README.md` 품질 기준, i18n 병기 규칙 |
| 문항 조립 & 모드 | `src/lib/questions.ts`(`assembleMockFrom` 등), `blueprint.ts`, mock/practice/review/unknown 모드 |
| 진도 & 학습 모델 | 자기평가 status, `src/lib/progress.ts`, `question_status` 테이블, Dashboard/QuizRunner |
| 인증 & 보안 | `@concentrix.com` 제한(config.ts + DB 트리거), RLS 정책, 시크릿 관리 |
| 콘텐츠 파이프라인 & QA | 다중 에이전트 생성·임포트, 3단계 QA, 근거 주입 보강 |
| 결정 로그 (ADR) | 브리프 §17의 주요 설계 결정 |

> 개별 문서를 읽을 때도 OutSystems 관련 사실은 §9의 문서 검증 기준선을 따르고, 불확실한 항목은 "알려진 갭"으로 명시한다.
