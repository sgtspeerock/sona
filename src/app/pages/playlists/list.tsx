import clsx from 'clsx'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ShadowHeader } from '@/app/components/album/shadow-header'
import { SongListFallback } from '@/app/components/fallbacks/song-fallbacks'
import { HeaderTitle } from '@/app/components/header-title'
import ListWrapper from '@/app/components/list-wrapper'
import { EmptyPlaylistsPage } from '@/app/components/playlist/empty-page'
import { Button } from '@/app/components/ui/button'
import { DataTable } from '@/app/components/ui/data-table'
import { PageState } from '@/app/components/ui/page-state'
import { usePlaylistsQuery } from '@/app/hooks/use-playlists-query'
import { playlistsColumns } from '@/app/tables/playlists-columns'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { usePlaylists } from '@/store/playlists.store'

export default function PlaylistsPage() {
  const { setPlaylistDialogState } = usePlaylists()
  const { setSongList } = usePlayerActions()
  const { t } = useTranslation()

  const { data: playlists, isLoading, isError, refetch } = usePlaylistsQuery()

  const columns = playlistsColumns()

  async function handlePlayPlaylist(playlistId: string) {
    const playlist = await subsonic.playlists.getOne(playlistId)

    if (playlist && playlist.entry.length > 0) {
      setSongList(playlist.entry, 0)
    }
  }

  if (isLoading) return <SongListFallback />
  if (isError) {
    return (
      <PageState
        variant="error"
        title={t('states.error.title')}
        description={t('states.error.description', {
          status: 500,
          detail: t('generic.error'),
        })}
        actionLabel={t('states.error.retry')}
        onAction={() => {
          refetch().catch(() => undefined)
        }}
      />
    )
  }
  if (!playlists) {
    return (
      <PageState
        title={t('states.empty.title')}
        description={t('states.empty.noResults')}
      />
    )
  }

  const showTable = playlists.length > 0

  return (
    <div className={clsx('w-full', showTable ? 'h-full' : 'h-empty-content')}>
      <ShadowHeader>
        <div className="w-full flex items-center justify-between">
          <HeaderTitle
            title={t('sidebar.playlists')}
            count={playlists.length}
          />
        </div>

        <Button
          size="sm"
          variant="default"
          className="h-9 px-3.5"
          onClick={() => setPlaylistDialogState(true)}
        >
          <PlusIcon className="w-5 h-5 -ml-[3px]" />
          <span className="ml-2">{t('playlist.form.create.title')}</span>
        </Button>
      </ShadowHeader>

      {!showTable && <EmptyPlaylistsPage />}

      {showTable && (
        <ListWrapper>
          <DataTable
            columns={columns}
            data={playlists}
            showPagination={playlists.length > 10}
            showSearch={true}
            searchColumn="name"
            handlePlaySong={(row) => handlePlayPlaylist(row.original.id)}
            allowRowSelection={false}
            dataType="playlist"
            noRowsMessage={t('options.playlist.notFound')}
          />
        </ListWrapper>
      )}
    </div>
  )
}
