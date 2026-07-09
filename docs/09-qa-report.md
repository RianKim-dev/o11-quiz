# 품질 검증 리포트 (QA Report)

> 범위: o11-quiz 문제 은행(710 verified + 3 flagged, 14개 subtopic)에 적용된 3계층 QA 파이프라인 — 구조 검사(`scripts/qa-check.mjs`), 전수 그라운딩, 재조회 타깃 재검증 — 과 발견·수정 이력, 그리고 OutSystems 세부 사실 검증에서 얻은 교훈.

이 문서는 문제 콘텐츠의 정확성이 제품의 핵심 가치라는 전제 아래, 710개 문항 은행이 어떤 검증 절차를 거쳐 "0 errors" 상태에 도달했는지를 정리한다. 대상 독자는 비개발자 학습자를 위한 O11(OutSystems 11 Associate Reactive Developer) 시험 대비 문제를 만드는 콘텐츠 엔지니어와, 이 파이프라인을 이어받을 개발자다. QA는 서로 다른 실패 유형을 잡는 세 계층으로 구성되며, 각 계층은 독립적으로 실행된다.

- **A. 구조/렌더링 검사** — 결정론적(no LLM). `scripts/qa-check.mjs`.
- **B. 전수 그라운딩** — 전체 은행의 정답을 표준 사실(canonical facts)로 재도출하는 Workflow + 독립 검증자.
- **C. 재조회 동작 재검증** — 문서 교정된 사실로 특정 주제군을 다시 훑는 타깃 패스.

---

## 1. 계층 A — 구조/렌더링 검사 (`scripts/qa-check.mjs`)

LLM 없이 돌아가는 결정론적 검사기로, `content/questions/*.json`의 모든 JSON 파일을 읽어 문항 하나하나를 규칙에 통과시킨다. 매 실행마다 동일한 결과가 나오므로 회귀 방지용 게이트로 쓸 수 있다. 실행: `node scripts/qa-check.mjs`.

### 1.1 심각도(severity) 3단계

검사 결과는 `issues` 배열에 `{id, file, sev, code, detail}` 형태로 쌓이며, 심각도는 세 가지다.

| 심각도 | 의미 | 예시 code |
| --- | --- | --- |
| `ERR` | UI 렌더링/정답 무결성을 깨는 치명적 결함. 반드시 0이어야 함 | `opt-count`, `answer-nomatch`, `ko-opt-string`, `vietnamese` |
| `WARN` | 품질 저하 신호. 사람이 확인 후 판단 | `opt-label-leak`, `opt-dup`, `dup-stem`, `stem-leading-number` |
| `INFO` | 참고성 신호. 대량 백필 등의 후속 작업 힌트 | `source-missing`, `expl-no-distractor-rationale` |

### 1.2 검사 항목 인벤토리

`scripts/qa-check.mjs`가 문항별로 수행하는 검사는 다음과 같다.

| 대상 | code | 심각도 | 검사 내용 |
| --- | --- | --- | --- |
| options | `opt-count` | ERR | `options`가 배열이며 길이 4 |
| options | `opt-keys` | ERR | 키에 A·B·C·D가 모두 존재 |
| options | `opt-empty` | ERR | 빈/공백 옵션 텍스트 없음 |
| options | `opt-label-leak` | WARN | 옵션 텍스트에 `A.`/`B)` 같은 접두 라벨이 새어 들어옴 |
| options | `opt-dup` | WARN | 정규화 후 중복 옵션 텍스트(고유값 4개 미만) |
| answer | `answer` | ERR | `answer`가 A~D 중 하나 |
| answer | `answer-nomatch` | ERR | `answer`가 실제 옵션 키와 매칭 |
| explanation | `expl-missing` | ERR | 해설 존재 |
| explanation | `expl-not-korean` | ERR | 해설에 한글(`[가-힣]`) 포함 |
| explanation | `expl-thin` | WARN | 공백 제외 60자 미만이면 빈약 |
| explanation | `expl-no-distractor-rationale` | INFO | 오답 근거 흔적이 없고 140자 미만인 짧은 해설(휴리스틱) |
| i18n.ko | `ko-missing` | WARN | 한국어 버전 객체 존재 |
| i18n.ko | `ko-stem` | ERR | `ko.stem` 비어있지 않음 |
| i18n.ko | `ko-opt-count` | ERR | `ko.options`가 배열이며 길이 4 |
| i18n.ko | `ko-opt-string` | ERR | `ko.options` 원소가 문자열이면 UI에서 빈칸 → 치명 |
| i18n.ko | `ko-opt-empty` | ERR | `{key,text}` 객체이고 `text`가 채워짐 |
| distractors | `distractor-format` | WARN | `distractors`는 문자열 또는 (배열 아닌) 객체여야 함 |
| stem | `stem-missing` | ERR | 문제 지문 존재 |
| stem | `stem-artifact` | ERR | `은주과장`, `확인필요`, `yourAns`, `answerKey`, `Question N:` 등 파싱 잔여물 |
| stem | `stem-leading-number` | WARN | `1.` 같은 선두 번호 잔여 |
| 전 필드 | `vietnamese` | ERR | 지문·해설·옵션에 베트남어 문자(`VI` 정규식)가 섞임 |
| metadata | `subtopic` | ERR | 14개 허용 `SUBTOPICS` 집합에 속함 |
| metadata | `source-missing` | INFO | `source` 채워짐 |
| metadata | `tags-format` | WARN | `tags`는 배열 |
| metadata | `status` | WARN | `verified`/`flagged`/`draft` 중 하나 |
| 전역 | `dup-stem` | WARN | 정규화 지문 기준 중복(어느 id와 같은지 표시) |

