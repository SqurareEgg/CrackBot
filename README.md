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

## 포트폴리오

<img width="1280" height="720" alt="슬라이드1" src="https://github.com/user-attachments/assets/94a423e6-1526-41a3-b84e-0110b6975bce" />

<img width="1280" height="720" alt="슬라이드2" src="https://github.com/user-attachments/assets/f7e03035-c6d0-4313-90fc-055d070f3e21" />

<img width="1280" height="720" alt="슬라이드3" src="https://github.com/user-attachments/assets/0a7c7acd-ab88-401a-9249-2f7fd812d799" />

<img width="1280" height="720" alt="슬라이드4" src="https://github.com/user-attachments/assets/820977e8-22a6-4da9-8de2-6c19ca218b65" />

<img width="1280" height="720" alt="슬라이드5" src="https://github.com/user-attachments/assets/e331a76c-fb01-43a6-b0e1-de066e7a39d1" />

<img width="1280" height="720" alt="슬라이드6" src="https://github.com/user-attachments/assets/04d9209f-aca1-4a97-8887-d4ce74187099" />

<img width="1280" height="720" alt="슬라이드7" src="https://github.com/user-attachments/assets/7c2b1137-7637-48f0-918d-d31bc7a2ffd2" />

<img width="1280" height="720" alt="슬라이드8" src="https://github.com/user-attachments/assets/36205517-7b8e-4e63-a44e-9f6af6584a82" />

<img width="1280" height="720" alt="슬라이드9" src="https://github.com/user-attachments/assets/ba9b727a-54a1-451c-84a9-4188a9bcda53" />

<img width="1280" height="720" alt="슬라이드10" src="https://github.com/user-attachments/assets/9db372bb-a2de-48d9-9b3a-584ff8d2ea30" />

<img width="1280" height="720" alt="슬라이드11" src="https://github.com/user-attachments/assets/3b72d5c7-cc5c-4aad-ba34-7c4d06ea0195" />

<img width="1280" height="720" alt="슬라이드12" src="https://github.com/user-attachments/assets/8b94eda2-a740-4078-8477-33ed61bea1b6" />

<img width="1280" height="720" alt="슬라이드13" src="https://github.com/user-attachments/assets/cbee4245-cbf3-47e2-a105-b97f358a9e33" />

<img width="1280" height="720" alt="슬라이드14" src="https://github.com/user-attachments/assets/c0ac1dc4-ceae-40cc-8780-b2a5ca6f164f" />

<img width="1280" height="720" alt="슬라이드15" src="https://github.com/user-attachments/assets/8a1de9f8-dbfb-4219-9df1-db72d91675dd" />
