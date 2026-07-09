# 보안 & 프라이버시 모델 (Security & Privacy)

> 범위: o11-quiz 앱의 사용자 데이터 격리(RLS), @concentrix.com 도메인 게이트, 로그인 강제(AuthGate), 시크릿 관리 정책, 회사 IP 보호, 게스트 모드의 localStorage 격리를 다룬다. 콘텐츠 파이프라인/QA는 별도 문서 참조.

이 앱은 소규모 Concentrix 그룹을 위한 **비공개** 학습 도구이며, 공개 서비스가 아니다. 문제 은행 자체는 저장소에 버전 관리되는 JSON(`content/questions/*.json`)으로 앱에 번들되어 있어 민감 데이터가 아니지만, **사용자별 학습 진도(self-assessment status)** 는 개인 데이터로 취급되어 Supabase Postgres에 저장되고 Row-Level Security(RLS)로 격리된다. 보안 모델은 크게 세 겹으로 구성된다: (1) DB가 강제하는 사용자 격리(RLS), (2) 이중(클라이언트 + DB 트리거)으로 강제되는 도메인 게이트, (3) 로그인 강제(AuthGate). 여기에 시크릿 관리와 회사 IP 보호 정책이 더해진다.

핵심 원칙은 **"클라이언트 검증은 UX, DB 강제는 보안"** 이다. 클라이언트 측 검사(도메인 확인, 로그인 리다이렉트)는 우회 가능하므로 신뢰 경계가 아니며, 실제 강제는 Postgres RLS 정책과 `auth.users` 트리거에서 이뤄진다.

---

## 1. RLS를 통한 사용자 격리

모든 사용자 테이블은 RLS가 켜져 있고, 정책은 `auth.uid() = user_id` 하나로 통일된다. `auth.uid()`는 Supabase가 요청의 JWT에서 추출한 로그인 사용자 UUID이며, 클라이언트가 위조할 수 없다. 따라서 사용자 간 데이터 누출이 원천적으로 불가능하다.

### 1.1 테이블별 RLS 정책 (`supabase/schema.sql`)

| 테이블 | 용도 | 상태 | RLS | 정책 (`for all`, using + with check) |
|---|---|---|---|---|
| `public.question_status` | 자기평가 상태(알아요/몰라요) — **현재 활성 데이터 계층** | 사용 중 | `enable row level security` | `auth.uid() = user_id` |
| `public.answers` | 과거 채점 이력 (레거시) | 보존되나 미사용 | `enable row level security` | `auth.uid() = user_id` |
| `public.bookmarks` | ⭐ 별표 북마크 (레거시) | 보존되나 미사용 | `enable row level security` | `auth.uid() = user_id` |

세 테이블 모두 동일한 방어가 적용된다:

- `alter table ... enable row level security;` — RLS 미적용 테이블은 기본이 "전부 접근 가능"이므로 반드시 켜야 한다.
- `create policy ... for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`
  - `using` 절은 **읽기/조회(SELECT/UPDATE/DELETE 대상 행)** 를 자기 행으로 제한한다.
  - `with check` 절은 **쓰기(INSERT/UPDATE 결과 행)** 가 자기 `user_id`를 갖도록 강제한다. 즉 남의 `user_id`로 행을 삽입하려는 시도를 Postgres가 거부한다.
- `for all`은 SELECT/INSERT/UPDATE/DELETE 전부에 정책을 적용한다는 의미다.

`answers`, `bookmarks`는 레거시(자기평가 모델로 대체됨, brief §7·§17)이지만 여전히 RLS가 켜진 채 보존되어 있으므로, 혹시 남은 데이터가 있어도 격리는 유지된다.

### 1.2 `question_status` 스키마 요약

```sql
create table if not exists public.question_status (
  user_id     uuid  not null references auth.users (id) on delete cascade,
  question_id text  not null,
  status      text  not null check (status in ('known', 'review')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
```

- `status='known'` = 알아요, `status='review'` = 몰라요(다시 볼 목록), **행 없음** = 미확인(default). `check` 제약으로 그 외 값은 거부된다.
- `references auth.users (id) on delete cascade` — 계정이 삭제되면 그 사용자의 진도 행도 자동 삭제된다(고아 데이터 방지).
- `primary key (user_id, question_id)` — 사용자·문제당 최대 한 행. Upsert 기반 상태 갱신에 적합하다.

