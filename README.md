# SENTIVISION — Image-Based Sentiment Intelligence

**SENTIVISION** is a production-quality, academic engineering application designed to analyze screenshots containing product reviews, customer feedback, and social media comments. By coupling **EasyOCR** (CRAFT text detection + ResNet recognition) with Cardiff NLP's pretrained **Twitter-RoBERTa** sentiment transformer, the system extracts text from image captures, segments multi-line comments, classifies sentiments into 3 categories (**Negative**, **Neutral**, **Positive**), and renders analytics through a modern SaaS web dashboard and an academic evaluation CLI.

---

## 1. Key Features

- **Screenshot-to-Sentiment Pipeline**: Upload any JPG, JPEG, or PNG screenshot of reviews or comments.
- **Computer Vision Preprocessing**: CLAHE contrast enhancement in LAB color space and variance-based denoising.
- **Intelligent Comment Segmentation**: Geometric line proximity clustering that separates distinct comment blocks rather than lumping text together.
- **Pretrained 3-Class Transformer**: Zero-shot sentiment inference with class probability breakdowns (`cardiffnlp/twitter-roberta-base-sentiment-latest`).
- **Dynamic Label Resolution**: Automatically queries `config.json` `id2label` at runtime — no hardcoded label order assumptions.
- **Interactive OCR Review**: Editable comment text directly within cards with on-the-fly re-classification.
- **Consolidated Batch Processing**: Upload up to 20 screenshots with sequential, memory-safe execution.
- **Interactive Evaluation Lab**: Upload labelled CSV datasets to calculate Accuracy, Precision, Recall, Macro F1, Weighted F1, and Confusion Matrices.
- **Evaluation CLI**: Dedicated CLI (`cli/cli.py`) with rich terminal tables, Hugging Face dataset downloader, and timestamped artifact generation (`metrics.json`, `confusion_matrix.png`, `misclassified_samples.csv`).
- **Persistent Local Database**: SQLite database via SQLAlchemy tracking all historical analyses.
- **Modern SaaS UI**: Styled after Linear, Vercel, and Stripe with light/dark theme toggles, Recharts visualizations, and Framer Motion transitions.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **UI & Icons**: Lucide React icons, custom accessible UI primitives
- **Data Visualization**: Recharts (Donut, Grouped Bar, and Trend Line charts)
- **Animations**: Framer Motion
- **HTTP Client**: Axios with multipart form handling

### Backend
- **Framework**: FastAPI (Asynchronous Python 3.11+)
- **Validation**: Pydantic v2 & Pydantic-Settings
- **Server**: Uvicorn ASGI
- **Database**: SQLite with SQLAlchemy ORM

### Machine Learning & OCR
- **Pretrained NLP Model**: `cardiffnlp/twitter-roberta-base-sentiment-latest` via Hugging Face Transformers & PyTorch
- **OCR Engine**: EasyOCR (PyTorch CRAFT + BiLSTM CTC)
- **Computer Vision**: OpenCV (headless) and Pillow (PIL)
- **Evaluation**: Scikit-Learn, Pandas, NumPy, Matplotlib, Seaborn

### CLI Tools
- **CLI Framework**: Typer with Rich terminal styling
- **Dataset Integration**: Hugging Face `datasets` library

---

## 3. System Architecture

```
User Screenshot
      │
      ▼
Image Preprocessing (OpenCV CLAHE + Bilateral Filter)
      │
      ▼
EasyOCR Detection & Recognition (Bounding Boxes & Confidences)
      │
      ▼
Text Segmentation (Geometric Vertical Proximity Clustering)
      │
      ▼
Pretrained RoBERTa Model (Inference Mode + Softmax Probabilities)
      │
      ▼
SQLite Analysis Storage & Interactive Dashboard Visualizations
```

