import { useCallback, useEffect, useRef } from 'react'
import {
  AudioContext,
  type IAudioContext,
  type IBiquadFilterNode,
  type IGainNode,
  type IMediaElementAudioSourceNode,
} from 'standardized-audio-context'
import {
  getGlobalAnalyserNode,
  getGlobalAudioContext,
  getGlobalMediaSourceNode,
  setGlobalAnalyserNode,
  setGlobalAudioContext,
  setGlobalMediaSourceNode,
} from '@/app/audio/context-singleton'
import {
  EQ_BANDS,
  getEqFilters,
  normalizeEqGains,
  setEqFilters,
} from '@/app/audio/eq-state'
import {
  useEqualizerSettings,
  usePlayerMediaType,
  usePlayerStore,
} from '@/store/player.store'
import { logger } from '@/utils/logger'
import { ReplayGainParams } from '@/utils/replayGain'

type IAudioSource = IMediaElementAudioSourceNode<IAudioContext>

export function useAudioContext(
  audio: HTMLAudioElement | null,
  enableVisualizerTap = true,
) {
  const { isSong } = usePlayerMediaType()
  const shouldEnableVisualizerBranch = enableVisualizerTap
  const { enabled: eqEnabled, gains: eqGains } = useEqualizerSettings()
  const normalizedEqGains = normalizeEqGains(eqGains)

  const audioContextRef = useRef<IAudioContext | null>(null)
  const sourceNodeRef = useRef<IAudioSource | null>(null)
  const gainNodeRef = useRef<IGainNode<IAudioContext> | null>(null)
  const visualizerGainRef = useRef<GainNode | null>(null)
  const eqFiltersRef = useRef<IBiquadFilterNode<IAudioContext>[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chainConnectedRef = useRef(false)
  const visualizerBranchConnectedRef = useRef(false)

  const setupAudioContext = useCallback(() => {
    if (!audio || !isSong) return

    const existingCtx = getGlobalAudioContext()
    if (!existingCtx || existingCtx.state === 'closed') {
      setGlobalAudioContext(new AudioContext())
      // Nullify local refs so they are rebuilt against the new context
      audioContextRef.current = null
      chainConnectedRef.current = false
      visualizerBranchConnectedRef.current = false
      gainNodeRef.current = null
      eqFiltersRef.current = []
    }
    if (!audioContextRef.current) {
      audioContextRef.current = getGlobalAudioContext()
    }

    const audioContext = audioContextRef.current

    if (!sourceNodeRef.current) {
      const existingSource = getGlobalMediaSourceNode(audio)
      if (existingSource) {
        sourceNodeRef.current = existingSource
      } else {
        const nextSource = audioContext.createMediaElementSource(audio)
        setGlobalMediaSourceNode(audio, nextSource)
        sourceNodeRef.current = nextSource
      }
    }

    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContext.createGain()
    }

    // Create EQ filters if not already created
    if (eqFiltersRef.current.length === 0) {
      const filters = EQ_BANDS.map((band) => {
        const filter = audioContext.createBiquadFilter()
        filter.type = band.type
        filter.frequency.value = band.hz
        filter.Q.value = 1.0
        filter.gain.value = 0
        return filter
      })
      eqFiltersRef.current = filters
      setEqFilters(filters)
      filters.forEach((filter, index) => {
        filter.gain.value = eqEnabled ? normalizedEqGains[index] : 0
      })
      logger.info('Created EQ filters', { count: filters.length })
    }

    if (!chainConnectedRef.current) {
      // Connect main audio chain: source -> EQ filters -> gainNode -> destination
      let prevNode: AudioNode = sourceNodeRef.current

      // Connect all EQ filters in series
      eqFiltersRef.current.forEach((filter) => {
        prevNode.connect(filter)
        prevNode = filter
      })

      // Connect to main gain node (for master volume)
      prevNode.connect(gainNodeRef.current)

      // Connect gain node to destination
      gainNodeRef.current.connect(audioContext.destination)

      chainConnectedRef.current = true
      logger.info(
        'Audio chain connected: source -> EQ -> gain -> destination (+ visualizer branch)',
      )
    }
  }, [audio, eqEnabled, isSong, normalizedEqGains])

  useEffect(() => {
    if (!isSong || !chainConnectedRef.current) return

    const lastEqFilter = eqFiltersRef.current[eqFiltersRef.current.length - 1]
    if (!lastEqFilter) return

    if (!shouldEnableVisualizerBranch) {
      if (visualizerBranchConnectedRef.current) {
        try {
          visualizerGainRef.current?.disconnect()
          analyserRef.current?.disconnect()
        } catch {
          // no-op
        }
        visualizerBranchConnectedRef.current = false
      }
      if (getGlobalAnalyserNode() === analyserRef.current) {
        setGlobalAnalyserNode(null)
      }
      return
    }

    if (!audioContextRef.current) return

    if (!visualizerGainRef.current) {
      const vizGain = audioContextRef.current.createGain() as GainNode
      vizGain.gain.value = 0.25
      visualizerGainRef.current = vizGain
    }

    if (!analyserRef.current) {
      const analyser = audioContextRef.current.createAnalyser() as AnalyserNode
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.75
      analyserRef.current = analyser
    }

    if (!visualizerBranchConnectedRef.current) {
      try {
        lastEqFilter.connect(visualizerGainRef.current)
        visualizerGainRef.current.connect(analyserRef.current)
      } catch {
        // already connected
      }
      visualizerBranchConnectedRef.current = true
    }

    setGlobalAnalyserNode(analyserRef.current)
  }, [isSong, shouldEnableVisualizerBranch])

  useEffect(() => {
    const filters =
      eqFiltersRef.current.length > 0 ? eqFiltersRef.current : getEqFilters()
    if (!filters.length) return

    filters.forEach((filter, index) => {
      filter.gain.value = eqEnabled ? normalizedEqGains[index] : 0
    })
  }, [eqEnabled, normalizedEqGains])

  const resumeContext = useCallback(async () => {
    const audioContext = audioContextRef.current
    if (!audioContext || !isSong) return

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    if (audioContext.state === 'closed') {
      setupAudioContext()
    }
  }, [isSong, setupAudioContext])

  const setupGain = useCallback(
    (gainValue: number, replayGain?: ReplayGainParams) => {
      if (audioContextRef.current && gainNodeRef.current) {
        const currentTime = audioContextRef.current.currentTime

        // Only update master gain, NOT visualizer gain
        gainNodeRef.current.gain.setValueAtTime(gainValue, currentTime)
      }
    },
    [],
  )

  const resetRefs = useCallback(() => {
    sourceNodeRef.current = null
    if (visualizerGainRef.current) {
      visualizerGainRef.current.disconnect()
      visualizerGainRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
      setGlobalAnalyserNode(null)
    }
    eqFiltersRef.current.forEach((filter) => {
      filter.disconnect()
    })
    eqFiltersRef.current = []
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect()
      gainNodeRef.current = null
    }
    audioContextRef.current = getGlobalAudioContext()
    chainConnectedRef.current = false
    visualizerBranchConnectedRef.current = false
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear state after unmount
  useEffect(() => {
    return () => resetRefs()
  }, [])

  useEffect(() => {
    if (audio) setupAudioContext()
  }, [audio, setupAudioContext])

  return {
    audioContextRef,
    sourceNodeRef,
    gainNodeRef,
    eqFiltersRef,
    analyserRef,
    setupAudioContext,
    resumeContext,
    setupGain,
    resetRefs,
  }
}

// Export function to get global analyser for visualizer
export function getGlobalAnalyser(): AnalyserNode | null {
  return getGlobalAnalyserNode()
}

// Export functions to control EQ from equalizer modal
export function setEqEnabled(enabled: boolean) {
  usePlayerStore.getState().settings.equalizer.setEnabled(enabled)
  logger.info('EQ enabled:', enabled)
}

export function setEqGains(gains: number[]) {
  const normalized = normalizeEqGains(gains)
  usePlayerStore.getState().settings.equalizer.setGains(normalized)
  getEqFilters().forEach((filter, index) => {
    logger.info(`EQ Filter ${index}: ${normalized[index]} dB`)
  })
}

export function getEqState() {
  const {
    settings: { equalizer },
  } = usePlayerStore.getState()
  return {
    enabled: equalizer.enabled,
    gains: normalizeEqGains(equalizer.gains),
    filters: getEqFilters(),
  }
}
