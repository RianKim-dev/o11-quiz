# 시험 도메인 모델 (Domain Model)

> 범위: OutSystems 11 Associate Reactive Developer(O11) 시험을 코드로 옮긴 도메인 택소노미 — 6개 category × 14개 subtopic, `src/lib/blueprint.ts`의 50문항 슬롯 배분, 문제 은행의 과목별 공급량 대비 블루프린트 비율, 그리고 문항 스키마의 난이도·태그·유형 다양화 규칙.

이 문서는 "실제 시험이 어떤 주제를 어떤 비율로 묻는가"라는 도메인 지식이 이 프로젝트 안에서 어떻게 데이터 구조로 표현되는지를 정리한다. 두 개의 축이 있다.

1. **택소노미(taxonomy)** — 모든 문항이 반드시 하나의 `category`와 하나의 `subtopic`에 속한다(`src/types/question.ts`, `content/questions/*.json`).
2. **블루프린트(blueprint)** — 실제 시험(50문항) 비율을 재현해 모의고사를 조립하기 위한 subtopic별 슬롯 수(`src/lib/blueprint.ts`).

이 둘을 문제 은행의 실제 보유량(브리핑 §6)과 대조하면 "어느 과목이 남고 어느 과목이 빠듯한지"가 드러난다.

## 1. 실제 시험 사양 (근거: 브리핑 §1)

공식 Certification Detail Sheet 기준이다. 이 수치가 블루프린트 상수의 근원이다.

| 항목 | 값 | 코드 반영 |
|---|---|---|
| 총 문항 수 | 50 | `TOTAL_QUESTIONS = 50` (`blueprint.ts:29`) |
| 문항 형식 | 4지선다 단일정답 | `options[A..D]`, `answer:A..D` (`question.ts`) |
| 시험 시간 | 120분 | mock 모드 `timeLimitSec = 120*60` (브리핑 §8) |
| 합격 기준 | 70% (35/50) | `PASSING_SCORE = 35` (`blueprint.ts:30`) |
| 오답 감점 | 없음 | — |
| 시각(스크린샷) 비중 | 약 45% | 은행에서는 아직 소수 — 알려진 갭(브리핑 §18) |

## 2. 택소노미 — 6개 category × 14개 subtopic

`Category` 타입(`src/types/question.ts`)과 `CATEGORY_ORDER`(`blueprint.ts:32`)가 6개 대분류의 정식 순서를 정의한다. 각 category는 아래처럼 subtopic으로 나뉘고, 모든 subtopic은 `content/questions/` 아래 파일 하나에 대응한다(총 14개 파일). 각 파일의 문항 `id`는 subtopic 접두사를 쓴다(`content/README.md` 접두사 규칙).

| category (CATEGORY_ORDER 순) | subtopic | id 접두사 | 블루프린트 슬롯 |
|---|---|---|---:|
| Reactive Apps in OutSystems | Client Variables | CV | 1 |
| Reactive Apps in OutSystems | Screen Lifecycle | SL | 3 |
| Reactive Apps in OutSystems | Debugging and Monitoring | DBG | 2 |
| Data Modeling | Entities & Data Types | ENT | 4 |
| Data Modeling | Data Relationships | REL | 2 |
| Fetching Data | Aggregates | AGG | 6 |
| Fetching Data | Fetching Data on Screens | FDS | 4 |
| Logic | Client and Server Actions | CSA | 2 |
| Logic | Form Validations | FV | 4 |
| Logic | Logic Flows & Exception Handling | LFE | 5 |
| UI Design | Screen Widgets | SW | 9 |
| UI Design | Blocks and Events | BE | 4 |
| Architecture & Security | Modular Dependencies | MOD | 2 |
| Architecture & Security | Role-based Security | SEC | 2 |
| **합계** | **14 subtopic** | | **50** |

### category별 슬롯 소계

`BLUEPRINT` 배열(`blueprint.ts:12`)을 category로 접으면 다음과 같다. `content/README.md`의 blueprint 표와 일치한다.

| category | 슬롯 합 | 구성 |
|---|---:|---|
| Reactive Apps in OutSystems | 6 | CV 1 · SL 3 · DBG 2 |
| Data Modeling | 6 | ENT 4 · REL 2 |
| Fetching Data | 10 | AGG 6 · FDS 4 |
| Logic | 11 | CSA 2 · FV 4 · LFE 5 |
| UI Design | 13 | SW 9 · BE 4 |
| Architecture & Security | 4 | MOD 2 · SEC 2 |
| **합계** | **50** | |

핵심: 실제 시험은 **UI Design(13)·Logic(11)·Fetching Data(10)** 에 무게가 실려 있고, **Architecture & Security(4)** 가 가장 가볍다. 단일 subtopic으로는 **Screen Widgets(9)** 가 가장 큰 슬롯이며, **Client Variables(1)** 가 가장 작다. 모의고사 조립기(`assembleMockFrom`, `src/lib/questions.ts`)는 이 슬롯 수만큼 각 subtopic에서 문항을 뽑아 50문항을 구성한다.

