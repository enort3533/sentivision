import axios from 'axios'
import type {
  SentimentResult,
  ImageAnalysisResponse,
  BatchAnalysisResponse,
  EvaluationResponse,
  HistoryRecord,
  HealthResponse,
  ModelInfo,
} from '@/types'

const api = axios.create({ baseURL: '/api', timeout: 180000 })

export const analyzeText = async (text: string): Promise<SentimentResult> => {
  const { data } = await api.post<SentimentResult>('/analyze/text', { text })
  return data
}

export const analyzeImage = async (
  file: File,
  onUploadProgress?: (pct: number) => void
): Promise<ImageAnalysisResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<ImageAnalysisResponse>('/analyze/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onUploadProgress && e.total) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return data
}

export const analyzeBatch = async (files: File[]): Promise<BatchAnalysisResponse> => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const { data } = await api.post<BatchAnalysisResponse>('/analyze/batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const evaluateDataset = async (
  file: File,
  textCol: string,
  labelCol: string
): Promise<EvaluationResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<EvaluationResponse>(
    `/evaluate?text_column=${encodeURIComponent(textCol)}&label_column=${encodeURIComponent(labelCol)}`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return data
}

export const getHistory = async (): Promise<HistoryRecord[]> => {
  const { data } = await api.get<HistoryRecord[]>('/history')
  return data
}

export const deleteHistory = async (id: string): Promise<void> => {
  await api.delete(`/history/${id}`)
}

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export const getModelInfo = async (): Promise<ModelInfo> => {
  const { data } = await api.get<ModelInfo>('/model/info')
  return data
}
