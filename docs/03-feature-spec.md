# 기능 명세 / PRD (Feature Spec)

> 범위: o11-quiz 웹 앱의 학습자 대면(front-end) 기능 요구사항 — 5개 학습 모드, 자가평가 상태 모델, 채점·복습·일괄 마킹, 이중언어, 3계층 해설, 대시보드 진도, 사용법 모달. 콘텐츠 생성 파이프라인·인프라·인증은 별도 문서(각각 content pipeline, deployment, security 문서)를 참조.

이 문서는 OutSystems 11 **Associate Reactive Developer (O11)** 자격증 대비 예상문제집 앱의 제품 요구사항을 역설계(reverse-engineering)해 정리한다. 대상 사용자는 Concentrix 그룹의 **비개발자** 학습자이며, 실제 시험(50문항·120분·70% 합격, 35/50)을 겨냥한다. 각 기능은 유저 스토리(`…하고 싶다`)와 수용 기준(acceptance criteria)으로 기술하고, 구현 근거가 되는 파일·함수·필드를 English 식별자로 명시해 탐색 가능하게 한다.

핵심 코드 위치는 다음과 같다.

| 관심사 | 파일 | 핵심 심볼 |
| --- | --- | --- |
| 모드별 문항 세트 조립 | `src/components/QuizClient.tsx` | `mode` / `subtopic` / `filter` 분기 |
| 풀이·복습 통합 엔진 | `src/components/QuizRunner.tsx` | `submit`, `mark`, `bulk`, number palette |
| 홈·진도 | `src/components/Dashboard.tsx` | `load()`, `SubStat`, overall bar |
| 사용법 모달 | `src/components/Help.tsx` | `Help` (modal) |
| 모의고사 블루프린트 | `src/lib/blueprint.ts` | `BLUEPRINT`, `TOTAL_QUESTIONS`, `PASSING_SCORE`, `CATEGORY_ORDER` |
| 문항 조립·필터 | `src/lib/questions.ts` | `ALL_QUESTIONS`, `assembleMockFrom`, `getBySubtopic`, `shuffle` |
| 진도 데이터 계층 | `src/lib/progress.ts` | `loadStatuses`, `setStatus`, `setStatusBulk`, `clearStatuses` |
| 상태 타입 | `src/lib/status.ts` | `QStatus` (`known` \| `review`) |
| 이중언어 | `src/lib/i18n.tsx` | `LanguageProvider`, `useLang`, `localizeQuestion` |

---

## 1. 자가평가 상태 모델 (모든 기능의 토대)

### 1.1 개요

기존의 자동 채점 + 별표 북마크 + 오답 복습(3중 시스템)을 폐기하고, **문항당·사용자당 하나의 자가평가 상태**로 통합했다(브리프 §7, §17-3). 상태는 정답 여부에서 추론하지 않고 **사용자가 직접** 설정한다.

| 상태 | 값(`QStatus`) | 저장 형태 | 의미 |
| --- | --- | --- | --- |
| 미확인 | (없음 / row 없음) | 기본값, DB에 row 미존재 | 아직 어느 쪽으로도 표시하지 않음 |
| 알아요 | `known` | `question_status.status='known'` | 이 문항은 안다 |
| 몰라요 | `review` | `question_status.status='review'` | 다시 볼 것 → "다시 볼 목록"에 모임 |

세 상태는 상호 배타적이다. `progress.ts`가 로그인+Supabase 구성 시 `public.question_status` 테이블(PK `(user_id, question_id)`, RLS `auth.uid() = user_id`)로, 그 외에는 localStorage(`o11quiz.status.v1`, `src/lib/status.ts`)로 라우팅한다. 진도는 언어 무관(question `id`가 언어 공통)하다.

### 1.2 유저 스토리 & 수용 기준

- **US-1.1** 학습자로서, 각 문항을 풀며 "이건 안다/모른다"를 **스스로 표시**하고 싶다. 자동 채점이 진도를 임의로 매기지 않게.
  - 문제 카드 하단에 항상 `알아요 ✓` / `몰라요 🔖` 두 버튼이 노출된다(`QuizRunner.tsx` self-assessment 영역, 모든 모드/상태에서 렌더).
  - 버튼을 누르면 `mark(id, status)`가 호출되어 optimistic하게 `statusMap`을 갱신하고 `saveStatus(id, next)`로 영속화한다.
  - **같은 버튼을 다시 누르면 미확인으로 해제**된다(`const next = statusMap.get(id) === s ? null : s`).
  - 현재 선택된 상태 버튼은 채운 배경(known=emerald, review=amber)으로 강조된다.
