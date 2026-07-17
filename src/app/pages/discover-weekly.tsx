import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import ImageHeader from '@/app/components/album/image-header'
import { BadgesData } from '@/app/components/header-info'
import ListWrapper from '@/app/components/list-wrapper'
import { PlaylistPageActions } from '@/app/components/playlist/page-actions'
import { DataTable } from '@/app/components/ui/data-table'
import { PageLoading, PageState } from '@/app/components/ui/page-state'
import { useDiscoverWeekly } from '@/app/hooks/use-discover-weekly'
import { songsColumns } from '@/app/tables/songs-columns'
import { exportPlaylist } from '@/service/export-playlist'
import { useAISettings, usePlayerActions } from '@/store/player.store'
import { ColumnFilter } from '@/types/columnFilter'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'
import { shuffleSongList } from '@/utils/songListFunctions'

export default function DiscoverWeeklyPage() {
  const columns = songsColumns()
  const { t } = useTranslation()
  const { enabled: aiEnabled } = useAISettings()
  const {
    playlist,
    isGenerating,
    error,
    lastGenerated,
    artistsUsed,
    dayKey,
    generate,
    isConfigured,
  } = useDiscoverWeekly()
  const { setSongList } = usePlayerActions()
  const [isSaving, setIsSaving] = useState(false)

  // Note: Catch-up check happens automatically in the hook on mount

  if (!isConfigured) {
    return (
      <PageState
        title={aiEnabled ? 'Discover Daily Setup' : t('discoverWeekly.setupTitle')}
        description={aiEnabled ? 'Provide your OpenRouter API Key in Services Settings to enable AI recommendations.' : `${t('discoverWeekly.setupDescription')} ${t('discoverWeekly.setupInstructions')}`}
      />
    )
  }

  if (error) {
    return (
      <PageState
        variant="error"
        title={t('states.error.title')}
        description={error}
        actionLabel={t('states.error.retry')}
        onAction={generate}
      />
    )
  }

  if (isGenerating) {
    return <PageLoading label={aiEnabled ? 'Generating Discover Daily playlist...' : t('discoverWeekly.generatingPlaylist')} />
  }

  if (playlist.length === 0) {
    return (
      <PageState
        title={aiEnabled ? 'Discover Daily' : t('discoverWeekly.emptyTitle')}
        description={aiEnabled ? 'Your personalized daily mix is ready to be generated.' : t('discoverWeekly.emptyDescription')}
        actionLabel={t('discoverWeekly.generatePlaylist')}
        onAction={generate}
      />
    )
  }

  const columnsToShow: ColumnFilter[] = [
    'index',
    'title',
    'album',
    'duration',
    'select',
  ]

  const totalDuration = playlist.reduce((acc, song) => acc + song.duration, 0)
  const duration = convertSecondsToHumanRead(totalDuration)

  const songCount = t('playlist.songCount', { count: playlist.length })
  const artistsCount =
    artistsUsed.length > 0
      ? t('discoverWeekly.artistCount', { count: artistsUsed.length })
      : null

  const lastUpdated = lastGenerated
    ? new Date(lastGenerated).toLocaleDateString()
    : null

  const badges: BadgesData = [
    { content: songCount, type: 'text' },
    { content: duration, type: 'text' },
    { content: artistsCount, type: 'text' },
    {
      content: lastUpdated
        ? t('discoverWeekly.updated', { date: lastUpdated })
        : null,
      type: 'text',
    },
  ]

  const handlePlayAll = () => {
    setSongList(playlist, 0)
  }

  const handlePlayShuffle = () => {
    const shuffled = shuffleSongList(playlist, 0, true)
    setSongList(shuffled, 0)
  }

  const handleSaveAsPlaylist = async () => {
    setIsSaving(true)
    try {
      const playlistName = `Discover Daily ${dayKey || new Date().toISOString().split('T')[0]}`
      await exportPlaylist({
        name: playlistName,
        songs: playlist,
        comment: `Generated on ${lastUpdated || new Date().toLocaleDateString()} with ${artistsUsed.length} artists`,
        isPublic: false,
      })
      toast.success(t('discoverWeekly.savedSuccess', { name: playlistName }))
    } catch (error) {
      console.error('[Discover Daily] Save failed:', error)
      toast.error(
        t('discoverWeekly.saveError', {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }
  // Use first song's cover art as playlist cover
  const coverArt = playlist.length > 0 ? playlist[0].coverArt : undefined

  return (
    <div className="w-full">
      <ImageHeader
        type={aiEnabled ? 'AI Recommendation' : t('discoverWeekly.headerType')}
        title={aiEnabled ? 'Discover Daily' : t('discoverWeekly.emptyTitle')}
        subtitle={aiEnabled ? 'Your personalized daily mix based on your listening habits' : t('discoverWeekly.headerSubtitle')}
        coverArtId={coverArt}
        coverArtType="album"
        coverArtSize="700"
        coverArtAlt={aiEnabled ? 'Discover Daily' : t('discoverWeekly.emptyTitle')}
        badges={badges}
        isPlaylist={true}
      />

      <ListWrapper>
        <PlaylistPageActions
          onPlayAll={handlePlayAll}
          onShuffle={handlePlayShuffle}
          onRefresh={generate}
          isRefreshing={isGenerating}
          onSave={handleSaveAsPlaylist}
          isSaving={isSaving}
        />

        <DataTable
          columns={columns}
          data={playlist}
          handlePlaySong={(row) => setSongList(playlist, row.index)}
          columnFilter={columnsToShow}
          noRowsMessage={t('discoverWeekly.noSongs')}
          variant="modern"
        />
      </ListWrapper>
    </div>
  )
}
