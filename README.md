# O11 Quiz — OutSystems 11 Associate Developer 예상문제집

OutSystems 11 Associate Reactive Developer 자격증 대비 연습문제 웹앱.
Concentrix 사내 스터디용 (비공개).

## 무엇을 하는가

- 시험 blueprint(50문항 비율)대로 **모의고사**, **주제별 연습**, **오답 복습**, **⭐ 북마크 복습**
- 자동 채점 + **문항별 해설/출처**, 주제별 정답률 통계
- **로그인 필수** (이메일+비밀번호, `@concentrix.com`만) · 진도/오답/북마크 **기기 간 동기화**

## 구조

- **문제 데이터**: `content/questions/*.json` (소스 오브 트루스, git 버전 관리, 앱에 번들)
  - 스키마·저작/검증 프로세스: `content/README.md`
  - 커밋 시 `scripts/gen-manifest.mjs`가 대시보드용 매니페스트를 자동 생성 (`predev`/`prebuild`)
- **사용자 데이터**: Supabase (진도 `answers`, 북마크 `bookmarks`, RLS로 사용자별 격리)
- **프레임워크**: Next.js 16 (App Router) + TypeScript + Tailwind v4

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # Supabase URL/anon key 입력 (없으면 게스트 모드)
npm run dev
```

## Supabase 설정

`supabase/SETUP.md` 참고. 요약:
1. 프로젝트 생성 → `supabase/schema.sql` 실행 (테이블+RLS)
2. `supabase/restrict-domain.sql` 실행 (@concentrix.com 서버 강제)
3. Authentication → URL Configuration에 Site URL/Redirect URLs 등록
4. Settings → API의 `Project URL` + `anon` 키를 env로

## 배포 (Vercel)

GitHub 저장소 연결 → 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 입력 → 배포.
푸시할 때마다 자동 재배포되므로, 문항 추가 = JSON 커밋 + 푸시.

## 문항 추가

`content/questions/<subtopic>.json`에 항목 추가 → `npm run gen`으로 매니페스트 갱신 → 커밋/푸시.