- **US-1.2** 학습자로서, 로그인하면 표시가 계정에 동기화되어 **기기가 바뀌어도** 유지되길 원한다.
  - 로그인+Supabase 구성 시 `question_status`에 저장(RLS로 사용자 격리), 게스트는 localStorage.
  - `QuizRunner`·`Dashboard`는 `userId` 변경 시 `loadStatuses()`를 재실행한다(`useEffect(..., [userId])`).
- **US-1.3** 학습자로서, 몰라요로 표시한 문항이 **한곳에 모여** 나중에 다시 풀 수 있으면 좋겠다.
  - `review` 상태 문항은 "다시 볼 목록"(§2.4)에 집계·수집된다. 버튼 툴팁이 이 동작을 안내한다.

> 알려진 갭(브리프 §18): 상태 변경에 대한 자동화 단위/e2e 테스트는 없다. 영속화는 optimistic 업데이트로, 저장 실패 시 롤백 로직은 코드상 확인되지 않는다.

---

## 2. 5개 학습 모드

문항 세트 조립은 전적으로 `QuizClient.tsx`가 담당하고, 실제 풀이·복습 UI는 `QuizRunner`가 단일 엔진으로 처리한다. URL 규약: `/quiz?mode=…&subtopic=…&filter=…` (`quiz/page.tsx`가 `<Suspense>` 안에서 파라미터를 `QuizClient`로 전달, 브리프 §8).

| 모드 | `mode` | 조립 로직 | 타이머 | 해설/공개 | 채점 |
| --- | --- | --- | --- | --- | --- |
| 모의고사 | `mock` | `assembleMockFrom(known)` | 120분 | 제출 후 일괄 공개 | 세션 한정 점수 |
| 연습 모드 | `practice` (subtopic 없음) | `assembleMockFrom(known)` | 없음 | 문항별 reveal | 없음 |
| 주제별 연습 | `practice` + `subtopic` (+`filter`) | `getBySubtopic` → status 필터 | 없음 | 문항별 reveal | 없음 |
| 다시 볼 목록 | `review` | `status==='review'` 필터 | 없음 | 문항별 reveal | 없음 |
| 미확인 목록 | `unknown` | 상태 없는 문항 필터 | 없음 | 문항별 reveal | 없음 |

모든 모드는 조립 전에 `loadStatuses()`로 상태를 읽고, `known` 집합을 만들어 조립에 활용한다. 문항 순서는 조립 결과를 그대로 쓰거나(`assembleMockFrom`) `shuffle()`로 섞는다.

### 2.1 모드: 모의고사 (`mock`)

- **US-2.1** 학습자로서, **실제 시험과 같은 비율·문항 수·시간**으로 실전처럼 풀고 채점받고 싶다.
  - `assembleMockFrom(known)`로 `BLUEPRINT`(§3) 기준 50문항을 조립한다. 제목은 "모의고사".
  - 타이머는 `timeLimitSec = 120 * 60`. `QuizRunner`가 1초 카운트다운(`setTimeLeft`)하며, 남은 시간 60초 미만이면 타이머 배지가 rose로 바뀐다. **0이 되면 자동 제출**(`submit()`).
  - 풀이 단계는 **블라인드**: 해설·정답이 숨겨지고(`solving = timed && !submitted`), 보기는 클릭해 선택만 가능하다.
  - 마지막 문항에서 "제출하고 채점" 버튼. 미답변이 남아 있으면 `confirm(\`아직 N문항이 미답변…\`)`으로 확인 후 제출.
