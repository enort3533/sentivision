import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Edit3,
  RefreshCw,
  Image as ImageIcon,
  Check,
  FileText,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SentimentBadge } from '@/components/ui/Badge'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { analyzeImage, analyzeText } from '@/services/api'
import type { ImageAnalysisResponse, CommentAnalysis } from '@/types'
import { sentimentColors, downloadCsv, downloadJson, cn } from '@/utils'

const STAGES = [
  'Uploading image',
  'Preprocessing (contrast & denoising)',
  'Extracting text (EasyOCR)',
  'Analyzing sentiment (Cardiff NLP RoBERTa)',
  'Generating results',
]

const COLORS = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral: '#F59E0B',
}

function ProcessingStages({ stage }: { stage: number }) {
  return (
    <div className="space-y-3.5 max-w-md mx-auto py-2">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-300',
              i < stage
                ? 'bg-green-500 text-white shadow-xs'
                : i === stage
                ? 'bg-violet-600 text-white shadow-sm ring-4 ring-violet-100 dark:ring-violet-950/50'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            )}
          >
            {i < stage ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : i === stage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span
            className={cn(
              'text-sm transition-colors',
              i === stage
                ? 'text-slate-900 dark:text-white font-semibold'
                : i < stage
                ? 'text-green-600 dark:text-green-400 font-medium'
                : 'text-slate-400'
            )}
          >
            {s}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [stage, setStage] = useState(0)
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({})
  const [reanalyzing, setReanalyzing] = useState<Record<number, boolean>>({})
  const [reanalyzedResults, setReanalyzedResults] = useState<Record<number, CommentAnalysis>>({})

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setPreview(URL.createObjectURL(accepted[0]))
      setResult(null)
      setError(null)
      setEditedTexts({})
      setReanalyzedResults({})
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    noClick: !!file,
  })

  const handleAnalyze = async () => {
    if (!file) return
    setProcessing(true)
    setError(null)
    setResult(null)
    setStage(0)

    try {
      setStage(0)
      await new Promise(r => setTimeout(r, 200))
      setStage(1)
      await new Promise(r => setTimeout(r, 300))
      setStage(2)

      const res = await analyzeImage(file)

      setStage(3)
      await new Promise(r => setTimeout(r, 200))
      setStage(4)
      await new Promise(r => setTimeout(r, 200))

      setResult(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      setError(err?.response?.data?.detail || err?.message || 'Analysis failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReanalyze = async (blockId: number) => {
    const text =
      editedTexts[blockId] !== undefined
        ? editedTexts[blockId]
        : result?.comments.find(c => c.block_id === blockId)?.extracted_text || ''

    if (!text.trim()) return

    setReanalyzing(r => ({ ...r, [blockId]: true }))
    try {
      const sr = await analyzeText(text)
      const original = result!.comments.find(c => c.block_id === blockId)!
      setReanalyzedResults(r => ({
        ...r,
        [blockId]: {
          ...original,
          extracted_text: text,
          sentiment_result: sr,
        },
      }))
    } catch {
      // Keep previous
    } finally {
      setReanalyzing(r => ({ ...r, [blockId]: false }))
    }
  }

  const getComment = (c: CommentAnalysis): CommentAnalysis => reanalyzedResults[c.block_id] || c

  const handleExportCsv = () => {
    if (!result) return
    const rows = result.comments.map(c => {
      const com = getComment(c)
      return {
        block_id: com.block_id + 1,
        text: com.extracted_text,
        sentiment: com.sentiment_result.sentiment,
        confidence: com.sentiment_result.confidence,
        ocr_confidence: com.ocr_confidence,
        negative_prob: com.sentiment_result.probabilities.negative,
        neutral_prob: com.sentiment_result.probabilities.neutral,
        positive_prob: com.sentiment_result.probabilities.positive,
      }
    })
    downloadCsv(rows, `${result.filename}_sentiment_analysis.csv`)
  }

  const handleExportJson = () => {
    if (!result) return
    const exportData = {
      ...result,
      comments: result.comments.map(c => getComment(c)),
    }
    downloadJson(exportData, `${result.filename}_sentiment_analysis.json`)
  }

  const removeFile = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setEditedTexts({})
    setReanalyzedResults({})
  }

  const pieData = result
    ? [
        { name: 'Positive', value: result.summary.positive_count, color: COLORS.positive },
        { name: 'Negative', value: result.summary.negative_count, color: COLORS.negative },
        { name: 'Neutral', value: result.summary.neutral_count, color: COLORS.neutral },
      ].filter(d => d.value > 0)
    : []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Analyze Screenshot
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload a screenshot containing customer reviews, product feedback, or social media comments.
        </p>
      </div>

      {/* Upload & Preview Zone */}
      {!file ? (
        <Card>
          <div
            {...getRootProps()}
            className={cn(
              'p-16 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center',
              isDragActive
                ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center ring-8 ring-violet-50/50 dark:ring-violet-900/10">
                <Upload className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {isDragActive ? 'Drop the screenshot here' : 'Drag & drop your screenshot'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  or{' '}
                  <button
                    type="button"
                    onClick={open}
                    className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                  >
                    browse files
                  </button>{' '}
                  from your computer
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
                  <span>PNG, JPG, JPEG</span>
                  <span>•</span>
                  <span>Max 10 MB</span>
                  <span>•</span>
                  <span>Multiple comments supported</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative group shrink-0 w-full sm:w-56 h-36 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={preview!}
                alt="Screenshot Preview"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {file.name}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB · {file.type || 'image'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleAnalyze}
                  loading={processing}
                  disabled={processing}
                  size="md"
                >
                  {!processing && <ImageIcon className="w-4 h-4" />}
                  {processing ? 'Processing Pipeline...' : 'Run Sentiment Analysis'}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={removeFile}
                  disabled={processing}
                >
                  <X className="w-4 h-4" /> Remove Image
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Processing Animation */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6 border-violet-200 dark:border-violet-900">
              <div className="text-center mb-5">
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  Analyzing Screenshot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Running multi-step OCR and transformer classification pipeline
                </p>
              </div>
              <ProcessingStages stage={stage} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Overall Analysis Summary Card */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-slate-900 dark:text-white text-lg">
                      Analysis Summary
                    </h2>
                    <SentimentBadge
                      sentiment={result.summary.dominant_sentiment as 'positive' | 'negative' | 'neutral'}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Found {result.total_comments} distinct comment block{result.total_comments !== 1 ? 's' : ''} in{' '}
                    <span className="font-medium text-slate-600 dark:text-slate-300">{result.filename}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExportJson}>
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {result.total_comments === 0 ? (
                  <EmptyState
                    icon={ImageIcon}
                    title="No readable comments detected"
                    description="The OCR model was unable to detect distinct text blocks in this image. Try uploading a higher-resolution screenshot with higher contrast."
                  />
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Donut chart */}
                    <div className="w-44 h-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`pie-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              borderRadius: '8px',
                              border: 'none',
                              color: '#fff',
                              fontSize: '11px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown cards */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['positive', 'negative', 'neutral'] as const).map(s => {
                        const count = result.summary[`${s}_count` as keyof typeof result.summary] as number
                        const pct = result.summary[`${s}_pct` as keyof typeof result.summary] as number
                        const col = sentimentColors[s]
                        return (
                          <div
                            key={s}
                            className={cn(
                              'p-4 rounded-xl border transition-all',
                              col.bg,
                              col.border
                            )}
                          >
                            <div className={cn('text-2xl font-bold', col.text)}>{count}</div>
                            <div className={cn('text-xs font-semibold uppercase tracking-wider capitalize', col.text)}>
                              {s}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {pct}% of comments
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Individual Comment Cards */}
            {result.comments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Detected Comments ({result.comments.length})
                  </h2>
                  <span className="text-xs text-slate-400">
                    Click comment text to edit and re-evaluate
                  </span>
                </div>

                {result.comments.map(c => {
                  const comment = getComment(c)
                  const sr = comment.sentiment_result
                  const col = sentimentColors[sr.sentiment]
                  const isEdited =
                    editedTexts[c.block_id] !== undefined &&
                    editedTexts[c.block_id] !== c.extracted_text

                  return (
                    <motion.div
                      key={c.block_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: c.block_id * 0.04 }}
                    >
                      <Card className={cn('border-l-4 overflow-hidden', col.border)}>
                        <CardContent className="space-y-4 p-5">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                  Comment #{c.block_id + 1}
                                </span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-xs text-slate-400">
                                  OCR Confidence: {(c.ocr_confidence * 100).toFixed(0)}%
                                </span>
                                {isEdited && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                                    <Edit3 className="w-3 h-3" /> Edited
                                  </span>
                                )}
                              </div>

                              <textarea
                                value={
                                  editedTexts[c.block_id] !== undefined
                                    ? editedTexts[c.block_id]
                                    : comment.extracted_text
                                }
                                onChange={e =>
                                  setEditedTexts(prev => ({
                                    ...prev,
                                    [c.block_id]: e.target.value,
                                  }))
                                }
                                className="w-full text-sm text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-normal leading-relaxed"
                                rows={2}
                                placeholder="Edit OCR text..."
                              />
                            </div>

                            {/* Classification summary on the right */}
                            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                              <SentimentBadge sentiment={sr.sentiment} />
                              <div className="text-right">
                                <span className={cn('text-xl font-extrabold', col.text)}>
                                  {(sr.confidence * 100).toFixed(1)}%
                                </span>
                                <span className="block text-[10px] text-slate-400 font-medium">
                                  Confidence
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Class Probabilities Bar */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                            {(['positive', 'negative', 'neutral'] as const).map(s => (
                              <ConfidenceBar
                                key={s}
                                value={sr.probabilities[s]}
                                sentiment={s}
                                label={s}
                              />
                            ))}
                          </div>

                          {/* Re-analyze action button when edited */}
                          {(isEdited || reanalyzedResults[c.block_id]) && (
                            <div className="flex justify-end pt-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={reanalyzing[c.block_id]}
                                onClick={() => handleReanalyze(c.block_id)}
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Re-classify Text
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

