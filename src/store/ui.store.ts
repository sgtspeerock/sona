import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createWithEqualityFn } from 'zustand/traditional'
import { IUiContext } from '@/types/uiContext'

export const useUiStore = createWithEqualityFn<IUiContext>()(
  subscribeWithSelector(
    devtools(
      immer((set) => ({
        songInfo: {
          songId: '',
          setSongId: (id) => {
            set((state) => {
              state.songInfo.songId = id
            })
          },
          modalOpen: false,
          setModalOpen: (open) => {
            set((state) => {
              state.songInfo.modalOpen = open
            })
          },
          reset: () => {
            set((state) => {
              state.songInfo.songId = ''
              state.songInfo.modalOpen = false
            })
          },
        },
        miniPlayer: {
          open: false,
          pinned: false,
          setOpen: (open) => {
            set((state) => {
              state.miniPlayer.open = open
            })
          },
          toggleOpen: () => {
            set((state) => {
              state.miniPlayer.open = !state.miniPlayer.open
            })
          },
          setPinned: (pinned) => {
            set((state) => {
              state.miniPlayer.pinned = pinned
            })
          },
          togglePinned: () => {
            set((state) => {
              state.miniPlayer.pinned = !state.miniPlayer.pinned
            })
          },
        },
        fullscreen: {
          open: false,
          setOpen: (open) => {
            set((state) => {
              state.fullscreen.open = open
            })
          },
          visualizerActive: false,
          setVisualizerActive: (active) => {
            set((state) => {
              state.fullscreen.visualizerActive = active
            })
          },
        },
      })),
      {
        name: 'ui_store',
      },
    ),
  ),
)

export const useSongInfo = () => useUiStore((state) => state.songInfo)
export const useMiniPlayerState = () => useUiStore((state) => state.miniPlayer)
export function useFullscreenState<T = IUiContext['fullscreen']>(
  selector?: (state: IUiContext['fullscreen']) => T,
) {
  return useUiStore((state) =>
    selector ? selector(state.fullscreen) : (state.fullscreen as unknown as T),
  )
}