- **US-2.2** 채점 후 내 점수와 **합격선 통과 여부**를 즉시 보고 싶다.
  - 제출 시 `submitted=true`, `idx=0`으로 리셋, 스크롤 top.
  - 채점 배너: `correctCount / total`, `pct = round(correctCount/total*100)`, `passed = pct >= 70`. 통과 시 emerald "합격선 통과 ✓", 미달 시 rose "합격선 미달".
  - **점수는 세션 한정**(브리프 §9, §17-3) — 저장하지 않는다. 진도는 오직 알아요/몰라요 표시로만 반영된다.
- **US-2.3** 아직 **모르는 문항 위주로** 모의고사가 구성되길 원한다.
  - `assembleMockFrom(known)`은 이미 `known`으로 표시한 문항을 후순위로 미뤄, 모르는 문항을 우선 채운다(브리프 §8).
- **US-2.4** 은행에 문항이 부족할 때 그 사실을 알고 싶다.
  - `assembleMockFrom`이 `shortfall > 0`을 반환하면 "실제 시험은 50문항이지만 현재 은행에 문항이 부족해 N문항으로 구성했어요." 노트를 표시한다.

### 2.2 모드: 연습 모드 (`practice`, subtopic 없음)

- **US-2.5** 시험 비율 그대로 50문항을 **타이머 없이, 해설을 보며** 연습하고 싶다.
  - 모의고사와 **동일한** `assembleMockFrom(known)` 조립. 단 `timeLimitSec=undefined`, 제목 "연습 모드".
  - 문항별로 "정답 확인 · 해설 보기" 버튼(`reveal`)을 눌러 정답·해설을 개별 공개(§4).
  - 상단에 안내 노트: "연습 모드는 성적에 반영되지 않아요. '정답 확인'을 열어 해설을 보고, '알아요/몰라요'로 표시해 보세요." (`practiceNote`)

### 2.3 모드: 주제별 연습 + 상태 필터 (`practice` + `subtopic` [+ `filter`])

- **US-2.6** 특정 과목만 골라 집중 연습하고 싶다.
  - `getBySubtopic(subtopic)` 풀을 `shuffle()`해서 사용. 제목 "연습 · {subtopic}".
- **US-2.7** 그 과목에서 **알아요/몰라요/미확인 중 한 상태의 문항만** 뽑아 풀고 싶다.
  - `filter` 값에 따라 풀을 좁힌다: `known` → 알아요만(제목 suffix " · 🟢 알아요"), `review` → 몰라요만(" · 🟡 몰라요"), `unknown` → 상태 없는 문항만(" · ⚪ 미확인").
  - 이 진입점은 대시보드의 클릭 가능한 상태 배지(§5)에서 만들어진다.
- 조건에 맞는 문항이 0개면 "이 조건에 해당하는 문항이 아직 없어요." + 홈 링크를 표시한다.

### 2.4 모드: 다시 볼 목록 (`review`)

- **US-2.8** 몰라요로 표시한 문항만 모아 반복 복습하고 싶다.
  - `ALL_QUESTIONS.filter(q => statuses.get(q.id) === 'review')`를 `shuffle()`. 제목 "다시 볼 목록".
  - 비어 있으면 안내: "다시 볼 문항이 없어요. 문제를 풀며 '몰라요'로 표시하면 여기에 모입니다."

### 2.5 모드: 미확인 목록 (`unknown`)

- **US-2.9** 아직 아무 표시도 안 한 문항만 골라 빠짐없이 훑고 싶다.
  - `ALL_QUESTIONS.filter(q => !statuses.get(q.id))`를 `shuffle()`. 제목 "미확인 목록", `practiceNote` 표시.
  - 비어 있으면 축하 문구: "미확인 문항이 없어요. 모든 문항을 '알아요' 또는 '몰라요'로 표시하셨네요! 👏"

---

## 3. 모의고사 블루프린트 (`src/lib/blueprint.ts`)

공식 Certification Detail Sheet의 주제 분포를 그대로 반영해 50문항을 조립한다. `TOTAL_QUESTIONS=50`, `PASSING_SCORE=35`(70%).

