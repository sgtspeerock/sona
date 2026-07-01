import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'

interface LibraryPaginationProps {
  pageIndex: number
  pageCount: number
  itemCount?: number
  pageSize?: number
  visibleCount?: number
  canPreviousPage?: boolean
  canNextPage?: boolean
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  className?: string
}

export function LibraryPagination({
  pageIndex,
  pageCount,
  itemCount,
  pageSize,
  visibleCount,
  canPreviousPage = pageIndex > 0,
  canNextPage = pageIndex < pageCount - 1,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  className = '',
}: LibraryPaginationProps) {
  const { t } = useTranslation()
  const normalizedPageCount = Math.max(1, pageCount)
  const from =
    itemCount !== undefined && pageSize !== undefined && visibleCount
      ? pageIndex * pageSize + 1
      : null
  const to =
    from !== null && itemCount !== undefined && visibleCount
      ? Math.min(itemCount, from + visibleCount - 1)
      : null

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-surface)] border border-border/35 bg-card/70 px-4 py-3 ${className}`}
    >
      <div className="text-sm text-muted-foreground">
        {from !== null && to !== null && itemCount !== undefined ? (
          <span>
            {from}-{to} / {itemCount}
          </span>
        ) : (
          <span>
            {t('table.pagination.currentPage', {
              currentPage: pageIndex + 1,
              totalPages: normalizedPageCount,
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="hidden h-9 w-9 rounded-[var(--radius-control)] border-border/40 bg-background-foreground/75 lg:inline-flex"
          onClick={onFirstPage}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">
            {t('table.pagination.screenReader.firstPage')}
          </span>
          <ChevronsLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-[var(--radius-control)] border-border/40 bg-background-foreground/75"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">
            {t('table.pagination.screenReader.previousPage')}
          </span>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <span className="min-w-24 text-center text-sm font-semibold text-foreground">
          {pageIndex + 1} / {normalizedPageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-[var(--radius-control)] border-border/40 bg-background-foreground/75"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          <span className="sr-only">
            {t('table.pagination.screenReader.nextPage')}
          </span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hidden h-9 w-9 rounded-[var(--radius-control)] border-border/40 bg-background-foreground/75 lg:inline-flex"
          onClick={onLastPage}
          disabled={!canNextPage}
        >
          <span className="sr-only">
            {t('table.pagination.screenReader.lastPage')}
          </span>
          <ChevronsRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
