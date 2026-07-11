import { Minimize2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { useFullscreenState } from '@/store/ui.store'
import { buttonsStyle } from './controls'

export function CloseFullscreenButton() {
  const { setOpen } = useFullscreenState()

  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid="fullscreen-close-button"
      className={`${buttonsStyle.utility} fullscreen-utility-button`}
      style={{ ...buttonsStyle.style }}
      onClick={() => setOpen(false)}
    >
      <Minimize2 className="size-5 drop-shadow-lg" />
    </Button>
  )
}
