# CrackBot AI — 건축물 균열(크랙) 탐지 안전점검 시스템

YOLO 기반 객체 탐지로 건축물 외벽 사진에서 균열을 자동 탐지하고, 점검 프로젝트/건물 단위로 관리하며 안전점검 보고서를 자동 생성하는 시스템입니다. 2026년 한이음 드림업 지원사업 팀 프로젝트로 제작했습니다.

- **기간**: 2026-04-29 ~ 2026-07-02
- **인원**: 팀 프로젝트 (2인 — AI 모델 담당 팀원 1인 + 본인)
- **담당 역할**: 백엔드(FastAPI)·프론트엔드(React)·인프라(Docker/Nginx) 전체 설계 및 개발

> ℹ️ **폴더별 담당 안내**
> - `Crack Detection(6.8)/` — **팀원 담당**: YOLO 모델 학습·추론 서버(별도 Flask 기반 프로토타입)
> - `backend/`, `frontend/`, `nginx/`, `docker-compose.yml`, `build.ps1`, `start.ps1` — **본인 담당**: 실제 서비스용 백엔드 API, 프론트엔드 앱, 배포 구성
> - `backend/app/ml/crack_best.pt` — 팀원이 학습한 최종 모델을 백엔드 서비스에 통합하여 사용

## 📐 설계 문서

시스템 아키텍처 · 화면 설계(18개 화면) · ERD · API 명세 · v0.1→v0.2 설계 업데이트(팀원 관리, 자율주행 로봇 연동 아키텍처)까지 정리한 전체 설계 문서는 [`doc/설계문서.md`](doc/설계문서.md)에서 확인할 수 있습니다.

## 기술 스택

**Backend**
- FastAPI, SQLAlchemy, Alembic (마이그레이션)
- JWT 인증 (python-jose, passlib+bcrypt)
- Ultralytics YOLO, OpenCV (균열 탐지 추론)
- ReportLab, python-docx (점검 보고서 자동 생성)

**Frontend**
- React 18, React Router, Vite

**Infra**
- Docker Compose, Nginx

## 핵심 기능 및 담당 구현 사항

- 건물(Building) → 프로젝트(Project) → 사진(Photo) 계층 구조로 안전점검 데이터 모델 설계
- 업로드된 외벽 사진에 YOLO 모델을 적용해 균열 탐지 후 위치/등급 판정
- 탐지 결과를 취합해 PDF/DOCX 안전점검 보고서 자동 생성 (ReportLab, python-docx)
- JWT 기반 인증/인가, 프로젝트별 접근 제어
- React 기반 모바일 친화적 UI: 카메라 촬영 → AI 분석 → 결과 확인 → 보고서 생성까지 이어지는 점검 플로우
- Docker Compose + Nginx로 백엔드/프론트엔드 통합 배포 구성

## 트러블슈팅 및 문제 해결

- YOLO 학습 실험(총 12회, `runs/`)과 데이터셋(Roboflow, 144MB)이 저장소에 그대로 있으면 용량이 너무 커져서, 최종 채택 모델(`train12`)의 가중치와 성능 지표만 남기고 나머지 실험 기록은 제외했습니다.
- `.env`에 로컬 개발용 더미 값만 있는 것을 확인했고, 실서비스 배포 시에는 별도 시크릿 관리가 필요합니다.

## 실행 방법

```sh
# 백엔드
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm install
npm run dev

# 또는 Docker Compose로 통합 실행
docker-compose up --build
```

- 초기 계정: `admin@crackbot.ai` / `crackbot123` (개발용 시드 계정, `backend/app/main.py` 참고)
- Python 3.10 이상 / Node.js 18 이상 권장

## 성과 및 회고

- (작성 예정)