핵심 헬퍼:
- `norm(s)` — 연속 공백을 하나로 접고 trim + 소문자화. 옵션 중복·지문 중복 비교의 기준.
- `VI` — 베트남어 특유의 결합 문자/성조 문자 집합을 잡는 정규식. mammoth 추출 과정에서 섞여 들어올 수 있는 외국어 오염을 탐지.
- `stemSeen` — 정규화 지문 → 첫 등장 id 맵. 중복 지문 검출용.

### 1.3 리포트 형식

스크립트는 마지막에 (1) 전체 문항 수와 `ERR/WARN/INFO` 집계, (2) `sev:code`별 카운트를 많은 순으로, (3) 모든 `ERR` + 상위 15개 `WARN`을 나열한다. 즉 치명적 오류는 전부 보여 주고 경고는 표본만 보여 준다.

### 1.4 결과

**최종 상태: `ERR` 0건.** 또한 이 계층을 돌리는 과정에서 import된 508개 문항에 대해 `source` 필드를 백필했다(`INFO:source-missing` 제거). 커밋 `4fd35b1`("Add Day 7 Fetching (+29), backfill source, add QA checker — bank 711")에서 QA 체커 도입과 source 백필이 함께 이뤄졌다.

---

## 2. 계층 B — 전수 그라운딩 (full-bank grounding)

구조 검사가 "형태"를 본다면, 계층 B는 "정답 자체가 맞는가"를 본다. 표준 OutSystems 사실을 시드로 주입한 Workflow가 **전체 은행의 모든 정답을 재도출**하고, `wrong_answer` / `false_premise` / `ambiguous`로 플래그를 붙인 뒤, 독립 검증자가 이를 확정한다.

### 2.1 결과 — 711개 중 4건 플래그

| 문항 | 조치 | 내용 |
| --- | --- | --- |
| `FDS-062` | 정답 수정 | C → D |
| `AGG-006` | 지문 재작성 + 정답 조정 | stem reworded, answer 조정 |
| `ENT-058` | flagged (미확정) | 공식 검증 대기 상태로 은행에서 제외 유지 |
| `BE-010` | **오탐(false flag)** | 수동 문서 검증으로 잡아낸 잘못된 플래그 — 실제로는 정답이 맞았음 |

`BE-010`은 검증자 파이프라인이 스스로 틀릴 수 있음을 보여 주는 사례다. 자동 플래그가 곧 오류 확정이 아니며, 사람의 공식 문서 대조가 최종 판정이 되어야 함을 입증한다. 관련 커밋: `24f10ee`("Grounding QA fixes: correct 2 answers, reword 1 stem, flag 1").

`ENT-058`은 attribute-rename 시 물리 DB 동작에 대한 공식 검증이 끝나지 않아 여전히 `flagged` 상태로 남아 있다(§18 백로그 참조). `flagged` 문항은 리포지토리에는 남지만 `status==="verified"`만 앱에 서빙되므로 사용자에게 노출되지 않는다.

---

## 3. 계층 C — 재조회 동작 재검증 (refresh-behavior re-scan)

