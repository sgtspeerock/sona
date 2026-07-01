import { Table } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { LibraryPagination } from '@/app/components/ui/library-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()

  return (
    <div className="mt-4 grid gap-3 rounded-[var(--radius-surface)] border border-border/35 bg-card/70 px-4 py-3 lg:grid-cols-[auto_1fr] lg:items-center">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t('table.pagination.rowsPerPage')}
        </p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger className="h-9 w-[78px] rounded-[var(--radius-control)] border-border/40 bg-background-foreground/75">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <LibraryPagination
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onFirstPage={() => table.setPageIndex(0)}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        onLastPage={() => table.setPageIndex(table.getPageCount() - 1)}
        className="mt-0 border-0 bg-transparent p-0"
      />
    </div>
  )
}
