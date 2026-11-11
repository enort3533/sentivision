import pytest
import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
from PIL import Image, ImageDraw
import numpy as np

# Add backend to path
_backend = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(_backend))

from database.database import create_tables

@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database tables exist for tests."""
    create_tables()

@pytest.fixture
def mock_sentiment_model():
    """Mock SentimentModel that returns fixed positive prediction."""
    mock = MagicMock()
    mock.predict.return_value = {
        "text": "test",
        "sentiment": "positive",
        "confidence": 0.95,
        "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
    }
    def _default_batch(texts):
        return [
            {
                "text": t,
                "sentiment": "positive",
                "confidence": 0.95,
                "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
            }
            for t in texts
        ]
    mock.predict_batch.return_value = _default_batch(["default"])
    mock.predict_batch.side_effect = lambda texts: _default_batch(texts)
    mock.get_model_info.return_value = {
        "model_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "labels": {0: "negative", 1: "neutral", 2: "positive"},
        "device": "cpu",
        "loaded": True,
    }
    return mock


@pytest.fixture
def sample_image():
    """Small synthetic PIL image with text-like content."""
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Great product! Very happy.", fill=(0, 0, 0))
    return img


@pytest.fixture
def sample_image_bytes(sample_image):
    import io

    buf = io.BytesIO()
    sample_image.save(buf, format="PNG")
    return buf.getvalue()
