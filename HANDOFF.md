# HANDOFF — 다른 컴퓨터에서 이어서 작업하기

이 파일은 **다른 기기(집 데스크탑)에서 작업을 이어받기 위한 인수인계 문서**입니다.
새 Claude Code 세션을 열면 **가장 먼저 이 파일 + `content/README.md` + `supabase/SETUP.md`를 읽게** 하세요.
(Claude의 프로젝트 메모리는 기기마다 로컬이라 자동으로 넘어오지 않습니다. 이 문서가 그 역할을 합니다.)

## 이 프로젝트가 뭔가

OutSystems 11 Associate (Reactive) Developer 자격증 대비 **이중언어(한국어/영어) 연습문제 웹앱**. Concentrix 사내 스터디용(비공개).
- **Live:** https://o11-quiz.vercel.app  (main에 push하면 Vercel이 자동 재배포)
- **Repo:** github.com/RianKim-dev/o11-quiz (private)
- **Supabase 프로젝트 ref:** `phhlyxxncfxzvwbxkvwn`

## 현재 상태 (2026-07-01 기준)

- 문제 은행: **156문항 / 154 verified + 2 flagged**, 14개 전 과목 커버 → 50문항 모의고사 조립 가능
- 전 문항 **한국어판(`i18n.ko`)** 있음, 헤더에 한국어/EN 토글
- 앱: Next.js 16(App Router)+TS+Tailwind v4. 로그인(**@concentrix.com 전용**, 이메일+비번, 로그인 필수), 진도·오답·북마크 Supabase 동기화(RLS)

## 집 데스크탑에서 이어받기 (순서대로)

### 1. 필수 프로그램
- **Node.js 20+**, **Git**, (그리고 Claude Code)

### 2. 코드 가져오기
```
git clone https://github.com/RianKim-dev/o11-quiz.git
cd o11-quiz
```
(첫 push/clone 때 GitHub 로그인 창이 뜰 수 있음 — 승인)

### 3. 환경변수 만들기  ⚠️ git에 없음
프로젝트 루트에 `.env.local` 파일 생성 (`.env.local.example` 참고). 값 2개는 Rian이 따로 전달받거나
Supabase 대시보드 → Project Settings → API 에서 복사:
```
NEXT_PUBLIC_SUPABASE_URL=https://phhlyxxncfxzvwbxkvwn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public 키>
```
(anon 키는 공개돼도 안전한 키. `service_role`·DB 비번은 절대 커밋/공유 금지.)

### 4. 실행
```
npm install
npm run dev        # http://localhost:3000
```

### 5. 문제(콘텐츠)를 더 만들려면  ⚠️ 워크북 PDF 필요
문제 생성은 **워크북 PDF에 근거**해서 합니다. 그 PDF들은 git에 없음(사내 자료).
- 회사 OneDrive에서 받은 `O11 Associate Developer` 폴더(특히 `OneDrive_2026-01-28`의 워크북 10개 PDF + `English/Korean` 샘플시험)를 **집 데스크탑에도 복사**해두세요.
- Claude Code의 Read 도구는 이 PDF를 못 엽니다(poppler 없음). **텍스트 추출 우회법:**
  ```
  # 임시 폴더에서
  npm i pdf-parse
  # node 스크립트: const {PDFParse}=require("pdf-parse");
  #   const p=new PDFParse({data:new Uint8Array(fs.readFileSync(PDF))});
  #   console.log((await p.getText()).text)
  ```

## 콘텐츠 파이프라인 & 품질 기준 (요약)

- **문항 = repo의 `content/questions/*.json`** (소스 오브 트루스, 앱에 번들). DB엔 문항 없음.
- 파일 추가/수정 후 **`npm run gen`** → `src/generated/{manifest.json, all-questions.ts}` 자동 생성. **`status:"verified"`만 서빙**, `"flagged"`는 repo에 남되 제외.
- **품질 기준:** 워크북 근거 → 유형·도메인 다양화 → 중복 없음 → 독립(적대적) 검증 → 애매하면 flagged. 자세한 건 `content/README.md`.
- **대량 생성은 멀티에이전트 Workflow로** 했음: 과목별 (생성 → 정답 숨긴 3인 적대적 검증 다수결 → 파일 기록). 새 세션에서 같은 패턴 반복 가능. 워크플로우 결과 파일이 안 써지면 저널(`.claude/projects/.../subagents/workflows/wf_*/agent-*.jsonl`의 `message.content`)에서 복구 가능.
- 이중언어: 새 문항은 생성 시 `i18n.ko`도 같이 작성(의미·정답 보존, OutSystems 용어는 영어 유지).

## 남은 백로그 (원하면)

- **flagged 검수/리라이트:** LFE-007, SEC-003 (+ LFE-014 지문/보기 정합성)
- **난이도 보정:** 스크린샷/비주얼 문항 비중이 9% (실제 시험 ~45%) → 늘리면 실전에 더 근접. 일부 보강 과목(Modular/Client Var/Role/Entities)은 암기형이 많아 약간 쉬움 → 시나리오형으로 리라이트 여지.
- **비밀번호 재설정(이메일)** 미구현.
- **한글 시험 "별개 문항" 전략(B안)** 은 아직 안 함 (지금은 같은 문항의 한국어 표현만).

## 잔가지(gotchas)

- Next.js **16** (App Router). `searchParams`/`params`는 async Promise, `useSearchParams`는 `<Suspense>` 필요. Turbopack 기본.
- git 커밋 시 `LF will be replaced by CRLF` 경고는 무해.
- 부모 폴더(홈)에 stray `package-lock.json`이 있으면 워크스페이스 루트 오인 → `next.config.ts`의 `turbopack.root`로 고정해둠.
