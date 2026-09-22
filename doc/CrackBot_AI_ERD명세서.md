# CrackBot AI — ERD 명세서

| 항목 | 내용 |
|------|------|
| 프로젝트명 | CrackBot AI: 건축물 안전점검 AI 자동화 시스템 |
| 데이터베이스 | PostgreSQL 15 |
| ORM | SQLAlchemy 2.x |
| 문서 버전 | v0.1 |
| 작성일 | 2026. 3. 25. |

---

## 목차

1. [엔티티 목록 및 도메인 분류](#1-엔티티-목록-및-도메인-분류)
2. [도메인 1 · 사용자/인증](#2-도메인-1--사용자인증)
3. [도메인 2 · 건축물/점검 프로젝트](#3-도메인-2--건축물점검-프로젝트)
4. [도메인 3 · 결함 탐지 결과](#4-도메인-3--결함-탐지-결과)
5. [도메인 4 · 보고서](#5-도메인-4--보고서)
6. [관계 정의 (Relationships)](#6-관계-정의-relationships)
7. [ENUM 타입 정의](#7-enum-타입-정의)
8. [인덱스 설계](#8-인덱스-설계)

---

## 1. 엔티티 목록 및 도메인 분류

| 도메인 | 엔티티 | 설명 |
|--------|--------|------|
| 사용자/인증 | `USERS` | 앱 사용자 (점검사, 관리자) |
| 사용자/인증 | `REFRESH_TOKENS` | JWT 리프레시 토큰 관리 |
| 건축물/점검 | `BUILDINGS` | 점검 대상 건축물 정보 |
| 건축물/점검 | `INSPECTION_PROJECTS` | 점검 프로젝트 (1건축물 N프로젝트) |
| 건축물/점검 | `INSPECTION_ZONES` | 프로젝트 내 점검 구역 |
| 건축물/점검 | `INSPECTION_PHOTOS` | 구역별 촬영 사진 |
| 결함 탐지 | `DEFECT_DETECTIONS` | AI 결함 탐지 결과 (사진 1장 N결함) |
| 결함 탐지 | `SAFETY_GRADES` | 구역/프로젝트별 안전 등급 판정 |
| 보고서 | `REPORTS` | 생성된 보고서 파일 메타데이터 |

---

## 2. 도메인 1 · 사용자/인증

### USERS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 사용자 고유 ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 로그인 이메일 |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 해시 비밀번호 |
| `name` | VARCHAR(100) | NOT NULL | 실명 |
| `role` | ENUM | NOT NULL, DEFAULT 'inspector' | 역할 (inspector / manager / admin) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 계정 활성화 여부 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 계정 생성일시 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 계정 수정일시 |

### REFRESH_TOKENS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 토큰 고유 ID |
| `user_id` | UUID | FK → USERS.id, NOT NULL | 발급 대상 사용자 |
| `token` | VARCHAR(512) | UNIQUE, NOT NULL | JWT 리프레시 토큰 문자열 |
| `expires_at` | TIMESTAMP | NOT NULL | 만료 일시 (발급 후 7일) |
| `is_revoked` | BOOLEAN | NOT NULL, DEFAULT FALSE | 폐기 여부 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 발급 일시 |

---

## 3. 도메인 2 · 건축물/점검 프로젝트

### BUILDINGS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 건축물 고유 ID |
| `name` | VARCHAR(200) | NOT NULL | 건축물명 |
| `address` | VARCHAR(500) | NOT NULL | 도로명 주소 |
| `latitude` | FLOAT | NULL | 위도 (GPS) |
| `longitude` | FLOAT | NULL | 경도 (GPS) |
| `floors` | INTEGER | NULL | 층수 |
| `built_year` | INTEGER | NULL | 사용승인 연도 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 등록 일시 |

### INSPECTION_PROJECTS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 프로젝트 고유 ID |
| `building_id` | UUID | FK → BUILDINGS.id, NOT NULL | 대상 건축물 |
| `inspector_id` | UUID | FK → USERS.id, NOT NULL | 담당 점검사 |
| `title` | VARCHAR(300) | NOT NULL | 프로젝트 제목 |
| `status` | ENUM | NOT NULL, DEFAULT 'planned' | 상태 (planned / in_progress / completed) |
| `start_date` | DATE | NOT NULL | 점검 시작일 |
| `end_date` | DATE | NULL | 점검 종료 예정일 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정 일시 |

### INSPECTION_ZONES

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 구역 고유 ID |
| `project_id` | UUID | FK → INSPECTION_PROJECTS.id, NOT NULL | 소속 프로젝트 |
| `zone_name` | VARCHAR(100) | NOT NULL | 구역명 (예: A구역) |
| `floor` | INTEGER | NULL | 층수 |
| `grade` | ENUM | NULL | 현재 안전 등급 (A~E) |
| `photo_count` | INTEGER | NOT NULL, DEFAULT 0 | 촬영된 사진 수 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성 일시 |

### INSPECTION_PHOTOS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 사진 고유 ID |
| `zone_id` | UUID | FK → INSPECTION_ZONES.id, NOT NULL | 소속 구역 |
| `s3_key` | VARCHAR(500) | NOT NULL | S3 오브젝트 키 |
| `s3_url` | VARCHAR(1000) | NOT NULL | S3 접근 URL |
| `latitude` | FLOAT | NULL | 촬영 위도 |
| `longitude` | FLOAT | NULL | 촬영 경도 |
| `taken_at` | TIMESTAMP | NOT NULL | 촬영 일시 (EXIF) |
| `is_analyzed` | BOOLEAN | NOT NULL, DEFAULT FALSE | AI 분석 완료 여부 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 업로드 일시 |

---

## 4. 도메인 3 · 결함 탐지 결과

### DEFECT_DETECTIONS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 탐지 결과 고유 ID |
| `photo_id` | UUID | FK → INSPECTION_PHOTOS.id, NOT NULL | 원본 사진 |
| `defect_type` | ENUM | NOT NULL | 결함 유형 (crack / spalling / rebar / efflorescence / leak / deformation) |
| `confidence` | FLOAT | NOT NULL | YOLOv8 신뢰도 (0.0~1.0) |
| `bbox` | JSONB | NOT NULL | 바운딩 박스 {x, y, w, h} (픽셀 단위) |
| `crack_width_mm` | FLOAT | NULL | 균열 폭 (OpenCV 측정, 0.1mm 단위) |
| `severity` | ENUM | NOT NULL | 심각도 (low / medium / high / critical) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 탐지 일시 |

### SAFETY_GRADES

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 등급 판정 고유 ID |
| `project_id` | UUID | FK → INSPECTION_PROJECTS.id, NOT NULL | 소속 프로젝트 |
| `zone_id` | UUID | FK → INSPECTION_ZONES.id, NULL | 구역 (NULL이면 프로젝트 전체 등급) |
| `grade` | ENUM | NOT NULL | 안전 등급 (A / B / C / D / E) |
| `defect_count` | INTEGER | NOT NULL, DEFAULT 0 | 탐지된 결함 총 수 |
| `max_crack_mm` | FLOAT | NULL | 최대 균열 폭 (mm) |
| `recommendation` | TEXT | NULL | AI 생성 조치 권고사항 |
| `graded_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 등급 판정 일시 |

---

## 5. 도메인 4 · 보고서

### REPORTS

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | UUID | PK | 보고서 고유 ID |
| `project_id` | UUID | FK → INSPECTION_PROJECTS.id, NOT NULL | 대상 프로젝트 |
| `created_by` | UUID | FK → USERS.id, NOT NULL | 생성 요청 사용자 |
| `template_type` | ENUM | NOT NULL | 양식 유형 (standard / summary) |
| `format` | ENUM | NOT NULL | 파일 형식 (pdf / docx / both) |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | 생성 상태 (pending / processing / completed / failed) |
| `docx_s3_key` | VARCHAR(500) | NULL | DOCX 파일 S3 키 |
| `pdf_s3_key` | VARCHAR(500) | NULL | PDF 파일 S3 키 |
| `generated_at` | TIMESTAMP | NULL | 생성 완료 일시 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 요청 일시 |

---

## 6. 관계 정의 (Relationships)

| 관계 | 카디널리티 | 설명 |
|------|-----------|------|
| USERS → REFRESH_TOKENS | 1 : N | 사용자 1명이 여러 리프레시 토큰 보유 가능 |
| USERS → INSPECTION_PROJECTS | 1 : N | 점검사 1명이 여러 프로젝트 담당 |
| USERS → REPORTS | 1 : N | 사용자 1명이 여러 보고서 생성 요청 |
| BUILDINGS → INSPECTION_PROJECTS | 1 : N | 건축물 1동에 여러 점검 프로젝트 존재 가능 |
| INSPECTION_PROJECTS → INSPECTION_ZONES | 1 : N | 프로젝트 1개에 여러 점검 구역 포함 |
| INSPECTION_PROJECTS → SAFETY_GRADES | 1 : N | 프로젝트 전체 + 구역별 등급 이력 관리 |
| INSPECTION_PROJECTS → REPORTS | 1 : N | 프로젝트 1개에 여러 보고서 생성 가능 |
| INSPECTION_ZONES → INSPECTION_PHOTOS | 1 : N | 구역 1개에 여러 촬영 사진 포함 |
| INSPECTION_ZONES → SAFETY_GRADES | 1 : N | 구역별 등급 이력 (시계열 관리) |
| INSPECTION_PHOTOS → DEFECT_DETECTIONS | 1 : N | 사진 1장에서 여러 결함 탐지 가능 |

---

## 7. ENUM 타입 정의

### user_role
```sql
CREATE TYPE user_role AS ENUM ('inspector', 'manager', 'admin');
```

### project_status
```sql
CREATE TYPE project_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
```

### safety_grade
```sql
CREATE TYPE safety_grade AS ENUM ('A', 'B', 'C', 'D', 'E');
```

### defect_type
```sql
CREATE TYPE defect_type AS ENUM (
  'crack',          -- 균열
  'spalling',       -- 박락 (콘크리트 탈락)
  'rebar_exposure', -- 철근 노출
  'efflorescence',  -- 백태
  'leak_stain',     -- 누수흔적
  'deformation'     -- 변형·처짐
);
```

### defect_severity
```sql
CREATE TYPE defect_severity AS ENUM ('low', 'medium', 'high', 'critical');
```

### report_template_type
```sql
CREATE TYPE report_template_type AS ENUM ('standard', 'summary');
```

### report_format
```sql
CREATE TYPE report_format AS ENUM ('pdf', 'docx', 'both');
```

### report_status
```sql
CREATE TYPE report_status AS ENUM ('pending', 'processing', 'completed', 'failed');
```

---

## 8. 인덱스 설계

| 테이블 | 인덱스 컬럼 | 타입 | 목적 |
|--------|-----------|------|------|
| `USERS` | `email` | UNIQUE | 로그인 조회 |
| `REFRESH_TOKENS` | `token` | UNIQUE | 토큰 검증 |
| `REFRESH_TOKENS` | `user_id` | B-TREE | 사용자별 토큰 조회 |
| `INSPECTION_PROJECTS` | `building_id` | B-TREE | 건축물별 프로젝트 조회 |
| `INSPECTION_PROJECTS` | `inspector_id` | B-TREE | 점검사별 프로젝트 조회 |
| `INSPECTION_PROJECTS` | `status` | B-TREE | 상태별 필터링 |
| `INSPECTION_ZONES` | `project_id` | B-TREE | 프로젝트별 구역 조회 |
| `INSPECTION_PHOTOS` | `zone_id` | B-TREE | 구역별 사진 조회 |
| `INSPECTION_PHOTOS` | `is_analyzed` | B-TREE | 미분석 사진 배치 조회 |
| `DEFECT_DETECTIONS` | `photo_id` | B-TREE | 사진별 결함 조회 |
| `DEFECT_DETECTIONS` | `defect_type` | B-TREE | 결함 유형별 집계 |
| `SAFETY_GRADES` | `project_id, graded_at` | B-TREE | 프로젝트 등급 이력 조회 |
| `SAFETY_GRADES` | `zone_id` | B-TREE | 구역별 등급 이력 |
| `REPORTS` | `project_id` | B-TREE | 프로젝트별 보고서 조회 |
| `REPORTS` | `status` | B-TREE | 생성 상태 모니터링 |
