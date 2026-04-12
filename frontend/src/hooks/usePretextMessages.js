import { useRef, useMemo } from 'react'
import { prepare, layout } from '@chenglou/pretext'

// Padding constants matching MessageBubble.jsx CSS
const BUBBLE_PADDING_Y = 24    // py-3 = 12px * 2
const BUBBLE_PADDING_X = 32    // px-4 = 16px * 2
const METADATA_HEIGHT = 24     // model info + timestamp row
const AVATAR_SIZE = 32         // w-8 h-8
const MESSAGE_GAP = 16         // gap between messages
const MAX_BUBBLE_RATIO = 0.7   // max-w-[70%]

/**
 * Batch-measures all message heights using Pretext.
 * Caches prepared handles so unchanged messages aren't re-measured.
 *
 * @param {Array} messages - Array of { role, content, ... }
 * @param {string} font - CSS font shorthand
 * @param {number} containerWidth - Full container width
 * @param {number} lineHeight - CSS line-height in px
 * @param {boolean} fontReady - Whether fonts are loaded
 * @returns {{ heightMap: Map, totalHeight: number, prefixHeights: number[] }}
 */
export function usePretextMessages(messages, font, containerWidth, lineHeight, fontReady = true) {
  const cacheRef = useRef(new Map())

  return useMemo(() => {
    const heightMap = new Map()
    const prefixHeights = [] // cumulative heights for virtualization
    let totalHeight = 0

    if (!fontReady || !containerWidth || containerWidth <= 0) {
      return { heightMap, totalHeight: 0, prefixHeights: [] }
    }

    const bubbleMaxWidth = containerWidth * MAX_BUBBLE_RATIO - BUBBLE_PADDING_X
    const cache = cacheRef.current

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const content = msg.content || ''

      if (!content) {
        const h = AVATAR_SIZE + MESSAGE_GAP
        heightMap.set(i, { height: h, textHeight: 0, lineCount: 0 })
        prefixHeights.push(totalHeight)
        totalHeight += h
        continue
      }

      // Get or create prepared handle (cached by content string)
      let prepared = cache.get(content)
      if (!prepared) {
        try {
          prepared = prepare(content, font)
          cache.set(content, prepared)
        } catch {
          const fallbackH = 60 + MESSAGE_GAP
          heightMap.set(i, { height: fallbackH, textHeight: 40, lineCount: 2 })
          prefixHeights.push(totalHeight)
          totalHeight += fallbackH
          continue
        }
      }

      try {
        const textLayout = layout(prepared, bubbleMaxWidth, lineHeight)
        const bubbleHeight = textLayout.height + BUBBLE_PADDING_Y
        const totalRowHeight = Math.max(bubbleHeight, AVATAR_SIZE) + METADATA_HEIGHT + MESSAGE_GAP

        heightMap.set(i, {
          height: totalRowHeight,
          textHeight: textLayout.height,
          lineCount: textLayout.lineCount,
        })
        prefixHeights.push(totalHeight)
        totalHeight += totalRowHeight
      } catch {
        const fallbackH = 60 + MESSAGE_GAP
        heightMap.set(i, { height: fallbackH, textHeight: 40, lineCount: 2 })
        prefixHeights.push(totalHeight)
        totalHeight += fallbackH
      }
    }

    // Prune stale cache entries (keep cache bounded)
    if (cache.size > messages.length * 2) {
      const contentSet = new Set(messages.map(m => m.content).filter(Boolean))
      for (const key of cache.keys()) {
        if (!contentSet.has(key)) cache.delete(key)
      }
    }

    return { heightMap, totalHeight, prefixHeights }
  }, [messages, font, containerWidth, lineHeight, fontReady])
}
