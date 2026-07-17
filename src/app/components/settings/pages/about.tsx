import {
  CheckCircle,
  FileDown,
  FileUp,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { AppIcon } from '@/app/components/app-icon'
import { Button } from '@/app/components/ui/button'
import { clearImageCacheMetadata } from '@/cache/image'
import { useAppUpdate } from '@/store/app.store'
import { getAppInfo } from '@/utils/appName'
import { isDesktop } from '@/utils/desktop'
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from '@/utils/safe-storage'

export function AboutPage() {
  const { t } = useTranslation()
  const { name, version, url } = getAppInfo()
  const { setOpenDialog: setUpdateDialog } = useAppUpdate()
  const [isChecking, setIsChecking] = useState(false)
  const [upToDate, setUpToDate] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const ONBOARDING_STORAGE_KEY = 'sona.contextualOnboarding.v1'

  const handleCheckForUpdates = async () => {
    setIsChecking(true)
    setUpToDate(false)
    try {
      const info = await window.api.checkForUpdates()
      if (info?.files?.length) {
        setUpdateDialog(true)
      } else {
        setUpToDate(true)
      }
    } catch {
      toast.error(t('update.checkFailed'))
    } finally {
      setIsChecking(false)
    }
  }

  const handleExportSettings = () => {
    try {
      const raw = safeStorageGet('app_store')
      if (!raw) {
        toast.error(
          t('settings.io.toast.exportError', 'No settings found to export.'),
        )
        return
      }
      const blob = new Blob([JSON.stringify(JSON.parse(raw), null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sona-settings.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(
        t('settings.io.toast.exportError', 'Failed to export settings.'),
      )
    }
  }

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        safeStorageSet('app_store', JSON.stringify(parsed))
        toast.success(t('settings.io.toast.importSuccess'))
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        toast.error(t('settings.io.toast.importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      let appCacheCleared = false
      try {
        appCacheCleared =
          typeof window.api.clearAppCache === 'function'
            ? await window.api.clearAppCache()
            : false
      } catch {
        appCacheCleared = false
      }

      const imageCacheCleared =
        typeof window !== 'undefined' && 'caches' in window
          ? await caches.delete('images')
          : true
      await clearImageCacheMetadata()

      if (appCacheCleared || imageCacheCleared) {
        toast.success(
          t('settings.system.cache.cleared', 'Cache cleared. Reloading...'),
        )
      } else {
        toast.warn(
          t(
            'settings.system.cache.partial',
            'Cache was only partially cleared. Reloading...',
          ),
        )
      }
      setTimeout(() => window.location.reload(), 900)
    } catch {
      toast.error(t('settings.system.cache.error', 'Failed to clear cache.'))
    } finally {
      setIsClearingCache(false)
    }
  }



  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/25 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AppIcon size={42} className="shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold leading-tight">
                {name}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                v{version}
              </span>
            </div>
          </div>

          {isDesktop() && (
            <div className="flex items-center gap-3">
              {upToDate && (
                <span className="flex items-center gap-1.5 text-sm text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  {t('settings.system.upToDate', 'Up to date')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckForUpdates}
                disabled={isChecking}
              >
                {isChecking ? (
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                {t('update.checkForUpdates')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/25 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {t('settings.io.group', 'Settings')}
          </p>
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importRef.current?.click()}
            >
              <FileUp className="mr-2 h-3.5 w-3.5" />
              {t('settings.io.import.button', 'Import')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSettings}>
              <FileDown className="mr-2 h-3.5 w-3.5" />
              {t('settings.io.export.button', 'Export')}
            </Button>
          </div>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportSettings}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/25 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('settings.system.cache.label', 'App Cache')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                'settings.system.cache.info',
                'Clears artwork and network cache, then reloads the app.',
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={isClearingCache}
          >
            {isClearingCache ? (
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {t('settings.system.cache.button', 'Clear Cache')}
          </Button>
        </div>
      </div>



      <div className="rounded-xl border border-border/60 bg-card/25 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">GitHub</span>
          <a
            href={url}
            target="_blank"
            rel="nofollow noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            {url.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>

      <div className="pt-0.5">
        <p className="text-xs text-muted-foreground">
          DJ Sona icons by flaticon Freepik, justicon
        </p>
      </div>
    </div>
  )
}
