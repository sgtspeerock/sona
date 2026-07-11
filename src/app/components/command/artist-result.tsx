import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CommandGroup, CommandItem } from '@/app/components/ui/command'
import { useSongList } from '@/app/hooks/use-song-list'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import { ISimilarArtist } from '@/types/responses/artist'
import { navigateSafe } from '@/utils/navigateSafe'
import { CustomGroup, CustomGroupHeader } from './command-group'
import { CommandItemProps } from './command-menu'
import { ResultItem } from './result-item'

type ArtistResultProps = CommandItemProps & {
  artists: ISimilarArtist[]
}

export function CommandArtistResult({
  artists,
  runCommand,
}: ArtistResultProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getArtistAllSongs } = useSongList()
  const { setSongList } = usePlayerActions()

  async function handlePlayArtistRadio(artist: ISimilarArtist) {
    const artistSongs = await getArtistAllSongs(artist.name)
    if (artistSongs) setSongList(artistSongs, 0)
  }

  return (
    <CustomGroup>
      <CustomGroupHeader>
        <span>{t('sidebar.artists')}</span>
      </CustomGroupHeader>
      <CommandGroup className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-3 md:[&_[cmdk-group-items]]:grid-cols-4 lg:[&_[cmdk-group-items]]:grid-cols-5 [&_[cmdk-group-items]]:gap-2.5 [&_[cmdk-group-items]]:px-3 [&_[cmdk-group-items]]:pb-2">
        {artists.length > 0 &&
          artists.map((artist) => (
            <CommandItem
              key={`artist-${artist.id}`}
              value={`artist-${artist.id}`}
              className="sona-panel-soft p-2 items-start cursor-pointer transition-colors hover:border-primary/35 hover:bg-accent/35 aria-selected:bg-accent/55"
              onSelect={() => {
                runCommand(() =>
                  navigateSafe(navigate, ROUTES.ARTIST.PAGE(artist.id)),
                )
              }}
            >
              <ResultItem
                coverArt={artist.coverArt}
                coverArtType={artist.coverArtType ?? 'artist'}
                title={artist.name}
                artist={t('artist.info.albumsCount', {
                  count: artist.albumCount,
                })}
                onClick={() => handlePlayArtistRadio(artist)}
              />
            </CommandItem>
          ))}
      </CommandGroup>
    </CustomGroup>
  )
}
