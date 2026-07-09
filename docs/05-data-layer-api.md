# 데이터 계층 API 계약 (Data Layer)

> 범위: `src/lib/progress.ts`의 공개 데이터 API와, 그 아래 Supabase↔localStorage 라우팅(`remote()`), `status.ts` localStorage 구조, `authStore.ts`/`auth.tsx` 연동을 다룬다.

이 문서는 O11 Quiz의 "진도(progress)" 데이터가 어떻게 저장·조회되는지를 코드 계약 수준으로 정리한다. 핵심은 **하나의 공개 API 표면(`progress.ts`)이 로그인·구성 상태에 따라 Supabase(원격, 기기 간 동기화, RLS 격리)와 localStorage(게스트 폴백) 중 하나로 자동 라우팅한다**는 점이다. 호출자(`QuizRunner.tsx`, `Dashboard.tsx` 등)는 어느 저장소가 쓰이는지 알 필요가 없다.

현재 실사용 데이터는 자기평가 status(`known`=알아요 / `review`=몰라요) 하나뿐이며(브리프 §7), `answers`/`bookmarks` 계열 API는 코드에 남아 있으나 **더 이상 호출되지 않는다**(브리프 §7, §17-3).

---

## 1. 계층 구조 한눈에 보기

```
호출자 (QuizRunner, Dashboard, …)
        │  (저장소를 모름)
        ▼
src/lib/progress.ts        ← 공개 API + remote() 라우팅
        ├─ remote() == null  →  src/lib/status.ts     (localStorage: 게스트)
        │                        src/lib/storage.ts    (localStorage: legacy, 미사용)
        └─ remote() != null  →  Supabase 테이블         (로그인 + 구성됨)
                                 · question_status
                                 · answers / bookmarks (legacy, 미사용)

라우팅 판단 입력:
  src/lib/authStore.ts        currentUserId()      ← auth.tsx가 세팅
  src/lib/supabase/client.ts  getSupabase()        ← 환경변수로 구성 여부 결정
```

| 파일 | 역할 |
| --- | --- |
| `src/lib/progress.ts` | 공개 데이터 API. `remote()`로 원격/로컬 분기 |
| `src/lib/status.ts` | 자기평가 status의 localStorage 구현 (게스트 폴백) |
| `src/lib/storage.ts` | legacy answers/bookmarks의 localStorage 구현 (**미사용**) |
| `src/lib/supabase/client.ts` | 브라우저 Supabase 클라이언트 + 구성 여부 플래그 |
| `src/lib/authStore.ts` | 현재 user id를 담는 모듈 전역 홀더 |
| `src/lib/auth.tsx` | `AuthProvider`. 세션 변화를 `authStore`에 반영 |

---

## 2. 라우팅 판단 — `remote()`

`progress.ts`의 모든 공개 함수는 첫 줄에서 `remote()`를 호출해 저장소를 고른다.

```ts
// src/lib/progress.ts
function remote() {
  const uid = currentUserId();   // authStore.ts
  const sb = getSupabase();      // supabase/client.ts
  return uid && sb ? { uid, sb } : null;
}
```

- **두 조건이 모두 참일 때만** 원격(Supabase)을 쓴다:
  1. `currentUserId()`가 non-null → **로그인됨** (`auth.tsx`의 `AuthProvider`가 `setCurrentUserId`로 세팅).
  2. `getSupabase()`가 non-null → **Supabase가 구성됨** (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 둘 다 존재).
- 둘 중 하나라도 없으면 `null`을 반환하고, 호출자는 **localStorage 폴백**(게스트 모드)으로 동작한다.

라우팅 조합:

| `currentUserId()` | `getSupabase()` | `remote()` | 사용 저장소 |
| --- | --- | --- | --- |
| null (미로그인) | null (미구성) | `null` | localStorage |
| null (미로그인) | 객체 (구성됨) | `null` | localStorage |
| 값 있음 (로그인) | null (미구성) | `null` | localStorage |
| 값 있음 (로그인) | 객체 (구성됨) | `{ uid, sb }` | Supabase |

> 참고: 앱이 배포 환경에서 Supabase가 구성되어 있으면 `AuthGate`가 게스트 접근을 막으므로(브리프 §4, §13), 실제 운영에서는 "로그인 + 구성됨" 경로가 정상 경로다. localStorage 폴백은 Supabase 미구성 로컬 개발/게스트 상황용이다.

### `getSupabase()` / 구성 판단 (`src/lib/supabase/client.ts`)

```ts
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && anon);

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) _client = createBrowserClient(url, anon);  // @supabase/ssr, 지연 싱글턴
  return _client;
}
```

