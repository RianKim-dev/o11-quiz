# o11-quiz — 설계 문서 (Design Docs)

> OutSystems 11 Associate Reactive Developer 대비 이중언어 예상문제집 웹앱의 **역공학 설계 문서** 모음입니다. 실제 코드베이스(710문항 은행 + Next.js/Supabase 앱)와 구축·검증 이력을 바탕으로 작성했습니다.

이 문서들은 앱 빌드/실행과 무관한 **문서 전용**이에요 (`content/`·`src/`를 참조만 함).

## 목차

| # | 문서 | 내용 |
|---|---|---|
| 00 | [프로젝트 개요](00-overview.md) | 제품 정체성·목표·현재 상태(710 verified), 문서 세트 안내 |
| 01 | [시스템 아키텍처](01-architecture.md) | Next.js/Supabase 런타임, 콘텐츠=JSON 번들, 빌드 파이프라인 (+Mermaid) |
| 02 | [데이터 모델 & ERD](02-data-model.md) | 문항 JSON 스키마, `question_status` 테이블·RLS, localStorage (+Mermaid ERD) |
| 03 | [기능 명세 / PRD](03-feature-spec.md) | 5개 모드, 자가평가 상태, 채점·일괄마킹, 이중언어, 해설 3계층 (유저스토리) |
| 04 | [플로우 & 상태](04-flows-and-states.md) | 문항 상태 전이, 퀴즈 생명주기, 모드 결정 (+Mermaid) |
| 05 | [데이터 계층 API](05-data-layer-api.md) | `progress.ts`/`status.ts` 계약, Supabase↔localStorage 라우팅 |
| 06 | [컴포넌트 인벤토리](06-component-inventory.md) | `src/components`·`src/lib` 책임·props·의존관계 |
| 07 | [보안 & 프라이버시](07-security-privacy.md) | RLS 유저격리, @concentrix 도메인 게이트, 시크릿 정책 |
| 08 | [콘텐츠 파이프라인](08-content-pipeline.md) | 멀티에이전트 생성·콜리그 임포트·병합 방법론 (+Mermaid) |
| 09 | [품질 검증 리포트](09-qa-report.md) | 3계층 QA, 발견·수정 이력, OutSystems 사실 검증 교훈 |
| 10 | [의사결정 기록 (ADR)](10-decision-log-adr.md) | 핵심 결정 7+건: 맥락·결정·근거·트레이드오프 |
| 11 | [시험 도메인 모델](11-domain-model.md) | 6 카테고리 × 14 subtopic 택소노미, 블루프린트 |

## 읽는 순서 (추천)
- **처음이라면**: 00 → 03(기능) → 01(아키텍처) → 02(데이터).
- **기여/유지보수**: 06(컴포넌트) → 05(데이터 계층) → 04(플로우) → 07(보안).
- **콘텐츠/품질**: 08(파이프라인) → 09(QA) → 11(도메인) → 10(ADR).

## 생성 방식
각 문서는 검증된 소스 브리프 + 실제 소스 파일을 근거로 문서별 에이전트가 초안을 작성했습니다.
사실은 코드/공식 OutSystems 문서에 정합하도록 통제했으나, **최종본은 사람 검토를 권장**합니다.
갱신 시점의 상태는 각 문서 상단/본문 기준이며, 코드가 진실의 원천입니다.
