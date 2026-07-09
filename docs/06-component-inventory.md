# 컴포넌트 & 모듈 인벤토리 (Component Inventory)

> 범위: `src/components/*` 8개 UI 컴포넌트와 `src/lib/*` 데이터/컨텍스트 모듈의 책임·주요 props/exports·의존 관계, 클라이언트/서버 구분, 상태 소유 위치, 재사용·결합도 코멘트.

이 문서는 O11 Quiz 앱의 렌더링·상태·데이터 계층을 파일 단위로 정리한 인벤토리다. 앱은 Next.js 16 App Router + React 19 기반이며, 화면 로직은 대부분 클라이언트 컴포넌트(`"use client"`)에 있고, 서버 컴포넌트는 정적 렌더링(예: `Markdown.tsx`)에 한정된다. 진도(self-assessment status)는 로그인 시 Supabase, 게스트 시 `localStorage`로 라우팅되는 단일 데이터 계층(`src/lib/progress.ts`)이 소유한다. 아래 표의 파일 경로·함수명·테이블명은 코드에서 그대로 확인 가능하도록 English로 유지했다.

주의: 아래 항목 중 `src/lib/blueprint.ts`, `src/lib/manifest.ts`, `src/lib/status.ts`, `src/lib/storage.ts`, `src/lib/authStore.ts`, `src/lib/config.ts`, `src/lib/supabase/client.ts`, `src/generated/all-questions.ts`는 이번 조사에서 직접 읽지 않고 brief(§4, §7, §16)와 다른 파일의 import 시그니처를 통해 확인한 것이다. 시그니처 수준은 정확하나 내부 구현 세부는 해당 파일 자체로 검증할 것.

---

## 1. 한눈에 보는 인벤토리

### 1.1 `src/components/*` (UI 컴포넌트)

| 파일 | 클라/서버 | 한 줄 책임 | 주요 export / props | 핵심 의존 |
|------|-----------|-----------|---------------------|-----------|
| `Dashboard.tsx` | Client (`"use client"`) | 홈 화면: 전체·주제별 진도 집계, 모드 진입 카드 | default `Dashboard()` (props 없음) | `manifest`, `blueprint`, `questions`, `progress`, `auth`, `Help` |
| `QuizClient.tsx` | Client | mode/subtopic/filter로 문제 세트를 조립해 `QuizRunner`에 전달 | default `QuizClient({ mode, subtopic?, filter? })` | `questions`, `progress`, `QuizRunner` |
| `QuizRunner.tsx` | Client | 풀이+복습 통합 엔진(단일 문항 뷰, 팔레트, 채점, 자가표시) | default `QuizRunner({ questions, title, mode, timeLimitSec? })` | `progress`, `auth`, `i18n`, `Markdown`, `status`(type) |
| `Help.tsx` | Client | ❓ 사용법 & FAQ 모달 (시스템 개요/모드/FAQ) | default `Help()` (props 없음), 내부 `Section` | React state만 |
| `AuthBar.tsx` | Client | 헤더의 로그인 상태/로그아웃/게스트 표시 | default `AuthBar()` (props 없음) | `auth` |
| `AuthGate.tsx` | Client | Supabase 설정 시 비로그인 접근 차단(로그인으로 redirect) | default `AuthGate({ children })` | `auth`, `next/navigation` |
| `LangToggle.tsx` | Client | 헤더의 한국어/EN 언어 토글 | default `LangToggle()` (props 없음) | `i18n` |
| `Markdown.tsx` | **Server**(no `"use client"`) | Markdown(stem/diagram/explanation) 렌더 | named `Markdown({ children: string })` | `react-markdown`, `remark-gfm` |

### 1.2 `src/lib/*` (데이터·컨텍스트 모듈, 이번에 읽은 파일)