- `isSupabaseConfigured`는 두 `NEXT_PUBLIC_*` 환경변수가 모두 있을 때만 `true`.
- 클라이언트는 **지연 생성 싱글턴**(`_client`) — 최초 호출 시 한 번만 `createBrowserClient` 실행.
- anon key는 공개 안전(브리프 §13). service_role key·DB 비밀번호는 커밋 금지.

### 현재 user id (`src/lib/authStore.ts`)

```ts
let _userId: string | null = null;
export function setCurrentUserId(id: string | null): void { _userId = id; }
export function currentUserId(): string | null { return _userId; }
```

- **비-React 데이터 계층(`progress.ts`)이 prop drilling 없이** 로그인 여부를 알기 위한 모듈 전역 홀더.
- 값의 소유·갱신은 `auth.tsx`가 담당한다(§6).

---

## 3. 공개 API 계약 — question status (실사용)

자기평가 status는 문항당·유저당 하나이며 상호 배타적이다(브리프 §7). 타입은 `status.ts`가 정의한다.

```ts
// src/lib/status.ts
export type QStatus = "known" | "review";   // known=알아요, review=몰라요(다시 볼 목록)
//  값이 없음(row 없음 / map에 키 없음) = 미확인(default)
```

`progress.ts`는 `QStatus`와 `AnswerRecord`를 재-export한다(`export type { AnswerRecord, QStatus }`).

원격 테이블: `public.question_status(user_id, question_id, status CHECK(known|review), updated_at, PK(user_id, question_id))`, RLS `auth.uid() = user_id`(브리프 §7, §13).

### 3.1 함수 시그니처·동작 요약

| 함수 | 시그니처 | 원격(Supabase) 동작 | 로컬(localStorage) 동작 |
| --- | --- | --- | --- |
| `loadStatuses` | `() => Promise<Map<string, QStatus>>` | `question_status`에서 `question_id,status`를 `user_id`로 select → `Map` | `status.ts`의 `getStatusMap()` 결과를 `Map`으로 |
| `setStatus` | `(id: string, status: QStatus \| null) => Promise<void>` | `status` 있으면 `upsert`(updated_at 갱신), `null`이면 해당 행 `delete` | `setStatusLocal(id, status)` |
| `setStatusBulk` | `(entries: {id:string; status:QStatus\|null}[]) => Promise<void>` | 세팅분은 `upsert(배열)`, 클리어분은 `delete().in("question_id", …)` | `setStatusBulkLocal(entries)` |
| `clearStatuses` | `() => Promise<void>` | `user_id`로 `question_status` 전체 `delete` | `clearStatusLocal()` (키 remove) |

모든 함수는 `async`(Promise 반환)이며, 첫 줄에서 `remote()`를 부른다.

### 3.2 `loadStatuses()`

```ts
export async function loadStatuses(): Promise<Map<string, QStatus>>
```

- **원격**: `.from("question_status").select("question_id,status").eq("user_id", uid)`.
  - `error || !data`이면 **빈 `Map`** 반환(조용한 실패 — 예외를 던지지 않음).
  - 성공 시 `data`를 `[question_id, status]` 페어의 `Map`으로 변환.
- **로컬**: `new Map(Object.entries(getStatusMap()))` — localStorage의 객체를 `Map`으로.
- 반환 `Map`에 **없는** 문항 id는 곧 "미확인"을 의미한다.

### 3.3 `setStatus(id, status | null)`

```ts
export async function setStatus(id: string, status: QStatus | null): Promise<void>
```

- `status`가 `"known"`/`"review"`면 **설정**, `null`이면 **미확인으로 되돌림(삭제)**.
- **원격**:
  - 설정: `.upsert({ user_id, question_id: id, status, updated_at: new Date().toISOString() })` — PK `(user_id, question_id)` 충돌 시 갱신.
  - 클리어: `.delete().eq("user_id", uid).eq("question_id", id)`.
- **로컬**: `setStatusLocal(id, status)`.
- 반환값 없음(`void`). 원격 호출 결과의 `error`는 **확인하지 않는다**(fire-and-forget에 가까움; §7 오류 처리 참고).

### 3.4 `setStatusBulk(entries)`

```ts
export async function setStatusBulk(entries: { id: string; status: QStatus | null }[]): Promise<void>
```

- `entries.length === 0`이면 **즉시 return**(저장소 접근 없음).
- 내부에서 `status`가 truthy인 항목(`toSet`)과 falsy인 항목(`toClear`, id만)으로 분리.
- **원격**: `toSet`이 있으면 한 번의 `upsert(배열)`(각 항목에 `updated_at` 부여), `toClear`가 있으면 한 번의 `delete().in("question_id", toClear)`. 최대 2회의 쿼리로 대량 처리.
- **로컬**: `setStatusBulkLocal(entries)` — 한 번 읽어 map을 수정하고 한 번 write.
- 사용처: mock 채점 후 벌크 액션(틀린 것→몰라요 / 맞은 것→알아요 등, 브리프 §9), 대시보드 대량 갱신.

