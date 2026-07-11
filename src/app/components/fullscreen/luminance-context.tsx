import { createContext, useContext } from 'react'
import { usePlayerCurrentSong } from '@/store/player.store'
import { useCoverLuminance } from './use-cover-luminance'

type FullscreenLuminanceContextType = {
  luminance: number | null
  useDarkForeground: boolean
}

const FullscreenLuminanceContext =
  createContext<FullscreenLuminanceContextType>({
    luminance: null,
    useDarkForeground: false,
  })

export function FullscreenLuminanceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { coverArt } = usePlayerCurrentSong()
  const luminance = useCoverLuminance(coverArt, '300')
  const useDarkForeground = luminance !== null && luminance >= 0.66

  return (
    <FullscreenLuminanceContext.Provider
      value={{ luminance, useDarkForeground }}
    >
      {children}
    </FullscreenLuminanceContext.Provider>
  )
}

export function useFullscreenLuminance() {
  return useContext(FullscreenLuminanceContext)
}
