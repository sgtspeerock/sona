import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  RowData,
  SortingFn,
  SortingState,
  Table,
  useReactTable,
} from '@tanstack/react-table'
import clsx from 'clsx'
import { Disc2Icon, XIcon } from 'lucide-react'
import {
  Fragment,
  MouseEvent,
  memo,
  TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { isMacOs } from 'react-device-detect'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'

import { PlaylistOptions } from '@/app/components/playlist/options'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { SelectedSongsMenuOptions } from '@/app/components/song/selected-options'
import { Button } from '@/app/components/ui/button'
import { DataTablePagination } from '@/app/components/ui/data-table-pagination'
import { Input } from '@/app/components/ui/input'
import { ColumnFilter } from '@/types/columnFilter'
import { ColumnDefType } from '@/types/react-table/columnDef'
import { Playlist } from '@/types/responses/playlist'
import { ISong } from '@/types/responses/song'
import { MouseButton } from '@/utils/browser'
import { computeMultiSelectedRows } from '@/utils/dataTable'
import { TableRow } from './data-table-row'

const MemoTableRow = memo(TableRow) as typeof TableRow

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    handlePlaySong: ((row: Row<TData>) => void) | undefined
  }
  interface SortingFns {
    customSortFn: SortingFn<unknown>
  }
}

type DiscNumber = {
  discNumber: number
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDefType<TData, TValue>[]
  data: TData[]
  handlePlaySong?: (row: Row<TData>) => void
  columnFilter?: ColumnFilter[]
  showPagination?: boolean
  paginationPageSizeOptions?: number[]
  initialPageSize?: number
  showSearch?: boolean
  searchColumn?: string
  noRowsMessage?: string
  allowRowSelection?: boolean
  showContextMenu?: boolean
  showHeader?: boolean
  showDiscNumber?: boolean
  variant?: 'classic' | 'modern'
  dataType?: 'song' | 'artist' | 'playlist' | 'radio'
  onReorder?: (fromIndex: number, toIndex: number) => void
  enableSorting?: boolean
  highlightRowId?: string
}

let isTap = false
let tapTimeout: NodeJS.Timeout