| 파일 | 클라/서버 | 한 줄 책임 | 주요 export | 핵심 의존 |
|------|-----------|-----------|-------------|-----------|
| `i18n.tsx` | Client(Provider) | 언어 컨텍스트 + 문항 필드별 로컬라이즈 | `LanguageProvider`, `useLang`, `localizeQuestion`, type `Lang` | React context, `localStorage` |
| `questions.ts` | isomorphic | 검증 문항 필터 + shuffle/과목별/모의고사 조립 | `ALL_QUESTIONS`, `shuffle`, `getBySubtopic`, `subtopicCounts`, `assembleMock`, `assembleMockFrom` | `@/generated/all-questions`, `blueprint` |
| `progress.ts` | Client(런타임) | 진도 데이터 계층: Supabase ↔ localStorage 라우팅 | `loadStatuses`, `setStatus`, `setStatusBulk`, `clearStatuses` (+ 레거시 answers/bookmarks), type `QStatus` | `supabase/client`, `authStore`, `status`, `storage` |
| `auth.tsx` | Client(Provider) | 인증 상태·로그인/가입/로그아웃, @도메인 검증 | `AuthProvider`, `useAuth`, type `AuthState`(내부) | `supabase/client`, `authStore`, `config` |

### 1.3 참조되는 `src/lib/*`·`src/generated/*` (이번에 미독, brief/시그니처 기반)

| 파일 | 역할(추정 근거) |
|------|------------------|
| `src/lib/blueprint.ts` | `BLUEPRINT`(과목별 slot 카운트), `CATEGORY_ORDER`, `TOTAL_QUESTIONS=50`, `PASSING_SCORE=35`. brief §6 및 `Dashboard`/`questions` import에서 확인 |
| `src/lib/manifest.ts` | `MANIFEST`(문항 카운트 등). 홈이 가볍도록 count만 노출. brief §3, `Dashboard` import |
| `src/lib/status.ts` | `localStorage` 상태(`o11quiz.status.v1`) 계층: `getStatusMap`, `setStatusLocal`, `setStatusBulkLocal`, `clearStatusLocal`, type `QStatus`. `progress.ts` import에서 확인 |
| `src/lib/storage.ts` | 레거시 answers/bookmarks localStorage. brief §7에 "retained but unused". `progress.ts`가 여전히 import |
| `src/lib/authStore.ts` | 모듈 레벨 현재 userId 저장: `currentUserId`, `setCurrentUserId`. `progress.ts`·`auth.tsx` import |
| `src/lib/config.ts` | `ALLOWED_EMAIL_DOMAIN="concentrix.com"`. `auth.tsx` import |
| `src/lib/supabase/client.ts` | `getSupabase`(browser client), `isSupabaseConfigured`. `auth.tsx`·`progress.ts` import |
| `src/generated/all-questions.ts` | `RAW_QUESTIONS`(모든 `content/questions/*.json` 자동 import). `scripts/gen-manifest.mjs`가 생성. `questions.ts` import |

---

## 2. 컴포넌트 상세

### 2.1 `Dashboard.tsx` (Client) — 홈/진도 화면
- **책임**: `ALL_QUESTIONS`를 순회하며 진도 통계를 집계한다. `loadStatuses()`로 `Map<id, QStatus>`를 받아 (a) 전체 `{ known, review, total }`, (b) 과목별 `Record<subtopic, SubStat>`를 계산한다(`load()`).
- **UI 구성**: 상단 전체 진도바(초록 = `known` 비율, amber = `review` 비율) + 카운트 문구, 모드 진입 4카드(`모의고사`/`📖 연습 모드`/`🔖 다시 볼 목록(N)`/`⚪ 미확인 목록(N)`), `CATEGORY_ORDER`로 그룹화한 주제별 행(과목명 연습 링크 + 미니 진도바 + `알아요/몰라요/미확인` 클릭 배지), 하단 `진도 초기화`(`clearStatuses()` → `confirm` 후 `load()`), 헤더의 `<Help />`.
- **상태 소유**: 로컬 state `mounted`, `stats`, `overall`만. 진도의 원천은 `progress.ts`이며 Dashboard는 파생 집계만 보유한다. `mounted` 게이트로 SSR/CSR hydration 불일치를 피한다(진도바·카운트는 mount 후에만 렌더).
- **의존/트리거**: `useAuth()`의 `userId`를 effect 의존성으로 삼아, 로그인/로그아웃 시 재집계한다.
- **링크 계약**: 배지·과목명은 `"/quiz?mode=practice&subtopic=…&filter=known|review|unknown"` 형태 URL을 생성한다. `subtopic`은 `encodeURIComponent`로 인코딩. 이 URL 스킴이 `QuizClient`와의 유일한 결합점이다(느슨한 결합).
- **엣지 케이스**: `st.total === 0` 과목은 링크 대신 dimmed span. 0-카운트 배지는 색은 유지하되 `opacity-40` + 비클릭.

