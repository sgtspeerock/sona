import { clsx } from 'clsx'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import Marquee from 'react-fast-marquee'

interface MarqueeTitleProps {
  children: ReactNode
  gap: string
}

export function MarqueeTitle({ children, gap }: MarqueeTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [marqueeKey, setMarqueeKey] = useState('')

  const MARQUEE_OVERFLOW_THRESHOLD_PX = 40

  const calculateOverflow = useCallback(() => {
    if (!containerRef.current || !textRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const textWidth = textRef.current.offsetWidth
    const nextOverflow =
      textWidth > containerWidth + MARQUEE_OVERFLOW_THRESHOLD_PX

    if (isOverflowing && !nextOverflow) {
      setMarqueeKey(Math.random().toString())
    }

    setIsOverflowing(nextOverflow)
  }, [isOverflowing])

  useLayoutEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(calculateOverflow)
    }

    calculateOverflow()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [calculateOverflow])

  useEffect(() => {
    setIsOverflowing(false)
    setIsFinished(false)
    setMarqueeKey(Math.random().toString())
    calculateOverflow()
  }, [calculateOverflow])

  return (
    <div className="relative">
      <div
        className="absolute bottom-0 left-0 right-0 w-full overflow-hidden whitespace-nowrap opacity-0 pointer-events-none"
        ref={containerRef}
      >
        <div className="inline-flex" ref={textRef}>
          {children}
        </div>
      </div>

      {!isOverflowing ? (
        <div>{children}</div>
      ) : (
        <Marquee
          key={marqueeKey}
          className={clsx(
            !isFinished && 'maskImage-marquee-fade',
            isFinished && 'maskImage-marquee-fade-finished',
          )}
          speed={26}
          play={true}
          loop={0}
          delay={4}
          pauseOnHover={false}
          onFinish={() => setIsFinished(true)}
        >
          <div className={gap}>{children}</div>
        </Marquee>
      )}
    </div>
  )
}
