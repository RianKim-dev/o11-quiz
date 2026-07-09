# 의사결정 기록 / ADR (Decision Log)

> 범위: `o11-quiz` 프로젝트(OutSystems 11 Associate Reactive Developer 대비 이중언어 문제풀이 앱 + 콘텐츠 엔지니어링 파이프라인)의 핵심 아키텍처·콘텐츠 의사결정을 ADR 형식으로 기록한다.

이 문서는 소스 브리핑 §17의 7가지 핵심 결정을 ADR(제목/맥락/결정/근거/영향/대안)로 정리하고, 이를 뒷받침하는 §3(콘텐츠=JSON), §7(자가평가 모델), §11(한국어 병기 A안), §12(검증된 사실 주입), §15(3계층 QA)의 세부 결정을 함께 담는다. 각 항목은 실제 소스 파일(`src/lib/blueprint.ts`, `supabase/schema.sql` 등)과 브리핑에 근거하며, 아직 확정되지 않았거나 검증이 남은 부분은 명시적으로 "미해결"로 표시한다.

각 ADR의 상태는 별도 표기가 없으면 **채택됨(Accepted, 배포 완료)**이다. 원문 근거는 브리핑의 절 번호(§)로 표기한다.

---

## ADR-001 — 콘텐츠는 DB가 아니라 리포지토리에 버전 관리되는 JSON으로 번들링한다

- **맥락**: 문제 은행은 710개 verified 문항(+3개 flagged)으로, 편집 성격의 읽기 전용 자료다(§6). 이 콘텐츠를 어디에 둘지가 첫 번째 구조 결정이었다. 후보는 (a) Supabase Postgres 테이블에 문항을 저장하거나, (b) 리포지토리 안의 파일로 두는 것이었다.
- **결정**: 문항을 `content/questions/*.json`(14개 파일, subtopic당 1개)으로 리포지토리에 두고 앱에 번들링한다. DB(`supabase/schema.sql`)에는 **사용자별 진도만** 저장한다. 빌드 시 `scripts/gen-manifest.mjs`가 `predev`/`prebuild`에서 실행되어 `src/generated/all-questions.ts`(모든 콘텐츠 파일 자동 import, `status==="verified"`만 서빙)와 `src/generated/manifest.json`(카운트만, 홈 화면 경량화용)을 생성한다(§3).
- **근거**:
  - 문항은 편집 자료이므로 git으로 리뷰·버전 관리·diff·롤백이 가능해야 한다. PR 리뷰가 곧 콘텐츠 QA가 된다.
  - DB에 넣으면 마이그레이션·시드·백업 부담이 생기지만, 읽기 전용 콘텐츠에는 그 이점이 없다.
  - 정적 번들은 호스팅이 저렴하고(Vercel 정적 배포), 런타임 DB 조회 없이 문항을 서빙할 수 있다.
  - `status==="verified"` 게이트로 `flagged`/`draft` 문항을 리포에 남겨두되 서빙에서만 배제할 수 있다(§5).
- **영향**:
  - `supabase/schema.sql`에는 문항 테이블이 존재하지 않는다. 테이블은 `answers`, `bookmarks`, `question_status`뿐이며 모두 사용자별 진도용이다.
  - 콘텐츠 변경은 반드시 재빌드/재배포를 거친다(main push → Vercel 자동 배포). 런타임에 문항을 고칠 수 없다.
  - 생성 산출물(`src/generated/*`)은 빌드 단계 의존성이 되므로, 매니페스트 생성 스크립트가 CI/로컬 모두에서 선행되어야 한다.
- **대안**: DB에 문항 저장(관리 UI로 즉시 수정 가능하나 버전 관리·리뷰 흐름 상실, 호스팅·백업 비용 증가). 헤드리스 CMS(외부 의존성·비용, 소규모 사설 도구에 과함).

---

## ADR-002 — 이메일+비밀번호 인증을 @concentrix.com 도메인으로 제한한다