### 2.2 `QuizClient.tsx` (Client) — 문제 세트 조립기
- **책임**: `mode`/`subtopic`/`filter` prop과 현재 진도(`loadStatuses`)를 조합해 실제 `Question[]`를 만들고, 제목·안내문(`note`)과 함께 `QuizRunner`에 넘긴다. 스스로는 문항을 렌더하지 않는다.
- **모드 분기**(brief §8과 일치):
  - `mock`: `assembleMockFrom(known)` — 이미 `known`인 문항을 뒤로 미뤄 모르는 것 우선. shortfall > 0이면 부족 안내문.
  - `review`: `statuses.get(id) === "review"` 문항만 shuffle (다시 볼 목록).
  - `unknown`: `!statuses.get(id)` 문항만 shuffle (미확인 목록) + practiceNote.
  - `practice` + `subtopic`: `getBySubtopic(subtopic)`에 `filter`(known/review/unknown) 적용 후 shuffle.
  - 그 외(=`practice` no subtopic): `mock`과 동일한 `assembleMockFrom(known)`이되 무타이머·해설 포함.
- **상태 소유**: 로컬 state `questions`(null=로딩)·`title`·`note`. effect는 `cancelled` 플래그로 언마운트/의존성 변경 시 stale set 방지.
- **`timeLimitSec` 계약**: `mode === "mock"`일 때만 `120*60`을 넘긴다. 이 값 유무가 `QuizRunner`의 timed/blind 동작을 결정한다.
- **엣지 케이스**: 로딩 중 "불러오는 중…", `questions.length === 0`이면 모드별 안내문 + 홈 링크.

### 2.3 `QuizRunner.tsx` (Client) — 통합 풀이+복습 엔진
가장 크고 상태가 밀집된 컴포넌트. 한 화면에서 풀이·채점·복습·자가표시를 모두 처리한다(brief §9).
- **props**: `{ questions, title, mode, timeLimitSec? }`. `timed = mode === "mock"`.
- **로컬 state**: `idx`(현재 문항), `chosen: Record<id, OptionKey>`(선택), `statusMap: Map<id, QStatus>`, `revealed: Set<id>`(연습에서 해설 열린 문항), `submitted`, `timeLeft`.
- **파생값**: `current = questions[idx]`, `loc = localizeQuestion(current, lang)`, `answeredCount`, `correctCount`(useMemo), `pct`, `passed = pct >= 70`, `solving = timed && !submitted`, `isRevealed(q) = submitted || revealed.has(q.id)`.
- **타이머**: mock 전용 countdown effect. `timeLeft <= 0`이면 `submit()` 자동 호출. 60초 미만이면 rose 강조.
- **채점**: `submit()`은 `submitted=true`·`idx=0`·스크롤 top. 점수 배너 + **일괄 표시** 3버튼: `wrongReview`(틀린 것→몰라요), `correctKnown`(맞은 것→알아요), `correctUnseenKnown`(맞은 미확인만→알아요). `bulk()`가 `entries` 만들어 낙관적 setState 후 `setStatusBulk(entries)`.
- **자가표시**: `mark(id, s)` — 같은 상태 재클릭 시 `null`로 해제(토글). 낙관적 `statusMap` 갱신 후 `saveStatus(id, next)` 저장. 모든 모드/상태에서 노출(풀이 중 mock 포함, 선택).
- **팔레트 색상**(brief §9): solving = answered(dark)/current(rose)/미답(slate). review = 상태색(known green/review amber/미확인 slate) + submitted mock이면 `✓/✗` 채점 배지, current는 ring.
- **reveal**: `!timed && !revealedNow`일 때 "정답 확인 · 해설 보기" 버튼 → `reveal(id)`. mock은 제출 전 blind(해설·정답 숨김).
- **상태 소유 vs 위임**: 세션 상태(선택·인덱스·채점)는 전부 로컬. **영속 상태는 `statusMap`만**이며 `progress.ts`(`loadStatuses`/`setStatus`/`setStatusBulk`)에 위임한다. **mock 점수는 세션 한정, 저장 안 함**(brief §9).
- **i18n 결합**: `useLang()`+`localizeQuestion`으로 stem/options/diagram만 현재 언어로 표시. `explanation`은 항상 한국어(brief §5).
- **`userId` effect**: 로그인 전환 시 `loadStatuses().then(setStatusMap)`로 재로딩.

