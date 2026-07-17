import { SonaDjMode } from '@/store/sona-dj.store'
import { LoopState } from '@/types/playerContext'

export type SongEndedActions = {
  hasNextSong: () => boolean
  playNextSong: () => void
  setPlayingState: (isPlaying: boolean) => void
  clearPlayerState: () => void
  resetProgress: () => void
  restartCurrentTrack: () => void
}

export type SongEndedRuntime = {
  ensureSonaDjNextTrack: () => Promise<void>
  ensureRuntimeShuffleNextTrack: () => Promise<void>
  ensureDaytimeMoodNextTrack: () => Promise<void>
  getRuntimeMode: () => SonaDjMode
  getRuntimeShuffleEnabled: () => boolean
}

export async function orchestrateSongEnded(
  loopState: LoopState,
  actions: SongEndedActions,
  runtime: SongEndedRuntime,
) {
  if (loopState === LoopState.One) {
    actions.restartCurrentTrack()
    actions.resetProgress()
    actions.setPlayingState(true)
    return
  }

  const isSonaDjEnabled = runtime.getRuntimeMode() !== SonaDjMode.Off

  await runtime.ensureSonaDjNextTrack()
  await runtime.ensureRuntimeShuffleNextTrack()
  await runtime.ensureDaytimeMoodNextTrack()

  if (isSonaDjEnabled && !actions.hasNextSong()) {
    await runtime.ensureSonaDjNextTrack()
  }
  if (runtime.getRuntimeShuffleEnabled() && !actions.hasNextSong()) {
    await runtime.ensureRuntimeShuffleNextTrack()
  }

  if (actions.hasNextSong() || loopState === LoopState.All) {
    actions.playNextSong()
    actions.setPlayingState(true)
    return
  }

  actions.clearPlayerState()
  actions.setPlayingState(false)
}
