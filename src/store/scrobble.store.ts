import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import merge from 'lodash/merge'

export type ScrobbleStatus =
  | 'idle'
  | 'sending-now'
  | 'now-ok'
  | 'now-failed'
  | 'sending'
  | 'ok'
  | 'failed'

export interface QueuedScrobble {
  id: string
  time: string
}

interface IScrobbleStatusStore {
  status: ScrobbleStatus
  trackId: string | null
  updatedAt: number
  hasPendingScrobbleFailure: boolean
  lastScrobbleFailedAt: number
  lastScrobbleSucceededAt: number
  queue: QueuedScrobble[]
  setStatus: (status: ScrobbleStatus, trackId?: string | null) => void
  addToQueue: (id: string, time: string) => void
  removeFromQueue: (id: string, time: string) => void
  clearQueue: () => void
}

export const useScrobbleStatusStore = create<IScrobbleStatusStore>()(
  persist(
    (set) => ({
      status: 'idle',
      trackId: null,
      updatedAt: 0,
      hasPendingScrobbleFailure: false,
      lastScrobbleFailedAt: 0,
      lastScrobbleSucceededAt: 0,
      queue: [],
      setStatus: (status, trackId = null) =>
        set((state) => {
          const now = Date.now()
          const next: Partial<IScrobbleStatusStore> = {
            status,
            trackId,
            updatedAt: now,
          }

          if (status === 'failed') {
            next.hasPendingScrobbleFailure = true
            next.lastScrobbleFailedAt = now
          }

          if (status === 'ok') {
            next.hasPendingScrobbleFailure = false
            next.lastScrobbleSucceededAt = now
          }

          return { ...state, ...next }
        }),
      addToQueue: (id, time) =>
        set((state) => {
          if (state.queue.some((item) => item.id === id && item.time === time)) {
            return state
          }
          return { queue: [...state.queue, { id, time }] }
        }),
      removeFromQueue: (id, time) =>
        set((state) => ({
          queue: state.queue.filter(
            (item) => !(item.id === id && item.time === time),
          ),
        })),
      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'scrobble_status_store',
      version: 1,
      merge: (persistedState, currentState) => {
        return merge(currentState, persistedState)
      },
    },
  ),
)

export const useScrobbleStatus = () =>
  useScrobbleStatusStore((state) => ({
    status: state.status,
    trackId: state.trackId,
    updatedAt: state.updatedAt,
    hasPendingScrobbleFailure: state.hasPendingScrobbleFailure,
    lastScrobbleFailedAt: state.lastScrobbleFailedAt,
    lastScrobbleSucceededAt: state.lastScrobbleSucceededAt,
    queue: state.queue,
  }))