> 참고: `content/README.md`의 스키마 주석은 subtopic을 "공식 12개"라고 표기하지만, 실제 파일·블루프린트는 **14개** subtopic으로 운영된다. 문서 주석이 뒤처진 것으로, 정본은 `blueprint.ts`의 14행 `BLUEPRINT` 배열이다.

## 3. 은행 공급량 대비 블루프린트 비율

문제 은행 보유량은 브리핑 §6의 verified 문항 수다. `content/README.md`의 "주제별 목표 문항 수"는 모의고사마다 다른 문항이 나오도록 **블루프린트 슬롯의 약 2.5~3배**를 채우는 것을 목표로 명시한다. 따라서 "슬롯 대비 배수(ratio)"가 2.5 미만이면 공급 부족, 그 이상이면 목표 충족, 크게 초과하면 과잉공급이다.

| subtopic | 은행(verified) | 슬롯 | 배수 | 코멘트 |
|---|---:|---:|---:|---|
| Aggregates | 138 | 6 | 23.0× | 압도적 과잉공급(의도적, 아래 참고) |
| Data Relationships | 56 | 2 | 28.0× | 최대 배수 — 슬롯 작고 문항 많음 |
| Fetching Data on Screens | 96 | 4 | 24.0× | 과잉공급 |
| Client and Server Actions | 45 | 2 | 22.5× | 과잉공급 |
| Logic Flows & Exception Handling | 97 | 5 | 19.4× | 과잉공급 |
| Entities & Data Types | 71 | 4 | 17.8× | 과잉공급 |
| Client Variables | 15 | 1 | 15.0× | 슬롯이 1이라 배수는 커도 절대량은 적음 |
| Screen Lifecycle | 37 | 3 | 12.3× | 충분 |
| Role-based Security | 21 | 2 | 10.5× | 충분 |
| Blocks and Events | 38 | 4 | 9.5× | 충분 |
| Debugging and Monitoring | 16 | 2 | 8.0× | 충분(절대량은 적음) |
| Modular Dependencies | 16 | 2 | 8.0× | 충분(절대량은 적음) |
| **Screen Widgets** | 49 | 9 | 5.4× | **가장 빠듯** — 최대 슬롯인데 배수 최저 |
| **Form Validations** | 18 | 4 | 4.5× | **가장 빠듯** — 절대량·배수 모두 낮음 |
| **합계** | **713** | **50** | — | |

### 공급 과부족 코멘트

- **모든 subtopic이 목표(2.5×)를 초과**한다. 즉 어떤 모의고사도 슬롯을 채우지 못해 실패하는 일은 없다. 문제는 부족이 아니라 편중이다.
- **의도적 과잉: Aggregates(23×)와 Fetching Data on Screens(24×)** 가 은행의 최대 공급원이다. Aggregates가 이미 최대 공급이었기 때문에 Day 7 Aggregate 임포트를 **의도적으로 건너뛰었다**(브리핑 §14·§17-5). 실제 시험 비중(Fetching Data 10/50 = 20%)에 비해 은행 비중은 훨씬 크지만, 모의고사에는 슬롯 수(AGG 6, FDS 4)만큼만 반영되므로 시험 왜곡은 없다 — 남는 문항은 연습 모드·subtopic 필터에서 소진된다.
- **상대적으로 가장 빠듯한 두 과목**은 **Screen Widgets(5.4×)** 와 **Form Validations(4.5×)** 다. Screen Widgets는 단일 최대 슬롯(9)이라 매 모의고사가 9문항을 요구하는데 풀(49)이 얕아, 연속 응시 시 중복이 가장 먼저 눈에 띌 후보다. Form Validations는 배수도 절대량(18)도 가장 낮다. 은행 확장 시 이 두 과목이 1순위 보강 대상이다.
- **절대량이 얇은 과목**: Client Variables(15), Debugging and Monitoring(16), Modular Dependencies(16), Form Validations(18)은 배수는 목표를 넘지만 절대 문항 수가 적어, 다양성 여지가 제한적이다. 다만 슬롯도 작아(각 1~2, FV만 4) 모의고사 조립에는 지장이 없다.

> 데이터 정합성 메모: 브리핑 §6의 subtopic별 verified 수를 합하면 **713**이지만, 같은 절의 서술은 "710 verified + 3 flagged"라고 한다. 차이 3은 flagged 문항으로 보이며(개별 subtopic 수치에 포함된 듯), 앱은 `status==="verified"`만 서빙하므로(브리핑 §5) 실제 출제 대상은 이보다 약간 적을 수 있다. 정확한 서빙 수는 `src/generated/manifest.json`(빌드 시 생성)이 정본이다.

## 4. 난이도 · 태그 · 도메인 다양화 규칙

문항 스키마(`content/questions/*.json`, `src/types/question.ts`)와 `content/README.md`의 품질 기준(Definition of Done)이 다양성을 규정한다.

### 난이도 (difficulty)