| Category | Subtopic | 슬롯 수 |
| --- | --- | --- |
| Reactive Apps in OutSystems | Client Variables | 1 |
| Reactive Apps in OutSystems | Screen Lifecycle | 3 |
| Reactive Apps in OutSystems | Debugging and Monitoring | 2 |
| Data Modeling | Entities & Data Types | 4 |
| Data Modeling | Data Relationships | 2 |
| Fetching Data | Aggregates | 6 |
| Fetching Data | Fetching Data on Screens | 4 |
| Logic | Client and Server Actions | 2 |
| Logic | Form Validations | 4 |
| Logic | Logic Flows & Exception Handling | 5 |
| UI Design | Screen Widgets | 9 |
| UI Design | Blocks and Events | 4 |
| Architecture & Security | Modular Dependencies | 2 |
| Architecture & Security | Role-based Security | 2 |
| **합계** | | **50** |

`CATEGORY_ORDER`는 대시보드 주제별 진도 섹션의 표시 순서로도 재사용된다(§5). 은행 문항 수는 주제별로 블루프린트 슬롯을 충분히 웃돌지만(예: Aggregates 138개 확보), 상황에 따라 `assembleMockFrom`이 부족(`shortfall`)을 신호할 수 있다.

- **US-3.1** 학습자로서, 모의고사가 **실제 시험의 주제 비중**을 반영해 어느 영역이 시험에서 큰지 자연스럽게 체감하고 싶다.
  - 조립은 항상 `BLUEPRINT`를 기준으로 하며, `known`으로 표시한 문항은 후순위로 밀린다.

---

## 4. 채점 · 복습 · 일괄 마킹 (`QuizRunner.tsx`)

### 4.1 통합 풀이/복습 엔진

한 번에 한 문항을 보여주는 단일 뷰다(별도의 긴 결과 페이지 없음, 브리프 §9). 상단에 번호 팔레트(number palette)와 이전/다음 내비게이션이 있다.

**번호 팔레트 색상 규약**

| 단계 | 색상 규칙 |
| --- | --- |
| 풀이 중(mock, `solving`) | 답변함=slate-800(dark) / 현재=rose-600 / 미답변=slate-200 |
| 복습(공개 후) | 상태색: 알아요=emerald / 몰라요=amber / 미확인=slate. 현재 문항은 rose ring |
| 채점된 mock | 위 상태색 + 우상단 정오 배지 `✓`(emerald) / `✗`(rose) |

문항 카드는 category / subtopic / difficulty 태그를 보여주고, 채점 후에는 "정답 ✓ / 오답 ✗" 배지도 표시한다. 보기 렌더는 공개 여부(`revealedNow = isRevealed(current)`)에 따라 클릭 가능한 버튼(풀이 중) 또는 정답·내 선택 하이라이트가 붙은 정적 뷰(공개 후)로 전환된다.

### 4.2 공개(reveal)와 채점

- **US-4.1** 연습/복습 모드에서 준비됐을 때 **문항별로** 정답·해설을 열고 싶다.
  - 비타이머 모드이고 아직 공개 전이면 "정답 확인 · 해설 보기" 버튼 → `reveal(id)`로 해당 문항만 공개. `isRevealed = submitted || revealed.has(id)`.
- **US-4.2** 모의고사는 제출 전까지 정답이 안 보이고, 제출하면 **모든 문항이 한꺼번에** 채점·공개되길 원한다.
  - `submitted`가 true면 모든 문항이 공개 상태가 된다.
  - `correctCount`는 `chosen[q.id] === q.answer`인 문항 수로 계산(`useMemo`).

### 4.3 채점 후 일괄 마킹 (bulk actions)

- **US-4.3** 채점 후, 50문항을 하나씩 누르지 않고 **한 번에** 상태를 정리하고 싶다.
  - 채점 배너 하단에 3개 버튼(`bulk(kind)`):

    | 버튼 | `kind` | 대상 | 부여 상태 |
    | --- | --- | --- | --- |
    | 틀린 것 → 몰라요 | `wrongReview` | `chosen[id] !== answer` | `review` |
    | 맞은 것 → 알아요 | `correctKnown` | `chosen[id] === answer` | `known` |
    | 맞은 미확인만 → 알아요 | `correctUnseenKnown` | 정답 & `!statusMap.has(id)` | `known` |

  - `bulk`는 대상 entries를 모아 `statusMap`을 갱신하고 `setStatusBulk(entries)`로 일괄 영속화한다. 대상이 없으면 no-op.
  - "맞은 미확인만" 옵션은 **이미 수동 분류한 문항의 상태를 덮어쓰지 않는다** — 자동 일괄 처리가 사용자의 세밀한 판단을 존중하도록.
