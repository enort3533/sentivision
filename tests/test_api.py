import sys
import os
import io
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# Patch heavy dependencies before importing app
_mock_model = MagicMock()
_mock_model.predict.return_value = {
    "text": "test",
    "sentiment": "positive",
    "confidence": 0.95,
    "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
}
_mock_model.predict_batch.return_value = [
    {
        "text": "test",
        "sentiment": "positive",
        "confidence": 0.95,
        "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
    }
]
_mock_model.get_model_info.return_value = {
    "model_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
    "labels": {0: "negative", 1: "neutral", 2: "positive"},
    "device": "cpu",
    "loaded": True,
}
_mock_model._instance = _mock_model
_mock_model.model = object()

_mock_ocr = MagicMock()
_mock_ocr._reader = object()
_mock_ocr.read_image.return_value = [
    {
        "text": "Great product!",
        "confidence": 0.95,
        "bbox": [[0, 0], [100, 0], [100, 20], [0, 20]],
    },
    {
        "text": "Very happy.",
        "confidence": 0.90,
        "bbox": [[0, 22], [100, 22], [100, 42], [0, 42]],
    },
]

with patch("modules.sentiment_model.SentimentModel.get_instance", return_value=_mock_model), \
     patch("modules.sentiment_model.SentimentModel._instance", _mock_model), \
     patch("modules.ocr_engine.OCREngine.get_instance", return_value=_mock_ocr), \
     patch("modules.ocr_engine.OCREngine._instance", _mock_ocr):
    from main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "model_loaded" in data
        assert "ocr_loaded" in data


class TestTextAnalysis:
    def test_analyze_text(self):
        with patch("api.routes.SentimentModel.get_instance", return_value=_mock_model):
            response = client.post("/api/analyze/text", json={"text": "This is great!"})
        assert response.status_code == 200
        data = response.json()
        assert "sentiment" in data
        assert "confidence" in data
        assert "probabilities" in data

    def test_analyze_text_empty(self):
        response = client.post("/api/analyze/text", json={"text": ""})
        assert response.status_code == 422


class TestModelInfo:
    def test_model_info(self):
        with patch("api.routes.SentimentModel.get_instance", return_value=_mock_model):
            response = client.get("/api/model/info")
        assert response.status_code == 200
        data = response.json()
        assert "model_id" in data
        assert "labels" in data


class TestHistory:
    def test_get_history(self):
        response = client.get("/api/history")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
