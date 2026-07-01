import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog'
import { useMainDrawerState, usePlayerActions } from '@/store/player.store'
import { SonaDjMode, useSonaDj } from '@/store/sona-dj.store'

const triggerStyles = {
  fullscreen:
    'relative w-12 h-12 rounded-full border border-[color:var(--fs-btn-utility-border)] bg-[color:var(--fs-btn-utility-bg)] text-[color:var(--fs-btn-fg-muted)] hover:text-[color:var(--fs-btn-fg)] data-[state=active]:text-[color:var(--fs-btn-fg)] hover:bg-[color:var(--fs-btn-utility-bg-hover)] hover:border-[color:var(--fs-btn-utility-border-hover)] transition-colors',
  player:
    'relative rounded-full w-10 h-10 p-2 text-secondary-foreground hover:text-secondary-foreground data-[state=active]:text-primary hover:bg-transparent',
  active: 'player-button-active',
}

interface SonaDjButtonProps {
  variant?: 'fullscreen' | 'player'
}

export function SonaDjButton({ variant = 'fullscreen' }: SonaDjButtonProps) {
  const { mode, setMode } = useSonaDj()
  const { seedSonaDjTrack, setRuntimeSonaDjMode } = usePlayerActions()
  const { setActiveDrawerPanel } = useMainDrawerState()
  const { t } = useTranslation()
  const enabled = mode !== SonaDjMode.Off
  const djs = [
    {
      mode: SonaDjMode.Adventure,
      name: t('fullscreen.sonaDj.modes.adventure.name'),
      description: t('fullscreen.sonaDj.modes.adventure.description'),
      icon: 'wildcard.png',
      gradient: 'from-purple-500/12 to-pink-500/12',
      border: 'border-purple-300/25',
      hover: 'hover:border-purple-300/55',
      activeBorder: 'border-primary/70',
      activeRing: 'ring-primary/45',
      activeGlow: 'shadow-[0_0_24px_hsl(var(--primary)/0.35)]',
      activeBackground:
        'bg-[hsl(var(--primary)/0.22)] from-[hsl(var(--primary)/0.46)] to-[hsl(var(--primary)/0.18)]',
    },
    {
      mode: SonaDjMode.Drift,
      name: t('fullscreen.sonaDj.modes.drift.name'),
      description: t('fullscreen.sonaDj.modes.drift.description'),
      icon: 'drift.png',
      gradient: 'from-purple-500/12 to-pink-500/12',
      border: 'border-purple-300/25',
      hover: 'hover:border-purple-300/55',
      activeBorder: 'border-primary/70',
      activeRing: 'ring-primary/45',
      activeGlow: 'shadow-[0_0_24px_hsl(var(--primary)/0.35)]',
      activeBackground:
        'bg-[hsl(var(--primary)/0.22)] from-[hsl(var(--primary)/0.46)] to-[hsl(var(--primary)/0.18)]',
    },
    {
      mode: SonaDjMode.Era,
      name: t('fullscreen.sonaDj.modes.era.name'),
      description: t('fullscreen.sonaDj.modes.era.description'),
      icon: 'timekeeper.png',
      gradient: 'from-purple-500/12 to-pink-500/12',
      border: 'border-purple-300/25',
      hover: 'hover:border-purple-300/55',
      activeBorder: 'border-primary/70',
      activeRing: 'ring-primary/45',
      activeGlow: 'shadow-[0_0_24px_hsl(var(--primary)/0.35)]',
      activeBackground:
        'bg-[hsl(var(--primary)/0.22)] from-[hsl(var(--primary)/0.46)] to-[hsl(var(--primary)/0.18)]',
    },
  ]

  const triggerButton = (
    <Button
      size="icon"
      variant="ghost"
      data-coach-id="sona-dj"
      data-state={enabled && 'active'}
      className={clsx(
        variant === 'fullscreen'
          ? triggerStyles.fullscreen
          : triggerStyles.player,
        variant === 'fullscreen' && 'fullscreen-utility-button',
        enabled && variant === 'fullscreen' && triggerStyles.active,
      )}
      data-fullscreen-panel-toggle={variant === 'fullscreen' ? 'dj' : undefined}
      onClick={() => {
        if (variant === 'fullscreen') setActiveDrawerPanel(null)
      }}
      aria-label={t('fullscreen.sonaDj.title')}
      title={t('fullscreen.sonaDj.title')}
    >
      <SonaDjIcon variant={variant} />
    </Button>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SonaDjIcon variant="player" className="w-5 h-5 text-white" />
            {t('fullscreen.sonaDj.title')}
          </DialogTitle>
          <DialogDescription>
            {t('fullscreen.sonaDj.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {djs.map((dj) => {
            const isActive = mode === dj.mode

            return (
              <button
                key={dj.mode}
                type="button"
                className={clsx(
                  'rounded-lg border p-4 text-left transition-colors bg-gradient-to-br h-24 flex items-center gap-3',
                  isActive ? dj.activeBackground : dj.gradient,
                  isActive
                    ? clsx(
                        dj.activeBorder,
                        'ring-1 dj-card-active-pulse',
                        dj.activeRing,
                        dj.activeGlow,
                      )
                    : clsx(dj.border, dj.hover, 'hover:bg-accent/40'),
                )}
                onClick={() => {
                  setMode(dj.mode)
                  setRuntimeSonaDjMode(dj.mode)
                  seedSonaDjTrack(dj.mode).catch(() => undefined)
                }}
              >
                <DjModeIcon fileName={dj.icon} />
                <div className="min-w-0">
                  <p className="font-semibold">{dj.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dj.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            onClick={() => {
              setMode(SonaDjMode.Off)
              setRuntimeSonaDjMode(SonaDjMode.Off)
            }}
          >
            {t('fullscreen.sonaDj.disable')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DjModeIcon({ fileName }: { fileName: string }) {
  const iconPath = `${import.meta.env.BASE_URL}icons/${fileName}`

  return (
    <span
      aria-hidden
      className="inline-block w-6 h-6 bg-white shrink-0"
      style={{
        WebkitMaskImage: `url('${iconPath}')`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
        WebkitMaskPosition: 'center',
        maskImage: `url('${iconPath}')`,
        maskRepeat: 'no-repeat',
        maskSize: '100% 100%',
        maskPosition: 'center',
        maskMode: 'alpha',
      }}
    />
  )
}

function SonaDjIcon({
  variant,
  className,
}: {
  variant: 'fullscreen' | 'player'
  className?: string
}) {
  const sizeClass = variant === 'fullscreen' ? 'w-6 h-6' : 'w-[18px] h-[18px]'
  const iconPath = `${import.meta.env.BASE_URL}icons/dj.png`

  return (
    <span
      aria-hidden
      className={clsx('inline-block bg-current shrink-0', sizeClass, className)}
      style={{
        WebkitMaskImage: `url('${iconPath}')`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
        WebkitMaskPosition: 'center',
        maskImage: `url('${iconPath}')`,
        maskRepeat: 'no-repeat',
        maskSize: '100% 100%',
        maskPosition: 'center',
        maskMode: 'alpha',
      }}
    />
  )
}


