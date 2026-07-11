import { cn } from '@/lib/utils'

interface MiniWaveformProps {
  isPlaying: boolean
}

export function MiniWaveform({ isPlaying }: MiniWaveformProps) {
  return (
    <div
      className="flex items-end gap-[2px] h-[10px] w-3.5 px-[1px] overflow-hidden select-none"
      title="Playback Active"
    >
      <span
        className={cn(
          'w-[2.5px] rounded-t-full bg-primary mini-eq-bar h-full',
          isPlaying ? 'mini-eq-bar--1' : 'scale-y-[0.3]',
        )}
      />
      <span
        className={cn(
          'w-[2.5px] rounded-t-full bg-primary mini-eq-bar h-full',
          isPlaying ? 'mini-eq-bar--2' : 'scale-y-[0.65]',
        )}
      />
      <span
        className={cn(
          'w-[2.5px] rounded-t-full bg-primary mini-eq-bar h-full',
          isPlaying ? 'mini-eq-bar--3' : 'scale-y-[0.4]',
        )}
      />
    </div>
  )
}
