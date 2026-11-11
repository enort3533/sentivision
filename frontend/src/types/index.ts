export interface SentimentProbabilities {
  negative: number
  neutral: number
  positive: number
}

export interface SentimentResult {
  text: string
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  probabilities: SentimentProbabilities
  error?: string
}

export interface CommentAnalysis {
  block_id: number
  extracted_text: string
  sentiment_result: SentimentResult
  ocr_confidence: number
  lines: string[]
}

export interface AnalysisSummary {
  total_comments: number
  positive_count: number
  negative_count: number
  neutral_count: number
  positive_pct: number
  negative_pct: number
  neutral_pct: number
  dominant_sentiment: 'positive' | 'negative' | 'neutral'
}

export interface ImageAnalysisResponse {
  analysis_id: string
  filename: string
  total_comments: number
  comments: CommentAnalysis[]
  summary: AnalysisSummary
}

export interface BatchImageResult {
  filename: string
  success: boolean
  error?: string
  result?: ImageAnalysisResponse
}

export interface BatchAnalysisResponse {
  total_images: number
  successful: number
  failed: number
  results: BatchImageResult[]
  combined_summary: AnalysisSummary
}

export interface EvaluationResponse {
  dataset_size: number
  valid_samples: number
  skipped_samples: number
  accuracy: number
  precision: number
  recall: number
  macro_f1: number
  weighted_f1: number
  confusion_matrix: number[][]
  classification_report: string
  labels: string[]
}

export interface HistoryRecord {
  id: string
  filename: string
  created_at: string
  total_comments: number
  positive_count: number
  negative_count: number
  neutral_count: number
  dominant_sentiment: string
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
  ocr_loaded: boolean
  version: string
}

export interface ModelInfo {
  model_id: string
  labels: Record<string, string>
  device: string
  loaded: boolean
}
