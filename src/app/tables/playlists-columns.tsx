import { ClockIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PlaylistOptions } from '@/app/components/playlist/options'
import { TableActionButton } from '@/app/components/table/action-button'
import { CoverImage } from '@/app/components/table/cover-image'
import { Checkbox } from '@/app/components/ui/checkbox'
import { DataTableColumnHeader } from '@/app/components/ui/data-table-column-header'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import i18n from '@/i18n'
import { ROUTES } from '@/routes/routesList'
import { isLikelyAutoImportedM3uPlaylist } from '@/service/playlists'
import { ColumnDefType } from '@/types/react-table/columnDef'
import { Playlist } from '@/types/responses/playlist'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

export interface PlaylistsColumnsOptions {
  showCheckboxes?: boolean
}

export function playlistsColumns(options: PlaylistsColumnsOptions = {}): ColumnDefType<Playlist>[] {
  const {
    showCheckboxes = false,
  } = options

  const cols: ColumnDefType<Playlist>[] = []

  if (showCheckboxes) {
    cols.push({
      id: 'select',
      accessorKey: 'select',
      style: {
        width: 48,
        minWidth: '48px',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
      },
      header: () => null,
      cell: ({ row, table }) => {
        const playlist = row.original
        const isImported = isLikelyAutoImportedM3uPlaylist(playlist)

        const autoPlaylistImport = table.options.meta?.autoPlaylistImport
        const autoPlaylistImportExceptions = table.options.meta?.autoPlaylistImportExceptions || []
        const onToggleImportException = table.options.meta?.onToggleImportException

        const isChecked = !isImported || autoPlaylistImport || autoPlaylistImportExceptions.includes(playlist.id)

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-full h-full"
          >
            <Checkbox
              checked={isChecked}
              disabled={!isImported}
              onCheckedChange={() => {
                if (isImported && onToggleImportException) {
                  onToggleImportException(playlist.id)
                }
              }}
            />
          </div>
        )
      },
    })
  }

  cols.push(
    {
      id: 'name',
      accessorKey: 'name',
      enableSorting: true,
      sortingFn: 'customSortFn',
      style: {
        flex: 1,
        minWidth: 250,
      },
      header: ({ column, table }) => (
        <DataTableColumnHeader column={column} table={table}>
          {i18n.t('table.columns.name')}
        </DataTableColumnHeader>
      ),
      cell: ({ row }) => (
        <div className="flex gap-2 items-center w-full">
          <CoverImage
            coverArt={row.original.coverArt}
            coverArtType="playlist"
            altText={row.original.name}
          />
          <div className="flex flex-col max-w-full justify-center truncate">
            <Link
              to={ROUTES.PLAYLIST.PAGE(row.original.id)}
              className="hover:underline truncate"
            >
              {row.original.name}
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'songCount',
      accessorKey: 'songCount',
      enableSorting: true,
      sortingFn: 'basic',
      style: {
        width: 190,
        maxWidth: 190,
      },
      header: ({ column, table }) => (
        <DataTableColumnHeader column={column} table={table}>
          {i18n.t('table.columns.songCount')}
        </DataTableColumnHeader>
      ),
    },
    {
      id: 'duration',
      accessorKey: 'duration',
      style: {
        width: 100,
        maxWidth: 100,
      },
      header: () => (
        <SimpleTooltip text={i18n.t('table.columns.duration')}>
          <ClockIcon className="w-4 h-4" />
        </SimpleTooltip>
      ),
      cell: ({ row }) => {
        const { duration } = row.original
        const formattedDuration = convertSecondsToTime(duration ?? 0)

        return formattedDuration
      },
    },
    {
      id: 'actions',
      accessorKey: 'actions',
      style: {
        width: 48,
        maxWidth: 48,
      },
      header: '',
      cell: ({ row }) => {
        const playlist = row.original
        const disableOption = playlist.songCount === 0

        return (
          <>
            <TableActionButton
              optionsMenuItems={
                <PlaylistOptions
                  playlist={playlist}
                  disablePlayNext={disableOption}
                  disableAddLast={disableOption}
                  disableDownload={disableOption}
                />
              }
            />
          </>
        )
      },
    },
  )

  return cols
}
