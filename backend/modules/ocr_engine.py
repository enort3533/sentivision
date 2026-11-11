import logging
from typing import Optional
import numpy as np
from PIL import Image
import os

logger = logging.getLogger(__name__)


class OCRResult:
    def __init__(self, text: str, confidence: float, bbox: list):
        self.text = text
        self.confidence = confidence
        self.bbox = bbox  # list of 4 [x,y] points


class OCREngine:
    _instance: Optional["OCREngine"] = None
    _reader = None

    def __init__(self):
        languages_env = os.getenv("OCR_LANGUAGES", "en")
        if isinstance(languages_env, str):
            self.languages = [l.strip() for l in languages_env.split(",")]
        else:
            self.languages = languages_env
        self.confidence_threshold = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.4"))
        self._init_reader()

    def _init_reader(self):
        import easyocr
        logger.info(f"Initializing EasyOCR with languages: {self.languages}")
        self._reader = easyocr.Reader(self.languages, gpu=False)
        logger.info("EasyOCR initialized")

    @classmethod
    def get_instance(cls) -> "OCREngine":
        if cls._instance is None:
            cls._instance = OCREngine()
        return cls._instance

    def read_image(self, pil_image: Image.Image) -> list[dict]:
        img_array = np.array(pil_image.convert("RGB"))
        raw_results = self._reader.readtext(img_array, detail=1, paragraph=False)
        results = []
        for (bbox, text, confidence) in raw_results:
            if confidence < self.confidence_threshold:
                continue
            text = text.strip()
            if len(text) < 2:
                continue
            results.append({
                "text": text,
                "confidence": round(confidence, 4),
                "bbox": bbox,  # list of 4 [x,y] corner points
            })
        # Sort top-to-bottom by mean y-coordinate of bbox
        results.sort(key=lambda r: sum(pt[1] for pt in r["bbox"]) / 4)
        return results
