import io
from PIL import Image, ImageEnhance
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)
MAX_DIMENSION = 4096


def validate_image(file_bytes: bytes, max_mb: int = 10) -> None:
    if len(file_bytes) > max_mb * 1024 * 1024:
        raise ValueError(f"Image exceeds {max_mb}MB limit")
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
    except Exception as e:
        raise ValueError(f"Invalid image: {e}")


def preprocess_image(pil_image: Image.Image) -> Image.Image:
    """Enhance image for better OCR accuracy."""
    img = pil_image.convert("RGB")
    # Resize if too large
    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Convert to LAB for CLAHE contrast enhancement
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(img_cv)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    img_cv = cv2.merge([l_enhanced, a, b])
    img_cv = cv2.cvtColor(img_cv, cv2.COLOR_LAB2RGB)

    # Optionally denoise if image appears blurry (low variance)
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 50:
        img_cv = cv2.fastNlMeansDenoisingColored(img_cv, None, 10, 10, 7, 21)

    return Image.fromarray(img_cv)


def pil_from_bytes(file_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")
