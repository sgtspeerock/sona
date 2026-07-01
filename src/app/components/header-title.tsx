import { Loader2 } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'

interface HeaderTitleProps {
  title: string
  count?: number
  loading?: boolean
  subtitle?: string
}

export function HeaderTitle({
  title,
  count,
  loading = false,
  subtitle,
}: HeaderTitleProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h1 className="truncate text-2xl font-bold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {!loading && count !== undefined && count > 0 && (
          <Badge
            variant="secondary"
            className="rounded-[var(--radius-control)] border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
          >
            {count.toLocaleString()}
          </Badge>
        )}
        {loading && (
          <Badge variant="secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Badge>
        )}
      </div>
      {subtitle && (
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  )
}
