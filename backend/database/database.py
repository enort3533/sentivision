import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sentivision.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    total_comments = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    dominant_sentiment = Column(String, default="neutral")
    results_json = Column(Text, nullable=True)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_record(
    db,
    filename: str,
    total_comments: int,
    positive: int,
    negative: int,
    neutral: int,
    dominant: str,
    results_json: str,
) -> AnalysisRecord:
    record = AnalysisRecord(
        filename=filename,
        total_comments=total_comments,
        positive_count=positive,
        negative_count=negative,
        neutral_count=neutral,
        dominant_sentiment=dominant,
        results_json=results_json,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_all_records(db) -> list[AnalysisRecord]:
    return db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).all()


def get_record_by_id(db, record_id: str) -> AnalysisRecord | None:
    return db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()


def delete_record(db, record_id: str) -> bool:
    record = get_record_by_id(db, record_id)
    if record:
        db.delete(record)
        db.commit()
        return True
    return False