- **맥락**: 이 앱은 공개 서비스가 아니라 소규모 Concentrix 그룹용 사설 학습 도구다(§1). 접근을 사내 인원으로 한정해야 했다. 초기 구현에는 합성 이메일(synthetic-email) 우회 방식이 있었다(§17.2).
- **결정**: Supabase(@supabase/ssr `createBrowserClient`) 기반 이메일+비밀번호 인증을 사용하고, 가입/로그인을 **@concentrix.com** 도메인으로 제한한다. 도메인 검사는 **클라이언트(`src/lib/config.ts`의 `ALLOWED_EMAIL_DOMAIN="concentrix.com"` + `src/lib/auth.tsx`)와 DB 트리거(`supabase/restrict-domain.sql`, `auth.users`에 대한 트리거) 양쪽**에서 강제한다. Supabase가 구성된 경우 로그인은 필수이며 `AuthGate`가 게스트를 차단한다. 초기의 합성 이메일 우회는 제거했다(§13, §17.2).
- **근거**:
  - 이중 강제(클라이언트 + DB)로 클라이언트 우회 시에도 서버 측에서 최종 차단된다. 신뢰 경계를 DB에 둔다.
  - anon key는 공개 안전(public-safe) 값이라 클라이언트에 노출해도 되지만, 접근 정책은 RLS와 도메인 트리거로 강제해야 한다(§13).
  - 합성 이메일 해킹은 실제 신원 보장이 없어 사내 한정 요건과 충돌했다.
- **영향**:
  - 비-Concentrix 계정은 가입/로그인이 불가하다. 게스트는 로그인 전까지 `AuthGate`로 차단되며, 진도는 localStorage로만 유지된다(ADR-003 참조).
  - `service_role` key와 DB 비밀번호는 절대 커밋하지 않는다. 커밋되는 것은 `NEXT_PUBLIC_SUPABASE_URL`과 anon key뿐이다(§13).
- **대안**: 클라이언트 검사만(우회 가능, 부적합). 초대 코드/화이트리스트(운영 부담). SSO/OAuth(소규모 도구에 과한 설정 비용). 합성 이메일 우회(신원 보장 없음 — 제거됨).

---

## ADR-003 — 자가평가 상태(미확인/알아요/몰라요)가 자동 채점·북마크·오답 복습을 대체한다

- **맥락**: 초기 학습 모델은 (1) 자동 채점 기반 진도, (2) ⭐ 북마크, (3) 오답 복습의 3개 시스템으로 나뉘어 있었다. 이들은 반쯤 겹치며 "짜깁기"처럼 느껴졌고, 사용자별 자동 채점은 모호하고 버그가 있었다(§7, §17.3). 대상 사용자가 개념 시험을 준비하는 한국어 비개발자라는 점도 단순한 학습 루프를 요구했다(§1).
- **결정**: 문항·사용자당 **하나의 상호배타적 자가평가 상태**로 통합한다.
  - **미확인**(기본값, DB에 행 없음) / **알아요**(`status='known'`) / **몰라요**(`status='review'`, "다시 볼 목록").
  - 이 상태는 정오답에서 추론하지 않고 **사용자가 직접 설정**한다(§7).
  - 저장 스키마: `public.question_status(user_id, question_id, status text check (status in ('known','review')), updated_at, primary key (user_id, question_id))` (`supabase/schema.sql`). RLS 정책은 `auth.uid() = user_id`(using + with check).
  - 게스트는 localStorage(`o11quiz.status.v1`, `src/lib/status.ts`)를 사용한다.
  - 데이터 계층 `src/lib/progress.ts`가 라우팅을 담당: `loadStatuses() → Map<id, QStatus>`, `setStatus(id, status|null)`, `setStatusBulk(entries)`, `clearStatuses()`. 로그인 + 구성된 경우 Supabase, 아니면 localStorage로 라우팅한다(§7).
  - **모의고사 점수는 세션 한정**이며 영속화하지 않는다(§8, §9).
- **근거**:
  - 사용자별 자동 채점은 "맞았다"의 의미가 모호했고(요행/추측 포함) 버그가 있었다. 자가평가는 학습자가 실제 이해도를 스스로 표시하게 해 개념 시험 준비에 더 부합한다.
  - 3개 반쯤 겹치는 시스템 → 1개 상호배타 상태로 단순화하면 UI(팔레트 색, 대시보드 카운트)와 데이터 계층이 일관된다(§9, §10).
  - "행 없음 = 미확인" 기본값은 저장 공간과 쓰기를 최소화한다(대다수 문항은 미평가 상태로 남는다).
- **영향**:
  - 구 `answers`/`bookmarks` 테이블과 `src/lib/storage.ts` 함수는 **스키마·코드에 남아 있으나 더 이상 사용되지 않는다**(retained but unused, §7). 신규 진도 경로는 `question_status`만 사용한다.
  - `assembleMockFrom(knownIds)`가 이미 "알아요"인 문항을 후순위로 밀어 모르는 것에 집중하게 한다(§8).
  - 대시보드 진도 바 = known 비율(green) + review(amber), 미확인(slate)로 표현된다(§10). QuizRunner 팔레트도 이 상태색을 재사용한다(§9).
  - 진도는 언어 무관(question id 공유)이므로 언어 전환이 진도에 영향하지 않는다(§11).