export function DataTable<TData, TValue>({
  columns,
  data,
  handlePlaySong,
  columnFilter,
  showPagination = false,
  paginationPageSizeOptions,
  initialPageSize,
  showSearch = false,
  searchColumn,
  noRowsMessage,
  allowRowSelection = true,
  showContextMenu = true,
  showHeader = true,
  showDiscNumber = false,
  variant = 'classic',
  dataType = 'song',
  onReorder,
  enableSorting,
  highlightRowId,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()
  const resolvedNoRowsMessage = noRowsMessage ?? t('states.empty.noResults')
  const newColumns = columns.filter((column) => {
    return columnFilter?.includes(column.id as ColumnFilter)
  })

  const [columnSearch, setColumnSearch] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [lastRowSelected, setLastRowSelected] = useState<number | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const lastAppliedHighlightRef = useRef<string | null>(null)

  const isClassic = variant === 'classic'
  const isModern = variant === 'modern'
  const isSortable = !!onReorder
  const isSortingEnabled = enableSorting ?? !isSortable

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const selectedRows = useMemo(
    () => Object.keys(rowSelection).map(Number),
    [rowSelection],
  )
  const isRowSelected = useCallback(
    (rowIndex: number) => selectedRows.includes(rowIndex),
    [selectedRows],
  )
  const isPrevRowSelected = useCallback(
    (rowIndex: number) => isRowSelected(rowIndex - 1),
    [isRowSelected],
  )
  const isNextRowSelected = useCallback(
    (rowIndex: number) => isRowSelected(rowIndex + 1),
    [isRowSelected],
  )

  const table = useReactTable({
    data,
    columns: columnFilter ? newColumns : columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    onColumnFiltersChange: setColumnSearch,
    getFilteredRowModel: showSearch ? getFilteredRowModel() : undefined,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    enableSorting: isSortingEnabled,
    sortingFns: {
      customSortFn: (rowA, rowB, columnId) => {
        return rowA.original[columnId].localeCompare(rowB.original[columnId])
      },
    },
    meta: {
      handlePlaySong,
    },
    state: {
      columnFilters: columnSearch,
      sorting,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize ?? paginationPageSizeOptions?.[0] ?? 10,
      },
    },
  })

  const { rows } = table.getRowModel()

  // Drag reorder is only active when no column sort is applied
  const isDragReorderActive = isSortable && sorting.length === 0

  // Sortable IDs are index strings so they stay stable relative to the rendered order
  const sortableIds = useMemo(() => rows.map((_, i) => i.toString()), [rows])

  const selectAllShortcut = useCallback(
    (state = true) => {
      if (allowRowSelection) {
        table.toggleAllRowsSelected(state)
      }
    },
    [allowRowSelection, table],
  )

  useHotkeys('mod+a', () => selectAllShortcut(), {
    preventDefault: true,
    enabled: !table.getIsAllRowsSelected(),
  })

  useHotkeys('esc', () => selectAllShortcut(false), {
    preventDefault: true,
    enabled: table.getIsAllRowsSelected() || table.getIsSomeRowsSelected(),
  })

  const inputValue =
    searchColumn !== undefined
      ? (table.getColumn(searchColumn || '')?.getFilterValue() as string)
      : undefined

  const getDiscIndexes = useCallback(() => {
    const uniqueIndices: number[] = []
    const seen = new Set<number>()

    if (!showDiscNumber) {
      return {
        uniqueIndices,
        seen,
      }
    }

    rows.forEach(({ original }, index) => {
      const item = original as DiscNumber
      if (!('discNumber' in item)) return

      if (!seen.has(item.discNumber)) {
        seen.add(item.discNumber)
        uniqueIndices.push(index)
      }
    })

    return {
      uniqueIndices,
      seen,
    }
  }, [rows, showDiscNumber])

  const discIndexes = getDiscIndexes()
  const isSingleDisk = discIndexes.seen.size <= 1
  const discNumberIndexes = discIndexes.uniqueIndices

  const getContextMenuOptions = useCallback(
    (row: Row<TData>) => {
      if (!showContextMenu) return undefined

      if (dataType === 'song') {
        if (table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()) {
          return (
            <SelectedSongsMenuOptions
              table={table as unknown as Table<ISong>}
            />
          )
        } else {
          return (
            <SongMenuOptions
              variant="context"
              index={row.index}
              song={row.original as ISong}
            />
          )
        }
      }

      if (dataType === 'playlist') {
        return (
          <PlaylistOptions
            variant="context"
            playlist={row.original as Playlist}
            showPlay={true}
          />
        )
      }

      return undefined
    },
    [dataType, showContextMenu, table],
  )

  const handleLeftClick = useCallback(
    (e: MouseEvent<HTMLDivElement>, row: Row<TData>) => {
      if (!allowRowSelection) return

      // Check the correct key depending on the OS (Meta for macOS, Ctrl for others)
      const isMultiSelectKey = isMacOs ? e.metaKey : e.ctrlKey

      if (isMultiSelectKey) {
        row.toggleSelected()
        setLastRowSelected(row.index)
        return
      }

      if (e.shiftKey && lastRowSelected !== null) {
        const selectedRowsUpdater = computeMultiSelectedRows(
          lastRowSelected,
          row.index,
        )
        table.setRowSelection(selectedRowsUpdater)
        return
      }

      // Deselect all rows, except current one
      table.setRowSelection({
        [row.index]: true,
      })
      setLastRowSelected(row.index)
    },
    [allowRowSelection, lastRowSelected, table],
  )

  const handleRightClick = useCallback(
    (row: Row<TData>) => {
      if (!allowRowSelection) return

      const hasSelectedRows = selectedRows.length > 0
      const isSelected = isRowSelected(row.index)

      if (hasSelectedRows && !isSelected) {
        table.resetRowSelection()
      }

      row.toggleSelected(true)
      setLastRowSelected(row.index)
    },
    [allowRowSelection, isRowSelected, selectedRows.length, table],
  )

  const handleClicks = useCallback(
    (e: MouseEvent<HTMLDivElement>, row: Row<TData>) => {
      if (e.nativeEvent.button === MouseButton.Left) {
        handleLeftClick(e, row)
      }
      if (e.nativeEvent.button === MouseButton.Right) {
        handleRightClick(row)
      }
    },
    [handleLeftClick, handleRightClick],
  )

  const handleRowDbClick = useCallback(
    (e: MouseEvent<HTMLDivElement>, row: Row<TData>) => {
      if (handlePlaySong) {
        e.stopPropagation()
        handlePlaySong(row)
      }
    },
    [handlePlaySong],
  )

  const handleRowTap = useCallback(
    (e: TouchEvent<HTMLDivElement>, row: Row<TData>) => {
      clearTimeout(tapTimeout)
      if (isTap && handlePlaySong) {
        e.stopPropagation()
        handlePlaySong(row)
      }
    },
    [handlePlaySong],
  )

  function handleTouchStart() {
    isTap = true
    tapTimeout = setTimeout(() => {
      isTap = false
    }, 500)
  }

  function handleTouchMove() {
    isTap = false
  }

  function handleTouchCancel() {
    clearTimeout(tapTimeout)
    isTap = false
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveRowIndex(parseInt(event.active.id as string))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveRowIndex(null)
    if (!over || active.id === over.id) return
    const fromIndex = parseInt(active.id as string)
    const toIndex = parseInt(over.id as string)
    onReorder?.(fromIndex, toIndex)
  }

  const activeRow = activeRowIndex !== null ? rows[activeRowIndex] : null

  useEffect(() => {
    if (!highlightRowId) return
    if (lastAppliedHighlightRef.current === highlightRowId) return

    const highlightIndex = (data as Array<{ id?: string }>).findIndex(
      (item) => item?.id === highlightRowId,
    )
    if (highlightIndex < 0) return

    setRowSelection({ [highlightIndex.toString()]: true })
    setLastRowSelected(highlightIndex)
    lastAppliedHighlightRef.current = highlightRowId

    requestAnimationFrame(() => {
      const rowElement = tableRef.current?.querySelector<HTMLDivElement>(
        `[data-song-id="${highlightRowId}"]`,
      )
      rowElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [data, highlightRowId])

  const rowList = rows?.length ? (
    rows.map((row, index) => (
      <Fragment key={row.id}>
        {showDiscNumber &&
          !isSingleDisk &&
          discNumberIndexes.includes(index) && (
            <div
              className={clsx(
                'w-full h-14 flex flex-row items-center transition-colors text-muted-foreground',
                isClassic && 'border-b',
              )}
              role="row"
            >
              <div className="w-12 flex items-center justify-center">
                <Disc2Icon strokeWidth={1.75} />
              </div>
              <span className="font-medium ml-[7px]">
                {t('album.table.discNumber', {
                  number: (row.original as DiscNumber).discNumber,
                })}
              </span>
            </div>
          )}
        <MemoTableRow
          index={index}
          row={row}
          contextMenuOptions={getContextMenuOptions(row)}
          isPrevRowSelected={isPrevRowSelected}
          isNextRowSelected={isNextRowSelected}
          variant={variant}
          dataType={dataType}
          isHighlighted={Boolean(
            highlightRowId &&
              (row.original as { id?: string })?.id === highlightRowId,
          )}
          sortableId={isDragReorderActive ? index.toString() : undefined}
          data-row-index={index}
          data-song-id={(row.original as { id?: string })?.id ?? ''}
          onClick={(e) => handleClicks(e, row)}
          onDoubleClick={(e) => handleRowDbClick(e, row)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleRowTap(e, row)}
          onTouchCancel={handleTouchCancel}
          onContextMenu={(e) => handleClicks(e, row)}
        />
      </Fragment>
    ))
  ) : (
    <div role="row">
      <div className="flex h-24 items-center justify-center p-2" role="cell">
        {resolvedNoRowsMessage}
      </div>
    </div>
  )

  const tableContent = (
    <>
      {showSearch && searchColumn && (
        <div className="mb-4 flex items-center" data-testid="table-search">
          <div className="w-72 relative">
            <Input
              placeholder={t('sidebar.search')}
              value={inputValue ?? ''}
              onChange={(event) =>
                table
                  .getColumn(searchColumn)
                  ?.setFilterValue(event.target.value)
              }
              autoCorrect="false"
              autoCapitalize="false"
              spellCheck="false"
              className="h-9 rounded-[var(--radius-control)] border-border/35 bg-background-foreground"
            />
            {inputValue !== '' && inputValue !== undefined && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 w-6 h-6"
                onClick={() =>
                  table.getColumn(searchColumn)?.setFilterValue('')
                }
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className={clsx(
          isClassic &&
            'rounded-[var(--radius-surface)] border border-border/35 bg-card/70 p-1',
        )}
      >
        <div
          ref={tableRef}
          className={clsx(
            'relative w-full overflow-hidden rounded-[var(--radius-surface)] cursor-default caption-bottom text-sm',
            isClassic ? 'bg-transparent' : 'bg-transparent',
          )}
          data-testid="data-table"
          role="table"
        >
          {showHeader && (
            <div>
              {table.getHeaderGroups().map((headerGroup) => (
                <div
                  key={headerGroup.id}
                  className={clsx(
                    'w-full flex flex-row border-b border-border/20',
                    isModern && 'mb-2 px-1',
                  )}
                  role="row"
                >
                  {/* Spacer matching the drag handle width */}
                  {isDragReorderActive && <div className="w-6 shrink-0" />}
                  {headerGroup.headers.map((header) => {
                    const columnDef = header.column
                      .columnDef as ColumnDefType<TData>

                    return (
                      <div
                        key={header.id}
                        className={clsx(
                          'p-2 h-11 flex items-center justify-start align-middle text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 [&:has([role=checkbox])]:pr-4',
                          columnDef.className,
                        )}
                        style={columnDef.style}
                        role="columnheader"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="[&_div:last-child]:border-0">
            <div className="w-full h-full overflow-hidden">{rowList}</div>
          </div>
        </div>
      </div>

      {showPagination && (
        <DataTablePagination
          table={table}
          pageSizeOptions={paginationPageSizeOptions}
        />
      )}
    </>
  )

  if (!isSortable) {
    return tableContent
  }

  if (!isDragReorderActive) {
    return tableContent
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {tableContent}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeRow ? (
          <MemoTableRow
            index={activeRowIndex!}
            row={activeRow}
            contextMenuOptions={undefined}
            isPrevRowSelected={() => false}
            isNextRowSelected={() => false}
            variant={variant}
            dataType={dataType}
            sortableId={undefined}
            className="shadow-xl border border-foreground/20 bg-popover rounded-md cursor-grabbing opacity-95"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