### 3.5 `clearStatuses()`

```ts
export async function clearStatuses(): Promise<void>
```

- **원격**: `.from("question_status").delete().eq("user_id", uid)` — 해당 유저의 모든 status 삭제.
- **로컬**: `clearStatusLocal()` → `localStorage.removeItem("o11quiz.status.v1")`.
- 사용처: 대시보드 "진도 초기화"(브리프 §10).

---

## 4. `status.ts` — localStorage 구조 (게스트 폴백)

```ts
// src/lib/status.ts
const KEY = "o11quiz.status.v1";
```

- **저장 형식**: 단일 키 `o11quiz.status.v1`에 JSON 객체 `Record<string, QStatus>` — 문항 id → `"known"|"review"`. **미확인은 키 자체가 없음**(값으로 표현하지 않음).
- 예: `{"AGG-001":"known","FDS-003":"review"}`.

| 함수 | 시그니처 | 동작 |
| --- | --- | --- |
| `getStatusMap` | `() => Record<string, QStatus>` | 키를 파싱해 반환. 없으면 `{}` |
| `setStatusLocal` | `(id, status: QStatus \| null) => void` | 맵을 읽어 `status`면 `map[id]=status`, `null`이면 `delete map[id]` 후 write |
| `setStatusBulkLocal` | `(entries[]) => void` | 맵을 한 번 읽어 루프로 반영 후 한 번 write |
| `clearStatusLocal` | `() => void` | `localStorage.removeItem(KEY)` |

**SSR/오류 방어**:
- 모든 함수가 `typeof window === "undefined"`를 먼저 검사 — 서버에서는 읽기는 `{}`, 쓰기는 no-op. (Next.js App Router의 서버 렌더 중 크래시 방지.)
- `getStatusMap()`은 `JSON.parse`를 `try/catch`로 감싸 파싱 실패 시 `{}` 반환(손상된 localStorage 방어).

---

## 5. legacy: answers / bookmarks (retained, 미사용)

브리프 §7·§17-3에 따라 자기평가 status가 auto-grading·bookmark·오답복습을 **대체**했다. 아래 API는 코드에 남아 있으나 **더 이상 호출되지 않는다**(호출자 제거됨). 유지 이유: 과거 데이터/DB 테이블 스키마와의 호환·이력 보존.

### `progress.ts`의 legacy 공개 함수

| 함수 | 시그니처 | 원격 테이블/동작 | 로컬 |
| --- | --- | --- | --- |
| `loadAnswers` | `() => Promise<AnswerRecord[]>` | `answers` select → `AnswerRecord[]` 매핑; `error\|\|!data`면 `[]` | `getAnswers()` |
| `saveAnswers` | `(records: AnswerRecord[]) => Promise<void>` | `answers.insert(rows)` (append) | `appendAnswers(records)` |
| `clearAnswers` | `() => Promise<void>` | `answers.delete().eq("user_id", uid)` | `clearAnswers()` |
| `loadBookmarks` | `() => Promise<Set<string>>` | `bookmarks` select → `Set<question_id>`; 실패 시 빈 `Set` | `getBookmarks()` |
| `setBookmark` | `(id: string, on: boolean) => Promise<boolean>` | `on`이면 `upsert`, 아니면 `delete`; **새 상태 반환** | `setBookmark(id, on)` |

### `storage.ts` — legacy localStorage 구현 (미사용)

```ts
// src/lib/storage.ts
const KEY    = "o11quiz.answers.v1";
const BM_KEY = "o11quiz.bookmarks.v1";
```

- `AnswerRecord` 타입: `{ questionId, chosen(""=미응답), correct, subtopic, category, mode, ts }`.
- `answers` 키에는 `AnswerRecord[]`(append-only 로그), `bookmarks` 키에는 `string[]`(id 목록)이 저장된다.
- 유틸: `latestByQuestion()`(최신 ts가 이기는 문항별 최신 답), `wrongIdsFrom()`(최신 답이 오답/미응답인 id 집합) — 과거 오답복습·숙련도 계산용. 현재 미사용.
- `status.ts`와 동일하게 `typeof window` 가드 + `try/catch` 파싱 방어를 갖춘다.

> 정리: 신규 코드는 **오직 `loadStatuses`/`setStatus`/`setStatusBulk`/`clearStatuses`만** 사용한다. answers/bookmarks 계열은 확장하지 말 것.

---

