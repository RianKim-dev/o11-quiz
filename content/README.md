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

## 저작 & 검증 프로세스

1. **생성** — 해당 워크북 장 + 공식문서 근거로 배치 초안 작성 (`status: "draft"`).
2. **독립 검증** — 별도 패스로 각 문항 점검:
   - 정답이 정확히 1개인가? · 키로 지정된 답이 맞나?
   - 오답이 '그럴듯하지만 틀린' 게 맞나? · 실제 OutSystems 동작에 근거하나(환각 아님)?
   - 통과 → `status: "verified"`, 불확실 → `status: "flagged"` + `verifyNote`.
3. **스팟체크** — 앱 리뷰 화면에서 flagged 위주로 사람이 최종 확인.

id 접두사 규칙: Aggregates=AGG, Logic Flows & Exceptions=LFE, Screen Widgets=SW, Blocks&Events=BE, Entities=ENT, Data Relationships=REL, Form Validations=FV, Client/Server Actions=CSA, Screen Lifecycle=SL, Client Variables=CV, Debugging=DBG, Fetching on Screens=FDS, Modular Deps=MOD, Role Security=SEC.
