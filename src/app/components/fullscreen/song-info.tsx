import { memo, startTransition, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MarqueeTitle } from '@/app/components/fullscreen/marquee-title'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { SongQualityBadge } from '@/app/components/song/quality-badge'
import { ContextMenuProvider } from '@/app/components/table/context-menu'
import { DrawerClose } from '@/app/components/ui/drawer'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { usePlayerStore, useSessionModeSettings } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { ALBUM_ARTISTS_MAX_NUMBER } from '@/utils/multipleArtists'
import { useFullscreenLuminance } from './luminance-context'
import { FullscreenSongImage } from './song-image'

const MemoFullscreenSongImage = memo(FullscreenSongImage)

interface SongInfoProps {
  isPanelOpen?: boolean
  isChromeVisible?: boolean
}

export function SongInfo({
  isPanelOpen = false,
  isChromeVisible = true,
}: SongInfoProps) {
  const currentSong = usePlayerStore((state) => state.songlist.currentSong)
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { useDarkForeground: useDarkText } = useFullscreenLuminance()
  const { mode } = useSessionModeSettings()
  const [isSongSwapping, setIsSongSwapping] = useState(false)
  const lastSongIdRef = useRef(currentSong?.id)

  useEffect(() => {
    if (lastSongIdRef.current === currentSong?.id) return
    lastSongIdRef.current = currentSong?.id
    setIsSongSwapping(true)
    const timeoutId = window.setTimeout(() => setIsSongSwapping(false), 220)
    return () => window.clearTimeout(timeoutId)
  }, [currentSong?.id])

  const titleToneClass =
    mode === 'focus'
      ? 'text-zinc-300 hover:text-zinc-200'
      : useDarkText
        ? 'text-black/90 hover:text-black'
        : 'text-foreground hover:text-foreground/95'

  const bodyToneClass =
    mode === 'focus'
      ? 'text-zinc-400 hover:text-zinc-300'
      : useDarkText
        ? 'text-black/90 hover:text-black'
        : 'text-foreground hover:text-foreground/95'

  const mutedToneClass =
    mode === 'focus'
      ? 'text-zinc-500'
      : useDarkText
        ? 'text-black/70'
        : 'text-foreground/40'

  const chipToneClass =
    mode === 'focus'
      ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300'
      : useDarkText
        ? 'border-black/15 bg-black/5 text-black/90'
        : 'border-white/15 bg-white/5 text-foreground/92'

  const titleShadowClass =
    mode === 'focus' || useDarkText ? '' : 'fullscreen-readable-shadow-strong'
  const bodyShadowClass =
    mode === 'focus' || useDarkText ? '' : 'fullscreen-readable-shadow-soft'

  function handleTitleClick() {
    closeButtonRef.current?.click()
    setTimeout(() => {
      startTransition(() => {
        navigate(ROUTES.ALBUM.PAGE(currentSong.albumId))
      })
    }, 100)
  }

  function handleAlbumClick() {
    closeButtonRef.current?.click()
    setTimeout(() => {
      startTransition(() => {
        navigate(ROUTES.ALBUM.PAGE(currentSong.albumId))
      })
    }, 100)
  }

  function handleArtistClick(id?: string) {
    if (!id) return
    closeButtonRef.current?.click()
    setTimeout(() => {
      startTransition(() => {
        navigate(ROUTES.ARTIST.PAGE(id))
      })
    }, 100)
  }

  return (
    <ContextMenuProvider
      options={
        <SongMenuOptions variant="context" song={currentSong} index={0} />
      }
    >
      <div
        className={cn(
          'flex items-center justify-start h-full min-h-full max-h-full gap-4 2xl:gap-6 flex-1 overflow-visible transition-[opacity,transform] duration-220',
          isChromeVisible ? 'pt-2' : 'pt-0',
          isPanelOpen && 'opacity-0 scale-[0.97]',
          isSongSwapping && 'fullscreen-song-swap',
          !isChromeVisible && 'scale-[0.99]',
        )}
      >
        <DrawerClose ref={closeButtonRef} className="hidden" />

        <MemoFullscreenSongImage isChromeVisible={isChromeVisible} />

        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 h-full min-h-0 text-left overflow-visible max-h-[595px] 2xl:max-h-[720px]',
            isChromeVisible ? 'justify-end pb-2' : 'justify-end pb-0',
          )}
        >
          <MarqueeTitle gap="mr-6">
            <h2
              className={cn(
                'inline-block max-w-full scroll-m-20 text-4xl 2xl:text-5xl font-bold tracking-tight py-2 2xl:py-3 transition-colors cursor-pointer',
                titleToneClass,
                titleShadowClass,
              )}
              onClick={handleTitleClick}
            >
              {currentSong.title}
            </h2>
          </MarqueeTitle>
          <div
            className={cn(
              'min-w-0 overflow-visible',
              mode === 'focus'
                ? 'text-zinc-400'
                : useDarkText
                  ? 'text-black/90'
                  : 'text-foreground/74',
            )}
          >
            <p
              className={cn(
                'inline-block text-xl 2xl:text-2xl transition-colors cursor-pointer',
                bodyToneClass,
                bodyShadowClass,
              )}
              onClick={handleAlbumClick}
            >
              {currentSong.album}
            </p>
            <div className="mt-0.5 text-lg 2xl:text-xl min-w-0">
              <ArtistNames
                song={currentSong}
                onArtistClick={handleArtistClick}
                useDarkText={useDarkText}
                bodyToneClass={bodyToneClass}
                bodyShadowClass={bodyShadowClass}
                className="inline-block min-w-0 max-w-full truncate whitespace-nowrap align-top"
              />
            </div>
          </div>
          <div className="mt-2 2xl:mt-3 mb-[1px]">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-md border-[1.5px] px-3 py-1.5 text-sm',
                chipToneClass,
              )}
            >
              {currentSong.genre && (
                <span className="truncate max-w-[220px]">
                  {currentSong.genre}
                </span>
              )}
              {currentSong.genre && currentSong.year && (
                <span className={mutedToneClass}>•</span>
              )}
              {currentSong.year && <span>{currentSong.year}</span>}
              {(currentSong.genre || currentSong.year) && (
                <span className={mutedToneClass}>•</span>
              )}
              <SongQualityBadge
                song={currentSong}
                display="text"
                className="leading-none"
              />
            </div>
          </div>
        </div>
      </div>
    </ContextMenuProvider>
  )
}

