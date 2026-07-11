import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  Content,
  ContentItem,
  ContentItemForm,
  ContentItemTitle,
  Header,
  HeaderTitle,
  Root,
} from '@/app/components/settings/section'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'
import { useDebouncedFormSync } from '@/app/hooks/use-debounced-form-sync'
import { useAppIntegrations } from '@/store/app.store'
import { useLrcLibSettings } from '@/store/player.store'
import { ScrobbleStatus, useScrobbleStatus } from '@/store/scrobble.store'

const { DISABLE_LRCLIB } = window

const lrclibSchema = z.object({
  customUrl: z
    .string()
    .url({ message: 'login.form.validations.url' })
    .optional(),
})

type LrclibSchemaType = z.infer<typeof lrclibSchema>

export function ServicesPage() {
  const { t } = useTranslation()

  // Last.fm
  const { lastfm, lidarr } = useAppIntegrations()

  // LRCLIB
  const {
    enabled,
    setEnabled,
    customUrlEnabled,
    setCustomUrlEnabled,
    customUrl,
    setCustomUrl,
  } = useLrcLibSettings()

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lrclibSchema),
    defaultValues: {
      customUrl: customUrl,
    },
  })

  useDebouncedFormSync(
    watch,
    (data: Partial<LrclibSchemaType>) => {
      if (data.customUrl !== undefined) {
        setCustomUrl(data.customUrl)
      }
    },
    500,
  )

  const isLrclibEnabled = DISABLE_LRCLIB ? false : enabled
  const {
    status,
    hasPendingScrobbleFailure,
    lastScrobbleFailedAt,
    lastScrobbleSucceededAt,
  } = useScrobbleStatus()
  const [lastfmUsernameInput, setLastfmUsernameInput] = useState(
    lastfm.username,
  )
  const [lastfmApiKeyInput, setLastfmApiKeyInput] = useState(lastfm.apiKey)

  useEffect(() => {
    setLastfmUsernameInput(lastfm.username)
  }, [lastfm.username])

  useEffect(() => {
    setLastfmApiKeyInput(lastfm.apiKey)
  }, [lastfm.apiKey])

  const commitLastfmUsername = () => {
    if (lastfmUsernameInput !== lastfm.username) {
      lastfm.setUsername(lastfmUsernameInput)
    }
  }

  const commitLastfmApiKey = () => {
    if (lastfmApiKeyInput !== lastfm.apiKey) {
      lastfm.setApiKey(lastfmApiKeyInput)
    }
  }

  const isLastFmConfigured = Boolean(
    lastfmUsernameInput.trim() && lastfmApiKeyInput.trim(),
  )
  const scrobbleIndicator = getScrobbleIndicator(
    t,
    status,
    isLastFmConfigured,
    hasPendingScrobbleFailure,
  )
  const formatScrobbleTimestamp = (value: number) => {
    if (!value) return null
    try {
      return new Date(value).toLocaleString()
    } catch {
      return null
    }
  }
  const lastFailedText = formatScrobbleTimestamp(lastScrobbleFailedAt)
  const lastSucceededText = formatScrobbleTimestamp(lastScrobbleSucceededAt)

  return (
    <div className="space-y-4">
      {/* Last.fm */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.integrations.lastfm.group', 'Last.fm')}
          </HeaderTitle>
        </Header>
        <Content>
          <p className="text-xs text-muted-foreground px-2 pb-1">
            {t(
              'settings.integrations.lastfm.description',
              'Connect your Last.fm account to enable personalized music recommendations.',
            )}
          </p>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.integrations.lastfm.username.label', 'Username')}
            </ContentItemTitle>
            <ContentItemForm>
              <Input
                type="text"
                placeholder={t(
                  'settings.integrations.lastfm.username.placeholder',
                  'Last.fm username',
                )}
                value={lastfmUsernameInput}
                onChange={(e) => setLastfmUsernameInput(e.target.value)}
                onBlur={commitLastfmUsername}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="h-8"
              />
            </ContentItemForm>
          </ContentItem>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.integrations.lastfm.apiKey.label', 'API Key')}
            </ContentItemTitle>
            <ContentItemForm>
              <Input
                type="password"
                placeholder={t(
                  'settings.integrations.lastfm.apiKey.placeholder',
                  'Last.fm API key',
                )}
                value={lastfmApiKeyInput}
                onChange={(e) => setLastfmApiKeyInput(e.target.value)}
                onBlur={commitLastfmApiKey}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="h-8"
              />
            </ContentItemForm>
          </ContentItem>
          <ContentItem>
            <ContentItemTitle>
              {t(
                'settings.integrations.lastfm.scrobbleStatus.label',
                'Scrobbling Status',
              )}
            </ContentItemTitle>
            <ContentItemForm>
              <div
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs',
                  scrobbleIndicator.textClass,
                  scrobbleIndicator.borderClass,
                )}
              >
                <span
                  className={clsx(
                    'h-2 w-2 rounded-full',
                    scrobbleIndicator.dotClass,
                  )}
                />
                <span>{scrobbleIndicator.label}</span>
              </div>
            </ContentItemForm>
          </ContentItem>
          {(lastFailedText || lastSucceededText) && (
            <div className="space-y-1 px-2">
              {lastSucceededText && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {t(
                    'settings.integrations.lastfm.scrobbleStatus.lastSuccess',
                    'Last successful scrobble',
                  )}
                  : {lastSucceededText}
                </p>
              )}
              {lastFailedText && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {t(
                    'settings.integrations.lastfm.scrobbleStatus.lastFailure',
                    'Last failed scrobble',
                  )}
                  : {lastFailedText}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              'settings.integrations.lastfm.apiKey.helpPrefix',
              'Get your API key from',
            )}{' '}
            <a
              href="https://www.last.fm/api/account/create"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t('settings.integrations.lastfm.apiKey.helpLink', 'Last.fm API')}
            </a>
          </p>
        </Content>
      </Root>

      {/* Lidarr */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.integrations.lidarr.group', 'Lidarr')}
          </HeaderTitle>
        </Header>
        <Content>
          <p className="text-xs text-muted-foreground px-2 pb-1">
            {t(
              'settings.integrations.lidarr.description',
              'Connect to your Lidarr instance for album requests.',
            )}
          </p>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.integrations.lidarr.url.label', 'Server URL')}
            </ContentItemTitle>
            <ContentItemForm>
              <Input
                type="url"
                placeholder={t(
                  'settings.integrations.lidarr.url.placeholder',
                  'http://localhost:8686',
                )}
                value={lidarr.url}
                onChange={(e) => lidarr.setUrl(e.target.value)}
                className="h-8"
              />
            </ContentItemForm>
          </ContentItem>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.integrations.lidarr.apiKey.label', 'API Key')}
            </ContentItemTitle>
            <ContentItemForm>
              <Input
                type="password"
                placeholder={t(
                  'settings.integrations.lidarr.apiKey.placeholder',
                  'Lidarr API key',
                )}
                value={lidarr.apiKey}
                onChange={(e) => lidarr.setApiKey(e.target.value)}
                className="h-8"
              />
            </ContentItemForm>
          </ContentItem>
        </Content>
      </Root>

      {/* LRCLIB */}
      <Root>
        <Header>
          <HeaderTitle>
            {t('settings.privacy.services.lrclib.label', 'LRCLIB')}
          </HeaderTitle>
        </Header>
        <Content>
          <p className="text-xs text-muted-foreground px-2 pb-1">
            {t(
              'settings.privacy.services.lrclib.info',
              'LRCLIB is used to find song lyrics.',
            )}
          </p>
          <ContentItem>
            <ContentItemTitle>
              {t('settings.privacy.services.lrclib.enabled', 'Enable LRCLIB')}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={isLrclibEnabled}
                onCheckedChange={setEnabled}
                disabled={DISABLE_LRCLIB}
              />
            </ContentItemForm>
          </ContentItem>

          {isLrclibEnabled && (
            <>
              <ContentItem>
                <ContentItemTitle
                  info={t('settings.privacy.services.lrclib.customUrl.info')}
                >
                  {t(
                    'settings.privacy.services.lrclib.customUrl.toggle',
                    'Use Custom URL',
                  )}
                </ContentItemTitle>
                <ContentItemForm>
                  <Switch
                    checked={customUrlEnabled}
                    onCheckedChange={setCustomUrlEnabled}
                  />
                </ContentItemForm>
              </ContentItem>

              {customUrlEnabled && (
                <ContentItem>
                  <ContentItemTitle>
                    {t(
                      'settings.privacy.services.lrclib.customUrl.label',
                      'Custom Server URL',
                    )}
                  </ContentItemTitle>
                  <ContentItemForm>
                    <Input
                      {...register('customUrl')}
                      className={clsx(
                        'h-8',
                        errors.customUrl && 'border-destructive',
                      )}
                      onChange={(e) => {
                        setValue('customUrl', e.target.value, {
                          shouldValidate: true,
                        })
                      }}
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="https://lrclib.net"
                    />
                  </ContentItemForm>
                </ContentItem>
              )}
            </>
          )}
        </Content>
      </Root>
    </div>
  )
}

