import clsx from 'clsx'
import { SlidersHorizontal } from 'lucide-react'
import {
  ComponentPropsWithoutRef,
  createContext,
  useContext,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { VISUALIZER_NAMES } from '@/app/components/fullscreen/visualizers'
import { Button } from '@/app/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Separator } from '@/app/components/ui/separator'
import { Slider } from '@/app/components/ui/slider'
import { Switch } from '@/app/components/ui/switch'
import { cn } from '@/lib/utils'
import { useSongColor, useVisualizerSettingsStore } from '@/store/player.store'
import { useFullscreenState } from '@/store/ui.store'
import type { VisualizerPreset } from '@/types/visualizer'
import { buttonsStyle } from './controls'

// Context for visualizer state (POC - will move to store)
type VisualizerContextType = {
  preset: VisualizerPreset
  setPreset: (preset: VisualizerPreset) => void
  renderQuality: 'high' | 'lite'
  setRenderQuality: (quality: 'high' | 'lite') => void
  autoQualityEnabled: boolean
  setAutoQualityEnabled: (enabled: boolean) => void
  visualizerActive: boolean
  setVisualizerActive: (active: boolean) => void
}

const VisualizerContext = createContext<VisualizerContextType | null>(null)

export function useVisualizerContext() {
  const context = useContext(VisualizerContext)
  if (!context) {
    if (import.meta.env.DEV) {
      console.warn('useVisualizerContext called outside VisualizerProvider')
    }
    throw new Error(
      'useVisualizerContext must be used within VisualizerProvider',
    )
  }
  return context
}

// Hook for visualizer settings (colors, etc.)
export function useVisualizerSettings() {
  const { currentSongColor, currentSongColorPalette } = useSongColor()

  return {
    primaryColor: currentSongColor || '#3b82f6',
    secondaryColor: currentSongColorPalette?.muted || '#8b5cf6',
  }
}

export function VisualizerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    preset,
    autoQualityEnabled,
    setVisualizerPreset,
    setVisualizerAutoQualityEnabled,
  } = useVisualizerSettingsStore()
  const [renderQuality, setRenderQuality] = useState<'high' | 'lite'>('high')
  const [visualizerActive, setVisualizerActive] = useState(false)

  return (
    <VisualizerContext.Provider
      value={{
        preset,
        setPreset: setVisualizerPreset,
        renderQuality,
        setRenderQuality,
        autoQualityEnabled,
        setAutoQualityEnabled: setVisualizerAutoQualityEnabled,
        visualizerActive,
        setVisualizerActive,
      }}
    >
      {children}
    </VisualizerContext.Provider>
  )
}

export function FullscreenSettings() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-coach-id="fullscreen-idle"
          className={clsx(
            buttonsStyle.utility,
            'fullscreen-utility-button',
            'data-[state=open]:scale-110',
          )}
          style={{ ...buttonsStyle.style }}
        >
          <SlidersHorizontal className={buttonsStyle.secondaryIcon} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="flex flex-col">
          <DynamicColorOption showSeparator={false} />
          <ColorIntensityOption />
          <VisualizerToggleOption />
          <VisualizerPresetOption />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function VisualizerToggleOption() {
  const { t } = useTranslation()
  const { visualizerActive, setVisualizerActive } = useVisualizerContext()
  const setFullscreenVisualizerActive = useFullscreenState(
    (state) => state.setVisualizerActive,
  ) as ((active: boolean) => void) | undefined

  const handleToggle = (checked: boolean) => {
    setVisualizerActive(checked)
    if (typeof setFullscreenVisualizerActive === 'function') {
      setFullscreenVisualizerActive(checked)
    }
  }

  return (
    <SettingWrapper text={t('fullscreen.visualizerLabel', 'Visualizer')}>
      <Switch checked={visualizerActive} onCheckedChange={handleToggle} />
    </SettingWrapper>
  )
}

export function QueueSettings() {
  const { useSongColorOnQueue } = useSongColor()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full hover:bg-foreground/20 data-[state=open]:bg-foreground/20"
        >
          <SlidersHorizontal className="size-4" strokeWidth={2.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-104 p-0" align="end" side="bottom">
        <div className="flex flex-col">
          <QueueDynamicColorOption showSeparator={false} />
          {useSongColorOnQueue && <ColorIntensityOption />}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type OptionProps = Omit<ComponentPropsWithoutRef<typeof SettingWrapper>, 'text'>

function DynamicColorOption(props: OptionProps) {
  const { t } = useTranslation()
  const { useSongColorOnBigPlayer, setUseSongColorOnBigPlayer } = useSongColor()

  return (
    <SettingWrapper text={t('settings.appearance.colors.group')} {...props}>
      <Switch
        checked={useSongColorOnBigPlayer}
        onCheckedChange={() =>
          setUseSongColorOnBigPlayer(!useSongColorOnBigPlayer)
        }
      />
    </SettingWrapper>
  )
}

function QueueDynamicColorOption(props: OptionProps) {
  const { t } = useTranslation()
  const { useSongColorOnQueue, setUseSongColorOnQueue } = useSongColor()

  return (
    <SettingWrapper text={t('settings.appearance.colors.group')} {...props}>
      <Switch
        checked={useSongColorOnQueue}
        onCheckedChange={() => setUseSongColorOnQueue(!useSongColorOnQueue)}
      />
    </SettingWrapper>
  )
}

function ColorIntensityOption(props: OptionProps) {
  const { t } = useTranslation()
  const { currentSongColorIntensity, setCurrentSongIntensity } = useSongColor()

  const intensityTooltip = `${Math.round(currentSongColorIntensity * 100)}%`

  return (
    <SettingWrapper
      text={t('settings.appearance.colors.queue.intensity')}
      {...props}
    >
      <Slider
        value={[currentSongColorIntensity]}
        min={0.3}
        max={1.0}
        step={0.05}
        tooltipValue={intensityTooltip}
        onValueChange={([value]) => setCurrentSongIntensity(value)}
      />
    </SettingWrapper>
  )
}

function VisualizerPresetOption({ showSeparator = true }: OptionProps) {
  const { t } = useTranslation()
  const { preset, setPreset } = useVisualizerContext()

  return (
    <>
      {showSeparator && <Separator />}
      <div className="flex items-center gap-3 p-3">
        <span className="text-sm shrink-0">
          {t('fullscreen.visualizerLabel')}
        </span>
        <Select
          value={preset}
          onValueChange={(value) => setPreset(value as VisualizerPreset)}
        >
          <SelectTrigger className="flex-1 min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VISUALIZER_NAMES) as VisualizerPreset[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {VISUALIZER_NAMES[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

type SettingWrapperProps = ComponentPropsWithoutRef<'div'> & {
  text: string
  showSeparator?: boolean
  contentClassName?: string
}

function SettingWrapper({
  text,
  className,
  contentClassName,
  children,
  showSeparator = true,
  ...props
}: SettingWrapperProps) {
  return (
    <>
      {showSeparator && <Separator />}
      <div
        className={cn('flex items-center justify-between p-3', className)}
        {...props}
      >
        <span className="text-sm flex-1 text-balance">{text}</span>
        <div
          className={cn(
            'w-2/5 flex items-center justify-end',
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </>
  )
}
