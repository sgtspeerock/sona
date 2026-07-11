import { useEffect, useState } from 'react'

export function useScrollThreshold(threshold?: number) {
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    const scrollContainer =
      document.querySelector(
        '#main-scroll-area [data-radix-scroll-area-viewport]',
      ) || document.querySelector('#main-scroll-area #scroll-viewport')
    if (!scrollContainer) return

    const getThreshold = () => {
      if (threshold !== undefined) return threshold
      const is2Xl = window.innerWidth >= 1536
      return is2Xl ? 390 : 330
    }

    const handleScroll = () => {
      setPassed(scrollContainer.scrollTop > getThreshold())
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll() // Run once on mount

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [threshold])

  return passed
}
