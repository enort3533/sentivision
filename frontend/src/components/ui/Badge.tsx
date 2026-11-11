import { cn, sentimentColors } from '@/utils'

interface BadgeProps {
  sentiment: 'positive' | 'negative' | 'neutral'
  className?: string
}

export function SentimentBadge({ sentiment, className }: BadgeProps) {
  const colors = sentimentColors[sentiment] || sentimentColors.neutral
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
        colors.badge,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} />
      {sentiment}
    </span>
  )
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
        className
      )}
    >
      {children}
    </span>
  )
}

