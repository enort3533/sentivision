import sys
import os
import json
import io
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sqlalchemy.orm import Session
from PIL import Image

from api.schemas import (
    SentimentResult,
    ProbabilityBreakdown,
    ImageAnalysisResponse,
    CommentAnalysis,
    AnalysisSummary,
    BatchAnalysisResponse,
    BatchImageResult,
    EvaluationResponse,
    HistoryRecord,
    HealthResponse,
    ModelInfoResponse,
    TextAnalysisRequest,
)
from core.config import settings
from modules.sentiment_model import SentimentModel
from modules.image_preprocessing import validate_image, preprocess_image, pil_from_bytes
from modules.ocr_engine import OCREngine
from modules.text_segmentation import segment_comments
from database.database import (
    get_db,
    create_record,
    get_all_records,
    get_record_by_id,
    delete_record,
)

router = APIRouter(prefix="/api")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _get_sentiment_model() -> SentimentModel:
    return SentimentModel.get_instance()


def _get_ocr_engine() -> OCREngine:
    return OCREngine.get_instance()


def _build_summary(comments: list[CommentAnalysis]) -> AnalysisSummary:
    total = len(comments)
    pos = sum(1 for c in comments if c.sentiment_result.sentiment == "positive")
    neg = sum(1 for c in comments if c.sentiment_result.sentiment == "negative")
    neu = total - pos - neg
    if total == 0:
        return AnalysisSummary(
            total_comments=0,
            positive_count=0,
            negative_count=0,
            neutral_count=0,
            positive_pct=0,
            negative_pct=0,
            neutral_pct=0,
            dominant_sentiment="neutral",
        )
    dominant = max(
        ["positive", "negative", "neutral"],
        key=lambda s: {"positive": pos, "negative": neg, "neutral": neu}[s],
    )
    return AnalysisSummary(
        total_comments=total,
        positive_count=pos,
        negative_count=neg,
        neutral_count=neu,
        positive_pct=round(pos / total * 100, 1),
        negative_pct=round(neg / total * 100, 1),
        neutral_pct=round(neu / total * 100, 1),
        dominant_sentiment=dominant,
    )


async def _process_image_upload(
    file: UploadFile, model: SentimentModel, ocr: OCREngine
) -> ImageAnalysisResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, f"Unsupported file type: {ext}")
    file_bytes = await file.read()
    try:
        validate_image(file_bytes, settings.MAX_UPLOAD_SIZE_MB)
    except ValueError as e:
        raise HTTPException(422, str(e))
    pil_img = pil_from_bytes(file_bytes)
    processed = preprocess_image(pil_img)
    ocr_results = ocr.read_image(processed)
    blocks = segment_comments(ocr_results)

    if not blocks:
        import uuid
        return ImageAnalysisResponse(
            analysis_id=str(uuid.uuid4()),
            filename=file.filename or "unknown",
            total_comments=0,
            comments=[],
            summary=_build_summary([]),
        )

    comment_analyses = []
    for block in blocks:
        pred = model.predict(block["full_text"])
        probs = pred["probabilities"]
        sa = CommentAnalysis(
            block_id=block["block_id"],
            extracted_text=block["full_text"],
            lines=block["lines"],
            ocr_confidence=block["avg_confidence"],
            sentiment_result=SentimentResult(
                text=pred["text"],
                sentiment=pred["sentiment"],
                confidence=pred["confidence"],
                probabilities=ProbabilityBreakdown(
                    negative=probs.get("negative", 0.0),
                    neutral=probs.get("neutral", 0.0),
                    positive=probs.get("positive", 0.0),
                ),
                error=pred.get("error"),
            ),
        )
        comment_analyses.append(sa)

    import uuid
    return ImageAnalysisResponse(
        analysis_id=str(uuid.uuid4()),
        filename=file.filename or "unknown",
        total_comments=len(comment_analyses),
        comments=comment_analyses,
        summary=_build_summary(comment_analyses),
    )


@router.get("/health", response_model=HealthResponse)
async def health():
    model_loaded = SentimentModel._instance is not None and SentimentModel._instance.model is not None
    ocr_loaded = OCREngine._instance is not None and OCREngine._instance._reader is not None
    return HealthResponse(status="ok", model_loaded=model_loaded, ocr_loaded=ocr_loaded)


@router.get("/model/info", response_model=ModelInfoResponse)
async def model_info():
    model = _get_sentiment_model()
    info = model.get_model_info()
    return ModelInfoResponse(**info)


@router.post("/analyze/text", response_model=SentimentResult)
async def analyze_text(request: TextAnalysisRequest):
    model = _get_sentiment_model()
    pred = model.predict(request.text)
    probs = pred["probabilities"]
    return SentimentResult(
        text=pred["text"],
        sentiment=pred["sentiment"],
        confidence=pred["confidence"],
        probabilities=ProbabilityBreakdown(**probs),
        error=pred.get("error"),
    )


