import { cn } from '@/utils'
import { sentimentColors } from '@/utils'

interface ConfidenceBarProps {
  value: number
  sentiment: 'positive' | 'negative' | 'neutral'
  label?: string
  showLabel?: boolean
}

export function ConfidenceBar({
  value,
  sentiment,
  label,
  showLabel = true,
}: ConfidenceBarProps) {
  const colors = sentimentColors[sentiment] || sentimentColors.neutral
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 capitalize">
            {label || sentiment}
          </span>
          <span className={cn('font-semibold', colors.text)}>{pct}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors.dot)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

