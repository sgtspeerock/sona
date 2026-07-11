import { useEffect, useRef } from 'react'
import { useVisualizerContext } from '@/app/components/fullscreen/settings'
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

// Bilateral mirrored frequency spectrum — bars go both up and down from center
export function WaveformTunnel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { renderQuality } = useVisualizerContext()
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
          smoothed[i] = smoothed[i] * 0.8 + freqBuf[i] * 0.2
        }
      }

      scheduleStableResize()

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cy = h / 2
      const isLite = renderQuality === 'lite'
      const palette = paletteRef.current
      const c1 = palette?.vibrant ?? palette?.dominant ?? FALLBACK_PRIMARY
      const coverSecondary =
        palette?.muted ?? palette?.accent ?? palette?.dominant ?? null
      const c2 =
        coverSecondary && coverSecondary.toLowerCase() !== c1.toLowerCase()
          ? coverSecondary
          : FALLBACK_SECONDARY
      ctx.clearRect(0, 0, w, h)

      const BAR_COUNT = isLite ? 56 : 90
      const totalW = w * 0.9
      const startX = (w - totalW) / 2
      const barW = totalW / BAR_COUNT
      const gap = Math.max(1, barW * 0.18)
      const maxH = h * 0.3
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
        // Favor mids/highs slightly so lows do not dominate the full graph.
        const curved = Math.pow(t, 0.9)
        const freqIdx = Math.round(
          rangeStart + curved * (rangeEnd - rangeStart),
        )
        const raw = smoothed[freqIdx] / 255

        // Reduce bass over-dominance, lift upper mids/highs a bit.
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

      // Horizontal color gradient (vibrant on edges, accent in center)
      const hGrad = ctx.createLinearGradient(startX, 0, startX + totalW, 0)
      hGrad.addColorStop(0, hexToRgba(c2, 0.85))
      hGrad.addColorStop(0.35, hexToRgba(c1, 0.95))
      hGrad.addColorStop(0.65, hexToRgba(c1, 0.95))
      hGrad.addColorStop(1, hexToRgba(c2, 0.85))

      // Glow pass (skip in lite mode to reduce compositor/GPU cost)
      if (!isLite) {
        ctx.save()
        ctx.shadowBlur = 10
        ctx.shadowColor = hexToRgba(c1, 0.45)
        ctx.fillStyle = hexToRgba(c1, 0.22)
        for (let i = 0; i < BAR_COUNT; i++) {
          const norm = getBandNorm(i)
          if (norm < 0.12) continue
          const barH = Math.max(2, norm * maxH)
          const x = startX + i * barW
          const bw = barW - gap
          ctx.fillRect(x, cy - barH, bw, barH * 2)
        }
        ctx.restore()
      }

      // Main bars
      ctx.fillStyle = hGrad
      for (let i = 0; i < BAR_COUNT; i++) {
        const norm = getBandNorm(i)
        const barH = Math.max(2, norm * maxH)
        const x = startX + i * barW
        const bw = barW - gap

        if (isLite) {
          // Simpler fill path in lite mode.
          ctx.fillRect(x, cy - barH, bw, barH * 2)
          continue
        }

        // Upper half — rounded top
        ctx.beginPath()
        if (barH > 4) {
          const r = Math.min(bw / 2, 3)
          ctx.moveTo(x + r, cy - barH)
          ctx.lineTo(x + bw - r, cy - barH)
          ctx.arcTo(x + bw, cy - barH, x + bw, cy - barH + r, r)
          ctx.lineTo(x + bw, cy)
          ctx.lineTo(x, cy)
          ctx.arcTo(x, cy - barH, x + r, cy - barH, r)
          ctx.closePath()
        } else {
          ctx.rect(x, cy - barH, bw, barH)
        }
        ctx.fill()

        // Lower half — rounded bottom (mirror)
        ctx.beginPath()
        if (barH > 4) {
          const r = Math.min(bw / 2, 3)
          ctx.moveTo(x, cy)
          ctx.lineTo(x + bw, cy)
          ctx.lineTo(x + bw, cy + barH - r)
          ctx.arcTo(x + bw, cy + barH, x + bw - r, cy + barH, r)
          ctx.lineTo(x + r, cy + barH)
          ctx.arcTo(x, cy + barH, x, cy + barH - r, r)
          ctx.closePath()
        } else {
          ctx.rect(x, cy, bw, barH)
        }
        ctx.fill()
      }

      // Center divider line
      ctx.fillStyle = c2 ? hexToRgba(c2, 0.12) : 'rgba(255,255,255,0.07)'
      ctx.fillRect(startX, cy - 1, totalW, 2)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
    }
  }, [renderQuality])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