### 1.3 데이터 계층의 라우팅 (참고)

애플리케이션 측 데이터 접근은 `src/lib/progress.ts`가 담당한다(brief §7): `loadStatuses()`, `setStatus(id, status|null)`, `setStatusBulk(entries)`, `clearStatuses()`. 로그인 + Supabase 설정 상태이면 Supabase로, 아니면 localStorage(`src/lib/status.ts`)로 라우팅한다. Supabase 경로에서는 위 RLS가 서버 측 강제선이 되고, 클라이언트가 `user_id`를 조작해도 정책이 막는다.

---

## 2. @concentrix.com 도메인 게이트 (이중 강제)

가입은 `@concentrix.com` 이메일로만 허용된다. 이 규칙은 **클라이언트와 DB 양쪽에서 각각** 강제된다. 클라이언트 검사만으로는 우회 가능(예: API 직접 호출)하기 때문에, DB 트리거가 최종 방어선이다.

### 2.1 클라이언트 측 (UX 레벨)

- 허용 도메인은 `src/lib/config.ts`에 상수로 선언되어 있다:
  ```ts
  export const ALLOWED_EMAIL_DOMAIN = "concentrix.com";
  ```
- `src/lib/auth.tsx`의 `signUp()`이 Supabase 호출 **전에** 도메인을 검사한다:
  ```ts
  if (!email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    return { error: `@${ALLOWED_EMAIL_DOMAIN} 이메일만 가입할 수 있어요.` };
  }
  ```
  `toLowerCase()`로 대소문자 무시, `trim()`으로 공백 제거 후 접미사 검사. 이는 사용자에게 친절한 즉시 피드백을 주기 위한 것으로, **보안 경계가 아니다**(클라이언트 코드는 신뢰할 수 없음).

### 2.2 서버 측 (보안 레벨, `supabase/restrict-domain.sql`)

`auth.users`에 `before insert` 트리거를 걸어, 신규 가입 행이 도메인 규칙을 어기면 예외를 던져 삽입 자체를 무산시킨다:

```sql
create or replace function public.enforce_allowed_email_domain()
returns trigger language plpgsql as $$
begin
  if new.email is null or lower(new.email) not like '%@concentrix.com' then
    raise exception 'signup_not_allowed: only @concentrix.com emails are permitted';
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email_domain
  before insert on auth.users
  for each row execute function public.enforce_allowed_email_domain();
```

- `lower(new.email) not like '%@concentrix.com'` — 대소문자 무시 + `@concentrix.com`으로 끝나지 않으면 거부. `new.email is null`도 방어한다.
- 클라이언트 검사를 우회해 Supabase Auth API를 직접 호출하더라도, 이 트리거가 계정 생성을 막는다. 파일 주석 그대로 "Backstop for the client-side check"다.

### 2.3 유지보수 주의 (동기화 필요)

허용 도메인이 **두 곳에 하드코딩**되어 있다: `config.ts`의 `ALLOWED_EMAIL_DOMAIN` 상수와 `restrict-domain.sql`의 리터럴 패턴 `'%@concentrix.com'`. 도메인을 바꾸려면 양쪽을 함께 수정해야 하며, SQL은 Supabase SQL Editor에서 재실행해야 한다(SQL 파일 상단 주석에 명시). 이 이중 소스는 알려진 유지보수상의 결합점이다.

---

## 3. 로그인 강제 (AuthGate)

`src/components/AuthGate.tsx`가 앱 전역에서 게스트 접근을 차단한다. 단, **Supabase가 설정된 경우에만** 강제되고, 미설정(로컬 개발 등)이면 오픈/게스트 모드로 폴백한다.

- 판정 로직:
  ```ts
  const isLoginRoute = pathname === "/login";
  const needsAuth = configured && !loading && !userId && !isLoginRoute;
  ```
  - `configured` — `isSupabaseConfigured`(§4)에서 온다. 키가 없으면 게이트가 열린다.
  - `/login` 라우트는 항상 통과시킨다(리다이렉트 루프 방지).
  - `loading` 중에는 "불러오는 중…" 표시만 하고 판정을 보류한다(세션 복원 레이스 방지).