For complete technical specifications, review [`docs/architecture.md`](file:///Users/shreyam/Documents/resume_projects/sentiment%20analysis/sentivision/docs/architecture.md).

---

## 4. Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+
- Git

### 4.1 Clone Repository & Setup Virtual Environment

```bash
# Clone the repository
git clone https://github.com/your-username/sentivision.git
cd sentivision

# Create and activate Python 3.11 virtual environment
python3.11 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

---

## 5. Backend Setup

Start the FastAPI backend server:

```bash
# From the sentivision directory with .venv active:
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Backend API: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`

---

## 6. Frontend Setup

In a new terminal window:

```bash
cd sentivision/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

The Vite dev server automatically proxies API requests to `http://localhost:8000/api`.

---

## 7. Command-Line Interface (CLI) Usage

The `sentivision` CLI allows testing and evaluation independent of the web interface.

### 7.1 Single Text Sentiment Prediction

```bash
python cli/cli.py predict --text "The product quality is superb! Highly recommend."
```

**Output:**
```
╭──────────────────────────────────────────────────╮
│        SENTIVISION — SENTIMENT PREDICTION        │
╰──────────────────────────────────────────────────╯

Input: The product quality is superb! Highly recommend.

Predicted Sentiment: POSITIVE
Confidence: 96.8%

Class Probabilities:
  Negative     0.8%  
  Neutral      2.4%  
  Positive    96.8%  ███████████████████
```

### 7.2 Predict Sentiments from an Unlabelled CSV

```bash
python cli/cli.py predict --input sample_reviews.csv --text-column review --output predictions.csv
```

---

## 8. Public Dataset Downloading & Academic Evaluation

### 8.1 Download Hugging Face Public Datasets

The CLI includes an automated downloader for verified benchmark datasets:

```bash
# Download TweetEval sentiment test set (3-class: negative, neutral, positive)
python cli/cli.py download-dataset --source tweet_eval --split test
```

This downloads the benchmark split, maps the labels into `negative`, `neutral`, and `positive`, and writes:
- `data/datasets/tweet_eval_test.csv`
- `data/datasets/tweet_eval_test_metadata.json` (provenance, license, sample count)

### 8.2 Evaluate Model on a Labelled Dataset

```bash
python cli/cli.py evaluate \
  --input data/datasets/tweet_eval_test.csv \
  --text-column text \
  --label-column sentiment
```

### 8.3 Evaluate Custom Datasets with Label Mappings

If your dataset uses numeric or non-standard sentiment labels (e.g., `0`, `1`, `2` or `NEG`, `NEU`, `POS`):

```bash
python cli/cli.py evaluate \
  --input my_dataset.csv \
  --text-column review_text \
  --label-column rating \
  --label-map "0=negative,1=neutral,2=positive"
```

### 8.4 Evaluation Report Artifacts

Every evaluation automatically generates a timestamped report folder under `reports/evaluation_YYYYMMDD_HHMMSS/` containing:

1. `metrics.json` — Machine-readable summary (Accuracy, Macro F1, Weighted F1, Precision, Recall).
2. `classification_report.txt` — Scikit-learn per-class precision, recall, and support.
3. `confusion_matrix.png` — High-resolution heatmap of the confusion matrix.
4. `predictions.csv` — Full table containing actual labels, predicted labels, and confidence.
5. `misclassified_samples.csv` — Subset of error cases for qualitative failure analysis.
6. `evaluation_summary.txt` — Formatted summary report.

---

## 9. Model Information

- **Model ID**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Architecture**: RoBERTa-base (12-layer, 768-hidden, 12-heads, 125M parameters)
- **Pretrained Corpus**: ~124M tweets
- **Output Classes**: `negative`, `neutral`, `positive`
- **Dynamic Configuration**: The label mapping is dynamically loaded from the model's configuration:
  ```python
  self.id2label = {int(k): v.lower() for k, v in self.model.config.id2label.items()}
  ```
- **Inference Mode**: Fully deterministic zero-shot evaluation without gradient computation (`torch.inference_mode()`).

---

## 10. Evaluation Methodology

1. **No Artificial Labels**: Evaluation is strictly performed on genuine human-annotated datasets.
2. **Class Imbalance & Macro F1**: Multi-class sentiment evaluation relies primarily on **Macro F1** to treat all classes equally regardless of frequency.
3. **Domain Disclosures**: The model was fine-tuned on social media text; performance on domain-specific product reviews or technical logs may differ.

---

## 11. REST API Documentation

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, model status, and OCR status |
| `GET` | `/api/model/info` | Loaded model identifier, labels, and device |
| `POST` | `/api/analyze/text` | Plain text sentiment classification |
| `POST` | `/api/analyze/image` | Upload screenshot -> OCR -> segmentation -> sentiment |
| `POST` | `/api/analyze/batch` | Upload up to 20 screenshots for batch analysis |
| `POST` | `/api/evaluate` | Upload labelled CSV to compute evaluation metrics |
| `GET` | `/api/history` | Retrieve historical analysis records |
| `DELETE` | `/api/history/{id}` | Delete a specific analysis record |

---

## 12. Automated Test Suite

The test suite covers OCR preprocessing, segmentation, model inference, API routing, and evaluator calculations using mocked models to run fast and offline.

Run tests with `pytest`:

```bash
pytest tests/ -v
```

Expected test coverage:
- `test_sentiment.py`: Positive, negative, neutral, empty, long text, dynamic label mappings, batch inference.
- `test_ocr.py`: Valid images, corrupted bytes, size limits, contrast enhancement, proximity line grouping.
- `test_api.py`: FastAPI endpoints (`/api/health`, `/api/analyze/text`, `/api/model/info`, `/api/history`).
- `test_evaluator.py`: Accuracy, macro F1, confusion matrix, custom label normalization, empty dataset checks.

---

## 13. Troubleshooting

- **First-run download**: On the first execution, EasyOCR downloads language weights (~100MB) and Hugging Face downloads the RoBERTa model (~500MB). These are cached in `model_cache/` and `~/.EasyOCR/`.
- **Port already in use**: If port 8000 is occupied, launch Uvicorn with `--port 8001` and update the proxy in `frontend/vite.config.ts`.
- **CPU vs GPU**: If a CUDA-enabled GPU is detected, PyTorch automatically utilizes it. To force CPU inference, set `DEVICE=cpu` in `.env`.

---

## 14. License

This project is licensed under the MIT License.
