import clsx from 'clsx'
import { Play, Repeat } from 'lucide-react'
import { isFirefox } from 'react-device-detect'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

export function HeaderItem({ song, index }: { song: ISong; index: number }) {
  const { setSongList } = usePlayerActions()

  async function handlePlaySongAlbum(song: ISong) {
    const album = await subsonic.albums.getOne(song.albumId)

    if (album) {
      const songIndex = album.song.findIndex((item) => item.id === song.id)

      setSongList(album.song, songIndex)
    }
  }

  return (
    <div
      className={clsx(
        'w-full h-[250px] 2xl:h-[300px] relative',
        isFirefox && 'bg-black/60',
      )}
    >
      <ImageLoader id={song.coverArt} type="song" size={400}>
        {(src) => (
          <>
            <div
              data-testid="header-bg"
              className="absolute -inset-10 bg-cover bg-center z-0 bg-skeleton"
              style={{
                backgroundImage: `url(${src})`,
                filter: isFirefox ? 'blur(24px)' : undefined,
              }}
            />
            <div
              className={clsx(
                'w-full h-full bg-gradient-to-b from-background/40 to-background/80 absolute z-10',
                !isFirefox && 'backdrop-blur-xl',
              )}
            >
              <div className="flex h-full p-4 2xl:p-6 gap-4">
                <div
                  className="h-full aspect-square relative group bg-skeleton rounded-lg"
                  data-testid="header-image-container"
                >
                  {index === 0 && (
                    <div className="absolute left-2 top-2 z-20 inline-flex items-center rounded-md border border-white/20 bg-black/50 px-1.5 py-1 text-white backdrop-blur-sm">
                      <Repeat className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {index === 1 && (
                    <div className="absolute left-2 top-2 z-20 inline-flex items-center rounded-md border border-white/25 bg-primary/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Neu
                    </div>
                  )}
                  <LazyLoadImage
                    src={src}
                    alt={song.title}
                    effect="opacity"
                    width="100%"
                    height="100%"
                    className="aspect-square rounded-lg object-cover bg-center absolute inset-0 z-0"
                    data-testid="header-image"
                  />
                  <div className="w-full h-full flex items-center justify-center rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-colors duration-300 absolute inset-0 z-10">
                    <Button
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full w-14 h-14"
                      variant="outline"
                      onClick={() => handlePlaySongAlbum(song)}
                      data-testid="header-play-button"
                    >
                      <Play className="fill-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-1 h-full flex-col justify-end">
                  <Link to={ROUTES.ALBUM.PAGE(song.albumId)} className="block w-fit pb-2 overflow-visible">
                    <h1
                      data-testid="header-title"
                      className="w-full scroll-m-20 text-3xl 2xl:text-4xl font-bold tracking-tight mb-0 2xl:mb-1 leading-relaxed pb-1 overflow-visible hover:underline"
                    >
                      {song.title}
                    </h1>
                  </Link>
                  {!song.artistId ? (
                    <h4
                      data-testid="header-artist"
                      className="scroll-m-20 text-lg 2xl:text-xl font-semibold tracking-tight opacity-70"
                    >
                      {song.artist}
                    </h4>
                  ) : (
                    <Link
                      to={ROUTES.ARTIST.PAGE(song.artistId)}
                      className="w-fit"
                    >
                      <h4
                        data-testid="header-artist"
                        className="scroll-m-20 text-lg 2xl:text-xl font-semibold tracking-tight opacity-70 hover:underline"
                      >
                        {song.artist}
                      </h4>
                    </Link>
                  )}
                  <div className="mt-1 2xl:mt-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-sm text-foreground/80 backdrop-blur-sm">
                      {song.genre !== undefined && (
                        <Link
                          to={ROUTES.ALBUMS.GENRE(song.genre)}
                          className="flex"
                          data-testid="header-genre"
                        >
                          <span className="hover:text-foreground transition-colors">
                            {song.genre}
                          </span>
                        </Link>
                      )}
                      {song.genre !== undefined &&
                        (song.year || song.duration) && (
                          <span className="text-foreground/40">•</span>
                        )}
                      {song.year && (
                        <span data-testid="header-year">{song.year}</span>
                      )}
                      {song.year && (
                        <span className="text-foreground/40">•</span>
                      )}
                      <span data-testid="header-duration">
                        {convertSecondsToTime(song.duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </ImageLoader>
    </div>
  )
}
