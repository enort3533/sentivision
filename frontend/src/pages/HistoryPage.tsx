import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Eye,
  X,
  Calendar,
  MessageSquare,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SentimentBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { getHistory, deleteHistory } from '@/services/api'
import type { HistoryRecord } from '@/types'
import { formatDate } from '@/utils'

export function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory()
      setRecords(data)
    } catch {
      setError('Unable to load history records from the backend database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete the record for "${filename}"?`)) {
      return
    }
    setDeletingId(id)
    try {
      await deleteHistory(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Failed to delete history record.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Analysis History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and manage all previous sentiment analyses stored locally in SQLite.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchHistory} loading={loading} size="sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={History}
            title="No analysis history"
            description="Completed screenshot analyses will automatically persist here. Start by uploading a screenshot on the Analyze page."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-left">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Screenshot
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Comments
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Positive
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Negative
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Neutral
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Dominant
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate max-w-[220px]">
                      {r.filename}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold">
                      {r.total_comments}
                    </td>
                    <td className="px-6 py-4 text-green-600 font-semibold">
                      {r.positive_count}
                    </td>
                    <td className="px-6 py-4 text-red-600 font-semibold">
                      {r.negative_count}
                    </td>
                    <td className="px-6 py-4 text-amber-600 font-semibold">
                      {r.neutral_count}
                    </td>
                    <td className="px-6 py-4">
                      <SentimentBadge
                        sentiment={
                          r.dominant_sentiment as 'positive' | 'negative' | 'neutral'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id, r.filename)}
                        disabled={deletingId === r.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all disabled:opacity-40"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
