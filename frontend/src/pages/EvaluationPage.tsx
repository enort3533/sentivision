import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FlaskConical,
  AlertCircle,
  Download,
  Info,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { evaluateDataset } from '@/services/api'
import type { EvaluationResponse } from '@/types'
import { cn } from '@/utils'

function MetricCard({
  label,
  value,
  description,
  highlight = false,
}: {
  label: string
  value: number
  description?: string
  highlight?: boolean
}) {
  const pct = (value * 100).toFixed(2)
  const color =
    value >= 0.8
      ? 'text-green-600 dark:text-green-400'
      : value >= 0.6
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl p-5 border transition-all',
        highlight
          ? 'border-violet-500/60 dark:border-violet-500/40 ring-2 ring-violet-500/10'
          : 'border-slate-200/80 dark:border-slate-700/80'
      )}
    >
      <div className={cn('text-3xl font-extrabold tracking-tight', color)}>{pct}%</div>
      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
        {label}
      </div>
      {description && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</div>
      )}
    </div>
  )
}

function ConfusionMatrix({
  matrix,
  labels,
}: {
  matrix: number[][]
  labels: string[]
}) {
  const max = Math.max(...matrix.flat(), 1)

  return (
    <div className="overflow-x-auto">
      <table className="text-xs sm:text-sm border-collapse w-full max-w-lg mx-auto">
        <thead>
          <tr>
            <th className="p-3 text-slate-400 text-xs font-semibold text-left border-b border-slate-100 dark:border-slate-700">
              Actual \ Predicted
            </th>
            {labels.map(l => (
              <th
                key={l}
                className="p-3 text-xs font-bold text-slate-700 dark:text-slate-300 capitalize text-center border-b border-slate-100 dark:border-slate-700"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-3 text-xs font-bold text-slate-700 dark:text-slate-300 capitalize border-b border-slate-100 dark:border-slate-750">
                {labels[i]}
              </td>
              {row.map((cell, j) => {
                const isCorrect = i === j
                const intensity = Math.min(cell / max, 1)

                return (
                  <td
                    key={j}
                    className={cn(
                      'p-3.5 text-center font-bold rounded border border-slate-100 dark:border-slate-800/60 text-sm transition-colors',
                      isCorrect
                        ? 'text-green-700 dark:text-green-300 bg-green-50/80 dark:bg-green-950/30'
                        : cell > 0
                        ? 'text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-950/20'
                        : 'text-slate-400 dark:text-slate-600'
                    )}
                    style={{
                      opacity: cell === 0 ? 0.6 : 0.7 + intensity * 0.3,
                    }}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EvaluationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [textCol, setTextCol] = useState('text')
  const [labelCol, setLabelCol] = useState('sentiment')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<EvaluationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: ([f]) => {
      if (f) {
        setFile(f)
        setResult(null)
        setError(null)
      }
    },
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    noClick: !!file,
  })

  const handleEvaluate = async () => {
    if (!file) return
    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const res = await evaluateDataset(file, textCol, labelCol)
      setResult(res)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      setError(
        err?.response?.data?.detail || err?.message || 'Evaluation failed. Verify CSV column headers.'
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleExportReport = () => {
    if (!result) return
    const text = `==========================================\nSENTIVISION MODEL EVALUATION REPORT\n==========================================\nTotal Samples:      ${result.dataset_size}\nValid Samples:      ${result.valid_samples}\nSkipped Samples:    ${result.skipped_samples}\n------------------------------------------\nAccuracy:           ${(result.accuracy * 100).toFixed(2)}%\nMacro Precision:    ${(result.precision * 100).toFixed(2)}%\nMacro Recall:       ${(result.recall * 100).toFixed(2)}%\nMacro F1-Score:     ${(result.macro_f1 * 100).toFixed(2)}%\nWeighted F1-Score:  ${(result.weighted_f1 * 100).toFixed(2)}%\n------------------------------------------\nClassification Report:\n${result.classification_report}\n==========================================\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_report_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Model Evaluation Lab
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Benchmark the pretrained Cardiff NLP RoBERTa model against external labelled datasets to compute scientific performance metrics.
        </p>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-300 text-xs sm:text-sm">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">Ground-Truth Benchmark Methodology:</p>
          <p className="leading-relaxed">
            Evaluation requires a dataset containing real human-verified ground-truth labels. The model is run in zero-training inference mode. Labels must resolve to <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded font-mono text-xs">positive</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded font-mono text-xs">negative</code>, or <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded font-mono text-xs">neutral</code>.
          </p>
        </div>
      </div>

      {/* Dataset Upload Card */}
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Select Labelled CSV Dataset
            </label>
            <div
              {...getRootProps()}
              className={cn(
                'p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center',
                isDragActive
                  ? 'border-violet-500 bg-violet-50/50'
                  : file
                  ? 'border-green-400 bg-green-50/40 dark:bg-green-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-violet-400'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-green-700 dark:text-green-400">
                  <FileSpreadsheet className="w-6 h-6 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB · Click to change file
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Drop your CSV file here, or{' '}
                    <button
                      type="button"
                      onClick={open}
                      className="text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-slate-400">
                    CSV must include a text column and a ground-truth sentiment column
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Text Column Name
              </label>
              <input
                value={textCol}
                onChange={e => setTextCol(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="text (e.g., review, comment, sentence)"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Sentiment Label Column Name
              </label>
              <input
                value={labelCol}
                onChange={e => setLabelCol(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="sentiment (e.g., label, sentiment, target)"
              />
            </div>
          </div>

          <Button
            onClick={handleEvaluate}
            loading={processing}
            disabled={!file || processing}
            className="w-full"
            size="lg"
          >
            <FlaskConical className="w-4 h-4" />
            {processing ? 'Running Model Evaluation...' : 'Execute Model Evaluation'}
          </Button>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Evaluation Results */}
      {result && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Evaluation Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Processed {result.valid_samples.toLocaleString()} samples (
                  {result.skipped_samples} skipped or unmapped)
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleExportReport}>
                <Download className="w-3.5 h-3.5" /> Export Report (TXT)
              </Button>
            </div>

            {/* 5 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="Accuracy" value={result.accuracy} description="Overall Correct" />
              <MetricCard label="Macro Precision" value={result.precision} description="Unweighted Avg" />
              <MetricCard label="Macro Recall" value={result.recall} description="Unweighted Avg" />
              <MetricCard
                label="Macro F1-Score"
                value={result.macro_f1}
                description="Primary Metric"
                highlight
              />
              <MetricCard label="Weighted F1" value={result.weighted_f1} description="Sample Weighted" />
            </div>

            {/* Confusion Matrix */}
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Confusion Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual comparison between ground-truth labels and model predictions
                </p>
              </CardHeader>
              <CardContent>
                <ConfusionMatrix matrix={result.confusion_matrix} labels={result.labels} />
              </CardContent>
            </Card>

            {/* Scikit-Learn Classification Report */}
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Detailed Classification Report
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Per-class precision, recall, and support calculated via scikit-learn
                </p>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto leading-relaxed">
                  {result.classification_report}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