- **US-4.4** 채점 결과지에서 원하는 문항으로 바로 이동해 복습하고 싶다.
  - 번호 팔레트가 정오 배지와 함께 유지되어, 임의 문항으로 점프 가능하다.

### 4.4 풀이 중 선택적 자가표시

- **US-4.5** 모의고사를 푸는 도중에도 원하면 알아요/몰라요를 미리 눌러두고 싶다(선택).
  - self-assessment 버튼은 풀이 중에도 노출된다. 타이머 모드에서는 안내 문구가 "지금 안 눌러도 돼요. 채점 후 위 '일괄 표시'로…"로 바뀐다(브리프 §19의 커밋 358f9d2 힌트).

> 참고(OutSystems 사실 정합성, 브리프 §16): 이 앱은 문항 콘텐츠를 통해 On Ready가 실재함, 쿼리(Aggregate/Data Action)는 변수·필터·입력 변경 시 자동 refetch되지 않고 Refresh Data가 항상 필요함, join type은 Only With(INNER)/With or Without(LEFT OUTER)/With(FULL OUTER)/no-condition(Cartesian)임 등을 정확히 반영한다. 채점 로직 자체는 `answer` 필드와의 단순 일치 비교다.

---

## 5. 대시보드 / 진도 (`src/components/Dashboard.tsx`)

홈 화면(`page.tsx` → `Dashboard`). `load()`가 `loadStatuses()`로 상태를 읽어 `ALL_QUESTIONS`를 순회하며 전체·주제별 집계(`SubStat { known, review, total }`)를 만든다.

### 5.1 전체 진도

- **US-5.1** 학습자로서, 지금까지 **얼마나 안다고 표시했는지** 한눈에 보고 싶다.
  - 상단 진도바: 초록(`known` 비율 `knownPct`) + 앰버(`review` 비율) 세그먼트.
  - 카운트 라인: "🟢 알아요 {known} · 🟡 몰라요 {review} · ⚪ 미확인 {total-known-review}".
  - 상단 요약: "현재 문제 은행: {MANIFEST.total}문항 · 실제 시험은 50문항(합격 70%)". 은행 총계는 홈을 가볍게 하려 `manifest.json`에서 온다(브리프 §3).
  - 서버/클라이언트 하이드레이션 불일치 방지를 위해 `mounted` 게이트로 클라이언트에서만 수치를 렌더한다.

### 5.2 액션 카드

- **US-5.2** 원하는 학습 모드로 한 번에 진입하고 싶다.
  - 4개 카드: `모의고사`(`/quiz?mode=mock`) / `📖 연습 모드`(`?mode=practice`) / `🔖 다시 볼 목록`(`?mode=review`) / `⚪ 미확인 목록`(`?mode=unknown`).
  - "다시 볼 목록"·"미확인 목록" 카드에는 해당 개수(N개)가 0보다 클 때 표시된다.

### 5.3 주제별 연습 & 진도

- **US-5.3** 과목별로 진도를 보고, 그 과목만 연습으로 열고 싶다.
  - `CATEGORY_ORDER` 순으로 카테고리를 그룹핑하고, `BLUEPRINT`에서 해당 카테고리 subtopic들을 나열한다.
  - 각 행: 과목명(연습 링크 `?mode=practice&subtopic=…`) + 미니 진도바(known+review 세그먼트) + 3개 카운트 배지.
- **US-5.4** 과목 안에서 **특정 상태의 문항만** 곧바로 연습하고 싶다.
  - 세 배지(알아요/몰라요/미확인)는 각각 `?mode=practice&subtopic=…&filter=known|review|unknown` 링크다(§2.3와 연결).
  - **0개 배지는 색은 유지하되 흐리게(opacity-40) 처리하고 클릭 불가**(브리프 §10, 커밋 3e2f118). 은행에 문항이 0인 과목(`st.total===0`)은 과목명 자체가 비활성(회색, 링크 없음)이다.

### 5.4 진도 초기화

