# CrackBot AI — 발표 자료 정리

> 건축물 균열 탐지 및 안전점검 자동화 시스템  
> 작성일: 2026-06-21

---

## 0. 한눈에 보기

| 구분 | 내용 |
|------|------|
| 프로젝트명 | CrackBot AI |
| 목적 | AI 기반 건축물 균열 탐지 및 안전등급 자동 판정 |
| 기술 스택 | React 18 + FastAPI + YOLO v8 + SQLite |
| 배포 방식 | Docker Compose + Nginx |
| 완료 단계 | Phase 6 (MVP 완성) |

---

## 1. 기획 (Planning)

### 1-1. 문제 정의

- 기존 건축물 안전점검은 **수작업 + 육안 확인** 방식
- 점검 결과를 Excel/수기로 정리 → 보고서 작성에 시간 과다 소요
- 균열 너비 측정 오차, 심각도 판단 기준의 주관성 문제

### 1-2. 해결 목표

- 스마트폰으로 촬영 → AI가 균열 탐지 → 안전등급 자동 판정 → 보고서 자동 생성
- 현장 점검사가 앱 하나로 처음부터 끝까지 처리 가능

### 1-3. 핵심 사용자

- **점검사 (inspector)**: 현장에서 사진 촬영 및 AI 분석 결과 확인
- **관리자 (admin)**: 건물·프로젝트·보고서 관리 (예정)

### 1-4. 핵심 기능 정의

1. 건축물 및 점검 프로젝트 관리
2. 사진 촬영 및 AI 균열 탐지
3. 안전등급 자동 판정 (A~E, 5단계)
4. PDF / DOCX 보고서 자동 생성
5. 모바일 & 데스크톱 반응형 UI

---

## 2. 설계 (Design)

### 2-1. 시스템 아키텍처

```
[사용자 브라우저/모바일]
        │
        ▼
[Nginx (80)] ──── /api 요청 ──▶ [FastAPI (8000)]
        │                               │
  [React 빌드 정적파일]         [SQLite DB]
                                        │
                                [YOLO v8 모델]
                                (app/ml/crack_best.pt)
```

**배포**: Docker Compose (backend + frontend/nginx 두 컨테이너)

---

### 2-2. 데이터 모델 (ERD 요약)

```
User
 ├─< RefreshToken
 ├─< InspectionProject (inspector_id)
 └─< Report (created_by)

Building
 └─< InspectionProject
        ├─< InspectionZone
        │     └─< InspectionPhoto
        │           └─< DefectDetection
        ├─< SafetyGrade
        └─< Report
```

| 모델 | 주요 필드 |
|------|-----------|
| User | email, password_hash, name, role |
| Building | address, latitude, longitude, floors, built_year |
| InspectionProject | title, status (planned/in_progress/completed), start_date, end_date |
| InspectionZone | name, floor, safety_grade, photo_count |
| InspectionPhoto | file_path, analyzed, location |
| DefectDetection | defect_type, severity, crack_width_mm, confidence, bbox |
| SafetyGrade | grade (A-E), defect_count, max_crack_width, recommendations |
| Report | status (pending/processing/completed/failed), format (pdf/docx/both), template_type |

---

### 2-3. 안전등급 판정 기준

| 등급 | 최대 균열폭 | 의미 |
|------|------------|------|
| A | 0.1mm 미만 | 양호 — 정기점검 유지 |
| B | 0.1 ~ 0.2mm | 주의 — 6개월 후 재점검 |
| C | 0.2 ~ 0.3mm | 경고 — 3개월 내 전문가 점검 |
| D | 0.3 ~ 0.5mm | 위험 — 즉시 구조 점검 필요 |
| E | 0.5mm 이상 | 심각 — 사용 제한 및 긴급 보수 |

---

### 2-4. API 설계

**인증**
```
POST /v1/auth/login       로그인 (JWT 발급)
POST /v1/auth/refresh     토큰 갱신
POST /v1/auth/logout      로그아웃
GET  /v1/auth/me          내 정보
```

