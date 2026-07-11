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

const DRAW_PTS = 60
const TRACES = 36

export function AudioLandscape() {
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
    const timeBuf = new Uint8Array(BUF)
    const freqBuf = new Uint8Array(BUF)
    const smoothedTime = new Float32Array(BUF).fill(128)
    const smoothedFreq = new Float32Array(BUF)

    const history: Float32Array[] = []
    let frameCount = 0
    let warmup = 0
    let startFrames = 0
    const FALLBACK_PRIMARY = '#7cc6ff'
    const FALLBACK_SECONDARY = '#9ff5ce'
    let animId: number

    const buildPath = (
      arr: Float32Array,
      getY: (v: number) => number,
      w: number,
    ) => {
      const step = arr.length / DRAW_PTS
      const xs: number[] = []
      const ys: number[] = []
      for (let i = 0; i < DRAW_PTS; i++) {
        let sum = 0
        const s0 = Math.floor(i * step)
        const s1 = Math.floor((i + 1) * step)
        for (let j = s0; j < s1; j++) sum += arr[j]
        xs.push((i / (DRAW_PTS - 1)) * w)
        ys.push(getY(sum / (s1 - s0)))
      }
      ctx.beginPath()
      ctx.moveTo(xs[0], ys[0])
      for (let i = 0; i < DRAW_PTS - 1; i++) {
        const mx = (xs[i] + xs[i + 1]) / 2
        const my = (ys[i] + ys[i + 1]) / 2
        ctx.quadraticCurveTo(xs[i], ys[i], mx, my)
      }
      ctx.lineTo(xs[DRAW_PTS - 1], ys[DRAW_PTS - 1])
    }

    const draw = () => {
      const analyser = getGlobalAnalyser()
      if (analyser) {
        analyser.getByteTimeDomainData(timeBuf)
        analyser.getByteFrequencyData(freqBuf)
        for (let i = 0; i < BUF; i++) {
          smoothedTime[i] = smoothedTime[i] * 0.55 + timeBuf[i] * 0.45
          smoothedFreq[i] = smoothedFreq[i] * 0.72 + freqBuf[i] * 0.28
        }
      }

      // Capture every 3 frames for dense, visibly distinct trace stack
      frameCount++
      if (frameCount % 3 === 0) {
        history.push(new Float32Array(smoothedTime))
        if (history.length > TRACES) history.shift()
      }

      scheduleStableResize()

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cy = h / 2
      const palette = paletteRef.current
      const c1 = palette?.vibrant ?? palette?.dominant ?? FALLBACK_PRIMARY
      const coverSecondary =
        palette?.muted ?? palette?.accent ?? palette?.dominant ?? null
      const c2 =
        coverSecondary && coverSecondary.toLowerCase() !== c1.toLowerCase()
          ? coverSecondary
          : FALLBACK_SECONDARY
      let bassSum = 0
      for (let i = 8; i < 24; i++) bassSum += smoothedFreq[i]
      const bassAvg = bassSum / 16 / 255
      let midSum = 0
      for (let i = 24; i < 72; i++) midSum += smoothedFreq[i]
      const midAvg = midSum / 48 / 255
      let highSum = 0
      for (let i = 72; i < 112; i++) highSum += smoothedFreq[i]
      const highAvg = highSum / 40 / 255
      const motionEnergy = bassAvg * 0.3 + midAvg * 0.5 + highAvg * 0.2
      const gatedMotion = clamp01((motionEnergy - 0.08) / 0.44)
      warmup = Math.min(1, warmup + 0.07)
      startFrames += 1
      const startLimiter = Math.pow(Math.min(1, startFrames / 45), 1.8)
      const reactiveMotion = gatedMotion * warmup * startLimiter
      const dynamicGain = 6 + reactiveMotion * 5
      const maxAmp = h * (0.14 + reactiveMotion * 0.12)

      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const toY = (sample: number) =>
        cy + Math.tanh(((sample - 128) / 128) * dynamicGain) * maxAmp

      const total = history.length
      if (total >= 2) {
        for (let t = 0; t < total; t++) {
          const age = t / (total - 1)
          const alpha = Math.pow(age, 1.0) * 0.92
          const lineW = 0.6 + age * 2.5

          buildPath(history[t], toY, w)

          ctx.shadowBlur = age > 0.5 ? ((age - 0.5) / 0.5) * 12 : 0
          ctx.shadowColor = hexToRgba(c1, 0.6)
          ctx.strokeStyle = hexToRgba(c1, alpha)
          ctx.lineWidth = lineW
          ctx.stroke()
        }
      }

      ctx.shadowBlur = 0

      // Live: massive outer glow
      buildPath(smoothedTime, toY, w)
      ctx.shadowBlur = 10 + reactiveMotion * 8
      ctx.shadowColor = hexToRgba(c1, 0.72)
      ctx.strokeStyle = hexToRgba(c1, 0.44 + reactiveMotion * 0.12)
      ctx.lineWidth = 3 + reactiveMotion * 2.5
      ctx.stroke()

      // Live: focused glow
      buildPath(smoothedTime, toY, w)
      ctx.shadowBlur = 10
      ctx.shadowColor = hexToRgba(c2, 0.85)
      ctx.strokeStyle = hexToRgba(c2, 0.92)
      ctx.lineWidth = 2.6
      ctx.stroke()

      // Live: razor core
      buildPath(smoothedTime, toY, w)
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)'
      ctx.lineWidth = 1.1
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
