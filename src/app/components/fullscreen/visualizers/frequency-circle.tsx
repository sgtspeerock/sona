import { useEffect, useRef } from 'react'
import { getGlobalAnalyser } from '@/app/hooks/use-audio-context'
import { useSongColor } from '@/store/player.store'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function blendHex(a: string, b: string, t: number): string {
  const ratio = clamp01(t)
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * ratio)
  const g = Math.round(ag + (bg - ag) * ratio)
  const bch = Math.round(ab + (bb - ab) * ratio)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bch
    .toString(16)
    .padStart(2, '0')}`
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function FrequencyCircle() {
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
    const BAR_COUNT = 128
    const TWO_PI = Math.PI * 2
    const cachedBarGeometry: Array<{
      x1: number
      y1: number
      xMax2: number
      yMax2: number
      cos: number
      sin: number
    }> = []
    let cachedBarGradients: CanvasGradient[] = []
    let gradientCacheKey = ''
    let centerGradientCacheKey = ''
    let cachedCenterGradient: CanvasGradient | null = null
    let animId: number
    let energyFloor = 0.06
    let energyPeak = 0.42
    let highPresence = 0
    let metricsReady = false
    let warmup = 0
    let startFrames = 0
    const FALLBACK_PRIMARY = '#7cc6ff'
    const FALLBACK_SECONDARY = '#9ff5ce'

    const rebuildGradientCache = (
      width: number,
      height: number,
      c1: string | null,
      c2: string | null,
      cdom: string | null,
    ) => {
      const size = Math.min(width, height)
      const cx = width / 2
      const cy = height / 2
      const innerR = size * 0.2
      const maxBarH = size * 0.26

      cachedBarGeometry.length = 0
      cachedBarGradients = new Array(BAR_COUNT)

      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * TWO_PI - Math.PI / 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x1 = cx + cos * innerR
        const y1 = cy + sin * innerR
        const xMax2 = cx + cos * (innerR + maxBarH)
        const yMax2 = cy + sin * (innerR + maxBarH)

        cachedBarGeometry.push({ x1, y1, xMax2, yMax2, cos, sin })

        const phase = (Math.sin((i / BAR_COUNT) * TWO_PI) + 1) * 0.5
        const midColor = cdom ?? c1 ?? FALLBACK_PRIMARY
        const startColor = blendHex(
          c2 ?? FALLBACK_SECONDARY,
          midColor,
          0.28 + phase * 0.34,
        )
        const endColor = blendHex(
          c1 ?? FALLBACK_PRIMARY,
          c2 ?? FALLBACK_SECONDARY,
          0.22 + phase * 0.5,
        )
        const grad = ctx.createLinearGradient(x1, y1, xMax2, yMax2)
        grad.addColorStop(0, hexToRgba(startColor, 0.72))
        grad.addColorStop(0.55, hexToRgba(midColor, 0.92))
        grad.addColorStop(1, hexToRgba(endColor, 1))
        cachedBarGradients[i] = grad
      }
    }

    const draw = () => {
      const analyser = getGlobalAnalyser()
      if (analyser) {
        analyser.getByteFrequencyData(freqBuf)
        for (let i = 0; i < BUF; i++) {
          smoothed[i] = smoothed[i] * 0.68 + freqBuf[i] * 0.32
        }
      }

      scheduleStableResize()

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w / 2
      const cy = h / 2
      const size = Math.min(w, h)
      const innerR = size * 0.22
      const maxBarH = size * 0.34
      const palette = paletteRef.current
      const c1 = palette?.vibrant ?? palette?.dominant ?? FALLBACK_PRIMARY
      const coverSecondary =
        palette?.muted ?? palette?.accent ?? palette?.dominant ?? null
      const c2 =
        coverSecondary && coverSecondary.toLowerCase() !== c1.toLowerCase()
          ? coverSecondary
          : FALLBACK_SECONDARY
      const cdom = palette?.dominant ?? c1

      const nextGradientCacheKey = `${w}x${h}|${c1 ?? 'none'}|${c2 ?? 'none'}|${cdom ?? 'none'}`
      if (nextGradientCacheKey !== gradientCacheKey) {
        gradientCacheKey = nextGradientCacheKey
        rebuildGradientCache(w, h, c1, c2, cdom)
      }

      ctx.clearRect(0, 0, w, h)

      const barW = ((TWO_PI * innerR) / BAR_COUNT) * 0.75
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
      const startLimiter = Math.pow(Math.min(1, startFrames / 45), 1.8)

      let activeBins = 0
      for (let i = rangeStart; i <= rangeEnd; i++) {
        if (smoothed[i] / 255 > energyFloor + 0.03) activeBins += 1
      }
      const activeDensity = energyCount > 0 ? activeBins / energyCount : 0
      const densityLimiter = 0.55 + Math.min(0.45, activeDensity * 1.2)

      const getBandNorm = (barIndex: number) => {
        const t = BAR_COUNT > 1 ? barIndex / (BAR_COUNT - 1) : 0
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
        return (
          Math.pow(normalized, 1.28) * warmup * densityLimiter * startLimiter
        )
      }

      // Bass average for center pulse
      let bassSum = 0
      for (let i = 8; i < 28; i++) bassSum += smoothed[i]
      const bassAvg = bassSum / 20 / 255

      const bars: Array<{
        barIndex: number
        x1: number
        y1: number
        x2: number
        y2: number
        norm: number
        barH: number
      }> = []

      for (let i = 0; i < BAR_COUNT; i++) {
        const geometry = cachedBarGeometry[i]
        if (!geometry) continue

        const norm = getBandNorm(i)
        // Power curve: low-level signals stay small, only loud frequencies make tall bars
        const barH = Math.pow(norm, 1.05) * maxBarH
        if (barH < 0.5) continue

        const x1 = geometry.x1
        const y1 = geometry.y1
        const x2 = x1 + geometry.cos * barH
        const y2 = y1 + geometry.sin * barH

        bars.push({ barIndex: i, x1, y1, x2, y2, norm, barH })
      }

      // Pass 1: draw bars without glow (cheap).
      ctx.shadowBlur = 0
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i]
        const cachedGradient = cachedBarGradients[bar.barIndex]
        ctx.strokeStyle = cachedGradient ?? '#ffffff'
        ctx.lineWidth = Math.max(1.5, barW, bar.barH * 0.03)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(bar.x1, bar.y1)
        ctx.lineTo(bar.x2, bar.y2)
        ctx.stroke()
      }

      // Pass 2: glow overlay for bright bars only.
      const brightBars = bars.filter((bar) => bar.norm > 0.35)
      if (brightBars.length > 0) {
        ctx.shadowBlur = 18
        ctx.shadowColor = hexToRgba(c1, 0.75)
        ctx.lineCap = 'round'
        for (const bar of brightBars) {
          ctx.strokeStyle = hexToRgba(c1, Math.min(1, 0.2 + bar.norm * 0.75))
          ctx.lineWidth = Math.max(1.2, barW * 0.72)
          ctx.beginPath()
          ctx.moveTo(bar.x1, bar.y1)
          ctx.lineTo(bar.x2, bar.y2)
          ctx.stroke()
        }
      }

      ctx.shadowBlur = 0

      // Central radial fill (pulses with bass)
      const pulseR = innerR * (1 + bassAvg * 0.02)
      const dc = cdom ?? c1
      const pulseRBucket = Math.round(pulseR * 10) / 10
      const bassBucket = Math.round(bassAvg * 20) / 20
      const nextCenterGradientCacheKey = `${w}x${h}|${dc ?? 'none'}|${pulseRBucket}|${bassBucket}`

      if (nextCenterGradientCacheKey !== centerGradientCacheKey) {
        centerGradientCacheKey = nextCenterGradientCacheKey
        const gradient = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          pulseRBucket,
        )
        gradient.addColorStop(0, hexToRgba(dc, 0.38 + bassBucket * 0.3))
        gradient.addColorStop(0.55, hexToRgba(dc, 0.14))
        gradient.addColorStop(1, hexToRgba(dc, 0))
        cachedCenterGradient = gradient
      }

      ctx.beginPath()
      ctx.arc(cx, cy, pulseR, 0, TWO_PI)
      ctx.fillStyle = cachedCenterGradient ?? '#00000000'
      ctx.fill()

      // Inner ring stroke
      ctx.beginPath()
      ctx.arc(cx, cy, innerR, 0, TWO_PI)
      ctx.strokeStyle = c1
        ? hexToRgba(c1, 0.35 + bassAvg * 0.08)
        : `rgba(255,255,255,0.25)`
      ctx.lineWidth = 1.5
      ctx.stroke()

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
