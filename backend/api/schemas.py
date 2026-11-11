from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class ProbabilityBreakdown(BaseModel):
    negative: float
    neutral: float
    positive: float


class SentimentResult(BaseModel):
    text: str
    sentiment: str
    confidence: float
    probabilities: ProbabilityBreakdown
    error: Optional[str] = None


class CommentAnalysis(BaseModel):
    block_id: int
    extracted_text: str
    sentiment_result: SentimentResult
    ocr_confidence: float
    lines: list[str]


class AnalysisSummary(BaseModel):
    total_comments: int
    positive_count: int
    negative_count: int
    neutral_count: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    dominant_sentiment: str


class ImageAnalysisResponse(BaseModel):
    analysis_id: str
    filename: str
    total_comments: int
    comments: list[CommentAnalysis]
    summary: AnalysisSummary


class BatchImageResult(BaseModel):
    filename: str
    success: bool
    error: Optional[str] = None
    result: Optional[ImageAnalysisResponse] = None


class BatchAnalysisResponse(BaseModel):
    total_images: int
    successful: int
    failed: int
    results: list[BatchImageResult]
    combined_summary: AnalysisSummary


class EvaluationResponse(BaseModel):
    dataset_size: int
    valid_samples: int
    skipped_samples: int
    accuracy: float
    precision: float
    recall: float
    macro_f1: float
    weighted_f1: float
    confusion_matrix: list[list[int]]
    classification_report: str
    labels: list[str]


class HistoryRecord(BaseModel):
    id: str
    filename: str
    created_at: datetime
    total_comments: int
    positive_count: int
    negative_count: int
    neutral_count: int
    dominant_sentiment: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    ocr_loaded: bool
    version: str = "1.0.0"


class ModelInfoResponse(BaseModel):
    model_id: str
    labels: dict
    device: str
    loaded: bool


class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
