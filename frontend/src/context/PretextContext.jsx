import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const PretextContext = createContext(null)

// Font config — must match your CSS declarations exactly
const FONT_CONFIG = {
  body: '14px Inter',
  bodyLineHeight: 20,
  code: '13px monospace',
  codeLineHeight: 18,
}

/**
 * PretextProvider — shared context for text measurement.
 * Handles font loading detection and container width tracking.
 */
export function PretextProvider({ children }) {
  const [fontReady, setFontReady] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef(null)
  const observerRef = useRef(null)

  // Wait for fonts to load before measuring
  useEffect(() => {
    // Try loading Inter specifically first
    if (document.fonts && document.fonts.load) {
      document.fonts.load('14px Inter')
        .then(() => setFontReady(true))
        .catch(() => {
          // Font might not be available — still set ready after a timeout
          // so we don't block indefinitely
          setFontReady(true)
        })
    } else {
      // Browser doesn't support Font Loading API — assume ready
      setFontReady(true)
    }

    // Fallback: set ready after 2s no matter what
    const timeout = setTimeout(() => setFontReady(true), 2000)
    return () => clearTimeout(timeout)
  }, [])

  // ResizeObserver callback for container width tracking
  const observeContainer = useCallback((node) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) return

    containerRef.current = node

    // Set initial width
    setContainerWidth(node.getBoundingClientRect().width)

    // Observe future resizes
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect?.width || entry.target.getBoundingClientRect().width
        setContainerWidth(width)
      }
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const value = {
    fontReady,
    containerWidth,
    containerRef,
    observeContainer,
    fonts: FONT_CONFIG,
  }

  return <PretextContext.Provider value={value}>{children}</PretextContext.Provider>
}

/**
 * Hook to access Pretext configuration and container dimensions.
 */
export function usePretextConfig() {
  const ctx = useContext(PretextContext)
  if (!ctx) {
    // Return safe defaults if not wrapped in provider (graceful degradation)
    return {
      fontReady: false,
      containerWidth: 0,
      containerRef: { current: null },
      observeContainer: () => {},
      fonts: FONT_CONFIG,
    }
  }
  return ctx
}
