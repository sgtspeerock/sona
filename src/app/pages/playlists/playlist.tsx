import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { DragEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import ImageHeader from '@/app/components/album/image-header'
import { PlaylistFallback } from '@/app/components/fallbacks/playlist-fallbacks'
import { BadgesData } from '@/app/components/header-info'
import { ImageLoader } from '@/app/components/image-loader'
import ListWrapper from '@/app/components/list-wrapper'
import { PlaylistButtons } from '@/app/components/playlist/buttons'
import { RemoveSongFromPlaylistDialog } from '@/app/components/playlist/remove-song-dialog'
import { Button } from '@/app/components/ui/button'
import { DataTable } from '@/app/components/ui/data-table'
import { useScrollThreshold } from '@/app/hooks/use-scroll-threshold'
import ErrorPage from '@/app/pages/error-page'
import { songsColumns } from '@/app/tables/songs-columns'
import { cn } from '@/lib/utils'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { ColumnFilter } from '@/types/columnFilter'
import { PlaylistWithEntries } from '@/types/responses/playlist'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'
import { queryKeys } from '@/utils/queryKeys'

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'flac',
  'm4a',
  'aac',
  'ogg',
  'opus',
  'wav',
  'alac',
  'aiff',
  'wma',
])

type DroppedFile = File & { path?: string }

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function basename(pathOrName: string) {
  const normalized = pathOrName.replace(/\\/g, '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? pathOrName
}

function stemFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, '')
}

function buildSearchQueries(fileStem: string) {
  const raw = fileStem.trim()
  if (!raw) return []

  const cleaned = raw
    .replace(/^\s*\d{1,3}\s*[-_. )]+\s*/g, '')
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const dashParts = cleaned
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates = [raw, cleaned, ...dashParts]
    .map((value) => value.trim())
    .filter((value) => value.length >= 2)

  return [...new Set(candidates)].slice(0, 4)
}

function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function scoreCandidate(
  filePathOrName: string,
  fileStem: string,
  song: { title?: string; path?: string },
) {
  const normalizedStem = normalizeText(fileStem)
  const songTitle = normalizeText(song.title ?? '')
  const songPathBase = normalizeText(
    stemFromFilename(basename(song.path ?? '')),
  )
  const fileBaseStem = normalizeText(stemFromFilename(basename(filePathOrName)))
  const fullPathNormalized = normalizeText(filePathOrName)

  let score = 0

  if (songTitle && songTitle === normalizedStem) score += 120
  if (songPathBase && songPathBase === fileBaseStem) score += 140
  if (songTitle && normalizedStem.includes(songTitle)) score += 30
  if (songTitle && songTitle.includes(normalizedStem)) score += 30
  if (song.path && fullPathNormalized.includes(normalizeText(song.path))) {
    score += 80
  }

  return score
}

