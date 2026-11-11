# SENTIVISION — System Architecture & Design

## 1. Executive Summary

**SENTIVISION** is a production-grade, academic engineering application designed to perform image-based sentiment intelligence. The system extracts textual content from user-uploaded screenshots (e.g., e-commerce reviews, social media discussions, customer support tickets) via deep-learning optical character recognition (OCR), segments lines into logical comment blocks, and classifies each comment into a 3-class sentiment framework (**Negative**, **Neutral**, **Positive**) using a pretrained transformer NLP model.

---

## 2. End-to-End Processing Pipeline

```
┌─────────────────────────────────┐
│     User Screenshot Upload      │
│     (JPG, JPEG, PNG <= 10MB)    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        Image Validation         │
│   (Dimensions, Format, Mime)    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Image Preprocessing       │
│  - LAB conversion & CLAHE       │
│  - Laplacian variance denoising │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       OCR Text Extraction       │
│   (EasyOCR - CRAFT + ResNet)    │
│  - Bounding boxes [x, y] coords │
│  - Confidence scoring           │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Text Segmentation & Grouping  │
│  - Vertical proximity clustering│
│  - Multi-line comment grouping  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Pretrained Sentiment Inference │
│  (cardiffnlp/twitter-roberta-   │
│   base-sentiment-latest)        │
│  - AutoTokenizer (max 512 toks) │
│  - Dynamic id2label mapping     │
│  - Softmax class probabilities  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Persistence & Visualization  │
│  - SQLite AnalysisRecord store  │
│  - Modern React SaaS Dashboard  │
└─────────────────────────────────┘
```

---

## 3. Core Component Architecture

### 3.1 Backend Modules (`backend/modules/`)

| Module | Responsibility | Key Technologies |
|---|---|---|
| `sentiment_model.py` | Singleton sentiment engine. Auto-loads weights, enforces inference mode, retrieves softmax probabilities, dynamically extracts `id2label` from config.json. | PyTorch, Hugging Face Transformers |
| `image_preprocessing.py` | Validates file integrity, enforces max resolution (4096px), enhances contrast via CLAHE in LAB color space, and applies bilateral denoising when blur is detected. | OpenCV, Pillow, NumPy |
| `ocr_engine.py` | Singleton OCR reader. Extracts text and bounding boxes, filters out sub-threshold detections (`OCR_CONFIDENCE_THRESHOLD`), and sorts reading order top-to-bottom. | EasyOCR, PyTorch |
| `text_segmentation.py` | Analyzes bounding box geometry to cluster consecutive lines separated by less than $2\times$ average line height into coherent single-comment blocks. | Python algorithmic clustering |

### 3.2 Database Layer (`backend/database/`)

- **Engine:** SQLite (`sentivision.db`) via SQLAlchemy ORM.
- **Table:** `analysis_records`
  - `id`: UUID primary key (string)
  - `filename`: original screenshot filename (string)
  - `created_at`: timestamp in UTC
  - `total_comments`: total detected comments (integer)
  - `positive_count`, `negative_count`, `neutral_count`: sentiment distribution counts (integers)
  - `dominant_sentiment`: modal sentiment category (string)
  - `results_json`: serialized JSON containing complete bounding box, text, confidence, and probability arrays

### 3.3 REST API Endpoints (`backend/api/`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze/image` | Upload screenshot -> Preprocessing -> OCR -> Segmentation -> Sentiment classification -> SQLite persist |
| `POST` | `/api/analyze/text` | Plaintext sentiment inference with class probabilities |
| `POST` | `/api/analyze/batch` | Multi-image batch processing (sequential memory-safe pipeline) |
| `POST` | `/api/evaluate` | Evaluates user-uploaded labelled CSV against pretrained model |
| `GET` | `/api/health` | Service health, model cache state, and OCR reader status |
| `GET` | `/api/model/info` | Inspect model ID, device, and dynamic label mapping |
| `GET` | `/api/history` | Retrieve historical analysis records |
| `DELETE` | `/api/history/{id}` | Remove historical analysis record |

---

## 4. Model Selection & Academic Validation

### 4.1 Transformer Model
- **Identifier:** `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Underlying Architecture:** RoBERTa-base (12-layer, 768-hidden, 12-heads, 125M parameters).
- **Training Foundation:** Trained on ~124M tweets (Jan 2018 - Dec 2021) and fine-tuned on the TweetEval benchmark.
- **Classes:** 3 (`negative`, `neutral`, `positive`).
- **Dynamic Mapping:** Rather than assuming 0=Negative, 1=Neutral, 2=Positive, the application dynamically parses `model.config.id2label` to prevent misalignment across checkpoint revisions.

### 4.2 OCR Engine
- **Identifier:** EasyOCR
- **Architecture:** CRAFT (Character Region Awareness for Text Detection) for text detection + ResNet with BiLSTM and CTC loss for recognition.
- **Advantage:** Performs exceptionally well on digital screen captures, non-standard web typography, and low-contrast UI screenshots.

---

## 5. Command-Line Interface (`cli/`)

The CLI (`cli/cli.py`) provides independent evaluation and prediction capabilities powered by Typer and Rich:

1. **`predict`**:
   - Single string inference: `python cli/cli.py predict --text "..."`
   - Batch CSV file inference: `python cli/cli.py predict --input reviews.csv --output out.csv`
2. **`evaluate`**:
   - Computes Accuracy, Macro Precision, Macro Recall, Macro F1, Weighted F1, Confusion Matrix, and Scikit-Learn Classification Report.
   - Saves timestamped evaluation bundles under `reports/evaluation_YYYYMMDD_HHMMSS/`.
3. **`download-dataset`**:
   - Automatically downloads standard public benchmark datasets (e.g. `tweet_eval`) via Hugging Face `datasets` and standardizes schema to `[text, sentiment]`.