@router.post("/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    model = _get_sentiment_model()
    ocr = _get_ocr_engine()
    result = await _process_image_upload(file, model, ocr)
    # Persist to DB
    s = result.summary
    create_record(
        db,
        result.filename,
        result.total_comments,
        s.positive_count,
        s.negative_count,
        s.neutral_count,
        s.dominant_sentiment,
        result.model_dump_json(),
    )
    return result


@router.post("/analyze/batch", response_model=BatchAnalysisResponse)
async def analyze_batch(files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    if len(files) > 20:
        raise HTTPException(422, "Maximum 20 images per batch")
    model = _get_sentiment_model()
    ocr = _get_ocr_engine()
    results = []
    total_pos = total_neg = total_neu = total_comments = 0
    successful = 0
    failed = 0
    for f in files:
        try:
            res = await _process_image_upload(f, model, ocr)
            s = res.summary
            create_record(
                db,
                res.filename,
                res.total_comments,
                s.positive_count,
                s.negative_count,
                s.neutral_count,
                s.dominant_sentiment,
                res.model_dump_json(),
            )
            total_pos += s.positive_count
            total_neg += s.negative_count
            total_neu += s.neutral_count
            total_comments += res.total_comments
            results.append(BatchImageResult(filename=f.filename or "unknown", success=True, result=res))
            successful += 1
        except Exception as e:
            results.append(BatchImageResult(filename=f.filename or "unknown", success=False, error=str(e)))
            failed += 1

    dominant = max(
        ["positive", "negative", "neutral"],
        key=lambda s: {"positive": total_pos, "negative": total_neg, "neutral": total_neu}[s],
    )
    total = total_comments or 1
    combined = AnalysisSummary(
        total_comments=total_comments,
        positive_count=total_pos,
        negative_count=total_neg,
        neutral_count=total_neu,
        positive_pct=round(total_pos / total * 100, 1),
        negative_pct=round(total_neg / total * 100, 1),
        neutral_pct=round(total_neu / total * 100, 1),
        dominant_sentiment=dominant,
    )
    return BatchAnalysisResponse(
        total_images=len(files),
        successful=successful,
        failed=failed,
        results=results,
        combined_summary=combined,
    )


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(
    file: UploadFile = File(...),
    text_column: str = Query("text"),
    label_column: str = Query("sentiment"),
):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(422, f"Invalid CSV: {e}")
    if text_column not in df.columns:
        raise HTTPException(422, f"Column '{text_column}' not found in CSV")
    if label_column not in df.columns:
        raise HTTPException(422, f"Column '{label_column}' not found in CSV")

    df = df[[text_column, label_column]].dropna()
    total_samples = len(df)
    df[text_column] = df[text_column].astype(str).str.strip()
    df[label_column] = df[label_column].astype(str).str.strip().str.lower()
    df = df[df[text_column].str.len() > 0]
    df = df[df[label_column].isin(["positive", "negative", "neutral"])]

    valid = len(df)
    skipped = total_samples - valid
    if valid == 0:
        raise HTTPException(422, "No valid samples found after filtering")

    model = _get_sentiment_model()
    preds = model.predict_batch(df[text_column].tolist())
    predicted_labels = [p["sentiment"] for p in preds]
    actual_labels = df[label_column].tolist()

    labels = ["negative", "neutral", "positive"]
    acc = round(accuracy_score(actual_labels, predicted_labels), 4)
    prec = round(
        precision_score(actual_labels, predicted_labels, labels=labels, average="macro", zero_division=0), 4
    )
    rec = round(
        recall_score(actual_labels, predicted_labels, labels=labels, average="macro", zero_division=0), 4
    )
    mac_f1 = round(
        f1_score(actual_labels, predicted_labels, labels=labels, average="macro", zero_division=0), 4
    )
    wgt_f1 = round(
        f1_score(actual_labels, predicted_labels, labels=labels, average="weighted", zero_division=0), 4
    )
    cm = confusion_matrix(actual_labels, predicted_labels, labels=labels).tolist()
    report = classification_report(actual_labels, predicted_labels, labels=labels, zero_division=0)

    return EvaluationResponse(
        dataset_size=valid + skipped,
        valid_samples=valid,
        skipped_samples=skipped,
        accuracy=acc,
        precision=prec,
        recall=rec,
        macro_f1=mac_f1,
        weighted_f1=wgt_f1,
        confusion_matrix=cm,
        classification_report=report,
        labels=labels,
    )


@router.get("/history", response_model=list[HistoryRecord])
async def get_history(db: Session = Depends(get_db)):
    records = get_all_records(db)
    return [
        HistoryRecord(
            id=r.id,
            filename=r.filename,
            created_at=r.created_at,
            total_comments=r.total_comments,
            positive_count=r.positive_count,
            negative_count=r.negative_count,
            neutral_count=r.neutral_count,
            dominant_sentiment=r.dominant_sentiment,
        )
        for r in records
    ]


@router.delete("/history/{record_id}", status_code=204)
async def remove_history(record_id: str, db: Session = Depends(get_db)):
    if not delete_record(db, record_id):
        raise HTTPException(404, "Record not found")
