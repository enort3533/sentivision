import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Camera,
  Zap,
  AlertCircle,
  CheckCircle,
  Activity,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SentimentBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { getHistory, getHealth } from '@/services/api'
import type { HistoryRecord, HealthResponse } from '@/types'
import { formatDate } from '@/utils'

const COLORS = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral: '#F59E0B',
}

export function OverviewPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHistory(), getHealth()])
      .then(([h, hth]) => {
        setHistory(h)
        setHealth(hth)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalComments = history.reduce((s, r) => s + r.total_comments, 0)
  const totalPositive = history.reduce((s, r) => s + r.positive_count, 0)
  const totalNegative = history.reduce((s, r) => s + r.negative_count, 0)
  const totalNeutral = history.reduce((s, r) => s + r.neutral_count, 0)

  const kpis = [
    {
      label: 'Total Comments Analyzed',
      value: totalComments,
      icon: MessageSquare,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/30',
      description: `${history.length} screenshot session${history.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Positive Comments',
      value: totalPositive,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
      description: totalComments > 0 ? `${((totalPositive / totalComments) * 100).toFixed(1)}% of total` : '0%',
    },
    {
      label: 'Negative Comments',
      value: totalNegative,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/30',
      description: totalComments > 0 ? `${((totalNegative / totalComments) * 100).toFixed(1)}% of total` : '0%',
    },
    {
      label: 'Neutral Comments',
      value: totalNeutral,
      icon: Minus,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      description: totalComments > 0 ? `${((totalNeutral / totalComments) * 100).toFixed(1)}% of total` : '0%',
    },
  ]

  const pieData =
    totalComments > 0
      ? [
          { name: 'Positive', value: totalPositive, color: COLORS.positive },
          { name: 'Negative', value: totalNegative, color: COLORS.negative },
          { name: 'Neutral', value: totalNeutral, color: COLORS.neutral },
        ].filter(d => d.value > 0)
      : []

  // Recent 6 analyses for bar chart and trend
  const recentHistory = [...history].reverse().slice(-7)

  const barData = recentHistory.map((r, i) => ({
    name: r.filename.length > 12 ? `${r.filename.substring(0, 10)}...` : r.filename,
    Positive: r.positive_count,
    Negative: r.negative_count,
    Neutral: r.neutral_count,
  }))

  const trendData = recentHistory.map((r, i) => ({
    index: `#${i + 1}`,
    name: r.filename.substring(0, 10),
    Positive: r.positive_count,
    Negative: r.negative_count,
    Neutral: r.neutral_count,
  }))

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome to SENTIVISION
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze product reviews, customer feedback, and social media sentiment from screenshots using OCR and Cardiff NLP RoBERTa.
          </p>
        </div>
        <Button onClick={() => navigate('/analyze')} className="shrink-0 shadow-sm">
          <Camera className="w-4 h-4" /> New Analysis
        </Button>
      </motion.div>

      {/* Backend Status Banner */}
      {health && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium border ${
            health.status === 'ok'
              ? 'bg-green-50/80 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {health.status === 'ok' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span className="flex-1">
            {health.status === 'ok'
              ? `Backend Connected · Engine: EasyOCR (${health.ocr_loaded ? 'Loaded' : 'Ready'}) · Pretrained Model: Twitter-RoBERTa (${health.model_loaded ? 'Cached & Ready' : 'On-Demand'})`
              : 'Backend service offline. Start the FastAPI server on port 8000.'}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/60 dark:bg-slate-800">
            v{health.version}
          </span>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {kpi.value.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                {kpi.description}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {history.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="No analyses recorded yet"
            description="Upload screenshots of social media comments or product reviews to extract text and analyze sentiment. All dashboard analytics are generated from actual analysis records."
            action={
              <Button onClick={() => navigate('/analyze')}>
                <Camera className="w-4 h-4" /> Analyze Screenshot
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Visualizations Row 1: Donut & Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Donut Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                    Sentiment Distribution
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Proportion across all {totalComments.toLocaleString()} classified comments
                  </p>
                </div>
                <Activity className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: number) => [`${val} comments (${((val / totalComments) * 100).toFixed(1)}%)`, 'Count']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center items-center gap-6 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">({d.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Positive vs Negative vs Neutral Bar Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                    Comments by Screenshot
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sentiment class breakdown per uploaded file
                  </p>
                </div>
                <BarChart className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="Positive" fill={COLORS.positive} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Negative" fill={COLORS.negative} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Neutral" fill={COLORS.neutral} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations Row 2: Sentiment Trend Graph */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                    Sentiment Trend Across Sessions
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Activity and sentiment progression over recent uploads
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Positive" stroke={COLORS.positive} strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Negative" stroke={COLORS.negative} strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Neutral" stroke={COLORS.neutral} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                  Recent Analysis Activity
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest screenshot processing records
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-left bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Screenshot</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Positive</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Negative</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Neutral</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dominant</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.slice(0, 5).map(r => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                        {r.filename}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold">
                        {r.total_comments}
                      </td>
                      <td className="px-6 py-4 text-green-600 font-medium">
                        {r.positive_count}
                      </td>
                      <td className="px-6 py-4 text-red-600 font-medium">
                        {r.negative_count}
                      </td>
                      <td className="px-6 py-4 text-amber-600 font-medium">
                        {r.neutral_count}
                      </td>
                      <td className="px-6 py-4">
                        <SentimentBadge
                          sentiment={r.dominant_sentiment as 'positive' | 'negative' | 'neutral'}
                        />
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
