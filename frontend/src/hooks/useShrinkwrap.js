import { useMemo } from 'react'
import { prepare, layout } from '@chenglou/pretext'

/**
 * Hook to compute the tightest bubble width for text.
 * Binary-searches for the narrowest width that preserves the line count.
 *
 * @param {string} text
 * @param {string} font
 * @param {number} maxWidth - Maximum allowed bubble width
 * @param {number} lineHeight
 * @param {boolean} fontReady - Whether fonts are loaded
 * @returns {{ tightWidth: number, height: number, lineCount: number }}
 */
export function useShrinkwrap(text, font, maxWidth, lineHeight, fontReady = true) {
  const prepared = useMemo(() => {
    if (!text || !fontReady) return null
    try {
      return prepare(text, font)
    } catch {
      return null
    }
  }, [text, font, fontReady])

  return useMemo(() => {
    if (!prepared || !maxWidth || maxWidth <= 0) {
      return { tightWidth: 0, height: 0, lineCount: 0 }
    }

    try {
      // Get baseline line count at max width
      const baseline = layout(prepared, maxWidth, lineHeight)

      if (baseline.lineCount <= 1) {
        // Single line — the natural width IS the tight width.
        // Use layout at a very large width to get the natural (unwrapped) width,
        // then clamp to maxWidth.
        const natural = layout(prepared, 99999, lineHeight)
        // For single line, height is just lineHeight. The tight width is
        // approximately (maxWidth / lineCount) but we can binary search too.
        // Simpler: use binary search even for 1 line.
        let lo = 0, hi = maxWidth
        while (hi - lo > 0.5) {
          const mid = (lo + hi) / 2
          const test = layout(prepared, mid, lineHeight)
          if (test.lineCount <= 1) {
            hi = mid
          } else {
            lo = mid
          }
        }
        return {
          tightWidth: Math.ceil(hi),
          height: baseline.height,
          lineCount: baseline.lineCount,
        }
      }

      // Multi-line: binary search for tightest width that keeps same line count
      let lo = 0, hi = maxWidth
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2
        const test = layout(prepared, mid, lineHeight)
        if (test.lineCount <= baseline.lineCount) {
          hi = mid
        } else {
          lo = mid
        }
      }

      const tightLayout = layout(prepared, hi, lineHeight)
      return {
        tightWidth: Math.ceil(hi),
        height: tightLayout.height,
        lineCount: tightLayout.lineCount,
      }
    } catch {
      return { tightWidth: 0, height: 0, lineCount: 0 }
    }
  }, [prepared, maxWidth, lineHeight])
}
