import { Link } from 'react-router-dom'
import { CoverImage } from '@/app/components/table/cover-image'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { useMainDrawerState, usePlayerActions } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { ALBUM_ARTISTS_MAX_NUMBER } from '@/utils/multipleArtists'

export function TableSongTitle({ song }: { song: ISong }) {
  const { checkActiveSong } = usePlayerActions()
  const isActive = checkActiveSong(song.id)

  return (
    <div className="flex w-full gap-2 items-center">
      <CoverImage
        coverArt={song.coverArt}
        coverArtType="song"
        altText={song.title}
      />
      <div className="flex flex-col w-full justify-center truncate">
        <span
          className={cn(
            'text-sm font-medium truncate transition-colors duration-150',
            isActive ? 'text-primary font-semibold' : 'text-foreground',
          )}
        >
          {song.title}
        </span>
        <div className="flex items-center truncate">
          <TableArtists song={song} />
        </div>
      </div>
    </div>
  )
}

type ArtistsLinksProps = {
  song: ISong
}

export function TableArtists({ song }: ArtistsLinksProps) {
  const { artists, artistId, artist } = song

  if (artists && artists.length > 1) {
    return <ArtistsLinks song={song} />
  }

  if (!artistId) {
    return (
      <span className="text-xs text-foreground/70 text-nowrap transition-colors duration-150">
        {artist}
      </span>
    )
  }

  return <ArtistLink id={artistId} name={artist} />
}

function ArtistsLinks({ song }: ArtistsLinksProps) {
  const { artists, artistId, artist } = song

  if (artists && artists.length > 1) {
    const reducedArtists = artists.slice(0, ALBUM_ARTISTS_MAX_NUMBER)
    const fullText = artists.map(({ name }) => name).join(', ')
    return (
      <div
        className="flex items-center gap-1 text-xs text-foreground/70 w-full maskImage-marquee-fade-finished"
        title={fullText}
      >
        {reducedArtists.map(({ id, name }, index) => (
          <div key={id} className="flex items-center">
            <ArtistLink id={id} name={name} />
            {index < reducedArtists.length - 1 && ','}
          </div>
        ))}
      </div>
    )
  }

  return <ArtistLink id={artistId} name={artist} />
}

type ArtistLinkProps = {
  id?: string
  name: string
}

function ArtistLink({ id, name }: ArtistLinkProps) {
  const { mainDrawerState, closeDrawer } = useMainDrawerState()

  return (
    <Link
      to={ROUTES.ARTIST.PAGE(id ?? '')}
      className={cn('w-fit inline-flex', !id && 'pointer-events-none')}
      data-testid="track-artist-url"
      onClick={() => {
        if (mainDrawerState) closeDrawer()
      }}
    >
      <span
        className={cn(
          'text-xs text-foreground/70 text-nowrap transition-colors duration-150',
          id && 'hover:underline hover:text-foreground',
        )}
      >
        {name}
      </span>
    </Link>
  )
}
