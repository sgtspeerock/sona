import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HeaderFallback,
  PreviewListFallback,
} from '@/app/components/fallbacks/home-fallbacks'
import AlbumHeader from '@/app/components/home/carousel/album-header'
import { DiscoverWeeklyCard } from '@/app/components/home/discover-weekly-card'
import { DaytimeMoodCard } from '@/app/components/home/daytime-mood-card'
import {
  SessionEnergyCard,
  GenreCard,
  AnniversaryRadioCard,
} from '@/app/components/home/genre-discovery'
import { RecentAddedColumn } from '@/app/components/home/recent-added-column'
import { ThisIsArtist } from '@/app/components/home/this-is-artist'
import { PageState } from '@/app/components/ui/page-state'
import { Button } from '@/app/components/ui/button'
import { Check, Edit2, Plus, Trash2, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/app/components/ui/dropdown-menu'
import { DashboardEditDialog } from '@/app/components/home/dashboard-edit-dialog'
import { useDashboardLayoutSettings, useIsDashboardEditing, usePlayerActions } from '@/store/player.store'
import {
  useGetLatestReleaseAlbum,
  useHomeDashboardData,
  useGetAnniversaryRadio,
} from '@/app/hooks/use-home'
import { useRenderCounter } from '@/app/hooks/use-render-counter'

const CARD_LABELS: Record<string, string> = {
  'discover-daily': 'Discover Daily / Weekly',
  'session-vibe': 'Session Vibe',
  'daytime-mood': 'Daytime Mood Mix',
  'top-1-genre': 'Top 1 Genre Radio',
  'top-2-genre': 'Top 2 Genre Radio',
  'on-this-day': 'On This Day (Jubiläum)',
  'this-is': 'This Is Artist',
}

export default function Home() {
  useRenderCounter('HomePage')
  const { t } = useTranslation()

  const isEditing = useIsDashboardEditing()
  const { setIsDashboardEditing } = usePlayerActions()
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const layoutSettings = useDashboardLayoutSettings()
  const {
    row1,
    row2,
    row3,
    setRow1,
    setRow2,
    setRow3,
    columnsTop,
    columnsMiddle,
    columnsBottom,
    setColumnsTop,
    setColumnsMiddle,
    setColumnsBottom,
  } = layoutSettings
  const anniversaryRadio = useGetAnniversaryRadio()

  const getCardLabel = (cardId: string | null) => {
    if (!cardId) return ''
    if (cardId === 'top-1-genre' && genres[0]?.value) {
      return `Top 1 Genre (${genres[0].value})`
    }
    if (cardId === 'top-2-genre' && genres[1]?.value) {
      return `Top 2 Genre (${genres[1].value})`
    }
    return CARD_LABELS[cardId] || cardId
  }

  const currentLayout = [...row1, ...row2, ...row3].filter((x): x is string => !!x)

  const handleSelectOption = (optionId: string | null) => {
    if (activeSlot === null) return

    if (activeSlot < columnsTop) {
      const newRow1 = [...row1]
      newRow1[activeSlot] = optionId as any
      setRow1(newRow1)
    } else if (activeSlot < columnsTop + columnsMiddle) {
      const indexInRow2 = activeSlot - columnsTop
      const newRow2 = [...row2]
      newRow2[indexInRow2] = optionId as any
      setRow2(newRow2)
    } else {
      const indexInRow3 = activeSlot - columnsTop - columnsMiddle
      const newRow3 = [...row3]
      newRow3[indexInRow3] = optionId as any
      setRow3(newRow3)
    }
    setActiveSlot(null)
  }

  const handleClearSlot = (slotIndex: number) => {
    if (slotIndex < columnsTop) {
      const newRow1 = [...row1]
      newRow1[slotIndex] = null as any
      setRow1(newRow1)
    } else if (slotIndex < columnsTop + columnsMiddle) {
      const indexInRow2 = slotIndex - columnsTop
      const newRow2 = [...row2]
      newRow2[indexInRow2] = null as any
      setRow2(newRow2)
    } else {
      const indexInRow3 = slotIndex - columnsTop - columnsMiddle
      const newRow3 = [...row3]
      newRow3[indexInRow3] = null as any
      setRow3(newRow3)
    }
  }

  const openEditModal = (slotIndex: number) => {
    setActiveSlot(slotIndex)
  }

  const renderCard = (cardId: string | null, layout: 'wide' | 'narrow') => {
    switch (cardId) {
      case 'discover-daily':
        return <DiscoverWeeklyCard layout={layout} />
      case 'session-vibe':
        return <SessionEnergyCard layout={layout} />
      case 'daytime-mood':
        return <DaytimeMoodCard layout={layout} />
      case 'top-1-genre':
        return genres[0] ? (
          <GenreCard
            genre={genres[0].value}
            albumCount={genres[0].albumCount}
            layout={layout}
          />
        ) : null
      case 'top-2-genre':
        return genres[1] ? (
          <GenreCard
            genre={genres[1].value}
            albumCount={genres[1].albumCount}
            layout={layout}
          />
        ) : null
      case 'on-this-day':
        return <AnniversaryRadioCard data={anniversaryRadio.data} layout={layout} />
      case 'this-is':
        return <ThisIsArtist layout={layout} />
      default:
        return null
    }
  }

  const {
    similarArtists,
    recentlyPlayed,
    recentlyAdded,
    genres,
    isGenresLoading,
  } = useHomeDashboardData()
  const latestReleaseQuery = useGetLatestReleaseAlbum()
  const latestReleasedAlbum = latestReleaseQuery.data

  const heroAlbums = useMemo(() => {
    const recommendedAlbums = similarArtists.data?.list || []
    if (!latestReleasedAlbum) return recommendedAlbums

    const dedupedRecommended = recommendedAlbums.filter(
      (album) => album.id !== latestReleasedAlbum.id,
    )

    return [latestReleasedAlbum, ...dedupedRecommended]
  }, [latestReleasedAlbum, similarArtists.data?.list])

  const hasCriticalError =
    similarArtists.isError && recentlyPlayed.isError && recentlyAdded.isError

  if (hasCriticalError) {
    return (
      <PageState
        variant="error"
        title={t('states.error.title')}
        description={t('states.error.homeDescription')}
        actionLabel={t('states.error.retry')}
        onAction={() => {
          Promise.all([
            similarArtists.refetch(),
            recentlyPlayed.refetch(),
            recentlyAdded.refetch(),
          ]).catch(() => undefined)
        }}
      />
    )
  }

  const hasAnyHomeContent =
    (similarArtists.data?.list?.length ?? 0) > 0 ||
    (recentlyPlayed.data?.list?.length ?? 0) > 0 ||
    (recentlyAdded.data?.list?.length ?? 0) > 0 ||
    genres.length > 0

  const allLoaded =
    !similarArtists.isLoading &&
    !recentlyPlayed.isLoading &&
    !recentlyAdded.isLoading &&
    !isGenresLoading
  const showRecentlyAddedFallback =
    (recentlyAdded.isLoading || recentlyAdded.isFetching) &&
    !(recentlyAdded.data?.list?.length ?? 0)
  const showHeaderFallback =
    (similarArtists.isLoading || similarArtists.isFetching) &&
    !(similarArtists.data?.list?.length ?? 0)

  if (allLoaded && !hasAnyHomeContent) {
    return (
      <PageState
        title={t('states.empty.title')}
        description={t('states.empty.homeDescription')}
      />
    )
  }

  return (
    <div className="relative min-h-full w-full overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-52 rounded-full bg-primary/[0.035] blur-3xl" />
      <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-5">
        <main className="grid min-w-0 content-start gap-5">
          <section className="h-[249px] min-w-0 min-[1700px]:h-[267px]">
            {showHeaderFallback ? (
              <HeaderFallback />
            ) : (
              <AlbumHeader
                albums={heroAlbums}
                newReleaseAlbumId={latestReleasedAlbum?.id}
                compact
              />
            )}
          </section>

          {isEditing && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Settings className="h-4.5 w-4.5 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-[0.81rem] font-semibold text-foreground leading-snug">Bearbeitungsmodus aktiv</h4>
                  <p className="text-[0.7rem] font-medium text-muted-foreground leading-normal mt-0.5">Passe das Layout der Startseite an. Du kannst Kacheln hinzufügen, verschieben oder entfernen.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-lg shrink-0"
                onClick={() => setIsDashboardEditing(false)}
              >
                <Check className="h-3.5 w-3.5" />
                Fertig
              </Button>
            </div>
          )}

          {/* Primary playlists */}
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-4 px-1">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                  Für dich
                </h2>
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  {/* Dropdown for Row 1 (Oben) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2.5 px-2.5 border-border/40 hover:bg-card/25"
                      >
                        {columnsTop === 1 && (
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                          </svg>
                        )}
                        {columnsTop === 2 && (
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                          </svg>
                        )}
                        {columnsTop === 3 && (
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                            <rect x="9.25" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                            <rect x="16.5" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                          </svg>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">Layout</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44 bg-background-foreground border-border/20 shadow-2xl">
                      <DropdownMenuRadioGroup
                        value={columnsTop.toString()}
                        onValueChange={(val) => setColumnsTop(parseInt(val))}
                      >
                        <DropdownMenuRadioItem value="1" className="cursor-pointer gap-3 justify-between">
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                          </svg>
                          <span className="text-xs text-muted-foreground">1 Kachel</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="2" className="cursor-pointer gap-3 justify-between">
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                          </svg>
                          <span className="text-xs text-muted-foreground">2 Kacheln</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="3" className="cursor-pointer gap-3 justify-between">
                          <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                            <rect x="2" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                            <rect x="9.25" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                            <rect x="16.5" y="2" width="5.5" height="8" className="fill-primary/70" rx="0.5" />
                          </svg>
                          <span className="text-xs text-muted-foreground">3 Kacheln</span>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            <div className={`grid min-w-0 gap-3 [&>*]:h-[172px] ${
              columnsTop === 1 ? 'grid-cols-1' :
              columnsTop === 2 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-3'
            }`}>
              {row1.map((cardId, index) => (
                <div key={index} className="relative group h-full">
                  {cardId ? renderCard(cardId, 'wide') : (
                    <button
                      type="button"
                      onClick={() => openEditModal(index)}
                      className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/10 hover:bg-card/20 hover:border-primary/50 transition-all z-10 cursor-pointer"
                    >
                      <Plus className="h-6 w-6 text-muted-foreground mb-1.5" />
                      <span className="text-xs text-muted-foreground font-medium">Kachel hinzufügen</span>
                    </button>
                  )}
                  {isEditing && cardId && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-[3px] rounded-xl flex flex-col items-center justify-center gap-2 z-20 transition-all border border-primary/20 p-4 text-center">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-primary/80 mb-0.5">Aktiv</span>
                      <span className="text-sm font-bold text-foreground tracking-tight line-clamp-2 px-2 mb-1">{getCardLabel(cardId)}</span>
                      <div className="flex items-center gap-1.5 w-full max-w-[150px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-primary/10 hover:border-primary/40"
                          onClick={() => openEditModal(index)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Ändern
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-destructive/10 hover:border-destructive/40 text-destructive"
                          onClick={() => handleClearSlot(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Leeren
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Secondary playlists */}
          <section className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            {recentlyAdded.data?.list && (
              <RecentAddedColumn albums={recentlyAdded.data.list} />
            )}
            <div className="min-w-0 flex flex-col gap-4">
              {/* Row 2 (Middle) Layout Header */}
              <div className="flex items-end justify-between gap-4 px-1">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                    Weitere Vorschläge
                  </h2>
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    {/* Dropdown for Row 2 (Middle / Layout oben) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2.5 px-2.5 border-border/40 hover:bg-card/25"
                        >
                          {columnsMiddle === 1 && (
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                          )}
                          {columnsMiddle === 2 && (
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                              <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                          )}
                          <span className="text-xs text-muted-foreground font-medium">Layout oben</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44 bg-background-foreground border-border/20 shadow-2xl">
                        <DropdownMenuRadioGroup
                          value={columnsMiddle.toString()}
                          onValueChange={(val) => setColumnsMiddle(parseInt(val))}
                        >
                          <DropdownMenuRadioItem value="1" className="cursor-pointer gap-3 justify-between">
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                            <span className="text-xs text-muted-foreground">1 Kachel</span>
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="2" className="cursor-pointer gap-3 justify-between">
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                              <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                            <span className="text-xs text-muted-foreground">2 Kacheln</span>
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Dropdown for Row 3 (Bottom / Layout unten) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2.5 px-2.5 border-border/40 hover:bg-card/25"
                        >
                          {columnsBottom === 1 && (
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                          )}
                          {columnsBottom === 2 && (
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                              <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                          )}
                          <span className="text-xs text-muted-foreground font-medium">Layout unten</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44 bg-background-foreground border-border/20 shadow-2xl">
                        <DropdownMenuRadioGroup
                          value={columnsBottom.toString()}
                          onValueChange={(val) => setColumnsBottom(parseInt(val))}
                        >
                          <DropdownMenuRadioItem value="1" className="cursor-pointer gap-3 justify-between">
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="20" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                            <span className="text-xs text-muted-foreground">1 Kachel</span>
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="2" className="cursor-pointer gap-3 justify-between">
                            <svg className="h-5 w-12 border-2 border-primary/45 rounded bg-muted/10" viewBox="0 0 24 12">
                              <rect x="2" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                              <rect x="13" y="2" width="9" height="8" className="fill-primary/70" rx="1" />
                            </svg>
                            <span className="text-xs text-muted-foreground">2 Kacheln</span>
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Row 2 (Middle) Grid */}
              <div className={`grid min-w-0 gap-3 [&>*]:h-[172px] ${
                columnsMiddle === 1 ? 'grid-cols-1' :
                'grid-cols-1 sm:grid-cols-2'
              }`}>
                {row2.map((cardId, idx) => {
                  const slotIndex = columnsTop + idx
                  return (
                    <div key={slotIndex} className="relative group h-full">
                      {cardId ? renderCard(cardId, 'narrow') : (
                        <button
                          type="button"
                          onClick={() => openEditModal(slotIndex)}
                          className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/10 hover:bg-card/20 hover:border-primary/50 transition-all z-10 cursor-pointer"
                        >
                          <Plus className="h-6 w-6 text-muted-foreground mb-1.5" />
                          <span className="text-xs text-muted-foreground font-medium">Kachel hinzufügen</span>
                        </button>
                      )}
                      {isEditing && cardId && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-[3px] rounded-xl flex flex-col items-center justify-center gap-2 z-20 transition-all border border-primary/20 p-4 text-center">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-primary/80 mb-0.5">Aktiv</span>
                          <span className="text-sm font-bold text-foreground tracking-tight line-clamp-2 px-2 mb-1">{getCardLabel(cardId)}</span>
                          <div className="flex items-center gap-1.5 w-full max-w-[150px]">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-primary/10 hover:border-primary/40"
                              onClick={() => openEditModal(slotIndex)}
                            >
                              <Edit2 className="h-3 w-3" />
                              Ändern
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-destructive/10 hover:border-destructive/40 text-destructive"
                              onClick={() => handleClearSlot(slotIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Leeren
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Row 3 (Bottom) Grid */}
              <div className="flex flex-col gap-3 mt-1">
                <div className={`grid min-w-0 gap-3 [&>*]:h-[172px] ${
                  columnsBottom === 1 ? 'grid-cols-1' :
                  'grid-cols-1 sm:grid-cols-2'
                }`}>
                  {row3.map((cardId, idx) => {
                    const slotIndex = columnsTop + columnsMiddle + idx
                    return (
                      <div key={slotIndex} className="relative group h-full">
                        {cardId ? renderCard(cardId, 'narrow') : (
                          <button
                            type="button"
                            onClick={() => openEditModal(slotIndex)}
                            className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/10 hover:bg-card/20 hover:border-primary/50 transition-all z-10 cursor-pointer"
                          >
                            <Plus className="h-6 w-6 text-muted-foreground mb-1.5" />
                            <span className="text-xs text-muted-foreground font-medium">Kachel hinzufügen</span>
                          </button>
                        )}
                        {isEditing && cardId && (
                          <div className="absolute inset-0 bg-background/90 backdrop-blur-[3px] rounded-xl flex flex-col items-center justify-center gap-2 z-20 transition-all border border-primary/20 p-4 text-center">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-primary/80 mb-0.5">Aktiv</span>
                            <span className="text-sm font-bold text-foreground tracking-tight line-clamp-2 px-2 mb-1">{getCardLabel(cardId)}</span>
                            <div className="flex items-center gap-1.5 w-full max-w-[150px]">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-primary/10 hover:border-primary/40"
                                onClick={() => openEditModal(slotIndex)}
                              >
                                <Edit2 className="h-3 w-3" />
                                Ändern
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 flex-1 gap-1 px-0 text-[10px] font-medium border-border/40 bg-background/40 hover:bg-destructive/10 hover:border-destructive/40 text-destructive"
                                onClick={() => handleClearSlot(slotIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Leeren
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {showRecentlyAddedFallback && <PreviewListFallback />}
          </section>
        </main>
      </div>

      <DashboardEditDialog
        isOpen={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        onSelect={handleSelectOption}
        currentLayout={currentLayout}
      />
    </div>
  )
}