function ArtistNames({
  song,
  onArtistClick,
  useDarkText,
  bodyToneClass,
  bodyShadowClass,
  className,
}: {
  song: ISong
  onArtistClick: (id?: string) => void
  useDarkText: boolean
  bodyToneClass: string
  bodyShadowClass: string
  className?: string
}) {
  const { artist, artistId, artists } = song

  if (artists && artists.length > 1) {
    const data = artists.slice(0, ALBUM_ARTISTS_MAX_NUMBER)
    const cleaned = data
      .map(({ id, name }) => ({
        id,
        name: name?.replace(/^[\s,;•]+/, '').trim() ?? '',
      }))
      .filter((entry) => entry.name.length > 0)

    const fullText = cleaned.map((entry) => entry.name).join(', ')

    if (cleaned.length > 0) {
      return (
        <span
          className={cn(
            'inline-block min-w-0 max-w-full truncate whitespace-nowrap',
            bodyToneClass,
            bodyShadowClass,
            className,
          )}
          title={fullText}
        >
          {cleaned.map((entry, index) => (
            <span key={`${entry.id ?? entry.name}-${index}`}>
              <span
                className={cn(
                  'transition-colors',
                  entry.id &&
                    (useDarkText
                      ? 'cursor-pointer hover:text-black'
                      : 'cursor-pointer hover:text-foreground'),
                )}
                onClick={() => onArtistClick(entry.id)}
              >
                {entry.name}
              </span>
              {index < cleaned.length - 1 && (
                <span className={mutedInlineTone(useDarkText)}>, </span>
              )}
            </span>
          ))}
        </span>
      )
    }
  }

  return (
    <span
      className={cn(
        'inline-block transition-colors',
        bodyToneClass,
        bodyShadowClass,
        className,
        artistId &&
          (useDarkText
            ? 'cursor-pointer hover:text-black'
            : 'cursor-pointer hover:text-foreground'),
      )}
      onClick={() => onArtistClick(artistId)}
    >
      {artist}
    </span>
  )
}

function mutedInlineTone(useDarkText: boolean) {
  return useDarkText ? 'text-black/72' : 'text-foreground/65'
}
