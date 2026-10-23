# AstroPlate — 작업 가이드

천체 사진을 올리면 nova.astrometry.net으로 플레이트 솔빙(좌표 추출)을 하고, 성도·별자리·딥스카이 천체와 매칭해 오버레이하는 웹앱.
Google AI Studio에서 시작한 프로젝트라 `.aistudio/`, `metadata.json`, `DISABLE_HMR` 같은 흔적이 남아 있다.

## 실행

```bash
npm install            # CI는 --legacy-peer-deps 사용
cp .env.example .env   # ASTROMETRY_API_KEY 입력
npm run dev            # tsx server.ts → Express + Vite 미들웨어, http://localhost:3000
npm run lint           # tsc --noEmit (테스트 스위트는 없음)
npm run build          # vite build → dist/
```

- 개발: `server.ts`가 Vite를 미들웨어로 띄워 프런트와 `/api/*`를 한 포트(3000)에서 제공.
- 프로덕션(`NODE_ENV=production`): `dist/` 정적 서빙 + 같은 API.

## 구조

| 경로 | 역할 |
| --- | --- |
| `server.ts` | Express 백엔드. astrometry.net API 프록시(로그인 세션 캐시, 업로드, 잡 상태/캘리브레이션/주석, 이미지 프록시), SIMBAD/Sesame 조회. 히스토리·이미지·잡 상세는 **메모리 캐시**라 재시작하면 사라짐 |
| `src/App.tsx` | 최상위 상태(solvedData, 탭 `photo`/`chart`/`telemetry`, 테마, 계정 잡 목록) |
| `src/components/StarPhotoViewer.tsx` | 사진 위 별·천체 오버레이 뷰어 |
| `src/components/CelestialStarChart.tsx` | 성도 렌더링(가장 큰 컴포넌트) |
| `src/components/AstroTelemetryPanel.tsx` | 별 검출·성운 파이프라인 텔레메트리 |
| `src/components/UploadPlateSolveModal.tsx` | 업로드 → 제출 → 폴링 → 결과 흐름 |
| `src/components/SimbadInspectorModal.tsx` | 천체 식별자 조회 |
| `src/components/DualIndexCatalogModal.tsx` | Tycho-2 + Gaia DR3 이중 인덱스 |
| `src/utils/localPlateSolver.ts` | 브라우저 로컬 솔버·별 검출(image2xy 유사), 주석 스냅 |
| `src/utils/constellations.ts` | 별자리 판별·제목 생성 |
| `src/utils/coordinateMath.ts` | RA/Dec 변환 등 좌표 수학 |
| `src/utils/accountJobs.ts` | localStorage 기반 잡 기록(`astroplate_account_jobs`, `astroplate_deleted_job_ids`) |
| `src/data/*.json`, `public/indexes/*.json` | 별 카탈로그 인덱스(대용량, 직접 편집 금지) |
| `src/types/astronomy.ts` | 공용 타입 |

## 환경 변수

- `ASTROMETRY_API_KEY` — nova.astrometry.net API 키(오타 호환용 `ASTROMETRY_API_KE`도 읽음). 사용자가 UI에서 키를 직접 넘길 수도 있음.
- `PORT` (기본 3000), `NODE_ENV`.

## 알아둘 점

- `.github/workflows/deploy.yml`은 `dist/`만 GitHub Pages에 올린다. Pages에는 Express 서버가 없으므로 `/api/*` 호출(업로드·솔빙·SIMBAD 프록시)은 동작하지 않는다. 정적 배포에서도 쓰이게 하려면 로컬 솔버/샘플 데이터 폴백이나 별도 백엔드 호스팅이 필요하다.
- UI 문자열은 한국어 중심.
- 테마: `data-theme` 속성(`deep_space` / `daylight`)과 `index.css`의 토큰.

## 작업 규칙

- 변경은 `claude/*` 브랜치에 커밋하고 PR로 올린다(`main` push 시 Pages 배포가 돈다).
- 커밋 메시지는 기존처럼 Conventional Commits(`feat:`, `fix:`, `refactor:` …).