export default function Playlist() {
  const { playlistId } = useParams() as { playlistId: string }
  const { t } = useTranslation()
  const showStickyHeader = useScrollThreshold(240)
  const columns = songsColumns({ showHeartInSelect: false })
  const { setSongList } = usePlayerActions()
  const queryClient = useQueryClient()
  const [isDropActive, setIsDropActive] = useState(false)
  const [isDropping, setIsDropping] = useState(false)
  const dragDepthRef = useRef(0)

  const {
    data: playlist,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [queryKeys.playlist.single, playlistId],
    queryFn: () => subsonic.playlists.getOne(playlistId),
  })

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!playlist?.entry) return

      const newEntries = [...playlist.entry]
      const [moved] = newEntries.splice(fromIndex, 1)
      newEntries.splice(toIndex, 0, moved)

      // Optimistic update
      queryClient.setQueryData(
        [queryKeys.playlist.single, playlistId],
        (old: PlaylistWithEntries | undefined) => {
          if (!old) return old
          return { ...old, entry: newEntries }
        },
      )

      // Persist to server
      try {
        await subsonic.playlists.reorderSongs(
          playlistId,
          newEntries.map((s) => s.id),
        )
      } catch {
        // Roll back on failure
        queryClient.invalidateQueries({
          queryKey: [queryKeys.playlist.single, playlistId],
        })
      }
    },
    [playlist, playlistId, queryClient],
  )

  const columnsToShow: ColumnFilter[] = [
    'index',
    'starred',
    'title',
    // 'artist',
    'album',
    'duration',
    'playCount',
    'created',
    'contentType',
    'select',
  ]

  const hasSongs = (playlist?.songCount ?? 0) > 0
  const duration = convertSecondsToHumanRead(playlist?.duration ?? 0)

  const songCount = hasSongs
    ? t('playlist.songCount', { count: playlist?.songCount ?? 0 })
    : null
  const playlistDuration = hasSongs
    ? t('playlist.duration', { duration })
    : null

  const badges: BadgesData = [
    { content: songCount, type: 'text' },
    {
      content: playlistDuration,
      type: 'text',
    },
  ]

  const coverArt = hasSongs ? playlist?.coverArt : undefined
  const existingSongIds = useMemo(
    () => new Set((playlist?.entry ?? []).map((song) => song.id)),
    [playlist?.entry],
  )

  const resolveDroppedSongs = useCallback(
    async (files: DroppedFile[]) => {
      const audioFiles = files.filter((file) => {
        const fileName = file.name || basename(file.path ?? '')
        const ext = getFileExtension(fileName)
        return AUDIO_EXTENSIONS.has(ext)
      })

      if (audioFiles.length === 0) {
        toast.info(t('playlist.drop.noSupportedFiles'))
        return []
      }

      const matchedIds = new Set<string>()

      await Promise.all(
        audioFiles.map(async (file) => {
          const filePathOrName = file.path ?? file.name
          const fileBase = basename(filePathOrName)
          const fileStem = stemFromFilename(fileBase)
          const queries = buildSearchQueries(fileStem)
          if (queries.length === 0) return

          try {
            const candidatesById = new Map<
              string,
              {
                song: { id: string; title?: string; path?: string }
                score: number
              }
            >()

            for (const query of queries) {
              const result = await subsonic.search.get({
                query,
                artistCount: 0,
                albumCount: 0,
                songCount: 30,
                songOffset: 0,
              })

              const songs = result?.song ?? []
              for (const song of songs) {
                const score = scoreCandidate(filePathOrName, fileStem, song)
                const existing = candidatesById.get(song.id)
                if (!existing || score > existing.score) {
                  candidatesById.set(song.id, { song, score })
                }
              }
            }

            if (candidatesById.size === 0) return

            const ranked = [...candidatesById.values()].sort(
              (a, b) => b.score - a.score,
            )
            const best = ranked[0]

            // More permissive threshold for filename-only drops.
            const minScore = file.path ? 40 : 20
            if (best && best.score >= minScore) {
              matchedIds.add(best.song.id)
            }
          } catch {
            // Keep processing remaining files.
          }
        }),
      )

      return [...matchedIds]
    },
    [t],
  )

  const handleDropFiles = useCallback(
    async (files: DroppedFile[]) => {
      if (isDropping) return
      setIsDropping(true)

      try {
        const matchedSongIds = await resolveDroppedSongs(files)

        if (matchedSongIds.length === 0) {
          toast.info(t('playlist.drop.noneMatched'))
          return
        }

        const newSongIds = matchedSongIds.filter(
          (id) => !existingSongIds.has(id),
        )

        if (newSongIds.length === 0) {
          toast.info(t('playlist.drop.alreadyInPlaylist'))
          return
        }

        await subsonic.playlists.update({
          playlistId,
          songIdToAdd: newSongIds,
        })

        await queryClient.invalidateQueries({
          queryKey: [queryKeys.playlist.single, playlistId],
        })

        toast.success(
          t('playlist.drop.added', {
            count: newSongIds.length,
            matched: matchedSongIds.length,
          }),
        )
      } catch {
        toast.error(t('playlist.drop.failed'))
      } finally {
        setIsDropping(false)
      }
    },
    [
      existingSongIds,
      isDropping,
      playlistId,
      queryClient,
      resolveDroppedSongs,
      t,
    ],
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragDepthRef.current += 1
      if (!isDropActive) setIsDropActive(true)
    },
    [isDropActive],
  )

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDropActive(false)
    }
  }, [])

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragDepthRef.current = 0
      setIsDropActive(false)

      const files = Array.from(event.dataTransfer.files ?? []) as DroppedFile[]
      if (files.length === 0) return
      await handleDropFiles(files)
    },
    [handleDropFiles],
  )

  if (isFetching || isLoading) return <PlaylistFallback />
  if (!playlist) return <ErrorPage status={404} statusText="Not Found" />

  return (
    <div
      className="w-full relative"
      key={playlist.id}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Compact Sticky Header on Scroll */}
      <div
        className={cn(
          'sticky top-0 left-0 right-0 z-30 h-14 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-8 transition-all duration-300 transform-gpu',
          showStickyHeader
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none absolute',
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ImageLoader id={coverArt} type="album" size="80">
            {(src) => {
              const fallbackSrc = getSimpleCoverArtUrl(undefined, 'album', '80')
              return (
                <img
                  src={src || fallbackSrc}
                  alt={playlist.name}
                  className="w-9 h-9 rounded-md object-cover border border-border/30"
                />
              )
            }}
          </ImageLoader>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="text-sm font-bold truncate leading-tight">
              {playlist.name}
            </h2>
            {playlist.comment && (
              <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {playlist.comment}
              </p>
            )}
          </div>
          {playlist.entry && playlist.entry.length > 0 && (
            <Button
              size="sm"
              onClick={() => setSongList(playlist.entry, 0)}
              className="h-8 rounded-full px-4 text-xs font-semibold shrink-0 ml-2"
            >
              {t('options.play', 'Play')}
            </Button>
          )}
        </div>
      </div>

      <ImageHeader
        type={t('playlist.headline')}
        title={playlist.name}
        subtitle={playlist.comment}
        coverArtId={coverArt}
        coverArtType="album"
        coverArtSize="700"
        coverArtAlt={playlist.name}
        badges={badges}
        isPlaylist={true}
      />

      <ListWrapper className="relative">
        {isDropActive && hasSongs && (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border border-primary/45 bg-background/35 backdrop-blur-[1px]">
            <div className="absolute inset-x-4 top-4 rounded-lg border border-primary/50 bg-primary/12 px-4 py-3 text-sm text-foreground/95 shadow-lg">
              {t('playlist.drop.hint')}
            </div>
          </div>
        )}
        <PlaylistButtons playlist={playlist} />

        {hasSongs ? (
          <DataTable
            columns={columns}
            data={playlist.entry ?? []}
            handlePlaySong={(row) => setSongList(playlist.entry, row.index)}
            columnFilter={columnsToShow}
            noRowsMessage=""
            variant="modern"
            onReorder={handleReorder}
            enableSorting={true}
          />
        ) : (
          <div className="py-2">
            <div
              className={
                isDropActive
                  ? 'min-h-[170px] rounded-xl border border-primary/50 bg-primary/10 px-8 py-8'
                  : 'min-h-[170px] rounded-xl border border-border/70 bg-card/35 px-8 py-8'
              }
            >
              <div className="mx-auto flex max-w-[640px] flex-col items-center justify-center text-center">
                <Plus
                  className={
                    isDropActive
                      ? 'mb-3 h-12 w-12 text-primary'
                      : 'mb-3 h-12 w-12 text-muted-foreground/70'
                  }
                  strokeWidth={1.8}
                />
                <h3 className="text-base font-semibold text-foreground">
                  {isDropActive
                    ? t('playlist.drop.emptyTitle')
                    : t('states.empty.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isDropActive
                    ? t('playlist.drop.hint')
                    : t('states.empty.playlistDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        <RemoveSongFromPlaylistDialog />
      </ListWrapper>
    </div>
  )
}
