# 문제 은행 (Content) — 데이터 계약 & 저작 프로세스

이 폴더가 **소스 오브 트루스**입니다. 앱(렌더러)은 여기 JSON을 읽어 화면을 그립니다.
화면 디자인이 바뀌어도 이 데이터는 그대로 유지됩니다.

## 폴더 구조

```
content/
  README.md                     ← 이 문서 (계약 + 프로세스)
  questions/
    aggregates.json             ← 세부주제별 파일 (Question[] 배열)
    logic-flows-exceptions.json
    ...
```

## Question 스키마 (데이터 계약)

```jsonc
{
  "id": "AGG-001",                    // 고정 고유 id (주제 접두사). 오답노트·통계 키
  "category": "Fetching Data",        // 6개 대분류 중 하나 (아래 blueprint 참고)
  "subtopic": "Aggregates",           // 공식 12개 세부주제 중 하나
  "difficulty": "medium",             // "easy" | "medium" | "hard"
  "tags": ["join-types"],             // 자유 태그(세밀한 복습·필터용, 선택)
  "stem": "질문 텍스트 (영어, 마크다운)",
  "diagram": "| a | b |\n|---|---|\n...", // 표(GFM) 또는 ```플로우차트``` (선택)
  "options": [
    { "key": "A", "text": "..." }, { "key": "B", "text": "..." },
    { "key": "C", "text": "..." }, { "key": "D", "text": "..." }
  ],
  "answer": "B",                      // "A" | "B" | "C" | "D"
  "explanation": "정답 근거 (한국어, 마크다운)",
  "distractors": { "A": "왜 틀렸는지", "C": "...", "D": "..." },  // 선택
  "source": "Workbook 4 · Use Data",  // 근거 (신뢰·추적성)
  "status": "verified",               // "draft" | "verified" | "flagged"
  "verifyNote": "",                   // flag 사유(선택)

  "i18n": {                           // 선택 · 지금은 비워둠 (미래 한글 시험 버전)
    "ko": { "stem": "...", "options": [], "diagram": "..." }
  }
}
```

- **표**는 GFM 마크다운 테이블로 저장 → 앱에서 실제 표로 렌더.
- **플로우차트**는 ```로 감싼 코드블럭(ASCII) → 모노스페이스로 정렬 유지.
- `explanation`은 한국어, `stem`/`options`는 영어(실제 시험과 동일). 한국어 지문은 미래에 `i18n.ko`로.

## 시험 blueprint (모의고사 조립 기준 — 실제 50문항 비율)

| category | 문항 | subtopic (문항) |
|---|---|---|
| Reactive Apps in OutSystems | 6 | Client Variables(1), Screen Lifecycle(3), Debugging and Monitoring(2) |
| Data Modeling | 6 | Entities & Data Types(4), Data Relationships(2) |
| Fetching Data | 10 | Aggregates(6), Fetching Data on Screens(4) |
| Logic | 11 | Client and Server Actions(2), Form Validations(4), Logic Flows & Exception Handling(5) |
| UI Design | 13 | Screen Widgets(9), Blocks and Events(4) |
| Architecture & Security | 4 | Modular Dependencies(2), Role-based Security(2) |

## 품질 기준 (Definition of Done — 문항 1개)

- **정확성**: 정답이 정확히 1개이며 공식 출처로 검증 가능(출처 명시). 오답은 그럴듯하지만 명확히 틀림(흔한 오해 기반).
- **중복 없음**: 기존 은행과 개념이 겹치지 않음 (단순 문구만 바꾼 변형 금지).
- **유형 다양성**: 한 배치가 같은 형태로 쏠리지 않게 — 개념 참/거짓 · 부정형(not·cannot) · 시나리오 트러블슈팅 · best-way 판단 · 플로우/구성 추적 을 섞음.
- **실습·이론 조화**: 손으로 하는 응용형(구성·동작 추적)과 개념형(정의·원리)을 균형 있게.
- **시험 유사성**: 공식 샘플 20문항의 난이도·어투와 일치.

## 저작 & 검증 프로세스

1. **근거 수집** — 해당 워크북 章 + 공식 문서를 실제로 확인해 사실 추출.
2. **생성** — 추출된 사실만으로 초안 작성(`draft`), 문항마다 출처 명시, 위 다양성·조화 기준 적용.
3. **독립 검증** — 별도 패스가 정답키를 안 보고 출처에서 정답 재도출 → 단일정답·오답타당성·근거·중복·유형쏠림 점검. 통과 → `verified`, 불확실 → `flagged` + `verifyNote`.
4. **스팟체크 (나중)** — 앱 리뷰 화면에서 flagged·샘플을 사람이 최종 검수.

## 주제별 목표 문항 수

모의고사마다 다른 문항이 나오도록 blueprint 개수의 약 2.5~3배를 목표로 채움 (예: Aggregates 6 → ~15). 비중 큰 UI Design(13)·Logic(11)·Fetching(10)부터.

id 접두사 규칙: Aggregates=AGG, Logic Flows & Exceptions=LFE, Screen Widgets=SW, Blocks&Events=BE, Entities=ENT, Data Relationships=REL, Form Validations=FV, Client/Server Actions=CSA, Screen Lifecycle=SL, Client Variables=CV, Debugging=DBG, Fetching on Screens=FDS, Modular Deps=MOD, Role Security=SEC.
