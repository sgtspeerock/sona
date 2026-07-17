import { Pin, PinOff, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { OptionsButtons } from '@/app/components/options/buttons'
import { DownloadOptionHandler } from '@/app/components/options/download-handler'
import { MenuItemFactory } from '@/app/components/options/menu-item-factory'
import { DropdownMenuSeparator } from '@/app/components/ui/dropdown-menu'
import { useOptions } from '@/app/hooks/use-options'
import { isLikelyAutoImportedM3uPlaylist } from '@/service/playlists'
import { subsonic } from '@/service/subsonic'
import { useAppPages } from '@/store/app.store'
import { usePlaylists, useRemovePlaylist } from '@/store/playlists.store'
import { Playlist, PlaylistWithEntries } from '@/types/responses/playlist'
import { ISong } from '@/types/responses/song'
import { getCoverArtUrl, getSimpleCoverArtUrl } from '@/api/httpClient'
import { invalidateArtworkCache } from '@/api/artwork'
import { queryKeys } from '@/utils/queryKeys'
import { deleteCachedImage } from '@/cache/image'

interface PlaylistOptionsProps {
  playlist: PlaylistWithEntries | Playlist
  variant?: 'context' | 'dropdown'
  showPlay?: boolean
  disablePlayNext?: boolean
  disableAddLast?: boolean
  disableDownload?: boolean
  disableEdit?: boolean
  disableDelete?: boolean
}

export function PlaylistOptions({
  playlist,
  variant = 'dropdown',
  showPlay = false,
  disablePlayNext = false,
  disableAddLast = false,
  disableDownload = false,
  disableEdit = false,
  disableDelete = false,
}: PlaylistOptionsProps) {
  const { t } = useTranslation()
  const { setPlaylistDialogState, setData } = usePlaylists()
  const { play, playNext, playLast, startDownload } = useOptions()
  const { setPlaylistId, setConfirmDialogState } = useRemovePlaylist()
  const { autoPlaylistImportExceptions, toggleAutoPlaylistImportException } =
    useAppPages()

  const queryClient = useQueryClient()

  async function handleRecalculateCover() {
    try {
      await subsonic.playlists.update({
        playlistId: playlist.id,
        name: playlist.name,
      })
      if (playlist.coverArt) {
        invalidateArtworkCache(playlist.coverArt)
        const url80 = getSimpleCoverArtUrl(playlist.coverArt, 'playlist', '80')
        const url300 = getSimpleCoverArtUrl(playlist.coverArt, 'playlist', '300')
        await deleteCachedImage(url80)
        await deleteCachedImage(url300)
      }
      await queryClient.invalidateQueries({
        queryKey: [queryKeys.playlist.all],
      })
    } catch (error) {
      console.error('Failed to recalculate playlist cover', error)
    }
  }

  const isAutoImportedM3u = isLikelyAutoImportedM3uPlaylist(playlist)
  const isException = autoPlaylistImportExceptions.includes(playlist.id)

  function handleEdit() {
    setData({
      id: playlist.id,
      name: playlist.name,
      comment: playlist.comment,
      public: playlist.public,
    })
    setPlaylistDialogState(true)
  }

  async function getSongsToQueue(callback: (songs: ISong[]) => void) {
    const playlistWithEntries = await subsonic.playlists.getOne(playlist.id)
    if (!playlistWithEntries) return

    callback(playlistWithEntries.entry)
  }

  async function handlePlay() {
    if ('entry' in playlist) {
      play(playlist.entry)
    } else {
      await getSongsToQueue(play)
    }
  }

  async function handlePlayNext() {
    if ('entry' in playlist) {
      playNext(playlist.entry)
    } else {
      await getSongsToQueue(playNext)
    }
  }

  async function handlePlayLast() {
    if ('entry' in playlist) {
      playLast(playlist.entry)
    } else {
      await getSongsToQueue(playLast)
    }
  }

  function handleDownload() {
    startDownload(playlist.id)
  }

  return (
    <>
      {variant === 'context' && (
        <>
          <div className="px-2 py-0.5 max-w-64">
            <span className="text-xs text-muted-foreground break-words line-clamp-4">
              {playlist.name}
            </span>
          </div>
          <DropdownMenuSeparator />
        </>
      )}
      {showPlay && (
        <OptionsButtons.Play
          variant={variant}
          onClick={(e) => {
            e.stopPropagation()
            handlePlay()
          }}
        />
      )}
      <OptionsButtons.PlayNext
        variant={variant}
        disabled={disablePlayNext}
        onClick={(e) => {
          e.stopPropagation()
          handlePlayNext()
        }}
      />
      <OptionsButtons.PlayLast
        variant={variant}
        disabled={disableAddLast}
        onClick={(e) => {
          e.stopPropagation()
          handlePlayLast()
        }}
      />
      <DownloadOptionHandler group={false}>
        <OptionsButtons.Download
          variant={variant}
          disabled={disableDownload}
          onClick={(e) => {
            e.stopPropagation()
            handleDownload()
          }}
        />
      </DownloadOptionHandler>
      <DropdownMenuSeparator />
      <OptionsButtons.EditPlaylist
        variant={variant}
        onClick={(e) => {
          e.stopPropagation()
          handleEdit()
        }}
        disabled={disableEdit}
      />
      <OptionsButtons.RemovePlaylist
        variant={variant}
        onClick={(e) => {
          e.stopPropagation()
          setPlaylistId(playlist.id)
          setConfirmDialogState(true)
        }}
        disabled={disableDelete}
      />
      <DropdownMenuSeparator />
      <MenuItemFactory
        variant={variant}
        icon={<RefreshCw className="mr-2 h-4 w-4" />}
        label={t('options.playlist.recalculateCover', 'Cover neu berechnen')}
        onClick={(e) => {
          e.stopPropagation()
          handleRecalculateCover()
        }}
      />
      {isAutoImportedM3u && (
        <>
          <DropdownMenuSeparator />
          <MenuItemFactory
            variant={variant}
            icon={
              isException ? (
                <PinOff className="mr-2 h-4 w-4" />
              ) : (
                <Pin className="mr-2 h-4 w-4" />
              )
            }
            label={
              isException
                ? t('options.playlist.hide')
                : t('options.playlist.show')
            }
            onClick={(e) => {
              e.stopPropagation()
              toggleAutoPlaylistImportException(playlist.id)
            }}
          />
        </>
      )}
    </>
  )
}
