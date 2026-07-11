import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { LinkWithoutTo } from '@/app/components/song/artist-link'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { useMainDrawerState, usePlayerCurrentSong } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { ALBUM_ARTISTS_MAX_NUMBER } from '@/utils/multipleArtists'

export function CurrentSongInfo() {
  const currentSong = usePlayerCurrentSong()
  const { closeDrawer } = useMainDrawerState()
  const { title, album, albumId, artist, coverArt } = currentSong

  return (
    <div className="flex-shrink-0 w-64 flex flex-col gap-4">
      <div className="w-full aspect-square rounded-lg overflow-hidden shadow-2xl bg-accent">
        <ImageLoader id={coverArt} type="song" size={900}>
          {(src) => (
            <img
              id="song-info-image"
              src={src}
              alt={`${artist} - ${title}`}
              className="w-full h-full object-cover text-transparent"
            />
          )}
        </ImageLoader>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight truncate text-shadow-lg">
          {albumId ? (
            <Link
              to={ROUTES.ALBUM.PAGE(albumId)}
              className="hover:underline"
              onClick={closeDrawer}
            >
              {title}
            </Link>
          ) : (
            <>{title}</>
          )}
        </h4>

        <div className="text-sm text-muted-foreground truncate text-shadow-lg">
          <QueueArtistsLinks song={currentSong} />
        </div>

        {album && albumId && (
          <Link
            to={ROUTES.ALBUM.PAGE(albumId)}
            className="text-sm text-muted-foreground truncate hover:text-foreground hover:underline transition-colors"
            onClick={closeDrawer}
          >
            {album}
          </Link>
        )}
      </div>
    </div>
  )
}

function QueueArtistsLinks({ song }: { song: ISong }) {
  const { closeDrawer } = useMainDrawerState()
  const { artist, artistId, artists } = song

  if (artists && artists.length > 1) {
    const data = artists.slice(0, ALBUM_ARTISTS_MAX_NUMBER)

    return (
      <div className="flex items-center flex-wrap gap-1">
        {data.map(({ id, name }, index) => (
          <div key={id} className="flex">
            <ArtistLink id={id} name={name} onClick={closeDrawer} />
            {index < data.length - 1 && ','}
          </div>
        ))}
      </div>
    )
  }

  return <ArtistLink id={artistId} name={artist} onClick={closeDrawer} />
}

type ArtistLinkProps = LinkWithoutTo & {
  id?: string
  name: string
}

function ArtistLink({ id, name, className, ...props }: ArtistLinkProps) {
  return (
    <Link
      className={cn(
        className,
        id ? 'hover:underline hover:text-foreground' : 'pointer-events-none',
      )}
      to={ROUTES.ARTIST.PAGE(id ?? '')}
      {...props}
    >
      {name}
    </Link>
  )
}
