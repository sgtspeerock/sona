import { useTranslation } from 'react-i18next'
import LastFmIcon from '@/app/components/icons/last-fm'
import MusicbrainzIcon from '@/app/components/icons/musicbrainz'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { Skeleton } from '@/app/components/ui/skeleton'
import { sanitizeLinks } from '@/utils/parseTexts'

interface InfoPanelProps {
  title: string
  bio?: string
  lastFmUrl?: string
  musicBrainzId?: string
}

const containerClasses =
  'flex flex-col items-start gap-2 border-l border-primary/45 py-2 pl-5 pr-2 text-left text-sm transition-all'

export default function InfoPanel({
  title,
  bio,
  lastFmUrl,
  musicBrainzId,
}: InfoPanelProps) {
  const { t } = useTranslation()

  if (!bio) return null

  return (
    <div className={containerClasses} id="artist-biography">
      <h3 className="sona-section-title scroll-m-20">
        {t('album.info.about', { name: title })}
      </h3>
      <p
        className="html max-w-5xl leading-6 text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizeLinks(bio) }}
      />

      <div className="flex w-full mt-1 gap-2">
        {lastFmUrl && (
          <SimpleTooltip text={t('album.info.lastfm')}>
            <a
              target="_blank"
              rel="nofollow noreferrer"
              href={lastFmUrl}
              className="rounded-[var(--radius-control)] border border-border/25 bg-foreground/[0.045] p-2 transition-colors hover:bg-foreground/[0.09]"
            >
              <LastFmIcon className="w-6 h-6 fill-foreground" />
            </a>
          </SimpleTooltip>
        )}

        {musicBrainzId && (
          <SimpleTooltip text={t('album.info.musicbrainz')}>
            <a
              target="_blank"
              rel="nofollow noreferrer"
              href={`https://musicbrainz.org/artist/${musicBrainzId}`}
              className="rounded-[var(--radius-control)] border border-border/25 bg-foreground/[0.045] p-2 transition-colors hover:bg-foreground/[0.09]"
            >
              <MusicbrainzIcon className="w-6 h-6 fill-foreground" />
            </a>
          </SimpleTooltip>
        )}
      </div>
    </div>
  )
}

export function InfoPanelFallback() {
  return (
    <div className={containerClasses}>
      <Skeleton className="h-9 w-[300px] mb-2 rounded bg-border" />
      <Skeleton className="h-3 w-full rounded bg-border" />
      <Skeleton className="h-3 w-full rounded bg-border" />
      <Skeleton className="h-3 w-1/2 rounded bg-border" />

      <div className="flex w-full mt-2 gap-2">
        <Skeleton className="w-10 h-10 rounded-full bg-border" />
      </div>
    </div>
  )
}