### 2.4 `Help.tsx` (Client) — 사용법 & FAQ 모달
- **책임**: 시스템 개요·모드 4가지·자가표시 모델·참고 박스·언어·FAQ를 담은 모달. Dashboard 헤더의 `❓ 사용법` 버튼.
- **상태 소유**: 로컬 `open`만. 진도·데이터 의존 전무 → 완전 자족적(가장 재사용·이식 쉬운 컴포넌트).
- **UX**: Escape 키 닫기(effect), 배경 클릭 닫기(내부 `stopPropagation`). 내부 `Section` 헬퍼로 문단 구조화.
- **주의**: 모달 텍스트가 앱 규칙(50문항·120분·70%, 자가표시 정의, 모드 설명)을 하드코딩. 규칙 변경 시 이 파일도 함께 갱신해야 하는 문서-코드 동기화 부담이 있다.

### 2.5 `AuthBar.tsx` (Client) — 헤더 인증 표시
- **책임**: `useAuth()`의 `{ configured, loading, name, userId, signOut }`로 상태별 표시. `!configured`→"게스트 모드", `loading`→"…", `userId`→이름+로그아웃 버튼, 그 외→`/login` 링크.
- **상태 소유**: 없음(순수 표시). `auth.tsx` 컨텍스트에만 의존.

### 2.6 `AuthGate.tsx` (Client) — 로그인 게이트
- **책임**: Supabase 설정 시 비로그인 사용자를 `/login`으로 redirect하여 앱 접근 차단. `/login` 라우트는 항상 통과. 미설정(로컬 키 없음)이면 게스트 개방(brief §13).
- **로직**: `needsAuth = configured && !loading && !userId && !isLoginRoute`. effect에서 `router.replace("/login")`. 렌더는 loading/미로그인/정상 3분기.
- **상태 소유**: 없음. `useAuth` + `usePathname`/`useRouter`에 의존.

### 2.7 `LangToggle.tsx` (Client) — 언어 토글
- **책임**: `useLang()`의 `lang/setLang`으로 `ko`/`en` 전환. `LABELS = { ko: "한국어", en: "EN" }`.
- **상태 소유**: 없음. 언어 상태는 `i18n.tsx`가 소유.

### 2.8 `Markdown.tsx` (**Server**) — Markdown 렌더러
- **책임**: `react-markdown` + `remark-gfm`으로 stem/diagram(표·플로차트)/explanation을 렌더. `.md-body` 래퍼.
- **특이점**: 유일하게 `"use client"`가 **없는** 순수 렌더 컴포넌트(named export `Markdown`, prop `children: string`). 상태·이벤트 없음 → 서버 컴포넌트로 동작 가능하고 재사용성 최고. `QuizRunner`가 stem/diagram/explanation 3곳에서 재사용.

---

## 3. 라이브러리 모듈 상세

### 3.1 `i18n.tsx` (Client Provider)
- **exports**: `type Lang = "en" | "ko"`, `LanguageProvider`, `useLang`, `localizeQuestion`.
- **상태 소유**: 언어 컨텍스트의 단일 소유자. 초기값 `ko`, mount 후 `localStorage["o11quiz.lang.v1"]`에서 복원, `setLang`이 state+localStorage 동시 갱신.
- **`localizeQuestion(q, lang)`**: `lang === "ko" && q.i18n?.ko`일 때 **필드별 fallback**(`ko.stem ?? q.stem`, `ko.options ?? q.options`, `ko.diagram ?? q.diagram`) 적용. 그 외 English base 반환. 즉 미번역 문항도 English로 안전 렌더(brief §5). `explanation`은 여기서 다루지 않음(항상 한국어 공유).
- **결합도**: 진도는 언어 무관(질문 id 공유)이라 i18n과 progress는 독립적.