계층 B가 표준 사실을 시드로 썼지만, 그 시드 일부가 **OutSystems 데이터 재조회 동작에 대해 틀린 믿음**이었다. 그래서 문서로 교정된(DOC-CORRECTED) 사실을 가지고 재조회 관련 문항군(110개)을 다시 훑는 타깃 패스를 별도로 돌렸다.

### 3.1 결과 — 1차 그라운딩이 놓친 auto-refetch 오탐 4건

| 문항 | 유형 |
| --- | --- |
| `AGG-106` | auto-refetch false-negative |
| `FDS-021` | auto-refetch false-negative |
| `FDS-038` | auto-refetch false-negative |
| `FDS-075` | auto-refetch false-negative |

관련 커밋: `e3b12c3`("Fix 4 auto-refetch answers missed by the first grounding pass"). 이 4건은 "변수/필터/입력 파라미터가 바뀌면 쿼리가 자동으로 다시 조회된다"는 잘못된 전제로 채점되어 있었고, 실제로는 그런 자동 재조회가 없다는 사실(§4.2)에 맞춰 교정됐다.

---

## 4. 발견·수정 이력 종합

세 계층과 그 과정에서 파생된 버그 수정을 한데 모으면 다음과 같다.

### 4.1 렌더링/데이터 버그 (계층 A 파생)

| 버그 | 원인 | 조치 | 커밋 |
| --- | --- | --- | --- |
| ko.options 빈칸 | `ko.options`가 `{key,text}` 객체가 아니라 문자열로 저장됨 → `localizeQuestion`이 기대하는 형태와 불일치 → UI에서 옵션이 빈칸으로 렌더 | 객체 형태로 정정 + `ko-opt-string` ERR로 가드 | `5aca383`("Fix empty Korean options on Day 2 questions") |
| distractor 문자 쪼개짐 | 문자열 형태의 `distractors`를 `Object.entries`로 순회하면 문자열이 글자 단위로 분해됨(garbled rationale) | 문자열/객체 형식을 구분해 처리 + 가드 | `28ea91a`("Fix garbled distractor rationale for string-format distractors") |

이 두 버그는 모두 "고쳤을 뿐 아니라 검사기로 가드했다"는 점이 중요하다. `ko-opt-string`과 `distractor-format` 체크는 같은 문제가 재발하면 즉시 `ERR`/`WARN`으로 잡는다.

### 4.2 정답/전제 오류 (계층 B·C)

정답 오류는 총 6건 수정 + `ENT-058` 1건 flagged로 정리된다.

- 계층 B에서 2건 정답 수정(`FDS-062`, `AGG-006`), 1건 지문 재작성(`AGG-006`), 1건 flag(`ENT-058`), 1건 오탐 기각(`BE-010`).
- 계층 C에서 4건 정답 수정(`AGG-106`, `FDS-021`, `FDS-038`, `FDS-075`).
- 합계: 정답 관련 수정 6건(`FDS-062`, `AGG-006`, `AGG-106`, `FDS-021`, `FDS-038`, `FDS-075`) + flagged 1건(`ENT-058`).

### 4.3 join-type 오류

Aggregate join 유형에 대해 초기에는 "타입이 둘뿐"이라는 잘못된 주장이 있었고, 사용자가 이를 잡아냈다. 실제로는 **세 종류 + Cartesian**이 존재한다(§5.3). 커밋 `aa02d91`("Fix wrong join-type claims: \"With\" (full outer) DOES exist")에서 `With`(FULL OUTER)의 존재를 포함해 바로잡았다.

---

## 5. 핵심 교훈 — OutSystems 세부는 반드시 공식 문서로 검증

이 QA에서 반복적으로 확인된 가장 큰 교훈은 **LLM 에이전트가 기억에 의존해 단언한 OutSystems 세부 사실이 여러 차례 틀렸다**는 점이다(§16 기준). 따라서 OutSystems 관련 세부는 어느 것이든 공식 문서로 대조한 뒤에만 확정한다. 아래는 QA 중 교정된, 문서 검증된(DOC-VERIFIED) 사실들이다.

### 5.1 생명주기(Lifecycle) — On Ready는 존재한다

Screen과 Block 모두에 적용되는 이벤트:

| 이벤트 | 시점 | 용도 |
| --- | --- | --- |
| On Initialize | 렌더 전, DOM 없음 | 초기 준비 |
| **On Ready** | 최초 렌더 후 1회, DOM 준비됨 | DOM/JS/focus 조작의 올바른 자리 |
| On Render | 매 렌더마다 | 여기서 표시 데이터를 쓰면 무한 루프 위험 |
| On After Fetch | 각 fetch 이후 | — |
| On Parameters Changed | Block 전용 | — |