- **US-5.5** 모든 표시를 지우고 처음부터 다시 시작하고 싶다.
  - `known+review > 0`일 때만 노출되는 "진도 초기화" 링크. `confirm("모든 '알아요/몰라요' 표시를 지울까요? (되돌릴 수 없어요)")` 후 `clearStatuses()` → `load()` 재실행.

---

## 6. 이중언어 (i18n)

- **US-6.1** 학습자로서, 헤더 토글로 지문·보기를 **한국어/영어**로 전환하고 싶다.
  - 헤더의 한국어/EN 토글(`LangToggle`, `i18n.tsx`의 `LanguageProvider`), 선호는 localStorage에 저장.
  - `QuizRunner`가 `useLang()`로 언어를 읽고 `localizeQuestion(current, lang)`로 stem/options/diagram을 현지화한다.
- **US-6.2** 진도는 언어와 무관하게 유지되길 원한다.
  - question `id`가 언어 공통이라 상태·진도는 언어 무관(브리프 §11).

**용어 규약(브리프 §11, "option A" — 공식 KR Sample Exam 정합):**

| 유형 | 규칙 | 예 |
| --- | --- | --- |
| 도메인/비즈니스 명사 | 첫 등장 시 `한국어(English)` 병기, 이후 한국어 | 고객(Customer), 주문(Order), 청구서(Invoice) |
| OutSystems 기술/제품 용어 | English 유지 | Aggregate, Server Action, Screen, Block, Widget, Entity |
| 식별자/속성/설정/식/모듈명 | English 유지 | `Order.CustomerId`, Only With, At Start, On Ready, Group By |

**중요:** 해설(explanation)은 **한국어 하나로 양 언어 공통**이다. `i18n.ko`에 stem/options/diagram만 현지화되며, 특정 필드가 없으면 English base로 per-field fallback한다(브리프 §5, §11).

> 알려진 버그 이력(브리프 §15): `ko.options`가 `{key,text}` 객체가 아닌 문자열로 저장돼 빈 보기가 났던 문제, 그리고 string 형식 distractor가 `Object.entries`로 문자 단위 순회돼 깨진 문제 — 둘 다 수정·가드됨.

---

## 7. 해설 3계층 (Explanation layers)

모든 해설은 한국어·비개발자 수준으로 작성된다(브리프 §12). 문항 카드에서 `<details open>` "해설" 블록으로 렌더되며, `Markdown` 컴포넌트(react-markdown + remark-gfm)로 리스트/표/코드블록을 표시한다.

| 계층 | 대상(문항 수) | 내용 |
| --- | --- | --- |
| 1. 기본 해설 | 전체(약점 320개 재작성) | 평이한 한국어 개념 + "→ 정답 X" + **"왜 나머지는 아닌가"** 오답별 근거 |
| 2. 개념 참고 박스 | 224문항 | 닫힌 선택지 집합을 가진 문항에 "참고 · …" 박스로 메뉴 전체 나열(Join types / Delete Rule / lifecycle / exception types / aggregate functions 등) |
| 3. 기초 부품 카드 | 96문항 | "이 부품이 무엇인가"가 장벽인 문항에 비유가 담긴 "참고 · …란?" 카드(For Each / If·Switch / Assign / Aggregate / Client vs Server / Refresh Data 등) |

- **US-7.1** 비개발자로서, 왜 그 답이 정답인지뿐 아니라 **나머지가 왜 오답인지**까지 이해하고 싶다.
  - 기본 해설이 오답별 근거 불릿을 포함한다.
- **US-7.2** 선택지가 정해진 메뉴(예: Join 종류 전체)일 때 그 메뉴 전체를 한눈에 정리해 보고 싶다.
  - 개념 참고 박스가 전체 메뉴를 나열한다. 문항당 참고 박스는 **최대 1개**.
- **US-7.3** 생소한 기초 부품(예: For Each 루프)이 무엇인지 비유로 이해하고 싶다.
  - 기초 부품 카드가 비유와 함께 설명한다.

**콘텐츠 무결성 원칙:** 참고 박스 두 유형 모두 **텍스트는 고정·문서 검증본**이며, 에이전트는 "어느 개념이 적용되는지 분류만" 했다(브리프 §12, §17-6). OutSystems 사실은 §16(브리프)의 문서 검증 사실과 일치해야 한다.