- 값은 `"easy" | "medium" | "hard"` 세 단계(`content/README.md` 스키마).
- 문항별 필수 필드. `content/README.md`의 "시험 유사성" 기준은 **공식 샘플 20문항의 난이도·어투와 일치**할 것을 요구한다 — 난이도는 임의 라벨이 아니라 실제 시험 체감에 맞춘 값이다.

### 태그 (tags[])

- 자유 문자열 배열, **선택** 필드. 세밀한 복습·필터용(예: `["join-types"]`).
- category/subtopic이 정식 택소노미라면, tags는 그 아래의 비공식 세부 축이다. subtopic보다 더 좁은 주제(예: Aggregate 안의 join-types, group-by)를 묶는 데 쓰인다.

### 도메인 다양화 (domain variety)

`content/README.md`의 "도메인 다양성" 기준(브리핑 §6에서 "domain-varied" 커밋으로 등장, 커밋 `2afb44e`·`66a91f4`)이 명시한다.

- 워크북의 예제(Movie/Person)에만 갇히지 말고, 실제 시험처럼 여러 업무 도메인을 섞는다: **Order·Product·Customer·Cart·Employee·수량(quantity)** 등.
- 규칙의 핵심 단서: **개념은 워크북 근거를 유지하되 시나리오(등장 엔터티)만 변형**한다 — 즉 사실관계는 그대로 두고 표면 스토리만 다양화한다.
- i18n 관점에서 이 도메인 명사들은 한국어(English) 병기 대상이다: 고객(Customer), 주문(Order), 직원(Employee), 상품(Product) 등(브리핑 §11). OutSystems 기술 용어(Aggregate, Entity, Screen…)는 영어로 유지된다.

## 5. 문항 유형 — 개념 / 시각 / 플로우

브리핑 §1(실제 시험 ~45% 시각)과 `content/questions/*.json`의 `diagram` 필드, `content/README.md`의 "유형 다양성" 기준이 유형을 규정한다. 크게 세 갈래다.

| 유형 | 데이터 표현 | 설명 |
|---|---|---|
| **개념형(concept)** | `diagram` 없음, `stem`만 | 정의·원리를 묻는 텍스트 문항. 참/거짓, 부정형(not·cannot), best-way 판단 등 |
| **시각형(visual)** | `diagram` = GFM 마크다운 **표** | 예: Aggregate 편집기/미리보기 결과 표(커밋 `c149be4`). 앱이 실제 표로 렌더(`src/components/Markdown.tsx`, remark-gfm) |
| **플로우형(flow)** | `diagram` = ``` 로 감싼 ASCII 코드블럭 | 플로우/구성 추적 문항. 모노스페이스로 정렬 유지 |

- `diagram`은 **선택** 필드다(`content/README.md` 스키마). 값이 있으면 표(GFM) 또는 플로우차트(코드블럭) 둘 중 하나로 저장한다.
- 시각/플로우 요소도 언어별로 나뉠 수 있다 — `i18n.ko.diagram`으로 한국어 버전 표/플로우를 따로 둔다(브리핑 §5, 필드별 폴백: 없으면 영어 base 사용).
- **유형 쏠림 방지**(`content/README.md`): 한 배치가 같은 형태로 몰리지 않도록 개념 참/거짓 · 부정형 · 시나리오 트러블슈팅 · best-way 판단 · 플로우/구성 추적을 섞고(유형 다양성), 손으로 하는 응용형과 개념형을 균형 있게(실습·이론 조화) 배분한다.

### 알려진 갭

실제 시험은 약 45%가 스크린샷/시각 문항이지만(브리핑 §1), 현재 은행의 시각·플로우 비중은 그보다 **작다**(브리핑 §18). 일부 subtopic은 암기(recall) 위주로 치우쳐 있다. 시각형 문항 보강은 미해결 백로그다. 이는 이후 문서에서 다룰 콘텐츠 파이프라인의 개선 항목과도 연결된다.

## 6. 도메인 모델이 다른 모듈에 미치는 영향 (내비게이션)

- `src/lib/blueprint.ts` — 이 문서의 정본 상수(`BLUEPRINT`, `TOTAL_QUESTIONS`, `PASSING_SCORE`, `CATEGORY_ORDER`).
- `src/lib/questions.ts` — `assembleMockFrom(knownIds)`/`assembleMock`이 `BLUEPRINT` 슬롯대로 subtopic별 문항을 뽑아 50문항 모의고사를 조립(mock·practice 공통, 브리핑 §8).
- `src/types/question.ts` — `Category` 타입과 `Question` 스키마(category/subtopic/difficulty/tags/diagram 등).
- `content/questions/*.json` — subtopic별 14개 파일. `status==="verified"`만 앱에 서빙.
- `scripts/gen-manifest.mjs` → `src/generated/manifest.json` — 실제 서빙되는 과목별 카운트의 런타임 정본(홈 대시보드의 진도 표시에 사용).
- `scripts/qa-check.mjs` — options/answer 정합성, i18n.ko 형태, distractor 포맷, 중복 stem 등 구조 QA(브리핑 §15-A).
