import { isDev } from './env'

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    // Muted to reduce console clutter
    // if (isDev) {
    //   console.info(`[logger] ${message}`, ...args)
    // }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[logger] ${message}`, ...args)
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[logger] ${message}`, ...args)
  },
}