### 3.2 `questions.ts` (isomorphic 데이터 헬퍼)
- **exports**: `ALL_QUESTIONS`, `shuffle`, `getBySubtopic`, `subtopicCounts`, `assembleMock`, `assembleMockFrom`.
- **`ALL_QUESTIONS`**: `RAW_QUESTIONS.filter(status === "verified")` — flagged/draft 제외(brief §5, §6). `RAW_QUESTIONS`는 `src/generated/all-questions.ts`(빌드 시 생성).
- **`assembleMockFrom(answeredIds)`**: `BLUEPRINT`의 과목별 `spec.count`를 항상 준수. 과목 내에서 미답(`fresh`) 우선 → 답한 것(`seen`)으로 채움, 최종 `shuffle`. 부족분 `shortfall` 합산. 빈 Set이면 순수 랜덤 모의고사(`assembleMock`이 이를 호출). 인자명은 `answeredIds`지만 `QuizClient`는 여기에 `known`(알아요) id 집합을 전달 → 실질적으로 "이미 아는 문항 뒤로 미루기"로 동작(brief §8).
- **상태 소유**: 없음(순수 함수/상수). `Math.random` 기반 shuffle이라 결정적이지 않음.

### 3.3 `progress.ts` (진도 데이터 계층)
- **핵심 라우팅**: `remote()`가 `currentUserId()`(authStore)와 `getSupabase()`가 모두 있으면 `{ uid, sb }` 반환, 아니면 `null`. `null`이면 `localStorage`(`status.ts`), 아니면 Supabase(RLS `auth.uid()=user_id`)로 라우팅(brief §7).
- **현행 status API**: `loadStatuses(): Map<id, QStatus>`, `setStatus(id, status|null)`(null=미확인 복원, upsert/delete), `setStatusBulk(entries)`(set은 upsert, clear는 `.in()` delete), `clearStatuses()`. 테이블 `public.question_status(user_id, question_id, status, updated_at, PK(user_id,question_id))`.
- **레거시(unused)**: `loadAnswers`/`saveAnswers`/`clearAnswers`/`loadBookmarks`/`setBookmark`와 `answers`/`bookmarks` 테이블은 코드에 남아 있으나 자가표시 재설계 후 UI에서 호출되지 않음(brief §7, §17). `storage.ts` import도 이 레거시 때문에 유지.
- **상태 소유**: 영속 진도의 **단일 소유·유일 게이트웨이**. `Dashboard`·`QuizClient`·`QuizRunner`가 모두 이 모듈만 통해 진도를 읽고 쓴다(높은 응집, 잘 격리된 결합).
- **재export**: `type { AnswerRecord, QStatus }`. 컴포넌트는 `QStatus`를 여기(또는 `status.ts`)에서 가져온다.

### 3.4 `auth.tsx` (Client Provider)
- **exports**: `AuthProvider`, `useAuth(): AuthState`. `AuthState = { userId, name, loading, configured, signIn, signUp, signOut }`.
- **세션 동기화**: mount 시 `getSupabase()`가 없으면 `loading=false`로 게스트. 있으면 `getSession()` + `onAuthStateChange` 구독. `applyUser(u)`가 `userId`·`name`(`user_metadata.display_name ?? email`) 세팅하고 **`setCurrentUserId(id)`로 authStore에 반영** → `progress.ts`의 라우팅이 이 값을 읽음(auth ↔ progress 연결고리).
- **가입 도메인 제약**: `signUp`에서 `@${ALLOWED_EMAIL_DOMAIN}`(=concentrix.com) 미일치 시 차단(클라이언트 검증). DB trigger가 서버측 이중 방어(brief §13). 세션 없으면 `needsConfirm=true`(이메일 확인 필요).
- **에러 UX**: `mapError`가 Supabase `AuthError` 메시지를 한국어 안내로 매핑.
- **상태 소유**: 인증 상태의 단일 소유자. `AuthBar`·`AuthGate`·`Dashboard`·`QuizRunner`가 `useAuth`로 구독.

---

## 4. 의존 그래프 (요약)