- `needsAuth`이면 `useEffect`에서 `router.replace("/login")`으로 리다이렉트하고, 폴백 UI로 "로그인이 필요합니다." + 로그인 링크를 렌더한다.
- 인증 상태는 `src/lib/auth.tsx`의 `AuthProvider`가 관리한다: 마운트 시 `sb.auth.getSession()`으로 세션 복원, `onAuthStateChange`로 상태 변화 구독, 언마운트 시 `unsubscribe`.

**보안 관점 한계**: AuthGate는 클라이언트 측 라우팅 게이트이므로 "UI 접근 차단" 수준이다. 실제 데이터 보호는 여전히 RLS(§1)가 담당한다 — 로그인하지 않으면 유효한 `auth.uid()`가 없어 어차피 남의 진도 데이터를 읽거나 쓸 수 없다. AuthGate는 방어 심층화(defense-in-depth)의 UX 계층이지 데이터 신뢰 경계가 아니다.

---

## 4. 시크릿 정책

Supabase 클라이언트는 `src/lib/supabase/client.ts`에서 두 개의 `NEXT_PUBLIC_*` 환경변수로 초기화된다:

```ts
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && anon);
```

| 시크릿 | 노출 여부 | 위치 | 정책 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개-안전 | Vercel / `.env.local` | 클라이언트 번들에 포함 OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **공개-안전** | Vercel / `.env.local` | 클라이언트 번들에 포함 OK |
| `service_role` 키 | 비밀 | (앱에서 사용 안 함) | **절대 커밋 금지** |
| DB 비밀번호 | 비밀 | (앱에서 사용 안 함) | **절대 커밋 금지** |

- **anon 키가 공개-안전한 이유**: anon 키는 익명/로그인 사용자의 제한된 권한만 부여하며, 데이터 접근은 전적으로 RLS 정책(§1)의 통제를 받는다. `NEXT_PUBLIC_` 접두사는 Next.js가 이 값을 클라이언트 번들에 넣도록 의도적으로 허용한 것이다. anon 키가 노출되어도 RLS를 뚫지 못한다.
- **service_role 키는 RLS를 우회**하는 관리자 권한이므로 절대 클라이언트나 저장소에 두면 안 된다. 이 앱의 클라이언트 코드는 service_role를 전혀 사용하지 않는다(브라우저 클라이언트만 존재).
- 환경변수는 git에 커밋되지 않으며, 예시 템플릿(`.env.local.example`, brief §13)만 제공된다. 실제 값은 Vercel 프로젝트 설정과 로컬 `.env.local`에 둔다.
- 키 미설정 시 `getSupabase()`는 `null`을 반환하고 앱은 게스트 모드로 동작한다(§3·§5) — 시크릿이 없어도 크래시 없이 열화 동작한다.

---

## 5. 게스트 모드와 localStorage 격리

Supabase가 설정되지 않은 환경(로컬 개발, 키 부재)에서는 로그인 없이 게스트로 동작한다. 이때 진도는 서버가 아닌 **브라우저 localStorage**에 저장된다.

- 상태 저장 키: `o11quiz.status.v1` (자기평가 상태; `src/lib/status.ts`, brief §7).
- 언어 선호 등도 localStorage에 저장된다(`src/lib/i18n.tsx`, brief §11).
- **격리 특성**: localStorage는 브라우저·오리진 단위로 분리되므로 게스트 데이터는 그 기기·브라우저 밖으로 나가지 않는다. 서버로 전송되지 않아 다른 사용자에게 누출될 경로가 없다. 반대로 같은 브라우저를 공유하면 게스트 데이터는 프로필 격리가 없다(같은 기기·브라우저의 다른 사용자와 공유됨) — 게스트 모드는 개인 기기 사용을 전제로 한다.
- 라우팅: `progress.ts`가 로그인 + 설정 상태이면 Supabase, 아니면 localStorage로 자동 분기한다(§1.3). 즉 프로덕션(Supabase 설정 + AuthGate 강제)에서는 항상 서버 경로 + RLS가 적용되고, localStorage 경로는 주로 개발/게스트 폴백이다.

레거시 `src/lib/storage.ts`(옛 answers/bookmarks localStorage)는 보존되어 있으나 더 이상 사용되지 않는다(brief §4·§7).

