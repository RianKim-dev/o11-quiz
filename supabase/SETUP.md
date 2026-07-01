# Supabase 연동 설정 (당신이 할 부분)

앱 코드는 이미 준비됐어요. 키를 넣으면 로그인·기기 간 동기화가 켜지고, 안 넣으면 게스트 모드(localStorage)로 그대로 돌아갑니다. 로그인은 **이메일 + 비밀번호** 방식입니다.

## 1. Supabase 프로젝트 만들기 (무료)

1. https://supabase.com → **Sign in** (GitHub 계정으로 가능)
2. **New project** → 이름(예: `o11-quiz`), DB 비밀번호(아무거나, 메모해두기), 리전은 `Northeast Asia (Seoul)` 권장 → **Create**
3. 프로비저닝 1~2분 대기

## 2. 인증(Auth) 설정

- **Authentication → Sign In / Providers → Email** 이 **켜져** 있는지 확인 (기본 켜짐).
- **Confirm email 은 켠 채로 두세요** (기본값). → 가입 시 확인 메일이 가고, 링크를 클릭해야 로그인됩니다.
- **Authentication → URL Configuration**
  - **Site URL**: 로컬 테스트용은 `http://localhost:3000`, 배포 후엔 Vercel 주소로 변경(또는 둘 다 Redirect URLs에 추가).
  - **Redirect URLs**에 `http://localhost:3000/**` 와 (나중에) `https://<vercel-도메인>/**` 추가.

> 참고: Supabase 기본 메일 발송기는 무료 티어에서 시간당 발송량 제한이 있고 스팸함으로 갈 수 있어요. 소수 인원 가입엔 충분하지만, 사용자가 늘면 나중에 SMTP(예: Resend)를 연결하면 됩니다.

## 3. 테이블 만들기

- 왼쪽 **SQL Editor → New query** → 이 저장소의 `supabase/schema.sql` 내용을 붙여넣고 **Run**.
- "Success" 뜨면 `answers`, `bookmarks` 테이블 + RLS(사용자별 격리)까지 완료.

## 4. API 키 가져오기

- **Project Settings → API** 에서 두 값 복사:
  - `Project URL`
  - `anon` `public` 키 (`service_role` 아님! 이건 절대 노출 금지)

## 5. 로컬에서 테스트

프로젝트 루트에 `.env.local` 파일을 만들고:

```
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
```

그런 다음:

```
npm run dev
```

헤더에 **로그인** 버튼이 보이면 성공. **회원가입** 탭에서 이메일/비밀번호로 가입 → 메일함의 확인 링크 클릭 → **로그인** 탭에서 로그인. 문제 풀고 로그아웃 후 다시 들어와도 진도가 유지되면 동기화 OK.

## 6. Vercel 배포 (그다음 단계에서 함께)

- GitHub 저장소에 push → Vercel에서 Import → **Environment Variables** 에 위 두 값 입력 → Deploy.
- 배포 후 Supabase **URL Configuration**의 Site URL / Redirect URLs에 Vercel 도메인을 추가하세요.

> anon 키는 공개돼도 안전한 키라 저에게 알려주셔도 됩니다. 그러면 `.env.local`까지 세팅해 로컬 동작을 같이 확인할게요. **service_role 키·DB 비밀번호는 알려주지 마세요.**

## (다음에) 비밀번호 재설정

"비밀번호 찾기"(이메일로 재설정)는 확인 메일/리다이렉트가 실제로 동작하는지 봐야 해서, 프로젝트가 생기면 그때 함께 붙이고 테스트하겠습니다.