**건축물·프로젝트**
```
GET/POST  /v1/buildings               건물 목록 / 등록
GET/PATCH /v1/buildings/{id}          건물 상세 / 수정

GET/POST  /v1/projects                프로젝트 목록 / 생성
GET       /v1/projects/{id}           프로젝트 상세 (구역 포함)
PATCH     /v1/projects/{id}/status    상태 변경
GET       /v1/projects/{id}/grades    안전등급 조회
```

**사진·탐지**
```
POST /v1/zones/{zone_id}/photos/upload-url   업로드 URL 생성
POST /v1/mock-upload/{photo_id}              로컬 이미지 업로드 (개발용)
POST /v1/photos/detect                       즉시 균열 탐지
POST /v1/photos/{id}/analyze                 저장 사진 YOLO 분석
GET  /v1/photos/{id}/detections              탐지 결과 조회
GET  /v1/photos/{id}/overlay                 바운딩 박스 오버레이 이미지
GET  /v1/zones/{zone_id}/photos              구역 사진 전체 조회
```

**보고서**
```
GET  /v1/reports               보고서 목록
POST /v1/reports               보고서 생성 (백그라운드)
GET  /v1/reports/{id}/status   생성 상태 폴링
GET  /v1/reports/{id}/download-file  파일 다운로드
```

**공통 응답 포맷**
```json
{ "success": true, "data": {}, "message": "", "timestamp": "" }
{ "success": false, "error": { "code": "", "message": "" }, "timestamp": "" }
```

---

### 2-5. 프론트엔드 화면 구성

```
온보딩 플로우
  SplashScreen → LoginScreen → PermissionsScreen → OnboardingDoneScreen

메인 플로우
  HomeScreen (대시보드)
   ├── ProjectListScreen
   │     └── ProjectDetailScreen
   │           └── CameraScreen → AIAnalyzingScreen → AIResultScreen
   ├── ReportListScreen
   │     └── ReportSettingsScreen → ReportGeneratingScreen → ReportPreviewScreen
   └── ProfileScreen
```

---

## 3. 구현 (Implementation)

### 3-1. 백엔드 구현 현황

#### ✅ 인증 시스템
- JWT Access Token (30분) + Refresh Token (7일)
- 401 발생 시 자동 토큰 갱신 (프론트 클라이언트)
- BCrypt 비밀번호 해싱
- Refresh Token DB 저장 및 폐기 (logout)

#### ✅ 건축물 · 프로젝트 관리
- 건물 CRUD + 주소/위치 정보
- 프로젝트 생성 시 구역(Zone) 동시 생성
- 프로젝트 상태 전환 (planned → in_progress → completed)
- 페이지네이션 + 검색 필터

#### ✅ YOLO 균열 탐지
- `ultralytics` YOLO v8 모델 로드 (startup 이벤트)
- 이미지 → YOLO 추론 → 바운딩 박스 JSON 저장
- 신뢰도(confidence) 기반 심각도 자동 분류
  - `< 0.5` → low, `0.5~0.7` → medium, `0.7~0.85` → high, `> 0.85` → critical
- 균열 너비 픽셀→mm 변환 (0.1mm/px 고정 계산식)
- OpenCV 바운딩 박스 오버레이 이미지 자동 생성
- 로컬 `/uploads` 디렉토리에 이미지 파일 저장

#### ✅ 안전등급 판정
- 구역 내 전체 DefectDetection 집계
- 최대 균열폭 기준 A~E 등급 자동 산출
- 한국어 권장사항 자동 생성
- SafetyGrade 모델로 DB 저장

#### ✅ 보고서 자동 생성
- **PDF**: ReportLab, Malgun Gothic 폰트, 구역별 통계 + 컬러 코딩
- **DOCX**: python-docx, 표 기반 구조화 문서
- `FastAPI BackgroundTasks`로 비동기 생성
- 상태 폴링 (pending → processing → completed/failed)

