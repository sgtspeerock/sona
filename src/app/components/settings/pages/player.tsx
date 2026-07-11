import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EqualizerModal } from '@/app/components/player/equalizer-modal'
import {
  Content,
  ContentItem,
  ContentItemForm,
  ContentItemTitle,
  Header,
  HeaderTitle,
  Root,
} from '@/app/components/settings/section'
import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Slider } from '@/app/components/ui/slider'
import { Switch } from '@/app/components/ui/switch'
import {
  useAppAccounts,
  useAppDesktopActions,
  useAppDesktopData,
  useAppImagesCacheLayer,
  useAppListDensity,
  useAppPages,
} from '@/store/app.store'
import {
  useCrossfadeSettings,
  useListeningMemorySettings,
  useReplayGainActions,
  useReplayGainState,
} from '@/store/player.store'
import { ListDensity } from '@/types/serverConfig'
import { isDesktop } from '@/utils/desktop'

const { HIDE_RADIOS_SECTION, DISABLE_IMAGE_CACHE_TOGGLE } = window

const listDensityModes: ListDensity[] = ['compact', 'default', 'cozy']

export function PlayerPage() {
  const { t } = useTranslation()
  const [equalizerOpen, setEqualizerOpen] = useState(false)

  // Replay Gain
  const { replayGainEnabled, replayGainType, replayGainError } =
    useReplayGainState()
  const { setReplayGainEnabled, setReplayGainType, setReplayGainError } =
    useReplayGainActions()

  // Crossfade
  const {
    enabled: crossfadeEnabled,
    setEnabled: setCrossfadeEnabled,
    durationSeconds: crossfadeDurationSeconds,
    setDurationSeconds: setCrossfadeDurationSeconds,
  } = useCrossfadeSettings()
  const crossfadePoints = [0, 2, 3, 4, 5, 6, 7, 8]
  const resolvedCrossfadeDurationSeconds = Math.min(
    8,
    Math.max(2, crossfadeDurationSeconds || 3),
  )
  const crossfadeSliderValue = crossfadeEnabled
    ? crossfadePoints.indexOf(resolvedCrossfadeDurationSeconds)
    : 0

  const {
    enabled: listeningMemoryEnabled,
    setEnabled: setListeningMemoryEnabled,
  } = useListeningMemorySettings()

  // Sidebar & Playlists
  const {
    hideRadiosSection,
    setHideRadiosSection,
    autoPlaylistImport,
    setAutoPlaylistImport,
  } = useAppPages()

  // Cache
  const { imagesCacheLayerEnabled, setImagesCacheLayerEnabled } =
    useAppImagesCacheLayer()
  const { listDensity, setListDensity } = useAppListDensity()

  // Rich Presence
  const { discord } = useAppAccounts()

  // Tray
  const { minimizeToTray, disableGpu } = useAppDesktopData()
  const { setMinimizeToTray, setDisableGpu } = useAppDesktopActions()

  const handleResetError = () => {
    setReplayGainError(false)
    setReplayGainEnabled(true)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Audio Processing */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.player.audioProcessing.group', 'Audio Processing')}
          </HeaderTitle>
        </Header>
        <Content>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.player.equalizer.label', 'Equalizer')}
            </ContentItemTitle>
            <ContentItemForm>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setEqualizerOpen(true)}
              >
                {t('settings.player.equalizer.open', 'Open')}
              </Button>
            </ContentItemForm>
          </ContentItem>

          {/* Crossfade point slider */}
          <ContentItem>
            <ContentItemTitle info={t('settings.player.crossfade.info')}>
              {t('settings.player.crossfade.label', 'Crossfade')}
            </ContentItemTitle>
            <ContentItemForm>
              <div className="flex items-center gap-3 min-w-[13rem]">
                <div className="relative w-44">
                  <Slider
                    min={0}
                    max={7}
                    step={1}
                    value={[crossfadeSliderValue]}
                    onValueChange={(values) => {
                      const nextIndex = values[0]
                      if (typeof nextIndex !== 'number') return

                      const roundedIndex = Math.max(
                        0,
                        Math.min(7, Math.round(nextIndex)),
                      )
                      const nextPoint = crossfadePoints[roundedIndex]

                      if (nextPoint === 0) {
                        if (crossfadeEnabled) {
                          setCrossfadeEnabled(false)
                        }
                        return
                      }

                      setCrossfadeDurationSeconds(nextPoint)
                      if (!crossfadeEnabled) {
                        setCrossfadeEnabled(true)
                      }
                    }}
                    className={`
                      h-5
                      [&_.slider-track]:h-0 [&_.slider-track]:bg-transparent
                      [&_.slider-range]:h-0 [&_.slider-range]:bg-transparent
                      [&_[role=slider]]:!h-0 [&_[role=slider]]:!w-0
                      [&_[role=slider]]:!opacity-0 [&_[role=slider]]:!bg-transparent
                      [&_[role=slider]]:!border-0 [&_[role=slider]]:!shadow-none
                      [&_[role=slider]]:!pointer-events-none
                    `}
                    aria-label={t(
                      'settings.player.crossfade.label',
                      'Crossfade',
                    )}
                  />
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-8 place-items-center">
                    {crossfadePoints.map((point) => {
                      const isActivePoint =
                        point === 0
                          ? !crossfadeEnabled
                          : crossfadeEnabled &&
                            point <= resolvedCrossfadeDurationSeconds
                      return (
                        <span
                          key={point}
                          className={`h-[0.65rem] w-[0.65rem] rounded-full transition-colors ${
                            isActivePoint
                              ? 'bg-primary'
                              : 'bg-muted-foreground/50'
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums min-w-[3.5rem] text-right">
                  {crossfadeEnabled
                    ? t('settings.player.crossfade.status', {
                        seconds: resolvedCrossfadeDurationSeconds,
                        defaultValue: '{{seconds}} s',
                      })
                    : t('settings.player.crossfade.off', 'Off')}
                </span>
              </div>
            </ContentItemForm>
          </ContentItem>

          <ContentItem>
            <ContentItemTitle info={t('settings.player.listeningMemory.info')}>
              {t('settings.player.listeningMemory.label', 'Listening Memory')}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={listeningMemoryEnabled}
                onCheckedChange={setListeningMemoryEnabled}
              />
            </ContentItemForm>
          </ContentItem>
        </Content>
      </Root>

      {/* Loudness */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.audio.replayGain.group', 'ReplayGain')}
          </HeaderTitle>
        </Header>
        <Content>
          <ContentItem>
            <ContentItemTitle info={t('settings.audio.replayGain.enabledInfo')}>
              {t('settings.audio.replayGain.enabled', 'Normalize volume')}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={replayGainEnabled}
                onCheckedChange={setReplayGainEnabled}
                disabled={replayGainError}
              />
            </ContentItemForm>
          </ContentItem>

          {replayGainError && (
            <ContentItem>
              <ContentItemTitle className="text-xs text-muted-foreground text-balance">
                {t('settings.audio.replayGain.error.message')}
              </ContentItemTitle>
              <ContentItemForm>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8"
                  onClick={handleResetError}
                >
                  {t('settings.audio.replayGain.error.button')}
                </Button>
              </ContentItemForm>
            </ContentItem>
          )}

          {replayGainEnabled && (
            <ContentItem>
              <ContentItemTitle
                info={t('settings.audio.replayGain.mode.albumToggleInfo')}
              >
                {t(
                  'settings.audio.replayGain.mode.albumToggle',
                  'Use Album Gain',
                )}
              </ContentItemTitle>
              <ContentItemForm>
                <Switch
                  checked={replayGainType === 'album'}
                  onCheckedChange={(checked) =>
                    setReplayGainType(checked ? 'album' : 'track')
                  }
                />
              </ContentItemForm>
            </ContentItem>
          )}
        </Content>
      </Root>

      {/* Playlists */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.player.playlists.group', 'Playlists')}
          </HeaderTitle>
        </Header>
        <Content>
          <ContentItem>
            <ContentItemTitle>
              {t(
                'settings.player.playlists.autoImport.label',
                'Show server-imported M3U playlists',
              )}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={autoPlaylistImport}
                onCheckedChange={setAutoPlaylistImport}
              />
            </ContentItemForm>
          </ContentItem>
        </Content>
      </Root>

      {/* Interface */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.player.interface.group', 'Interface')}
          </HeaderTitle>
        </Header>
        <Content>
          <ContentItem>
            <ContentItemTitle>
              {t(
                'settings.content.sidebar.radios.section',
                'Hide radios section',
              )}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={hideRadiosSection}
                onCheckedChange={setHideRadiosSection}
                disabled={HIDE_RADIOS_SECTION}
              />
            </ContentItemForm>
          </ContentItem>

          <ContentItem>
            <ContentItemTitle>
              {t('settings.player.density.label', 'List density')}
            </ContentItemTitle>
            <ContentItemForm>
              <Select
                value={listDensity}
                onValueChange={(value) => setListDensity(value as ListDensity)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {listDensityModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {t(`settings.player.density.options.${mode}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ContentItemForm>
          </ContentItem>

          <ContentItem>
            <ContentItemTitle
              info={t('settings.content.images.cacheLayer.info')}
            >
              {t('settings.player.cache.label', 'Cache Album Artwork')}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={imagesCacheLayerEnabled}
                onCheckedChange={setImagesCacheLayerEnabled}
                disabled={DISABLE_IMAGE_CACHE_TOGGLE}
              />
            </ContentItemForm>
          </ContentItem>
        </Content>
      </Root>

      {/* Desktop Features */}
      {isDesktop() && (
        <Root>
          <Header>
            <HeaderTitle>
              {t('settings.player.desktop.group', 'Desktop')}
            </HeaderTitle>
          </Header>
          <Content>
            <ContentItem>
              <ContentItemTitle>
                {t(
                  'settings.accounts.discord.enabled.label',
                  'Discord Rich Presence',
                )}
              </ContentItemTitle>
              <ContentItemForm>
                <Switch
                  checked={discord.rpcEnabled}
                  onCheckedChange={discord.setRpcEnabled}
                />
              </ContentItemForm>
            </ContentItem>

            <ContentItem>
              <ContentItemTitle info={t('settings.desktop.general.tray.info')}>
                {t('settings.player.tray.label', 'Close to System Tray')}
              </ContentItemTitle>
              <ContentItemForm>
                <Switch
                  checked={minimizeToTray}
                  onCheckedChange={setMinimizeToTray}
                />
              </ContentItemForm>
            </ContentItem>

            <ContentItem>
              <ContentItemTitle info={t('settings.desktop.general.gpu.info')}>
                {t('settings.player.gpu.label', 'Disable GPU Acceleration')}
              </ContentItemTitle>
              <ContentItemForm>
                <Switch checked={disableGpu} onCheckedChange={setDisableGpu} />
              </ContentItemForm>
            </ContentItem>
          </Content>
        </Root>
      )}

      <EqualizerModal open={equalizerOpen} onOpenChange={setEqualizerOpen} />
    </div>
  )
}
