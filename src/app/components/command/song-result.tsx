import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CommandGroup, CommandItem } from '@/app/components/ui/command'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { navigateSafe } from '@/utils/navigateSafe'
import {
  CustomGroup,
  CustomGroupHeader,
  CustomHeaderLink,
} from './command-group'
import { CommandItemProps } from './command-menu'
import { ResultItem } from './result-item'

type SongResultProps = CommandItemProps & {
  query: string
  songs: ISong[]
}

export function CommandSongResult({
  query,
  songs,
  runCommand,
}: SongResultProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playSong } = usePlayerActions()

  return (
    <CustomGroup>
      <CustomGroupHeader>
        <span>{t('sidebar.songs')}</span>
        <CustomHeaderLink
          onClick={() =>
            runCommand(() => navigateSafe(navigate, ROUTES.SONGS.SEARCH(query)))
          }
        >
          {t('generic.seeMore')}
        </CustomHeaderLink>
      </CustomGroupHeader>
      <CommandGroup className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-3 md:[&_[cmdk-group-items]]:grid-cols-4 lg:[&_[cmdk-group-items]]:grid-cols-5 [&_[cmdk-group-items]]:gap-2.5 [&_[cmdk-group-items]]:px-3 [&_[cmdk-group-items]]:pb-2">
        {songs.length > 0 &&
          songs.map((song) => (
            <CommandItem
              key={`song-${song.id}`}
              value={`song-${song.id}`}
              className="sona-panel-soft p-2 items-start cursor-pointer transition-colors hover:border-primary/35 hover:bg-accent/35 aria-selected:bg-accent/55"
              onSelect={() => {
                runCommand(() =>
                  navigateSafe(
                    navigate,
                    ROUTES.ALBUM.PAGE(song.albumId, song.id),
                  ),
                )
              }}
            >
              <ResultItem
                coverArt={song.coverArt}
                coverArtType="song"
                title={song.title}
                artist={song.artist}
                onClick={() => playSong(song)}
              />
            </CommandItem>
          ))}
      </CommandGroup>
    </CustomGroup>
  )
}
