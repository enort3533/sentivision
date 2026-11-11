import sys
import os
import pytest
import pandas as pd
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).parent.parent / "cli"))


def test_evaluate_basic():
    """Test evaluator computes correct metrics on small dataset."""
    from evaluator import evaluate, normalize_label, parse_label_map

    df = pd.DataFrame({
        "text": ["great product", "terrible service", "it arrived"],
        "sentiment": ["positive", "negative", "neutral"],
    })

    _mock_model = MagicMock()
    _mock_model.predict_batch.return_value = [
        {
            "text": "great product",
            "sentiment": "positive",
            "confidence": 0.95,
            "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
        },
        {
            "text": "terrible service",
            "sentiment": "negative",
            "confidence": 0.92,
            "probabilities": {"negative": 0.92, "neutral": 0.04, "positive": 0.04},
        },
        {
            "text": "it arrived",
            "sentiment": "neutral",
            "confidence": 0.70,
            "probabilities": {"negative": 0.15, "neutral": 0.70, "positive": 0.15},
        },
    ]

    with patch("evaluator.SentimentModel.get_instance", return_value=_mock_model):
        result = evaluate(df, "text", "sentiment")

    assert result.accuracy == 1.0  # all correct
    assert result.valid_samples == 3
    assert result.skipped_samples == 0
    assert len(result.predictions_df) == 3
    assert result.misclassified_df.empty


def test_normalize_label():
    from evaluator import normalize_label

    assert normalize_label("positive") == "positive"
    assert normalize_label("POSITIVE") == "positive"
    assert normalize_label("pos") == "positive"
    assert normalize_label("neg") == "negative"
    assert normalize_label("neu") == "neutral"
    assert normalize_label("unknown_xyz") is None


def test_parse_label_map():
    from evaluator import parse_label_map

    m = parse_label_map("0=negative,1=neutral,2=positive")
    assert m["0"] == "negative"
    assert m["1"] == "neutral"
    assert m["2"] == "positive"


def test_evaluate_with_label_map():
    from evaluator import evaluate

    df = pd.DataFrame({
        "review": ["loved it", "hated it"],
        "rating": ["2", "0"],
    })

    _mock_model = MagicMock()
    _mock_model.predict_batch.return_value = [
        {
            "text": "loved it",
            "sentiment": "positive",
            "confidence": 0.95,
            "probabilities": {"negative": 0.02, "neutral": 0.03, "positive": 0.95},
        },
        {
            "text": "hated it",
            "sentiment": "negative",
            "confidence": 0.92,
            "probabilities": {"negative": 0.92, "neutral": 0.04, "positive": 0.04},
        },
    ]

    with patch("evaluator.SentimentModel.get_instance", return_value=_mock_model):
        result = evaluate(df, "review", "rating", "0=negative,1=neutral,2=positive")

    assert result.valid_samples == 2
    assert result.accuracy == 1.0


def test_empty_dataset():
    from evaluator import evaluate

    df = pd.DataFrame({"text": [], "sentiment": []})
    with pytest.raises(ValueError):
        evaluate(df, "text", "sentiment")
