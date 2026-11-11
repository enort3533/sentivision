import sys
import os
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))
from modules.sentiment_model import SentimentModel

LABEL_ALIASES = {
    "pos": "positive",
    "neg": "negative",
    "neu": "neutral",
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "1": "positive",
    "-1": "negative",
    "0": "neutral",
    "2": "positive",   # common in tweet_eval: 0=neg,1=neu,2=pos
}


@dataclass
class EvaluationResult:
    dataset_size: int
    valid_samples: int
    skipped_samples: int
    accuracy: float
    precision: float
    recall: float
    macro_f1: float
    weighted_f1: float
    confusion_matrix: list
    classification_report: str
    labels: list[str] = field(default_factory=lambda: ["negative", "neutral", "positive"])
    predictions_df: pd.DataFrame = field(default_factory=pd.DataFrame)
    misclassified_df: pd.DataFrame = field(default_factory=pd.DataFrame)


def parse_label_map(label_map_str: str) -> dict[str, str]:
    """Parse '0=negative,1=neutral,2=positive' into a dict."""
    mapping = {}
    for pair in label_map_str.split(","):
        pair = pair.strip()
        if "=" in pair:
            k, v = pair.split("=", 1)
            mapping[k.strip().lower()] = v.strip().lower()
    return mapping


def normalize_label(label: str, custom_map: dict[str, str] | None = None) -> str | None:
    label = str(label).strip().lower()
    if custom_map and label in custom_map:
        return custom_map[label]
    return LABEL_ALIASES.get(label)


def evaluate(
    df: pd.DataFrame,
    text_col: str,
    label_col: str,
    label_map_str: str | None = None,
) -> EvaluationResult:
    custom_map = parse_label_map(label_map_str) if label_map_str else None
    total = len(df)

    df = df[[text_col, label_col]].copy()
    df[text_col] = df[text_col].astype(str).str.strip()
    df["_norm_label"] = df[label_col].apply(lambda x: normalize_label(str(x), custom_map))
    df = df[df["_norm_label"].notna() & (df[text_col].str.len() > 0)]

    valid = len(df)
    skipped = total - valid

    if valid == 0:
        raise ValueError("No valid samples after normalization. Use --label-map to specify label mapping.")

    model = SentimentModel.get_instance()
    predictions = model.predict_batch(df[text_col].tolist())
    pred_labels = [p["sentiment"] for p in predictions]
    pred_confs = [p["confidence"] for p in predictions]
    actual_labels = df["_norm_label"].tolist()

    labels = ["negative", "neutral", "positive"]
    acc = round(accuracy_score(actual_labels, pred_labels), 4)
    prec = round(
        precision_score(actual_labels, pred_labels, labels=labels, average="macro", zero_division=0), 4
    )
    rec = round(
        recall_score(actual_labels, pred_labels, labels=labels, average="macro", zero_division=0), 4
    )
    mac_f1 = round(
        f1_score(actual_labels, pred_labels, labels=labels, average="macro", zero_division=0), 4
    )
    wgt_f1 = round(
        f1_score(actual_labels, pred_labels, labels=labels, average="weighted", zero_division=0), 4
    )
    cm = confusion_matrix(actual_labels, pred_labels, labels=labels).tolist()
    report = classification_report(actual_labels, pred_labels, labels=labels, zero_division=0)

    preds_df = df[[text_col, "_norm_label"]].copy()
    preds_df.columns = ["text", "actual"]
    preds_df["predicted"] = pred_labels
    preds_df["confidence"] = pred_confs

    misclass_df = preds_df[preds_df["actual"] != preds_df["predicted"]].copy()

    return EvaluationResult(
        dataset_size=total,
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
        predictions_df=preds_df,
        misclassified_df=misclass_df,
    )
