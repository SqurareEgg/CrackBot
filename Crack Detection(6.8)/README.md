# AI CrackBot — 균열 탐지 API

YOLOv8 기반 균열(Crack) 탐지 모델과 FastAPI 서버를 결합한 프로젝트입니다.  
이미지를 업로드하면 균열 위치와 신뢰도를 반환하고, 탐지 기록을 DB에 저장하며 PDF 보고서를 생성합니다.

---

## 프로젝트 구조

```
yolo_4.22/
├── server.py          # FastAPI 서버 (추론 + DB + 보고서)
├── train.py           # 모델 재학습 스크립트
├── init.py            # Roboflow 데이터셋 다운로드 + 초기 학습
├── .env               # DB URL, 모델 경로 환경변수
├── yolov8n.pt         # YOLOv8n 사전학습 가중치
├── yolo26n.pt         # 커스텀 가중치 (참고용)
├── runs/              # 학습 결과 (best.pt 포함)
├── Crack-1/           # 데이터셋
└── demo_images/       # 테스트용 이미지
```

---

## 환경 설정

### 1. 패키지 설치

```bash
pip install fastapi uvicorn ultralytics opencv-python sqlalchemy \
            python-dotenv reportlab roboflow python-multipart
```

### 2. `.env` 파일 설정

```env
DB_URL=mysql+pymysql://유저명:비밀번호@호스트:3306/DB명
MODEL_PATH=runs/detect/train12/weights/best.pt
```

---

## 실행 방법

### 서버 실행

```bash
uvicorn server:app --reload
```

서버가 실행되면 `http://localhost:8000/docs` 에서 Swagger UI를 확인할 수 있습니다.

### 모델 학습 (선택)

초기 학습 (Roboflow 데이터셋 다운로드 포함):
```bash
python init.py
```

기존 체크포인트에서 이어서 학습:
```bash
python train.py
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/predict` | 이미지 업로드 → 균열 탐지 결과 반환 |
| `GET` | `/detections` | 전체 탐지 기록 조회 (최신순) |
| `DELETE` | `/detections/{id}` | 특정 탐지 기록 삭제 |
| `GET` | `/stats` | 탐지 통계 요약 (총 수, 평균 신뢰도 등) |
| `GET` | `/report` | 탐지 기록 PDF 보고서 다운로드 |
| `GET` | `/health` | 서버 및 모델 상태 확인 |

### `/predict` 응답 예시

```json
{
  "detections": [
    {
      "class_id": 0,
      "class_name": "Crack",
      "confidence": 0.9123,
      "bbox": [120.5, 80.3, 340.1, 210.7]
    }
  ],
  "count": 1,
  "annotated_image_base64": "<base64 encoded JPEG>"
}
```

---

## 모델 성능

| 모델 | mAP50 | 비고 |
|------|-------|------|
| train12/best.pt | **0.86** | 현재 사용 중 |

---

## 기술 스택

- **탐지 모델**: YOLOv8n (Ultralytics)
- **API 서버**: FastAPI
- **데이터베이스**: MySQL + SQLAlchemy
- **보고서**: ReportLab (PDF)
- **데이터셋**: Roboflow (`crack-wyt8q-akcdn`)
