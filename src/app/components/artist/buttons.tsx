import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Rabbit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Actions } from '@/app/components/actions'
import { useRabbitHole } from '@/app/hooks/use-rabbit-hole'
import { useSongList } from '@/app/hooks/use-song-list'
import { subsonic } from '@/service/subsonic'
import { useAppPages } from '@/store/app.store'
import { usePlayerActions } from '@/store/player.store'
import { IArtist } from '@/types/responses/artist'
import { queryKeys } from '@/utils/queryKeys'
import { ArtistOptions } from './options'

interface ArtistButtonsProps {
  artist: IArtist
  showInfoButton: boolean
  isArtistEmpty: boolean
}

export function ArtistButtons({
  artist,
  showInfoButton,
  isArtistEmpty,
}: ArtistButtonsProps) {
  const { t } = useTranslation()
  const { setSongList } = usePlayerActions()
  const { showInfoPanel, toggleShowInfoPanel } = useAppPages()
  const { getArtistAllSongs } = useSongList()
  const { startRabbitHole, isLoading: rabbitHoleLoading } = useRabbitHole()

  const isArtistStarred = artist.starred !== undefined

  const queryClient = useQueryClient()

  const starMutation = useMutation({
    mutationFn: subsonic.star.handleStarItem,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.artist.single, artist.id],
      })
    },
  })

  function handleLikeButton() {
    if (!artist) return
    starMutation.mutate({
      id: artist.id,
      starred: isArtistStarred,
    })
  }

  async function handlePlayArtistRadio(shuffle = false) {
    const songList = await getArtistAllSongs(artist?.name || '')

    if (songList) {
      setSongList(songList, 0, shuffle)
    }
  }

  function handleRabbitHole() {
    startRabbitHole({
      type: 'artist',
      artistName: artist.name,
      artistId: artist.id,
    })
  }

  const buttonsTooltips = {
    play: t('playlist.buttons.play', { name: artist.name }),
    shuffle: t('playlist.buttons.shuffle', { name: artist.name }),
    options: t('playlist.buttons.options', { name: artist.name }),
    like: () => {
      return isArtistStarred
        ? t('album.buttons.dislike', { name: artist.name })
        : t('album.buttons.like', { name: artist.name })
    },
    info: () => {
      return showInfoPanel ? t('generic.hideDetails') : t('generic.showDetails')
    },
    rabbitHole: t('rabbitHole.tooltip'),
  }

  if (isArtistEmpty) {
    return <div className="h-8 w-full" />
  }

  return (
    <Actions.Container>
      <Actions.Button
        tooltip={buttonsTooltips.play}
        buttonStyle="primary"
        onClick={() => handlePlayArtistRadio()}
      >
        <Actions.PlayIcon />
        <span>{t('player.tooltips.play', 'Play')}</span>
      </Actions.Button>

      <Actions.Button
        tooltip={buttonsTooltips.shuffle}
        onClick={() => handlePlayArtistRadio(true)}
      >
        <Actions.ShuffleIcon />
      </Actions.Button>

      <Actions.Button
        tooltip={buttonsTooltips.rabbitHole}
        onClick={handleRabbitHole}
        disabled={rabbitHoleLoading}
      >
        <Rabbit className="h-5 w-5" />
      </Actions.Button>

      <Actions.Button
        tooltip={buttonsTooltips.like()}
        onClick={handleLikeButton}
      >
        <Actions.LikeIcon isStarred={isArtistStarred} />
      </Actions.Button>

      {showInfoButton && (
        <Actions.Button
          tooltip={buttonsTooltips.info()}
          onClick={toggleShowInfoPanel}
        >
          <Actions.InfoIcon />
        </Actions.Button>
      )}

      <Actions.Dropdown
        tooltip={buttonsTooltips.options}
        options={<ArtistOptions artist={artist} />}
      />
    </Actions.Container>
  )
}