- **대안**: 자동 채점 유지(모호·버그, 폐기). 별 북마크 + 오답 복습 병존(중복·짜깁기, 폐기). 4단계 이상 상태(비개발자에게 과한 인지 부담).

---

## ADR-004 — 한국어 표기 규약 "A안"(도메인 명사 병기 · 기술 용어 English)을 채택한다

- **맥락**: 이중언어(한국어/English) 앱이며 문항의 stem/options/diagram이 지역화된다(§5). 공식 KR Sample Exam은 기술 용어를 음차한다(예: 애그리게이트/Aggregate). 한국어 비개발자 대상이지만 Service-Studio 화면과의 용어 일치(fidelity)도 중요했다(§11).
- **결정**: 브리핑에서 "option A"로 잠긴 규약을 채택한다(§11, §17.4).
  - **도메인/업무 명사 → 한국어(English) 병기**(첫 등장 시), 이후 한국어 단독: 고객(Customer), 주문(Order), 직원(Employee), 상품(Product), 청구서(Invoice) 등.
  - **OutSystems 기술/제품 용어 → English 유지**: Aggregate, Data/Server/Client Action, Screen, Block, Widget, Form, Entity, Static Entity, Attribute, Expression, Exception 등.
  - **식별자/속성/설정/표현식/엔티티·모듈 이름 → English**: `Order.CustomerId`, Only With, At Start, On Initialize/Ready/Render, Group By, Options Text, Refresh Data, `NullIdentifier()`, `Customer` Entity, Role 이름 등. 한 필드 안에서는 일관성 유지.
  - 이 규약을 367개 KO stems/options에 적용했다(§11, commit `c2244c5`).
- **근거**:
  - 기술 용어를 음차하지 않고 English로 유지하면 학습자가 실제 Service Studio UI에서 보는 용어와 1:1로 매칭돼 전이 학습이 쉽다(§11).
  - 도메인 명사는 병기 후 한국어 단독으로 두어 가독성을 확보한다(비개발자 대상).
  - 해설(explanation)은 언어와 무관하게 한국어로 공유되므로(§5), 지역화 범위를 stem/options/diagram으로 한정해 유지보수를 줄인다.
- **영향**:
  - `i18n.ko`에 필드가 없으면 English 원문으로 필드 단위 폴백된다(per-field fallback, §5). 규약 위반이 있어도 원문으로 안전하게 표시된다.
  - 지역화는 `src/lib/i18n.tsx`의 `LanguageProvider` + `localizeQuestion`이 담당하며, 언어 선호는 localStorage에 저장된다(§11).
- **대안**: 공식 시험식 음차(예: 애그리게이트) — 공식 표기와 일치하나 Service-Studio 화면 용어와 어긋나 전이 학습에 불리(기각). 전면 English(비개발자 가독성 저하). 전면 한국어 번역(제품 용어 fidelity 상실).

---

## ADR-005 — 콜레이그 Day 7 Aggregate 임포트를 건너뛴다

- **맥락**: 시험에 합격한 동료가 Day 1–10에 걸쳐 ~650문항을 2개의 .docx(문항 + 정답 키)로 공유했고, 이를 mammoth로 추출해 **하루 단위**로 파서를 붙여 처리했다(형식이 매일 달랐다: "Question N:"+ABCD, "N."+무라벨 보기, True/False, 인라인 보기, "A) B)" 라벨, Day10은 50문항 모의 2세트)(§14). 각 Day는 review→verify Workflow를 거쳤다.
- **결정**: **Day 7의 Aggregate 부분 임포트를 의도적으로 건너뛴다**. 대신 Day 7은 Fetching만 반영(+29, commit `4fd35b1`)한다(§14, §17.5).
- **근거**:
  - Day 7 Aggregate 소스가 형식이 지저분하게 섞여 있어 파싱 위험이 컸다(§14, §17.5).
  - Aggregates는 이미 가장 과잉 공급된 subtopic이다(verified 138개로 최다, §6). 추가 임포트의 한계 가치가 낮았다.
  - 높은 파싱 리스크 대비 낮은 한계 효용 → 스킵이 합리적.
