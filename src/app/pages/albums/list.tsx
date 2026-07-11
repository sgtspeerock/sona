import { useMemo } from 'react'
import { AlbumGridCard } from '@/app/components/albums/album-grid-card'
import { EmptyAlbums } from '@/app/components/albums/empty-page'
import { AlbumsHeader } from '@/app/components/albums/header'
import { AlbumsFallback } from '@/app/components/fallbacks/album-fallbacks'
import { GridViewWrapper } from '@/app/components/grid-view-wrapper'
import ListWrapper from '@/app/components/list-wrapper'
import { LibraryPagination } from '@/app/components/ui/library-pagination'
import { dedupeAlbumsForDisplay } from '@/utils/albumDedup'
import { useAlbumsListModel } from './list.model'

export default function AlbumsList() {
  const {
    isLoading,
    isEmpty,
    albums,
    albumsCount,
    pageCount,
    pageIndex,
    pageSize,
    setPageIndex,
  } = useAlbumsListModel()
  const displayAlbums = useMemo(() => dedupeAlbumsForDisplay(albums), [albums])
  const displayAlbumsCount = displayAlbums.length

  if (isLoading) return <AlbumsFallback />
  if (isEmpty || displayAlbumsCount === 0) return <EmptyAlbums />

  return (
    <div className="w-full h-full">
      <AlbumsHeader albumCount={albumsCount} />

      <ListWrapper className="px-0 pt-3">
        <GridViewWrapper
          list={displayAlbums}
          data-testid="albums-grid"
          type="albums"
        >
          {(album) => <AlbumGridCard album={album} />}
        </GridViewWrapper>

        <LibraryPagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          itemCount={albumsCount}
          pageSize={pageSize}
          visibleCount={displayAlbumsCount}
          onFirstPage={() => setPageIndex(0)}
          onPreviousPage={() => setPageIndex(Math.max(0, pageIndex - 1))}
          onNextPage={() =>
            setPageIndex(Math.min(pageCount - 1, pageIndex + 1))
          }
          onLastPage={() => setPageIndex(pageCount - 1)}
          className="mx-8 mb-8 mt-6"
        />
      </ListWrapper>
    </div>
  )
}