---

### 3-2. 프론트엔드 구현 현황

#### ✅ 반응형 레이아웃
- `useResponsive()` 훅으로 768px 기준 모바일/데스크톱 분기
- 모바일: 하단 탭 바 (`BottomTabBar`) + 풀스크린
- 데스크톱: 좌측 사이드바 (`Sidebar`) + 메인 컨텐트

#### ✅ API 클라이언트 레이어
- `src/api/client.js`: 공통 fetch + 401 자동 토큰 갱신 + 재시도
- 도메인별 분리: `auth.js`, `projects.js`, `detection.js`, `photos.js`, `reports.js`

#### ✅ 주요 화면 구현
- **HomeScreen**: 프로젝트 요약 카드, 최근 활동 통계
- **ProjectListScreen**: 프로젝트 목록, 상태 필터, 페이지네이션
- **ProjectDetailScreen**: 구역별 사진 목록, 안전등급 뱃지
- **CameraScreen**: 파일 드래그 앤 드롭 + 파일 선택 업로드
- **AIAnalyzingScreen**: 분석 중 로딩 애니메이션
- **AIResultScreen**: 탐지된 균열 목록, 바운딩 박스 오버레이 이미지 뷰어
- **ReportSettingsScreen**: 템플릿(표준/요약) + 형식(PDF/DOCX/둘다) 선택
- **ReportGeneratingScreen**: 생성 상태 폴링 (1초 간격)
- **ReportPreviewScreen**: iframe PDF 미리보기 + 다운로드 버튼
- **ProfileScreen**: 사용자 정보 + 로그아웃

#### ✅ 온보딩 플로우
- `localStorage` `onboarding_done` 플래그로 최초 1회만 표시
- 카메라 / 위치 권한 요청 화면

#### ✅ 스타일 시스템
- CSS 변수 기반 테마 (`--primary`, `--bg-*`, `--text-*`, `--border-*`)
- 다크/라이트 모드 변수 정의 완료

---

### 3-3. 인프라 구현 현황

#### ✅ Docker 구성
- `backend`: Python 3.11 + FastAPI + uvicorn
- `frontend`: nginx:alpine + 빌드된 정적파일 서빙
- `docker-compose.yml`으로 단일 명령 실행 (`docker compose up`)

#### ✅ Nginx 설정
- `/api` 요청 → FastAPI 프록시
- 그 외 → React SPA fallback (`index.html`)

---

### 3-4. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18, React Router v6, Vite 5 |
| 백엔드 | FastAPI 0.115, Python 3.11 |
| ORM/DB | SQLAlchemy 2.0, SQLite (개발) |
| AI 모델 | Ultralytics YOLO v8 |
| 이미지 처리 | OpenCV 4.6+ |
| 보고서 | ReportLab (PDF), python-docx (DOCX) |
| 인증 | JWT (python-jose), BCrypt |
| 배포 | Docker, Docker Compose, Nginx |

---

## 4. 미구현 (Not Implemented)

### 4-1. 기능 미구현

| 항목 | 현재 상태 | 비고 |
|------|-----------|------|
| 역할 기반 권한 (RBAC) | 모델 정의만 됨, 라우터 권한 체크 없음 | admin 전용 기능 보호 안 됨 |
| AWS S3 연동 | 코드 뼈대 존재, `.env` 미설정 | 현재 로컬 `/uploads`만 사용 |
| 오프라인 모드 | `OfflineQueueScreen` 화면만 생성 | 로직 전혀 없음 |
| 실시간 알림 | 미구현 | 분석 완료 푸시 없음 |
| 다국어 지원 | 한국어만 | 영어 등 추가 예정 |
| 다크모드 전환 버튼 | CSS 변수만 준비됨 | UI 토글 없음 |
| 팀 협업 | 단일 사용자 구조 | 다중 점검사 배정 불가 |
| 데이터 내보내기 | 미구현 | CSV / Excel 미지원 |
| 감사 로그 | 미구현 | 누가 무엇을 했는지 추적 불가 |

