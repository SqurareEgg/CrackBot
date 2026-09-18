import base64
from pathlib import Path
from datetime import datetime

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from ultralytics import YOLO
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from fastapi.responses import FileResponse

# ── DB 연결 설정 ──
# MySQL 접속 정보: 사용자명/비밀번호/호스트/포트/DB명
load_dotenv()  # .env 파일 로드

DB_URL = os.getenv("DB_URL")
MODEL_PATH = Path(__file__).parent / os.getenv("MODEL_PATH")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ── DB 테이블 모델 ──
# 균열 탐지 결과를 저장하는 테이블 (detections)
class DetectionRecord(Base):
    __tablename__ = "detections"
    id         = Column(Integer, primary_key=True, index=True)  # 자동 증가 PK
    filename   = Column(String(255))   # 업로드된 이미지 파일명
    confidence = Column(Float)         # 탐지 신뢰도 (0.0 ~ 1.0)
    class_name = Column(String(100))   # 탐지 클래스명 (현재: Crack)
    bbox_x1    = Column(Float)         # 바운딩박스 좌상단 x
    bbox_y1    = Column(Float)         # 바운딩박스 좌상단 y
    bbox_x2    = Column(Float)         # 바운딩박스 우하단 x
    bbox_y2    = Column(Float)         # 바운딩박스 우하단 y
    created_at = Column(DateTime, default=datetime.now)  # 탐지 일시

# 테이블이 없으면 자동 생성
Base.metadata.create_all(bind=engine)


# ── DB 세션 의존성 ──
# FastAPI 엔드포인트에서 db: Session = Depends(get_db) 형태로 사용
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── 모델 설정 ──
# train12 best.pt 사용 (mAP50 0.86)
# 클래스 추가 시 CLASS_NAMES에 순서대로 추가
MODEL_PATH = Path(__file__).parent / "runs/detect/train12/weights/best.pt"
CLASS_NAMES = ["Crack"]

app = FastAPI(title="Crack Detection API")
model: YOLO | None = None


# ── 서버 시작 시 모델 로드 ──
@app.on_event("startup")
def load_model():
    global model
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model not found: {MODEL_PATH}")
    model = YOLO(str(MODEL_PATH))


# ── Pydantic 응답 스키마 ──
class Detection(BaseModel):
    class_id:   int
    class_name: str
    confidence: float
    bbox:       list[float]  # [x1, y1, x2, y2]

class PredictResponse(BaseModel):
    detections:             list[Detection]
    count:                  int
    annotated_image_base64: str  # JPEG 결과 이미지 (base64 인코딩)


# ── POST /predict ──
# 이미지 업로드 → YOLO 탐지 → 결과 반환 + DB 저장
@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 이미지 파일 여부 확인
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # 이미지 디코딩
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    # YOLO 추론
    results = model(img)[0]

    detections: list[Detection] = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf   = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        detections.append(Detection(
            class_id=cls_id,
            class_name=CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id),
            confidence=round(conf, 4),
            bbox=[round(v, 2) for v in [x1, y1, x2, y2]],
        ))

        # 탐지 결과 DB 저장
        db.add(DetectionRecord(
            filename=file.filename,
            confidence=round(conf, 4),
            class_name=CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id),
            bbox_x1=round(x1, 2),
            bbox_y1=round(y1, 2),
            bbox_x2=round(x2, 2),
            bbox_y2=round(y2, 2),
        ))

    try:
        db.commit()
    except Exception as e:
        print(f"DB 저장 실패: {e}")
        db.rollback()

    # 어노테이션 이미지 base64 인코딩
    annotated = results.plot()
    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
    img_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    return PredictResponse(
        detections=detections,
        count=len(detections),
        annotated_image_base64=img_b64,
    )


# ── GET /health ──
# 서버 및 모델 로드 상태 확인
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


# ── GET /detections ──
# 전체 탐지 기록 조회 (최신순)
@app.get("/detections")
def get_detections(db: Session = Depends(get_db)):
    return db.query(DetectionRecord).order_by(DetectionRecord.created_at.desc()).all()


# ── DELETE /detections/{id} ──
# 특정 탐지 기록 삭제
@app.delete("/detections/{id}")
def delete_detection(id: int, db: Session = Depends(get_db)):
    record = db.query(DetectionRecord).filter(DetectionRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": f"id {id} 삭제 완료"}


# ── GET /stats ──
# 탐지 기록 요약 통계 (총 탐지 수, 평균 신뢰도, 클래스별 통계 등)
@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(DetectionRecord).count()

    if total == 0:
        return {"message": "탐지 기록 없음", "total_detections": 0}

    avg_conf = db.query(func.avg(DetectionRecord.confidence)).scalar()
    max_conf = db.query(func.max(DetectionRecord.confidence)).scalar()
    min_conf = db.query(func.min(DetectionRecord.confidence)).scalar()
    latest   = db.query(func.max(DetectionRecord.created_at)).scalar()

    # 클래스별 탐지 수 집계
    by_class = {}
    for class_name, count in db.query(
        DetectionRecord.class_name, func.count(DetectionRecord.id)
    ).group_by(DetectionRecord.class_name).all():
        by_class[class_name] = count

    return {
        "total_detections":   total,
        "average_confidence": round(float(avg_conf), 4),
        "max_confidence":     round(float(max_conf), 4),
        "min_confidence":     round(float(min_conf), 4),
        "by_class":           by_class,
        "latest_detection":   str(latest),
    }

# ── GET /report ──
# DB 탐지 기록을 PDF 보고서로 생성 후 다운로드
@app.get("/report")
def generate_report(db: Session = Depends(get_db)):
    records = db.query(DetectionRecord).order_by(DetectionRecord.created_at.asc()).all()

    # PDF 생성
    pdf_path = "crackbot_report.pdf"
    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4

    # 제목
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "AI CrackBot Detection Report")

    # 생성 일시
    c.setFont("Helvetica", 11)
    c.drawString(50, height - 75, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    c.drawString(50, height - 95, f"Total Detections: {len(records)}")

    # 구분선
    c.line(50, height - 110, width - 50, height - 110)

    # 테이블 헤더
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50,  height - 130, "ID")
    c.drawString(90,  height - 130, "Filename")
    c.drawString(310, height - 130, "Class")
    c.drawString(380, height - 130, "Confidence")
    c.drawString(460, height - 130, "Detected At")

    c.line(50, height - 135, width - 50, height - 135)

    # 데이터 행
    c.setFont("Helvetica", 9)
    y = height - 152
    for r in records:
        if y < 60:  # 페이지 넘김
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 9)

        c.drawString(50,  y, str(r.id))
        c.drawString(90,  y, str(r.filename)[:28] if r.filename else "-")
        c.drawString(310, y, str(r.class_name))
        c.drawString(380, y, str(round(r.confidence, 4)))
        c.drawString(460, y, str(r.created_at)[:16] if r.created_at else "-")
        y -= 18

    # 하단 통계
    if records:
        avg = round(sum(r.confidence for r in records) / len(records), 4)
        c.line(50, y - 5, width - 50, y - 5)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y - 20, f"Average Confidence: {avg}")

    c.save()
    return FileResponse(pdf_path, media_type="application/pdf", filename="crackbot_report.pdf")