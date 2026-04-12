import { useRef, useCallback, useState } from 'react'
import { prepare, layout } from '@chenglou/pretext'

/**
 * Hook for streaming AI responses — re-measures height as tokens arrive.
 * Uses requestAnimationFrame to debounce rapid token updates.
 *
 * @param {string} font - CSS font shorthand
 * @param {number} maxWidth - Bubble max width in px
 * @param {number} lineHeight - Line height in px
 * @returns {{ currentHeight: number, lineCount: number, updateText: (text) => void, reset: () => void }}
 */
export function useStreamingPretext(font, maxWidth, lineHeight) {
  const [currentHeight, setCurrentHeight] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const lastTextRef = useRef('')
  const rafRef = useRef(null)

  const updateText = useCallback((text) => {
    if (!text || text === lastTextRef.current) return
    lastTextRef.current = text

    // Debounce with rAF — don't re-prepare on every single token
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      try {
        const prepared = prepare(text, font)
        const result = layout(prepared, maxWidth, lineHeight)
        setCurrentHeight(result.height)
        setLineCount(result.lineCount)
      } catch {
        // Fallback: estimate based on text length
        const estimatedLines = Math.ceil(text.length / 60)
        setCurrentHeight(estimatedLines * lineHeight)
        setLineCount(estimatedLines)
      }
    })
  }, [font, maxWidth, lineHeight])

  const reset = useCallback(() => {
    lastTextRef.current = ''
    setCurrentHeight(0)
    setLineCount(0)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return { currentHeight, lineCount, updateText, reset }
}