---

### 4-2. 기술적 제한사항

| 항목 | 현재 상태 | 개선 방향 |
|------|-----------|-----------|
| YOLO 모델 파일 | 미포함 (`crack_best.pt` 없음) | 별도 배포 또는 S3 다운로드 |
| 균열 너비 계산 | 0.1mm/px 고정값 (부정확) | 카메라 거리/캘리브레이션 데이터 필요 |
| 보고서 폰트 | Windows Malgun Gothic 의존 | Linux 환경 폴백 폰트 필요 |
| DB | SQLite (단일 파일) | 운영 환경에서 PostgreSQL 전환 필요 |
| 이미지 동시 분석 | 순차 처리 | Celery 등 태스크 큐 필요 |
| 테스트 코드 | `test_api.py` 기초 수준만 | 유닛/통합/E2E 테스트 부재 |

---

### 4-3. 보안 미완성 항목

| 항목 | 현재 상태 |
|------|-----------|
| CORS | `allow_origins=["*"]` (모든 도메인 허용) |
| Rate Limiting | 미구현 |
| HTTPS | 미구현 (Nginx에 SSL 설정 없음) |
| 파일 업로드 검증 | 확장자 체크 없음 |
| 환경 변수 관리 | `.env` 평문 저장 |

---

## 5. 향후 개발 로드맵

| Phase | 내용 |
|-------|------|
| Phase 7 | RBAC 완성, S3 연동, HTTPS 설정 |
| Phase 8 | 실시간 웹소켓 알림, 팀 협업 기능 |
| Phase 9 | 균열 종류 분류 고도화, 시계열 추이 그래프 |
| Phase 10 | React Native 모바일 앱, 오프라인 분석 |
| Phase 11 | AWS 클라우드 전환 (RDS, Lambda, CloudFront) |

---

## 6. PPT 슬라이드 구성 추천 (프롬프트용)

아래 내용을 GPT/Claude에 붙여넣어 PPT 슬라이드를 생성할 수 있습니다.

---

### 📋 PPT 생성 프롬프트

```
다음 내용으로 발표용 PPT 슬라이드 구성을 만들어줘.

프로젝트명: CrackBot AI — 건축물 균열 탐지 자동화 시스템

슬라이드 목차:
1. 표지 — 프로젝트명, 한 줄 소개
2. 문제 정의 — 기존 안전점검의 한계 (수작업, 오차, 시간 낭비)
3. 솔루션 개요 — AI 탐지 + 자동 보고서 = CrackBot AI
4. 시스템 아키텍처 — React + FastAPI + YOLO v8 + SQLite + Docker 구조도
5. 기획 — 핵심 사용자 정의 (점검사), 5가지 핵심 기능 목표
6. 설계 — 데이터 모델 (ERD 요약), 안전등급 기준표 (A~E)
7. 설계 — API 설계 (주요 엔드포인트), 화면 흐름도
8. 구현 — 백엔드: YOLO 균열 탐지 + 안전등급 + 보고서 생성
9. 구현 — 프론트엔드: 반응형 UI (모바일/데스크톱), 주요 화면 스크린샷 위치 표시
10. 구현 — 기술 스택 요약 표
11. 미구현 — 기능 미구현 목록 (RBAC, S3, 오프라인, 테스트)
12. 미구현 — 기술적 제한사항 및 보안 미완성
13. 향후 로드맵 — Phase 7~11 계획
14. 마무리 — 성과 요약, Q&A

각 슬라이드당:
- 제목 1개
- 핵심 내용 3~5줄 (bullet point)
- 시각자료 위치 표시 (예: "[구조도 이미지]", "[표]")

발표 시간: 10분 기준으로 내용 조절해줘.
```
