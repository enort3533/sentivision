import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Layers,
  FileImage,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SentimentBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { analyzeBatch } from '@/services/api'
import type { BatchAnalysisResponse } from '@/types'
import { downloadCsv, cn } from '@/utils'

export function BatchPage() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<BatchAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      const newFiles = accepted.filter(f => !existingNames.has(f.name))
      return [...prev, ...newFiles].slice(0, 20)
    })
    setResult(null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    multiple: true,
    noClick: files.length > 0,
  })

  const removeFile = (name: string) => {
    setFiles(f => f.filter(x => x.name !== name))
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!files.length) return
    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const res = await analyzeBatch(files)
      setResult(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      setError(err?.response?.data?.detail || err?.message || 'Batch analysis encountered an error.')
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    if (!result) return
    const rows = result.results.map(r => {
      if (!r.success || !r.result) {
        return {
          filename: r.filename,
          status: 'FAILED',
          error: r.error || 'Failed',
          total_comments: 0,
          positive_count: 0,
          negative_count: 0,
          neutral_count: 0,
          dominant_sentiment: 'none',
        }
      }
      const s = r.result.summary
      return {
        filename: r.filename,
        status: 'SUCCESS',
        error: '',
        total_comments: s.total_comments,
        positive_count: s.positive_count,
        negative_count: s.negative_count,
        neutral_count: s.neutral_count,
        dominant_sentiment: s.dominant_sentiment,
      }
    })
    downloadCsv(rows, 'batch_sentiment_summary.csv')
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Batch Analysis
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload up to 20 screenshots simultaneously. Each screenshot will be processed sequentially to ensure optimal memory usage.
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            'p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center',
            isDragActive
              ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/40 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isDragActive ? 'Drop screenshots here' : 'Drop screenshots to add to queue'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or{' '}
                <button
                  type="button"
                  onClick={open}
                  className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                >
                  browse files
                </button>{' '}
                (PNG, JPG, JPEG · max 20 images)
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded File Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                Selected Files ({files.length}/20)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
                disabled={processing}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </Button>
              <Button
                onClick={handleAnalyze}
                loading={processing}
                disabled={processing || !files.length}
                size="sm"
              >
                <Layers className="w-4 h-4" />{' '}
                {processing ? 'Processing Batch...' : `Analyze ${files.length} Images`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {files.map(f => {
                const fileResult = result?.results.find(r => r.filename === f.name)
                return (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs"
                  >
                    {processing && !result ? (
                      <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
                    ) : fileResult ? (
                      fileResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )
                    ) : (
                      <FileImage className="w-4 h-4 text-slate-400 shrink-0" />
                    )}

                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                      {f.name}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>

                    {fileResult?.success && fileResult.result && (
                      <SentimentBadge
                        sentiment={
                          fileResult.result.summary.dominant_sentiment as
                            | 'positive'
                            | 'negative'
                            | 'neutral'
                        }
                      />
                    )}

                    {!processing && (
                      <button
                        onClick={() => removeFile(f.name)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batch Results Consolidated Summary */}
      {result && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Consolidated Batch Results
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Analyzed {result.total_images} screenshot{result.total_images !== 1 ? 's' : ''} with{' '}
                    {result.successful} succeeded, {result.failed} failed
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5" /> Download Combined CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {result.total_images}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Total Screenshots
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.successful}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Processed Successfully
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {result.combined_summary.total_comments}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Total Comments Found
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <div className="text-2xl font-bold capitalize text-violet-600 dark:text-violet-400">
                      {result.combined_summary.dominant_sentiment}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Dominant Sentiment
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Screenshot
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Comments
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Positive
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Negative
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Neutral
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Dominant
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {result.results.map(r => (
                        <tr
                          key={r.filename}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                            {r.filename}
                          </td>
                          <td className="px-4 py-3">
                            {r.success ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500"
                                title={r.error}
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {r.result?.total_comments ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-green-600 font-medium">
                            {r.result?.summary.positive_count ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-red-600 font-medium">
                            {r.result?.summary.negative_count ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-amber-600 font-medium">
                            {r.result?.summary.neutral_count ?? '-'}
                          </td>
                          <td className="px-4 py-3">
                            {r.result ? (
                              <SentimentBadge
                                sentiment={
                                  r.result.summary.dominant_sentiment as
                                    | 'positive'
                                    | 'negative'
                                    | 'neutral'
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {files.length === 0 && (
        <Card>
          <EmptyState
            icon={Layers}
            title="Batch queue is empty"
            description="Upload multiple screenshots to process them in sequence and generate aggregated cross-screenshot analytics."
          />
        </Card>
      )}
    </div>
  )
}

