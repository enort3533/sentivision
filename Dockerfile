FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    EASYOCR_MODULE_PATH=/var/data/easyocr \
    MODEL_CACHE_DIR=/var/data/model_cache

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch to avoid the much larger CUDA distribution.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch
COPY backend/requirements-render.txt /tmp/requirements-render.txt
RUN pip install --no-cache-dir -r /tmp/requirements-render.txt

WORKDIR /app/backend
COPY backend/ /app/backend/

EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
