import { useTranslation } from 'react-i18next'
import {
  Content,
  ContentItem,
  ContentItemForm,
  ContentItemTitle,
  Header,
  HeaderTitle,
  Root,
} from '@/app/components/settings/section'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Button } from '@/app/components/ui/button'
import { languages } from '@/i18n/languages'
import { useLang } from '@/store/lang.store'
import { useFullscreenPlayerSettings, useIsDashboardEditing, usePlayerActions } from '@/store/player.store'
import { useAppSettings } from '@/store/app.store'
import { ThemeSettingsPicker } from './appearance/theme'

const appearanceLanguages = languages

export function AppearancePage() {
  const { t } = useTranslation()
  const { setOpenDialog } = useAppSettings()
  const isDashboardEditing = useIsDashboardEditing()
  const { setIsDashboardEditing } = usePlayerActions()
  const { autoFullscreenEnabled, setAutoFullscreenEnabled } =
    useFullscreenPlayerSettings()
  const { langCode, setLang } = useLang()

  const handleStartEditMode = () => {
    setIsDashboardEditing(true)
    // Close settings modal
    setOpenDialog(false)
    // Navigate to Home page via hash route
    window.location.hash = '/'
  }

  return (
    <div className="space-y-4">
      <Root>
        <Content>
          <ContentItem>
            <ContentItemTitle
              info={t('settings.appearance.general.fullscreen.info')}
            >
              {t(
                'settings.appearance.general.fullscreen.label',
                'Automatic Fullscreen',
              )}
            </ContentItemTitle>
            <ContentItemForm>
              <Switch
                checked={autoFullscreenEnabled}
                onCheckedChange={setAutoFullscreenEnabled}
              />
            </ContentItemForm>
          </ContentItem>

          <ContentItem>
            <ContentItemTitle
              info="Aktiviert den Bearbeitungsmodus für das Kachel-Layout auf der Startseite."
            >
              Startseite anpassen
            </ContentItemTitle>
            <ContentItemForm>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-4"
                onClick={handleStartEditMode}
              >
                Layout bearbeiten
              </Button>
            </ContentItemForm>
          </ContentItem>

          <ContentItem>
            <ContentItemTitle>
              {t('menu.language', 'Language')}
            </ContentItemTitle>
            <ContentItemForm>
              <Select value={langCode} onValueChange={setLang}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {appearanceLanguages.map((lang) => (
                      <SelectItem key={lang.langCode} value={lang.langCode}>
                        {lang.nativeName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ContentItemForm>
          </ContentItem>
        </Content>
      </Root>

      <Root>
        <Header>
          <HeaderTitle>{t('theme.label', 'Theme')}</HeaderTitle>
        </Header>
        <ThemeSettingsPicker />
      </Root>
    </div>
  )
}