---

## 8. 사용법 모달 (`src/components/Help.tsx`)

대시보드 헤더의 "❓ 사용법" 버튼으로 여는 모달. 시스템 개요 + 모드 + FAQ를 담는다(브리프 §10, 커밋 a99d81c).

- **US-8.1** 처음 온 학습자로서, 앱이 무엇이고 어떻게 쓰는지 **한 화면에서** 파악하고 싶다.
  - 섹션: "이 앱은 뭔가요?"(50문항·120분·70% 합격 설명), "핵심: 문항마다 '내 상태' 하나"(미확인/알아요/몰라요), "모드 4가지", "어떤 순서로 나오나요?"(모르는 문항 우선), "해설 속 '참고' 박스", "언어", "자주 묻는 것"(FAQ).
- **US-8.2** 모달을 쉽게 닫고 싶다.
  - 배경 클릭, "닫기 ✕"/"알겠어요" 버튼, **Escape 키**(`keydown` 리스너)로 닫힌다. 카드 내부 클릭은 `stopPropagation`으로 닫히지 않는다.
- FAQ가 명시하는 정책: 진도는 로그인 시 동기화됨 / 틀려도 자동으로 몰라요가 되지 않음(수동 표시, 단 채점지 일괄 버튼 제공) / 모의고사 점수는 저장 안 됨 / 진도 초기화로 전체 삭제.

> 모달의 "모드 4가지" 서술은 액션 카드 4개(모의고사·연습·다시 볼 목록·미확인 목록)를 가리킨다. 주제별 연습(§2.3)은 별도 문단으로 "과목 이름을 누르면 그 과목만 연습 모드로 열려요"라고 안내되어, 코드상 총 5개 진입 모드와 정합한다.

---

## 9. 인증 게이트 (요구사항 경계)

- **US-9.1** 회사 그룹만 접근할 수 있어야 한다.
  - Supabase 구성 시 로그인 필수(`AuthGate`가 게스트 차단). `@concentrix.com`만 허용(`config.ts`의 `ALLOWED_EMAIL_DOMAIN` + DB trigger, 브리프 §13). 상세는 security 문서 참조.
  - 게스트(미구성 환경)는 localStorage로 진도를 로컬 저장한다.

---

## 10. 알려진 갭 / 백로그 (브리프 §18, 정직하게)

| 항목 | 상태 |
| --- | --- |
| 단위/e2e 테스트 | 없음 — `tsc`/build + 결정론적 `scripts/qa-check.mjs`만 존재 |
| 비밀번호 재설정(이메일) | 미구현 |
| 스크린샷/시각 문항 비중 | 실제 시험 ~45% 대비 낮음, 일부 과목은 recall 편중 |
| ENT-058 | 속성 rename의 물리 DB 동작 공식 검증 대기(flagged) |
| 최종 인간 검수 | OutSystems 개발자의 은행 최종 리뷰 유예 중 |

---

## 부록 A. 모드 → 조립 로직 매핑 요약

| URL | `QuizClient` 분기 | 결과 문항 | 제목 |
| --- | --- | --- | --- |
| `?mode=mock` | `assembleMockFrom(known)` | 블루프린트 50, known 후순위 | 모의고사 |
| `?mode=practice` | `assembleMockFrom(known)` | 블루프린트 50 | 연습 모드 |
| `?mode=practice&subtopic=X` | `shuffle(getBySubtopic(X))` | X 과목 전체 | 연습 · X |
| `?mode=practice&subtopic=X&filter=known` | 위 + `status==='known'` | X의 알아요 | 연습 · X · 🟢 알아요 |
| `?mode=practice&subtopic=X&filter=review` | 위 + `status==='review'` | X의 몰라요 | 연습 · X · 🟡 몰라요 |
| `?mode=practice&subtopic=X&filter=unknown` | 위 + 상태 없음 | X의 미확인 | 연습 · X · ⚪ 미확인 |
| `?mode=review` | `status==='review'` 필터 | 몰라요 전체 | 다시 볼 목록 |
| `?mode=unknown` | 상태 없음 필터 | 미확인 전체 | 미확인 목록 |
