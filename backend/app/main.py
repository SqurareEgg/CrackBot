"""
CrackBot AI API — Entry point

Default seed credentials:
  Email:    admin@crackbot.ai
  Password: crackbot123
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base

# Import all models before create_all so SQLAlchemy registers them
from app.models import user, building, project, photo, report  # noqa: F401

from app.routers import auth, buildings, projects, photos, reports, dev

app = FastAPI(
    title="CrackBot AI API",
    description="건축물 안전점검 자동화 시스템",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Create all tables, seed a default user, and load the YOLO model."""
    Base.metadata.create_all(bind=engine)

    try:
        from app.services.detection import load_model
        load_model()
        print("YOLO crack detection model loaded.")
    except Exception as e:
        print(f"Warning: could not load YOLO model: {e}")

    from app.database import SessionLocal
    from app.models.user import User
    from app.services.auth import hash_password

    db = SessionLocal()
    try:
        if not db.query(User).first():
            seed_user = User(
                email="admin@crackbot.ai",
                password_hash=hash_password("crackbot123"),
                name="김민준",
                role="inspector",
            )
            db.add(seed_user)
            db.commit()
            print("Seed user created: admin@crackbot.ai / crackbot123")
    finally:
        db.close()


app.include_router(auth.router, prefix="/v1/auth", tags=["인증"])
app.include_router(buildings.router, prefix="/v1/buildings", tags=["건축물"])
app.include_router(projects.router, prefix="/v1/projects", tags=["점검 프로젝트"])
app.include_router(photos.router, prefix="/v1", tags=["사진/탐지"])
app.include_router(reports.router, prefix="/v1/reports", tags=["보고서"])
app.include_router(dev.router, prefix="/v1", tags=["개발용 Mock"])


@app.get("/", tags=["헬스체크"])
def root():
    """API root — basic health check."""
    return {"message": "CrackBot AI API", "docs": "/docs", "version": "0.1.0"}
