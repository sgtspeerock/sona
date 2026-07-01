import clsx from 'clsx'
import {
  EllipsisVertical,
  Heart,
  Info,
  Pause,
  Play,
  Shuffle,
} from 'lucide-react'
import { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react'
import { Button as ComponentButton } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { cn } from '@/lib/utils'

type ActionsContainerProps = ComponentPropsWithoutRef<'div'>

function Container({ children, className, ...rest }: ActionsContainerProps) {
  return (
    <div
      {...rest}
      className={cn('mb-5 flex w-full items-center gap-2', className)}
    >
      {children}
    </div>
  )
}

interface ActionsMainButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string
  buttonStyle?: 'primary' | 'secondary'
  isActive?: boolean
}

function Button({
  children,
  tooltip,
  buttonStyle = 'secondary',
  isActive = false,
  className,
  ...props
}: ActionsMainButtonProps) {
  const button = (
    <ComponentButton
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'h-10 rounded-[var(--radius-control)] border border-transparent transition-all duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        'data-[state=active]:border-border/60 data-[state=active]:bg-foreground/12',
        buttonStyle === 'primary'
          ? 'mr-1 min-w-10 gap-2 px-4 text-sm font-semibold shadow-[0_12px_36px_hsl(var(--primary)/0.22)] hover:scale-[1.02]'
          : 'w-10 px-0 text-muted-foreground hover:bg-foreground/12 hover:text-foreground',
        className,
      )}
      variant={buttonStyle === 'primary' ? 'default' : 'ghost'}
      {...props}
    >
      {children}
    </ComponentButton>
  )

  if (!tooltip) return button

  return <SimpleTooltip text={tooltip}>{button}</SimpleTooltip>
}

interface DropdownProps {
  tooltip: string
  options?: React.ReactNode
}

function Dropdown({ tooltip, options }: DropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent focus:ring-transparent"
      >
        <ComponentButton
          className={clsx(
            'h-10 w-10 rounded-[var(--radius-control)] border border-transparent px-0 text-muted-foreground',
            'data-[state=open]:bg-foreground/12 data-[state=open]:text-foreground',
            'hover:bg-foreground/12 hover:text-foreground',
            'transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
          )}
          variant="ghost"
        >
          <SimpleTooltip text={tooltip}>
            <div className="flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-control)]">
              <EllipsisIcon />
            </div>
          </SimpleTooltip>
        </ComponentButton>
      </DropdownMenuTrigger>
      {options && (
        <DropdownMenuContent className="min-w-56" align="start">
          {options}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

function PlayIcon() {
  return <Play className="w-6 h-6 fill-primary-foreground" strokeWidth={2} />
}

function PauseIcon() {
  return <Pause className="w-5 h-5 fill-primary-foreground" />
}

function ShuffleIcon() {
  return <Shuffle className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

interface LikeIconProps {
  isStarred?: boolean
}

function LikeIcon({ isStarred }: LikeIconProps) {
  return (
    <Heart
      className={clsx(
        'w-5 h-5 drop-shadow-md',
        isStarred && 'text-red-500 fill-red-500',
      )}
      strokeWidth={2}
    />
  )
}

function InfoIcon() {
  return <Info className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

function EllipsisIcon() {
  return <EllipsisVertical className="w-5 h-5 drop-shadow-md" strokeWidth={2} />
}

export const Actions = {
  Container,
  Button,
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  LikeIcon,
  InfoIcon,
  EllipsisIcon,
  Dropdown,
}
