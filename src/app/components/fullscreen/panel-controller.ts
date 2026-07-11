export type FullscreenPanelTarget = 'queue' | 'lyrics'

export function getNextFullscreenPanel(
  target: FullscreenPanelTarget,
  state: { queueOpen: boolean; lyricsOpen: boolean },
): FullscreenPanelTarget | null {
  if (target === 'queue' && state.queueOpen) return null
  if (target === 'lyrics' && state.lyricsOpen) return null
  return target
}

export function shouldIgnoreFullscreenOutsideClick(
  target: HTMLElement,
): boolean {
  if (target.closest('[data-fullscreen-panel-toggle]')) return true
  if (target.closest('[data-fullscreen-control-surface]')) return true
  if (target.closest('[data-testid="fullscreen-close-button"]')) return true
  return false
}
