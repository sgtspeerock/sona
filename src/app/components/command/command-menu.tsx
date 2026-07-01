import { useQuery } from '@tanstack/react-query'
import { Disc3, Heart, Library, ListMusic, Mic2, SearchIcon } from 'lucide-react'
import { KeyboardEvent, useCallback, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'
import { Keyboard } from '@/app/components/command/keyboard-key'
import { Button } from '@/app/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/app/components/ui/command'
import { useMainSidebar } from '@/app/components/ui/main-sidebar'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { useAppStore } from '@/store/app.store'
import { Albums } from '@/types/responses/album'
import { ISimilarArtist } from '@/types/responses/artist'
import { ISong } from '@/types/responses/song'
import { byteLength } from '@/utils/byteLength'
import { convertMinutesToMs } from '@/utils/convertSecondsToTime'
import { navigateSafe } from '@/utils/navigateSafe'
import { queryKeys } from '@/utils/queryKeys'
import { CommandAlbumResult } from './album-result'
import { CommandArtistResult } from './artist-result'
import { CommandSongResult } from './song-result'

export type CommandItemProps = {
  runCommand: (command: () => unknown) => void
}

type CommandMenuProps = {
  compact?: boolean
}

const SEARCH_RESULT_LIMIT = 5
const SEARCH_CANDIDATE_LIMIT = 25

export default function CommandMenu({ compact = false }: CommandMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state: sidebarState } = useMainSidebar()
  const { open, setOpen } = useAppStore((state) => state.command)

  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const enableQuery = Boolean(byteLength(query) >= 2)
  const hasInput = Boolean(inputValue.trim().length > 0)

  const { data: searchResult } = useQuery({
    queryKey: [queryKeys.search, query],
    queryFn: () =>
      subsonic.search.get({
        query,
        albumCount: SEARCH_CANDIDATE_LIMIT,
        artistCount: SEARCH_CANDIDATE_LIMIT,
        songCount: SEARCH_CANDIDATE_LIMIT,
      }),
    enabled: enableQuery,
    staleTime: convertMinutesToMs(5),
  })

  const { data: artistOnlyResult } = useQuery({
    queryKey: [queryKeys.search, 'artists-only', query],
    queryFn: () =>
      subsonic.search.get({
        query,
        albumCount: 0,
        songCount: 0,
        artistCount: SEARCH_CANDIDATE_LIMIT,
      }),
    enabled: enableQuery,
    staleTime: convertMinutesToMs(5),
  })

  const albums = sortAlbumsByRelevance(searchResult?.album ?? [], query).slice(
    0,
    SEARCH_RESULT_LIMIT,
  )
  const artists = sortArtistsByRelevance(
    mergeArtists(searchResult?.artist, artistOnlyResult?.artist),
    query,
  ).slice(0, SEARCH_RESULT_LIMIT)
  const songs = sortSongsByRelevance(searchResult?.song ?? [], query).slice(
    0,
    SEARCH_RESULT_LIMIT,
  )

  const showAlbumGroup = Boolean(query && albums.length > 0)
  const showArtistGroup = Boolean(query && artists.length > 0)
  const showSongGroup = Boolean(query && songs.length > 0)

  useHotkeys(['/', 'mod+f', 'mod+k'], () => setOpen(!open), {
    preventDefault: true,
  })

  const clear = useCallback(() => {
    setInputValue('')
    setQuery('')
  }, [])

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false)
      clear()
      command()
    },
    [clear, setOpen],
  )

  const debounced = useDebouncedCallback((value: string) => {
    setQuery(value)
  }, 500)

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === '/') {
      event.preventDefault()
    }
  }

  function handleSearchChange(value: string) {
    setInputValue(value)
    debounced(value)
  }

  const sidebarOpen = sidebarState === 'expanded'
  const quickActions = [
    {
      label: t('sidebar.albums'),
      description: t('home.recentlyAdded'),
      icon: Library,
      route: ROUTES.LIBRARY.ALBUMS,
    },
    {
      label: t('sidebar.artists'),
      description: t('sidebar.library'),
      icon: Mic2,
      route: ROUTES.LIBRARY.ARTISTS,
    },
    {
      label: t('sidebar.playlists'),
      description: t('sidebar.playlists'),
      icon: ListMusic,
      route: ROUTES.LIBRARY.PLAYLISTS,
    },
    {
      label: t('sidebar.favorites'),
      description: t('home.mostPlayed'),
      icon: Heart,
      route: ROUTES.LIBRARY.FAVORITES,
    },
    {
      label: t('sidebar.songs'),
      description: t('sidebar.library'),
      icon: Disc3,
      route: ROUTES.LIBRARY.SONGS,
    },
  ]

  return (
    <>
      {sidebarOpen && (
        <Button
          variant="outline"
          className={
            compact
              ? 'h-10 w-10 p-0 flex items-center justify-center rounded-lg active:scale-[98%] transition hover:bg-background-foreground/80'
              : 'flex justify-start w-full px-2 gap-2 relative min-w-max active:scale-[98%] transition hover:bg-background-foreground/80'
          }
          onClick={() => setOpen(true)}
        >
          <SearchIcon
            className={
              compact
                ? 'h-5 w-5 text-muted-foreground'
                : 'h-4 w-4 text-muted-foreground'
            }
          />
          {!compact && (
            <>
              <span className="inline-flex text-muted-foreground text-sm">
                {t('sidebar.search')}
              </span>
              <div className="absolute right-2">
                <Keyboard text="/" />
              </div>
            </>
          )}
        </Button>
      )}
      <CommandDialog
        contentClassName={
          hasInput
            ? 'top-[36%] translate-y-[-36%] h-[70vh] max-h-[70vh]'
            : 'top-[24%] translate-y-[-24%] h-auto max-h-none'
        }
        open={open}
        onOpenChange={(state) => {
          setOpen(state)
          if (!state) clear()
        }}
      >
        <Command
          shouldFilter={false}
          id="main-command"
          className={hasInput ? 'h-full max-h-full' : 'h-auto'}
        >
          <CommandInput
            data-testid="command-menu-input"
            placeholder={t('command.inputPlaceholder')}
            className="h-12 text-[15px]"
            autoCorrect="false"
            autoCapitalize="false"
            spellCheck="false"
            onValueChange={(value) => handleSearchChange(value)}
            onKeyDown={handleInputKeyDown}
          />
          {!hasInput && (
            <CommandList className="px-3 pb-4 pt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.route}
                      type="button"
                      className="sona-panel-soft flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-accent/35"
                      onClick={() =>
                        runCommand(() => navigateSafe(navigate, action.route))
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/12 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {action.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </CommandList>
          )}

          {hasInput && (
            <CommandList>
              {!enableQuery && (
                <div className="mx-3 mt-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {t('command.typeMore')}
                </div>
              )}

              {enableQuery && showArtistGroup && (
                <CommandArtistResult artists={artists} runCommand={runCommand} />
              )}

              {enableQuery && showAlbumGroup && (
                <CommandAlbumResult
                  query={query}
                  albums={albums}
                  runCommand={runCommand}
                />
              )}

              {enableQuery && showSongGroup && (
                <CommandSongResult
                  query={query}
                  songs={songs}
                  runCommand={runCommand}
                />
              )}

              {enableQuery && (
                <CommandEmpty>{t('command.noResults')}</CommandEmpty>
              )}
            </CommandList>
          )}
        </Command>
      </CommandDialog>
    </>
  )
}

function mergeArtists(
  primary?: ISimilarArtist[],
  fallback?: ISimilarArtist[],
) {
  const merged = [...(primary ?? []), ...(fallback ?? [])]
  const byId = new Map<string, ISimilarArtist>()
  const byName = new Map<string, ISimilarArtist>()

  for (const artist of merged) {
    if (!artist?.name) continue

    if (artist.id) {
      if (!byId.has(artist.id)) byId.set(artist.id, artist)
      continue
    }

    const key = artist.name.trim().toLowerCase()
    if (!key) continue
    if (!byName.has(key)) byName.set(key, artist)
  }

  return [...byId.values(), ...byName.values()]
}

function sortArtistsByRelevance(artists: ISimilarArtist[], query: string) {
  return artists
    .filter((artist) => (artist.albumCount ?? 0) > 0)
    .sort((a, b) => compareByRelevance(a, b, query, getArtistRelevance))
}

function sortAlbumsByRelevance(albums: Albums[], query: string) {
  return albums
    .filter((album) => (album.songCount ?? 0) > 0)
    .sort((a, b) => compareByRelevance(a, b, query, getAlbumRelevance))
}

function sortSongsByRelevance(songs: ISong[], query: string) {
  return songs.sort((a, b) => compareByRelevance(a, b, query, getSongRelevance))
}

function compareByRelevance<T>(
  a: T,
  b: T,
  query: string,
  getRelevance: (item: T, query: string) => number,
) {
  return getRelevance(b, query) - getRelevance(a, query)
}

function getArtistRelevance(artist: ISimilarArtist, query: string) {
  return (artist.albumCount ?? 0) * 100 + getTextMatchScore(artist.name, query)
}

function getAlbumRelevance(album: Albums, query: string) {
  return (
    (album.songCount ?? 0) * 100 +
    getTextMatchScore(album.name, query) +
    getTextMatchScore(album.artist, query)
  )
}

function getSongRelevance(song: ISong, query: string) {
  return (
    getTextMatchScore(song.title, query) * 100 +
    getTextMatchScore(song.artist, query) * 50 +
    getTextMatchScore(song.album, query) * 25 +
    (song.playCount ?? 0)
  )
}

function getTextMatchScore(value: string | undefined, query: string) {
  const text = normalizeSearchText(value)
  const normalizedQuery = normalizeSearchText(query)

  if (!text || !normalizedQuery) return 0
  if (text === normalizedQuery) return 40
  if (text.startsWith(normalizedQuery)) return 30
  if (text.split(' ').some((part) => part.startsWith(normalizedQuery))) return 20
  if (text.includes(normalizedQuery)) return 10
  return 0
}

function normalizeSearchText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? ''
}
