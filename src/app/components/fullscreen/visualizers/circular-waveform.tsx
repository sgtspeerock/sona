import { useEffect, useRef } from 'react'
import { getGlobalAnalyser } from '@/app/hooks/use-audio-context'
import { useSongColor } from '@/store/player.store'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

// Psychedelic zoom vortex: frequency-distorted rings continuously fly toward the viewer.
// Bass drives speed and rotation, making it react violently to the beat.
export function CircularWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentSongColorPalette } = useSongColor()
  const paletteRef = useRef(currentSongColorPalette)

  useEffect(() => {
    paletteRef.current = currentSongColorPalette
  }, [currentSongColorPalette])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    let pendingWidth = 0
    let pendingHeight = 0
    let stableFrames = 0

    const commitResize = (width: number, height: number) => {
      if (canvas.width === width && canvas.height === height) return
      canvas.width = width
      canvas.height = height
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const scheduleStableResize = () => {
      const width = Math.floor(canvas.clientWidth * dpr)
      const height = Math.floor(canvas.clientHeight * dpr)
      if (width <= 0 || height <= 0) return

      if (width !== pendingWidth || height !== pendingHeight) {
        pendingWidth = width
        pendingHeight = height
        stableFrames = 0
        return
      }

      if (stableFrames < 2) {
        stableFrames += 1
        return
      }

      commitResize(pendingWidth, pendingHeight)
    }

    const BUF = 256
    const freqBuf = new Uint8Array(BUF)
    const smoothed = new Float32Array(BUF)

    const N = 22
    // Each ring has a progress value 0..1 (0 = tiny/far, 1 = full-screen/close)
    const progress = new Float32Array(N)
    for (let i = 0; i < N; i++) progress[i] = i / N

    let baseRotation = 0
    const TWO_PI = Math.PI * 2
    const POINTS = 72
    let animId: number
    let energyFloor = 0.06
    let energyPeak = 0.42
    let highPresence = 0
    let metricsReady = false
    let warmup = 0
    let startFrames = 0
    const FALLBACK_PRIMARY = '#7cc6ff'
    const FALLBACK_SECONDARY = '#9ff5ce'

    const draw = () => {
      const analyser = getGlobalAnalyser()
      if (analyser) {
        analyser.getByteFrequencyData(freqBuf)
        for (let i = 0; i < BUF; i++) {
          smoothed[i] = smoothed[i] * 0.78 + freqBuf[i] * 0.22
        }
      }

      scheduleStableResize()

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.min(w, h) * 0.42
      const palette = paletteRef.current
      const c1 = palette?.vibrant ?? palette?.dominant ?? FALLBACK_PRIMARY
      const coverSecondary =
        palette?.muted ?? palette?.accent ?? palette?.dominant ?? null
      const c2 =
        coverSecondary && coverSecondary.toLowerCase() !== c1.toLowerCase()
          ? coverSecondary
          : FALLBACK_SECONDARY
      const c3 = palette?.dominant ?? c1
      // Bass & mid energy
      let bassSum = 0
      for (let i = 8; i < 28; i++) bassSum += smoothed[i]
      const bassAvg = bassSum / 20 / 255

      let midSum = 0
      for (let i = 32; i < 72; i++) midSum += smoothed[i]
      const midAvg = midSum / 40 / 255

      ctx.clearRect(0, 0, w, h)

      // Speed: base + heavy bass kick
      const speed = 0.006 + bassAvg * 0.012 + midAvg * 0.01
      // Rotation: also bass-driven
      baseRotation += 0.01 + bassAvg * 0.02

      // Advance all rings
      for (let i = 0; i < N; i++) {
        progress[i] += speed
        if (progress[i] > 1) progress[i] -= 1
      }

      const maxFreqBin = Math.max(1, analyser?.frequencyBinCount ?? BUF / 2)
      const rangeStart = Math.min(3, maxFreqBin - 1)
      const rangeEnd = Math.max(rangeStart + 1, Math.min(88, maxFreqBin - 1))

      let energySum = 0
      let energyCount = 0
      for (let i = rangeStart; i <= rangeEnd; i++) {
        energySum += smoothed[i] / 255
        energyCount += 1
      }
      const globalEnergy = energyCount > 0 ? energySum / energyCount : 0

      let highSum = 0
      let highCount = 0
      const highStart = Math.min(64, maxFreqBin - 1)
      const highEnd = Math.max(highStart, Math.min(88, maxFreqBin - 1))
      for (let i = highStart; i <= highEnd; i++) {
        highSum += smoothed[i] / 255
        highCount += 1
      }
      const highEnergy = highCount > 0 ? highSum / highCount : 0

      if (!metricsReady) {
        energyFloor = globalEnergy * 0.74
        energyPeak = Math.max(energyFloor + 0.18, globalEnergy * 1.34)
        highPresence = highEnergy
        metricsReady = true
      }

      energyFloor = energyFloor * 0.97 + globalEnergy * 0.03
      energyPeak = Math.max(
        energyFloor + 0.16,
        energyPeak * 0.965 + globalEnergy * 0.035,
      )
      highPresence = highPresence * 0.9 + highEnergy * 0.1
      warmup = Math.min(1, warmup + 0.065)
      startFrames += 1
      const startLimiter = Math.pow(Math.min(1, startFrames / 50), 1.9)

      let activeBins = 0
      for (let i = rangeStart; i <= rangeEnd; i++) {
        if (smoothed[i] / 255 > energyFloor + 0.03) activeBins += 1
      }
      const activeDensity = energyCount > 0 ? activeBins / energyCount : 0
      const densityLimiter = 0.55 + Math.min(0.45, activeDensity * 1.2)

      // Draw order: smallest (farthest) first
      const order = Array.from({ length: N }, (_, i) => i).sort(
        (a, b) => progress[a] - progress[b],
      )

      for (const idx of order) {
        const p = progress[idx]

        // Dramatic perspective ease — rings accelerate as they approach
        const scale = Math.pow(p, 1.6)
        const baseR = maxR * scale * (0.35 + 0.65 * startLimiter)
        if (baseR < 1.5) continue

        // Each ring rotates proportionally to how close it is (parallax)
        const angleOffset = baseRotation * (0.5 + p * 1.8)

        // Distortion amount grows with proximity
        const distMult = 0.12 + p * 0.09

        // Build distorted ring path
        ctx.beginPath()
        for (let i = 0; i <= POINTS; i++) {
          const angle = (i / POINTS) * TWO_PI + angleOffset
          const t = i / POINTS
          const curved = Math.pow(t, 0.9)
          const freqIdx = Math.round(
            rangeStart + curved * (rangeEnd - rangeStart),
          )
          const raw = smoothed[freqIdx] / 255
          const lowWeight = freqIdx < 16 ? 0.68 : freqIdx < 32 ? 0.84 : 1
          const highWeight = freqIdx > 80 ? 0.65 + highPresence * 0.65 : 1
          const weighted = clamp01(raw * lowWeight * highWeight)
          const gate = energyFloor * 0.55 + 0.04
          const range = Math.max(0.18, energyPeak - gate)
          const normalized = clamp01((weighted - gate) / range)
          const fv =
            Math.pow(normalized, 1.24) * warmup * densityLimiter * startLimiter
          const r = baseR * (1 + fv * distMult)
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()

        // Alpha: fades in from center, full opacity near edge, then fades just before clipping
        const alpha = Math.pow(p, 0.5) * (p < 0.9 ? 1 : (1 - p) / 0.1) * 0.8

        // Color: cycle through palette based on ring position
        // Creates a color depth illusion (far = one color, close = another)
        let color: string
        const band = Math.floor(p * 3)
        if (band === 0) color = c3 ?? c2 ?? c1
        else if (band === 1) color = c2 ?? c1
        else color = c1

        const glowStrength = p * (0.4 + bassAvg * 0.6)
        ctx.shadowBlur = 6 + glowStrength * 18
        ctx.shadowColor = hexToRgba(color, glowStrength * 0.75)
        ctx.strokeStyle = hexToRgba(color, alpha)
        ctx.lineWidth = 0.5 + p * 2.8
        ctx.stroke()
      }

      ctx.shadowBlur = 0

      // Vanishing point glow at center (draws the eye in)
      const vpGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.18)
      vpGrad.addColorStop(0, hexToRgba(c1, 0.25 + bassAvg * 0.35))
      vpGrad.addColorStop(0.5, hexToRgba(c1, 0.06))
      vpGrad.addColorStop(1, hexToRgba(c1, 0))
      ctx.beginPath()
      ctx.arc(cx, cy, maxR * 0.18, 0, TWO_PI)
      ctx.fillStyle = vpGrad
      ctx.fill()

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