function getScrobbleIndicator(
  t: (key: string, defaultValue: string) => string,
  status: ScrobbleStatus,
  configured: boolean,
  hasPendingScrobbleFailure: boolean,
) {
  if (!configured) {
    return {
      label: t(
        'settings.integrations.lastfm.scrobbleStatus.notConfigured',
        'Not configured',
      ),
      dotClass: 'bg-muted-foreground',
      textClass: 'text-muted-foreground',
      borderClass: 'border-border/60',
    }
  }

  if (hasPendingScrobbleFailure) {
    return {
      label: t(
        'settings.integrations.lastfm.scrobbleStatus.lastFailed',
        'Last scrobble failed',
      ),
      dotClass: 'bg-red-500',
      textClass: 'text-red-500',
      borderClass: 'border-red-500/40',
    }
  }

  if (status === 'now-ok' || status === 'ok') {
    return {
      label: t('settings.integrations.lastfm.scrobbleStatus.ok', 'OK'),
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-500',
      borderClass: 'border-emerald-500/40',
    }
  }

  if (status === 'sending-now' || status === 'sending') {
    return {
      label: t(
        'settings.integrations.lastfm.scrobbleStatus.sending',
        'Sending...',
      ),
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-500',
      borderClass: 'border-amber-500/40',
    }
  }

  if (status === 'now-failed' || status === 'failed') {
    return {
      label: t('settings.integrations.lastfm.scrobbleStatus.failed', 'Failed'),
      dotClass: 'bg-red-500',
      textClass: 'text-red-500',
      borderClass: 'border-red-500/40',
    }
  }

  return {
    label: t('settings.integrations.lastfm.scrobbleStatus.idle', 'Idle'),
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-500',
    borderClass: 'border-sky-500/40',
  }
}