- **영향**:
  - 최종 은행에서 Aggregates 138개는 다른 어떤 subtopic보다 크게 많다(§6). 그러나 모의고사 blueprint는 Aggregates에 6슬롯만 배정하므로(`src/lib/blueprint.ts`) 과잉 공급이 시험 균형을 해치지 않는다.
  - Day별 순증 합계에서 Day 7은 Fetch +29만 반영된다(§14).
- **대안**: 지저분한 Day 7 Aggregate를 무리하게 파싱(파서 오류·오분류 위험, 이미 과잉인 subtopic에 저품질 추가). 수작업 정제 후 임포트(비용 대비 효용 낮음).

---

## ADR-006 — 강화(enrichment)는 "검증된 사실 주입" 방식으로 한다 — 에이전트는 분류만, 사실 텍스트는 고정

- **맥락**: OutSystems 세부 사실에 대해 에이전트/시드된 믿음이 **기억에 의존하다 3차례나 틀렸다**(§16, §17.6). 예: On Ready 존재 부정, 쿼리 자동 refetch 오해, join 타입이 2종뿐이라는 오류 등. 해설 강화 시 에이전트가 사실을 생성하게 두면 오류가 재발할 위험이 컸다(§12, §16).
- **결정**: 개념/프리미티브 참고 박스는 **문서로 검증된 고정 텍스트**를 쓰고, 에이전트는 "어떤 개념이 적용되는지"만 분류한다(no agent-generated facts). 문항당 참고 박스는 최대 1개(§12, §17.6).
  - **Concept-reference 박스(224문항)**: 닫힌 보기 집합에 의존하는 문항에, 검증된 "참고 · …" 박스가 전체 메뉴를 나열(Join types / Delete Rule / Fetch / lifecycle / exception types / aggregate functions / built-in validation / variable scope)(§12, commit `9aa3e46`).
  - **Beginner building-block 카드(96문항)**: "이 프리미티브가 무엇인가"가 장벽인 문항에, 비유가 담긴 "참고 · …란?" 카드(For Each / If·Switch / Assign / variable / List·Record·Attribute / Aggregate / Expression / Client vs Server / Refresh Data / Entity)(§12, commit `1fa2123`).
  - 두 박스 텍스트 모두 공식 OutSystems 문서에 대해 고정·검증됨.
- **근거**:
  - 기억 기반 생성은 이미 3번 틀렸다(§16). 사실 텍스트를 고정하고 에이전트 역할을 분류로 한정하면 사실 오류의 발생 지점을 원천 차단한다.
  - 비개발자 대상이므로 "닫힌 메뉴 전체 나열"과 "프리미티브 비유"가 학습에 효과적이다(§1, §12).
  - 문항당 박스 1개 제한으로 해설 과밀을 방지한다.
- **영향**:
  - 해설(explanation)은 모두 한국어이며 두 언어에서 공유된다(§5). 참고 박스도 Markdown으로 렌더된다(`src/components/Markdown.tsx`).
  - 모든 OutSystems 특정 사실은 §16의 DOC-VERIFIED 목록과 일치해야 한다(예: On Ready는 존재함; 쿼리는 자동 refetch하지 않으며 Refresh Data가 항상 필요; join은 Only With=INNER / With or Without=LEFT OUTER / With=FULL OUTER + Cartesian). 강화 텍스트가 이 사실과 어긋나면 안 된다.
- **대안**: 에이전트가 사실을 자유 생성(3회 오류 전력 — 기각). 박스 없이 원문 해설만(비개발자에게 개념 진입 장벽 큼). 문항마다 다수 박스(과밀·중복).

---

## ADR-007 — 콘텐츠 정확성은 다중 에이전트 리뷰 + 적대적 검증 + 문서 기반 최종 QA로 보장한다 (3계층 QA)