---

## 6. 위협 → 완화 표

| # | 위협 | 완화책 | 강제 지점 | 잔여 위험 |
|---|---|---|---|---|
| T1 | 다른 사용자의 진도 데이터 조회/변조 | RLS `auth.uid() = user_id` (using + with check) | Postgres (`schema.sql`) | 없음 — DB가 강제. anon 키 노출과 무관 |
| T2 | 남의 `user_id`로 행 삽입 | RLS `with check` 절이 삽입 행의 `user_id` 강제 | Postgres | 없음 |
| T3 | 외부인(비-@concentrix.com) 가입 | 클라이언트 접미사 검사 + `auth.users` before-insert 트리거 | 클라이언트(UX) + DB(보안) | 도메인 상수가 두 곳에 하드코딩 — 변경 시 동기화 필요 |
| T4 | 클라이언트 도메인 검사 우회(API 직접 호출) | DB 트리거가 삽입을 예외로 차단 | Postgres (`restrict-domain.sql`) | 없음 |
| T5 | 비로그인 게스트의 앱 접근 | AuthGate가 `/login`으로 리다이렉트(Supabase 설정 시) | 클라이언트(UX) + RLS(데이터) | AuthGate 자체는 UI 게이트 — 데이터 보호는 RLS가 담당 |
| T6 | anon 키 노출 | anon 키는 공개-안전; 권한은 RLS로 통제 | 설계상 안전 | 없음 (service_role는 아예 미사용) |
| T7 | service_role 키 / DB 비번 유출 | 저장소·클라이언트에 커밋/포함 안 함; 앱은 브라우저 클라이언트만 사용 | 운영 정책 + 코드 부재 | 사람의 실수(수동 커밋)만 위험 — `.env` git 제외 |
| T8 | 게스트 데이터 서버 누출 | localStorage는 오리진·기기 로컬, 서버 전송 없음 | 브라우저 | 공유 기기에서 게스트끼리는 분리 안 됨(개인 기기 전제) |
| T9 | 회사 IP(워크북 PDF) 유출 | 내부 교재는 커밋하지 않고 scratchpad에만 보관, 콘텐츠 생성 근거로만 사용 | 운영 정책 (§7) | 파생 콘텐츠(문제)는 저장소에 있음 — 원문은 비공개 |
| T10 | 계정 삭제 후 진도 데이터 잔존 | FK `on delete cascade`로 자동 삭제 | Postgres | 없음 |

---

## 7. 회사 IP 보호 (워크북 미커밋)

문제 은행 생성의 근거가 된 **사내 교육 워크북 PDF는 회사 IP**이므로 저장소에 커밋하지 않는다(brief §13). 이 원문 자료는 로컬 scratchpad에만 보관되어 콘텐츠 생성의 grounding 소스로만 쓰였다. 저장소에 남는 것은 파생 산출물인 문제 JSON(`content/questions/*.json`)뿐이며, 원문 교재 자체는 유출되지 않는다. 이는 코드로 강제되는 것이 아니라 운영/작업 정책이므로, 실수로 PDF를 커밋하지 않도록 주의가 필요하다(잔여 위험 T9).

---

## 8. 알려진 격차 / 주의 (정직한 한계, brief §18)

- **자동화 테스트 부재**: `tsc`/빌드 + 결정적 `scripts/qa-check.mjs` 외에 보안 관련 단위/e2e 테스트가 없다. RLS 정책 자체를 검증하는 테스트도 없으므로, 정책 회귀는 수동 검토에 의존한다.
- **비밀번호 재설정(이메일) 미구현**: 계정 복구 흐름이 없다.
- **도메인 규칙 이중 하드코딩**: `config.ts`와 `restrict-domain.sql`가 별개로 도메인을 담고 있어 변경 시 동기화 누락 위험(T3).
- **AuthGate는 클라이언트 게이트**: UI 차단일 뿐 데이터 보호는 RLS에 의존한다. 두 계층을 혼동하면 안 된다.
- **이메일 확인 흐름**: `signUp()`은 `data.session`이 없으면 `needsConfirm: true`를 반환한다(`auth.tsx`) — 첫 로그인 전 이메일 확인이 요구되도록 Supabase 설정에 의존한다(앱 코드가 강제하는 것은 아님).
