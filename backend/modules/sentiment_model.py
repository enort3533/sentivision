import logging
import os
from typing import Optional
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from torch.nn.functional import softmax

logger = logging.getLogger(__name__)


class SentimentModel:
    _instance: Optional["SentimentModel"] = None
    _loaded: bool = False

    def __init__(self):
        self.model_id: str = os.getenv("SENTIMENT_MODEL_ID", "cardiffnlp/twitter-roberta-base-sentiment-latest")
        self.cache_dir: str = os.getenv("MODEL_CACHE_DIR", "./model_cache")
        self.device: str = os.getenv("DEVICE", "cpu")
        if torch.cuda.is_available() and self.device != "cpu":
            self.device = "cuda"
        self.tokenizer = None
        self.model = None
        self.id2label: dict[int, str] = {}  # populated after load
        self._load()

    def _load(self):
        logger.info(f"Loading sentiment model: {self.model_id}")
        os.makedirs(self.cache_dir, exist_ok=True)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id, cache_dir=self.cache_dir)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_id, cache_dir=self.cache_dir
        )
        self.model.to(self.device)
        self.model.eval()
        # Read label mapping from model config — never hardcode
        self.id2label = {int(k): v.lower() for k, v in self.model.config.id2label.items()}
        logger.info(f"Model loaded. Labels: {self.id2label}")

    @classmethod
    def get_instance(cls) -> "SentimentModel":
        if cls._instance is None:
            cls._instance = SentimentModel()
        return cls._instance

    def predict(self, text: str) -> dict:
        if not text or not text.strip():
            return {
                "text": text,
                "sentiment": "neutral",
                "confidence": 0.0,
                "probabilities": {"negative": 0.0, "neutral": 1.0, "positive": 0.0},
                "error": "Empty text"
            }
        text = text.strip()[:5000]  # guard against very long inputs
        with torch.inference_mode():
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self.model(**inputs)
            probs = softmax(outputs.logits, dim=-1)[0].cpu().tolist()

        # Map dynamically using id2label
        label_probs = {self.id2label[i]: round(probs[i], 4) for i in range(len(probs))}
        # Ensure all three keys exist (fill 0.0 if model doesn't output one)
        for key in ("negative", "neutral", "positive"):
            label_probs.setdefault(key, 0.0)
        predicted_label = max(label_probs, key=lambda k: label_probs[k])
        confidence = round(label_probs[predicted_label], 4)
        return {
            "text": text,
            "sentiment": predicted_label,
            "confidence": confidence,
            "probabilities": label_probs,
        }

    def predict_batch(self, texts: list[str]) -> list[dict]:
        return [self.predict(t) for t in texts]

    def get_model_info(self) -> dict:
        return {
            "model_id": self.model_id,
            "labels": self.id2label,
            "device": self.device,
            "loaded": self.model is not None,
        }
