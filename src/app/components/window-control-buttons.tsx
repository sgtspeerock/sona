import { clsx } from 'clsx'
import { type HTMLProps } from 'react'
import { Icons } from '@/app/components/controls/icons'
import { useAppWindow } from '@/app/hooks/use-app-window'
import { cn } from '@/lib/utils'

export function WindowControlButtons({
  className,
  buttonClassName,
  closeButtonClassName,
  ...props
}: HTMLProps<HTMLDivElement> & {
  buttonClassName?: string
  closeButtonClassName?: string
}) {
  const { minimizeWindow, maximizeWindow, closeWindow, isMaximized } =
    useAppWindow()

  const baseButton = clsx(
    'h-8 w-8 rounded-[10px] border border-white/20 bg-black/35 text-foreground/90',
    'hover:bg-black/50 transition-colors duration-150 flex items-center justify-center',
    buttonClassName,
  )

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <button
        type="button"
        onClick={minimizeWindow}
        aria-label="Minimize window"
        className={baseButton}
      >
        <Icons.minimizeWin />
      </button>
      <button
        type="button"
        onClick={maximizeWindow}
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        className={baseButton}
      >
        {isMaximized ? <Icons.maximizeRestoreWin /> : <Icons.maximizeWin />}
      </button>
      <button
        type="button"
        onClick={closeWindow}
        aria-label="Close window"
        className={clsx(
          baseButton,
          'hover:bg-red-600/75 hover:border-red-400/40 hover:text-white',
          closeButtonClassName,
        )}
      >
        <Icons.closeWin />
      </button>
    </div>
  )
}