에이전트들이 반복적으로 **On Ready의 존재를 부정**했으나, On Ready는 실제로 존재한다.

### 5.2 데이터 재조회 — 자동 재조회는 없다

쿼리(Aggregate 또는 Data Action)는 변수/필터/입력 파라미터가 바뀌어도 **절대 자동으로 다시 조회하지 않는다**. 재조회하려면 항상 **Refresh Data가 필요**하다. 이미 fetch된 바운드 데이터가 바뀌면 UI만 자동으로 **다시 렌더**될 뿐이다. (초기 시드였던 "Block/Data-Action 입력이 auto-refetch한다"는 믿음은 틀렸고, 계층 C의 4건 수정이 여기서 비롯됐다.)

### 5.3 Aggregate join 유형 — 3종 + Cartesian

| Aggregate 표기 | SQL 의미 |
| --- | --- |
| **Only With** | INNER |
| **With or Without** | LEFT OUTER |
| **With** | FULL OUTER (양쪽 모든 행) |
| (join 조건 없음) | Cartesian |

`With`(FULL OUTER)이 존재한다는 사실이 "타입 두 개뿐" 오주장을 뒤집었다.

### 5.4 그 밖의 문서 검증된 사실(§16)

- **Delete Rule**: Protect(부모 삭제 차단, Database Exception) / Delete(cascade) / Ignore(고아 FK 방치).
- **Exception 유형**: All Exceptions(가장 일반) / Database / Security / Communication(Reactive·Mobile 전용) / User Exception. 더 구체적인 핸들러가 부모보다 우선.
- **Aggregate 함수**: Count(모든 타입), Sum·Average(숫자만), Max, Min. Group By는 출력을 그룹 속성 + 집계로 제한.
- **Built-in Validation**: 필수 필드 채움 + 제출값이 입력 데이터 타입과 일치하는지만 확인. 그 외 규칙은 custom validation(`Form.Valid`) 필요.
- **변수 범위**: Local Variable(화면/액션 범위, 임시) / Input Parameter(인스턴스별) / Client Variable(브라우저, 사용자별) / Session Variable(서버/DB) / Site Property(서버측 전역 설정, 환경별 런타임 지정).
- **Expression은 동기**: 클라이언트 Function만 호출, Server Action 호출 불가. Static Entity 레코드는 런타임 불변. 빈 리스트 `.Current`는 기본 레코드(`Id=NullIdentifier=0`, `Text=""`).

이 사실들은 §12의 개념 참조 박스(224문항)·초보자 빌딩블록 카드(96문항)에도 그대로 쓰인다. 에이전트는 어떤 개념이 적용되는지만 분류하고, 박스 본문은 공식 문서로 검증된 고정 텍스트다(에이전트 생성 사실 없음).

---

## 6. 남은 백로그 (§18 — 정직한 한계)

QA가 "0 errors"에 도달했다고 해서 모든 검증이 끝난 것은 아니다. 남은 항목:

- **자동화 테스트 부재**: `tsc`/build와 결정론적 `scripts/qa-check.mjs` 외에 unit/e2e 테스트가 없다. 계층 B·C의 그라운딩은 일회성 Workflow였고 CI에 상주하지 않는다.
- **비밀번호 재설정(email) 미구현**.
- **스크린샷/시각형 문항 비중 부족**: 실제 시험은 약 45%가 시각형이나 은행은 그 비중이 낮고, 일부 subtopic은 암기 위주로 치우침.
- **`ENT-058` 미확정**: attribute-rename의 물리 DB 동작에 대한 공식 검증 대기 상태로 여전히 `flagged`.
- **최종 사람 리뷰 지연**: OutSystems 개발자에 의한 은행 전체의 최종 검토는 아직 미뤄져 있음.

---

## 부록 — 재현 방법

```bash
node scripts/qa-check.mjs   # 계층 A: 결정론적 구조 검사, ERR는 0이어야 함
```

계층 B·C는 표준 사실을 시드로 주입한 멀티에이전트 Workflow였으며, 현재 리포지토리에 상주 스크립트로 남아 있지 않다(일회성 검증 패스). 향후 회귀 방지를 위해서는 계층 A를 predev/prebuild 게이트로 상시 실행하고, OutSystems 세부는 §16의 문서 검증된 사실을 단일 진실 소스로 참조하는 것이 권장된다.
