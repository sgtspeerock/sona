import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { useAISettings } from '@/store/player.store'
import { cn } from '@/lib/utils'
import { AlertCircle, Calendar, Sparkles, Activity, Music, Radio } from 'lucide-react'

interface DashboardEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (option: string | null) => void
  currentLayout: string[]
}

interface DashboardOption {
  id: string | null
  label: string
  desc: string
  icon: React.ReactNode
  isAiRequired: boolean
}

export function DashboardEditDialog({
  isOpen,
  onClose,
  onSelect,
  currentLayout,
}: DashboardEditDialogProps) {
  const { enabled: aiEnabled } = useAISettings()

  const options: DashboardOption[] = [
    {
      id: null,
      label: 'Slot leeren',
      desc: 'Entfernt die Kachel aus diesem Platz.',
      icon: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
      isAiRequired: false,
    },
    {
      id: 'discover-daily',
      label: 'Discover Daily / Weekly',
      desc: 'Dein täglicher, personalisierter AI- oder Last.fm-Mix.',
      icon: <Sparkles className="h-5 w-5 text-amber-500" />,
      isAiRequired: false,
    },
    {
      id: 'session-vibe',
      label: 'Session Vibe',
      desc: 'Konzentrations- und Abspielfokus-Kachel.',
      icon: <Activity className="h-5 w-5 text-sky-500" />,
      isAiRequired: false,
    },
    {
      id: 'daytime-mood',
      label: 'Daytime Mood Mix',
      desc: 'Ein kontinuierlicher, an die Tageszeit angepasster Mix (AI benötigt).',
      icon: <Radio className="h-5 w-5 text-emerald-500 animate-pulse" />,
      isAiRequired: true,
    },
    {
      id: 'top-1-genre',
      label: 'Top 1 Genre Radio',
      desc: 'Radio-Station basierend auf deinem meistgehörten Genre.',
      icon: <Radio className="h-5 w-5 text-indigo-400" />,
      isAiRequired: false,
    },
    {
      id: 'top-2-genre',
      label: 'Top 2 Genre Radio',
      desc: 'Radio-Station basierend auf deinem zweitmeistgehörten Genre.',
      icon: <Radio className="h-5 w-5 text-rose-400" />,
      isAiRequired: false,
    },
    {
      id: 'on-this-day',
      label: 'On This Day (Jubiläum)',
      desc: 'Entdecke Alben, die heute ein Jubiläum feiern.',
      icon: <Calendar className="h-5 w-5 text-purple-400" />,
      isAiRequired: false,
    },
    {
      id: 'this-is',
      label: 'This Is Artist',
      desc: 'Empfehlungs-Kachel für deinen Lieblings-Künstler.',
      icon: <Music className="h-5 w-5 text-pink-400" />,
      isAiRequired: false,
    },
  ]

  const handleSelect = (optionId: string | null) => {
    onSelect(optionId)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background-foreground border-border/40 p-5 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-left text-lg font-bold tracking-tight">
            Kachel auswählen
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
          {options.map((option) => {
            const isAlreadyAdded = option.id !== null && currentLayout.includes(option.id)
            const isAiLocked = option.isAiRequired && !aiEnabled
            const isDisabled = isAlreadyAdded || isAiLocked

            return (
              <button
                key={option.id ?? 'empty'}
                onClick={() => !isDisabled && handleSelect(option.id)}
                disabled={isDisabled}
                className={cn(
                  'flex w-full items-start gap-4 rounded-xl border border-border/20 bg-background/30 p-3.5 text-left transition-all duration-200',
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/10'
                    : 'hover:border-primary/45 hover:bg-background/80 cursor-pointer',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/50 border border-border/10">
                  {option.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {option.label}
                    </span>
                    {isAlreadyAdded && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Aktiv
                      </span>
                    )}
                    {isAiLocked && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                        AI deaktiviert
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/90 leading-normal line-clamp-2">
                    {option.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
