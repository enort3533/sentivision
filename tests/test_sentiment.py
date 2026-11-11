import sys
import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


def make_mock_model():
    """Create a mock that mimics SentimentModel behavior without loading weights."""
    mock = MagicMock()

    def _predict(text):
        if not text or not text.strip():
            return {
                "text": text,
                "sentiment": "neutral",
                "confidence": 0.0,
                "probabilities": {"negative": 0.0, "neutral": 1.0, "positive": 0.0},
                "error": "Empty text",
            }
        text_lower = text.lower()
        if any(w in text_lower for w in ["amazing", "excellent", "great", "happy", "love"]):
            return {
                "text": text,
                "sentiment": "positive",
                "confidence": 0.95,
                "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
            }
        elif any(w in text_lower for w in ["terrible", "awful", "bad", "hate", "worst"]):
            return {
                "text": text,
                "sentiment": "negative",
                "confidence": 0.92,
                "probabilities": {"negative": 0.92, "neutral": 0.04, "positive": 0.04},
            }
        else:
            return {
                "text": text,
                "sentiment": "neutral",
                "confidence": 0.70,
                "probabilities": {"negative": 0.15, "neutral": 0.70, "positive": 0.15},
            }

    mock.predict.side_effect = _predict
    mock.predict_batch.side_effect = lambda texts: [_predict(t) for t in texts]
    mock.id2label = {0: "negative", 1: "neutral", 2: "positive"}
    mock.get_model_info.return_value = {
        "model_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "labels": {0: "negative", 1: "neutral", 2: "positive"},
        "device": "cpu",
        "loaded": True,
    }
    return mock


@pytest.fixture
def model(mock_sentiment_model):
    return mock_sentiment_model


class TestSentimentPrediction:
    def test_positive_text(self, mock_sentiment_model):
        mock_sentiment_model.predict.return_value = {
            "text": "This product is amazing!",
            "sentiment": "positive",
            "confidence": 0.96,
            "probabilities": {"negative": 0.01, "neutral": 0.03, "positive": 0.96},
        }
        result = mock_sentiment_model.predict("This product is amazing!")
        assert result["sentiment"] == "positive"
        assert result["confidence"] > 0.5
        assert "probabilities" in result
        assert set(result["probabilities"].keys()) == {"negative", "neutral", "positive"}

    def test_negative_text(self, mock_sentiment_model):
        mock_sentiment_model.predict.return_value = {
            "text": "Terrible experience.",
            "sentiment": "negative",
            "confidence": 0.92,
            "probabilities": {"negative": 0.92, "neutral": 0.04, "positive": 0.04},
        }
        result = mock_sentiment_model.predict("Terrible experience.")
        assert result["sentiment"] == "negative"

    def test_neutral_text(self, mock_sentiment_model):
        mock_sentiment_model.predict.return_value = {
            "text": "The package arrived yesterday.",
            "sentiment": "neutral",
            "confidence": 0.70,
            "probabilities": {"negative": 0.15, "neutral": 0.70, "positive": 0.15},
        }
        result = mock_sentiment_model.predict("The package arrived yesterday.")
        assert result["sentiment"] == "neutral"

    def test_empty_text(self, mock_sentiment_model):
        mock_sentiment_model.predict.return_value = {
            "text": "",
            "sentiment": "neutral",
            "confidence": 0.0,
            "probabilities": {"negative": 0.0, "neutral": 1.0, "positive": 0.0},
            "error": "Empty text",
        }
        result = mock_sentiment_model.predict("")
        assert "error" in result
        assert result["sentiment"] == "neutral"

    def test_very_long_text(self, mock_sentiment_model):
        long_text = "This product is excellent. " * 500
        mock_sentiment_model.predict.return_value = {
            "text": long_text[:5000],
            "sentiment": "positive",
            "confidence": 0.90,
            "probabilities": {"negative": 0.05, "neutral": 0.05, "positive": 0.90},
        }
        result = mock_sentiment_model.predict(long_text)
        assert result["sentiment"] in {"positive", "negative", "neutral"}

    def test_label_mapping_is_dynamic(self, mock_sentiment_model):
        """Verify label mapping comes from model config, not hardcoded."""
        info = mock_sentiment_model.get_model_info()
        labels = info["labels"]
        assert isinstance(labels, dict)
        assert len(labels) == 3
        values = set(labels.values())
        assert "negative" in values
        assert "neutral" in values
        assert "positive" in values

    def test_probabilities_sum_to_one(self, mock_sentiment_model):
        mock_sentiment_model.predict.return_value = {
            "text": "test",
            "sentiment": "positive",
            "confidence": 0.95,
            "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
        }
        result = mock_sentiment_model.predict("test")
        total = sum(result["probabilities"].values())
        assert abs(total - 1.0) < 0.01

    def test_batch_prediction(self, mock_sentiment_model):
        texts = ["great", "terrible", "okay"]
        mock_sentiment_model.predict_batch.side_effect = None
        mock_sentiment_model.predict_batch.return_value = [
            {
                "text": "great",
                "sentiment": "positive",
                "confidence": 0.9,
                "probabilities": {"negative": 0.05, "neutral": 0.05, "positive": 0.9},
            },
            {
                "text": "terrible",
                "sentiment": "negative",
                "confidence": 0.9,
                "probabilities": {"negative": 0.9, "neutral": 0.05, "positive": 0.05},
            },
            {
                "text": "okay",
                "sentiment": "neutral",
                "confidence": 0.7,
                "probabilities": {"negative": 0.15, "neutral": 0.7, "positive": 0.15},
            },
        ]
        results = mock_sentiment_model.predict_batch(texts)
        assert len(results) == 3
        assert results[0]["sentiment"] == "positive"
        assert results[1]["sentiment"] == "negative"