## 6. authStore 연동 — user id는 어떻게 채워지나

`progress.ts`는 React 밖의 순수 모듈이라 컨텍스트를 읽을 수 없다. 그래서 `auth.tsx`의 `AuthProvider`가 세션 상태를 `authStore`의 모듈 전역에 밀어 넣는 방식으로 다리를 놓는다.

`src/lib/auth.tsx` (`AuthProvider`)의 흐름:

1. 마운트 시 `getSupabase()` 확인. `null`(미구성)이면 `loading=false`로 두고 종료 → `currentUserId()`는 계속 `null` → 데이터 계층은 localStorage 경로.
2. 구성됨이면 `sb.auth.getSession()`으로 초기 세션을 읽고, `sb.auth.onAuthStateChange(...)`로 이후 변화를 구독.
3. 세션이 바뀔 때마다 `applyUser(user | null)` 실행:
   - React 상태(`userId`, `name`) 갱신 **그리고**
   - `setCurrentUserId(u?.id ?? null)` 호출 → `authStore`의 `_userId` 갱신.
4. 언마운트 시 `sub.subscription.unsubscribe()`.

즉 **`remote()`가 보는 `currentUserId()`는 항상 최신 Supabase 세션과 동기화**된다. `signOut()`은 `sb.auth.signOut()` 후 `applyUser(null)`을 불러 즉시 `_userId=null`로 만들어, 로그아웃 순간부터 데이터 계층이 localStorage로 폴백한다.

`AuthState`(컨텍스트)가 노출하는 값: `userId`, `name`(display_name → email 순 폴백), `loading`, `configured`(= `isSupabaseConfigured`), `signIn`, `signUp`, `signOut`.

도메인 제한: `signUp`은 `@${ALLOWED_EMAIL_DOMAIN}`(= `concentrix.com`, `config.ts`)로 끝나지 않으면 가입 거부(클라이언트 측). 서버 측 DB 트리거로도 이중 강제(브리프 §13). `signUp` 반환의 `needsConfirm = !data.session` — 세션이 없으면 이메일 확인 대기.

---

## 7. 오류 처리 · 일관성 계약

| 지점 | 동작 | 함의 |
| --- | --- | --- |
| `loadStatuses` / `loadAnswers` / `loadBookmarks` 원격 실패 | `error \|\| !data`이면 **빈 컬렉션** 반환(예외 없음) | 네트워크/RLS 오류 시 화면은 "데이터 없음"처럼 보인다. 로드 실패와 진짜 빈 상태를 구분하지 않음 |
| `setStatus` / `setStatusBulk` / `clearStatuses` 원격 쓰기 | 반환 `error`를 **검사하지 않음**(`await`만 함) | 쓰기 실패가 조용히 무시될 수 있음. UI는 낙관적으로 갱신됨 |
| SSR (`window` 없음) | 로컬 함수는 읽기 `{}`/`[]`/빈 `Set`, 쓰기 no-op | 서버 렌더 안전 |
| 손상된 localStorage | `JSON.parse` `try/catch` → 기본값 | 크래시 대신 초기화된 것처럼 동작 |
| `setStatusBulk([])` | 즉시 return | 불필요한 저장소 접근·빈 쿼리 회피 |

**알려진 갭 / 유의점**(브리프 §18: 정직하게 밝힘):
- 자동화 테스트가 `tsc`/build와 `qa-check.mjs` 외에 없다 — 데이터 계층에 단위/e2e 테스트 없음.
- 원격 쓰기 오류가 사용자에게 노출되지 않는다(위 표). 오프라인/일시적 실패 시 UI 낙관적 상태와 서버가 어긋날 수 있으나, 다음 `loadStatuses`에서 서버 값으로 재수렴한다.
- **로컬↔원격 마이그레이션 없음**: 게스트로 localStorage에 쌓은 status는 로그인 시 Supabase로 자동 이관되지 않는다(코드에 해당 로직 없음). 실 운영에서는 `AuthGate`로 게스트 사용 자체가 차단되므로 실질 영향은 작다.

---

## 8. 호출자를 위한 요약 규칙

- 저장소를 직접 만지지 말고 **항상 `progress.ts`의 공개 함수를 통해** 접근한다(라우팅이 그 안에 캡슐화됨).
- 신규 기능은 `loadStatuses`/`setStatus`/`setStatusBulk`/`clearStatuses`만 사용한다. answers/bookmarks는 legacy.
- 모든 API는 `async`이므로 `await`하되, 로드 결과가 빈 컬렉션일 수 있음을 감안한다(로드 실패 ≡ 빈 상태).
- 미확인 상태는 "값 없음"으로 표현된다 — `Map`/객체에 키가 없으면 미확인.