```
app/page.tsx ──► Dashboard ──► Help
                    │           (자족적)
                    ├─► manifest / blueprint / questions
                    └─► progress ─┬─► supabase/client
                                  ├─► authStore ◄── auth (setCurrentUserId)
                                  ├─► status (localStorage)
                                  └─► storage (legacy, unused)

app/quiz/page.tsx ─(Suspense)─► QuizClient ──► QuizRunner
        (mode/subtopic/filter)      │              ├─► i18n (localizeQuestion, useLang)
                                    │              ├─► Markdown (Server)
                                    ├─► questions  ├─► progress (status R/W)
                                    └─► progress   └─► auth (userId)

layout(header): LangToggle ─► i18n     AuthBar ─► auth     AuthGate ─► auth
Providers(추정): AuthProvider · LanguageProvider가 트리 상단에서 감쌈
```

- **컨텍스트 3종**이 상태 소유의 중심: `auth.tsx`(인증), `i18n.tsx`(언어), 그리고 컨텍스트는 아니지만 `progress.ts`(+`authStore.ts`)가 진도. 나머지 컴포넌트는 대부분 이들의 소비자.
- **결합의 급소**는 두 곳: (1) Dashboard↔QuizClient 사이의 `/quiz?mode/subtopic/filter` **URL 스킴**(문자열 계약, 타입 미보장), (2) `mode` 문자열이 `QuizClient`·`QuizRunner`·`timeLimitSec` 유무를 동시에 좌우 — mock 특수 로직이 여러 파일에 흩어져 있음.

---

## 5. 재사용·결합도 코멘트 (senior 관점)

- **잘 격리된 부분**: `progress.ts`가 Supabase/localStorage 라우팅을 단일 지점에 캡슐화해, 컴포넌트는 저장 위치를 몰라도 된다. `Markdown.tsx`는 상태 없는 서버 컴포넌트로 3곳에서 재사용되는 모범 사례. `Help.tsx`는 의존 0의 자족 모달.
- **비대한 컴포넌트**: `QuizRunner.tsx`(약 400줄)가 풀이/채점/복습/자가표시/타이머/팔레트를 한 컴포넌트에 담아 상태가 6개. 통합 UX 의도(brief §9)에 부합하나, 테스트·수정 시 리스크 집중 지점이다.
- **레거시 잔재**: `progress.ts`의 answers/bookmarks API와 `storage.ts`가 unused 상태로 남아 사표면(surface)을 넓힌다(brief §7, §17). 정리 여지 있음.
- **문자열 계약 취약성**: `mode`/`filter`/`subtopic`이 타입이 아닌 문자열로 흐른다(`QuizClient` props도 `mode: string`). 오타·미지원 모드가 컴파일 타임에 안 걸린다.
- **하드코딩 동기화 부담**: `Help.tsx`(모드/규칙 설명), `Dashboard.tsx`(카드 문구), 실제 로직(`QuizClient`/`blueprint`)이 각각 "50문항·120분·70%·모드 4종"을 반복 서술 → 규칙 변경 시 다지점 수정 필요.
- **OutSystems 사실 정합성**: 이 계층은 순수 앱 로직으로, 문항 내용(정답·해설)의 OutSystems 사실성은 `content/questions/*.json`과 파이프라인/QA에서 보장된다(brief §15–16). 컴포넌트는 `status === "verified"` 필터(`questions.ts`) 외에는 내용 검증에 관여하지 않는다.

---

## 6. 알려진 갭 / 불확실 (정직 표기)

- `blueprint.ts`·`manifest.ts`·`status.ts`·`storage.ts`·`authStore.ts`·`config.ts`·`supabase/client.ts`·`generated/all-questions.ts`는 **직접 읽지 않음**(§1.3). 시그니처는 import로 검증되나 내부 구현은 해당 파일로 확인 필요.
- 상단 Provider 배치(`AuthProvider`/`LanguageProvider`가 `layout.tsx` 어디서 트리를 감싸는지)는 brief §4 기반 추정이며 `src/app/layout.tsx`를 읽어 확정할 것.
- 자동화 테스트는 `tsc`/build + `qa-check.mjs`뿐, 컴포넌트 단위/e2e 테스트 없음(brief §18) — 본 인벤토리의 동작 기술은 소스 판독 기반이지 실행 검증 기반이 아니다.