- **맥락**: 이 제품의 핵심 가치는 문항의 정확성이다(§17.7). 콘텐츠는 (a) 초기 다중 에이전트 생성분과 (b) 동료 임포트분(156→710)으로 이뤄졌고(§14), 형식·출처가 제각각이라 체계적 QA가 필요했다.
- **결정**: 3계층 QA(§15)와 다중 에이전트 적대적 검증(§14)을 결합해 배포 전 모두 적용한다.
  - **A. 구조/렌더링** — `scripts/qa-check.mjs`(결정론적, LLM 미사용): options/answer 무결성, `i18n.ko` 객체 형태, distractor 형식, 얇은/외국어 해설, 아티팩트, 중복 stem 검사. 종료 상태 0 errors. 임포트 문항 508개에 `source` 백필(§15A).
  - **B. Grounding** — 전 은행 Workflow가 정본(canonical) 사실을 시드한 채 모든 정답을 재도출하고 wrong_answer/false_premise/ambiguous를 플래그, 이후 독립 검증자가 확정. 711 → 단 4건 플래그: FDS-062(C→D) 수정, AGG-006(stem 재작성 + 정답) 수정, ENT-058(미검증) 플래그, BE-010은 수동 문서 검증으로 잡아낸 **오탐(false flag)**(§15B, commits `24f10ee`).
  - **C. Refresh-behavior 재스캔** — 문서로 교정된 사실로 110문항 표적 재검, 1차가 놓친 auto-refetch 오탐(false-negative) 4건 포착: AGG-106, FDS-021, FDS-038, FDS-075(§15C, commit `e3b12c3`).
  - **콘텐츠 생성 시 적대적 검증**: 정답을 가린 채 에이전트가 독립적으로 정답을 재도출, 동료 정답 키와 교차검증, good/fix/weird 분류(weird 제외), 이견은 정답 키와 리뷰가 모두 동의하지 않으면 폐기(§14).
- **근거**:
  - 정확성이 제품의 존재 이유이므로 단일 통과가 아니라 계층적·중복적 검증이 필요하다(§17.7).
  - 결정론적 검사(A)는 값싸고 재현 가능하며 렌더링 버그를 확실히 잡는다. LLM 기반(B, C)은 사실·정답 오류를 잡되, **문서로 교정된 사실을 시드**해야만 신뢰할 수 있다(§16). C 계층은 1차 LLM 패스도 놓치는 오류가 있음을 보여준다.
  - 정답을 가린 적대적 검증 + 동료 정답 키 교차검증으로 확증 편향을 줄인다(§14).
- **영향**:
  - 발견·수정된 버그: 빈 한국어 옵션(`ko.options`가 `{key,text}` 객체 대신 문자열로 저장 — `localizeQuestion`이 기대하는 형태와 불일치), 문자열 distractor가 `Object.entries`로 문자 단위 순회되어 깨진 rationale. 둘 다 수정·가드 추가(§15, commits `5aca383`, `28ea91a`).
  - 종료 상태 0 errors(구조), 최종 4 flags(grounding). 모두 배포 완료.
  - **미해결/백로그**(§18, 정직하게 기록):
    - `tsc`/빌드 + 결정론적 `qa-check.mjs` 외 자동화 테스트 없음(unit/e2e 없음).
    - ENT-058은 attribute-rename의 물리 DB 동작에 대한 공식 검증 대기 중으로 flagged 유지.
    - 문제 은행의 최종 human OutSystems-dev 리뷰는 여전히 보류.
    - 스크린샷/시각 문항 비중이 작음(실제 시험 ~45%); 일부 subtopic은 recall 편중.
- **대안**: 단일 결정론적 검사만(사실·정답 오류를 못 잡음). LLM 단일 패스만(§16처럼 기억 기반 오류·오탐 발생 — C 계층 필요성이 반증). 수동 리뷰만(710문항 규모에 비현실적).

---

## 부록 — 결정 요약 매핑

| ADR | 제목 | 근거 절 | 상태 |
| --- | --- | --- | --- |
| ADR-001 | 콘텐츠 = 버전 관리 JSON 번들 | §3, §17.1 | 채택·배포 |
| ADR-002 | @concentrix.com 이메일+비밀번호 인증 | §13, §17.2 | 채택·배포 |
| ADR-003 | 자가평가 상태(미확인/알아요/몰라요) | §7, §9, §17.3 | 채택·배포 |
| ADR-004 | 한국어 표기 "A안"(도메인 병기·기술 English) | §11, §17.4 | 채택·배포 |
| ADR-005 | Day 7 Aggregate 임포트 스킵 | §14, §17.5 | 채택·배포 |
| ADR-006 | 검증된 사실 주입(에이전트는 분류만) | §12, §16, §17.6 | 채택·배포 |
| ADR-007 | 3계층 QA + 적대적 검증 | §14, §15, §17.7 | 채택·배포(4 flags, 백로그 §18) |

> 참고: `answers`, `bookmarks` 테이블(`supabase/schema.sql`)과 `src/lib/storage.ts`는 스키마·코드에 남아 있으나 현재 진도 경로에서는 사용되지 않는다(ADR-003). 신규 진도는 `question_status`만 사용한다.
