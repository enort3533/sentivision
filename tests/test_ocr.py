import sys
import os
import io
import pytest
from pathlib import Path
from PIL import Image, ImageDraw
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from modules.image_preprocessing import validate_image, preprocess_image, pil_from_bytes
from modules.text_segmentation import segment_comments


def make_white_image(width=400, height=100) -> Image.Image:
    return Image.new("RGB", (width, height), color=(255, 255, 255))


def image_to_bytes(img: Image.Image, fmt="PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


class TestImageValidation:
    def test_valid_image(self):
        img = make_white_image()
        b = image_to_bytes(img)
        validate_image(b)  # Should not raise

    def test_invalid_bytes(self):
        with pytest.raises(ValueError):
            validate_image(b"not_an_image")

    def test_too_large(self):
        img = make_white_image()
        b = image_to_bytes(img)
        with pytest.raises(ValueError):
            validate_image(b, max_mb=0)


class TestImagePreprocessing:
    def test_preprocess_rgb(self):
        img = make_white_image()
        result = preprocess_image(img)
        assert result.mode == "RGB"

    def test_preprocess_large_image(self):
        img = make_white_image(5000, 5000)
        result = preprocess_image(img)
        w, h = result.size
        assert max(w, h) <= 4096

    def test_pil_from_bytes(self):
        img = make_white_image()
        b = image_to_bytes(img)
        result = pil_from_bytes(b)
        assert result.mode == "RGB"


class TestTextSegmentation:
    def _make_ocr_result(self, text, top_y, bottom_y, left_x=10, right_x=200):
        return {
            "text": text,
            "confidence": 0.9,
            "bbox": [
                [left_x, top_y],
                [right_x, top_y],
                [right_x, bottom_y],
                [left_x, bottom_y],
            ],
        }

    def test_empty_ocr_results(self):
        blocks = segment_comments([])
        assert blocks == []

    def test_single_line(self):
        results = [self._make_ocr_result("Hello world", 10, 30)]
        blocks = segment_comments(results)
        assert len(blocks) == 1
        assert blocks[0]["full_text"] == "Hello world"

    def test_groups_close_lines(self):
        results = [
            self._make_ocr_result("Line one", 10, 30),
            self._make_ocr_result("Line two", 32, 52),
        ]
        blocks = segment_comments(results)
        assert len(blocks) == 1  # Grouped together

    def test_separates_distant_lines(self):
        results = [
            self._make_ocr_result("Comment A", 10, 30),
            self._make_ocr_result("Comment B", 200, 220),
        ]
        blocks = segment_comments(results)
        assert len(blocks) == 2

    def test_multiple_blocks(self):
        results = [
            self._make_ocr_result("Review 1 line 1", 10, 30),
            self._make_ocr_result("Review 1 line 2", 32, 52),
            self._make_ocr_result("Review 2", 300, 320),
        ]
        blocks = segment_comments(results)
        assert len(blocks) == 2
