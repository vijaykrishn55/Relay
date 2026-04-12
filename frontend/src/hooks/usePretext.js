import { useMemo } from 'react'
import { prepare, layout } from '@chenglou/pretext'

/**
 * Hook to measure text height using Pretext.
 * Two-phase: prepare (once per text) → layout (pure math on resize).
 *
 * @param {string} text - The text content to measure
 * @param {string} font - CSS font shorthand (e.g., '14px Inter')
 * @param {number} maxWidth - Container width in pixels
 * @param {number} lineHeight - CSS line-height in pixels
 * @param {boolean} fontReady - Whether the font is loaded
 * @returns {{ height: number, lineCount: number }}
 */
export function usePretext(text, font, maxWidth, lineHeight, fontReady = true) {
  const prepared = useMemo(() => {
    if (!text || !fontReady) return null
    try {
      return prepare(text, font)
    } catch {
      return null
    }
  }, [text, font, fontReady])

  const result = useMemo(() => {
    if (!prepared || !maxWidth || maxWidth <= 0) {
      return { height: 0, lineCount: 0 }
    }
    try {
      return layout(prepared, maxWidth, lineHeight)
    } catch {
      return { height: 0, lineCount: 0 }
    }
  }, [prepared, maxWidth, lineHeight])

  return result
}
