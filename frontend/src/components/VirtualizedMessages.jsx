import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const OVERSCAN = 5 // extra messages to render above/below viewport

/**
 * VirtualizedMessages — renders only visible messages using pre-computed heights.
 * Falls back to rendering all messages if no height data is available.
 *
 * @param {Object} props
 * @param {Array} props.messages - Message array
 * @param {Map} props.heightMap - Pre-computed heights from usePretextMessages
 * @param {number} props.totalHeight - Total scroll height of all messages
 * @param {number[]} props.prefixHeights - Cumulative height array for binary search
 * @param {Function} props.renderMessage - (message, index) => ReactNode
 * @param {boolean} props.enabled - Whether virtualization is active
 * @param {React.Ref} props.bottomRef - Ref for scroll-to-bottom
 * @param {React.Ref} props.containerRef - Ref callback for width observation
 * @param {boolean} props.loading - Whether AI is currently generating
 * @param {React.ReactNode} props.loadingIndicator - Loading dots component
 * @param {React.ReactNode} props.emptyState - Empty state component
 */
function VirtualizedMessages({
  messages,
  heightMap,
  totalHeight,
  prefixHeights,
  renderMessage,
  enabled = true,
  bottomRef,
  containerRef,
  loading,
  loadingIndicator,
  emptyState,
}) {
  const scrollRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const isNearBottomRef = useRef(true)

  // Combined ref callback: observe width + store scroll ref
  const combinedRef = useCallback((node) => {
    scrollRef.current = node
    if (containerRef) containerRef(node)
    if (node) {
      setViewportHeight(node.clientHeight)
    }
  }, [containerRef])

  // Track viewport height on resize
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Scroll handler with rAF debounce
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    let rafId = null
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setScrollTop(node.scrollTop)
        // Check if near bottom (within 100px)
        isNearBottomRef.current = (node.scrollHeight - node.scrollTop - node.clientHeight) < 100
      })
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      node.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Auto-scroll to bottom on new messages (if user was already at bottom)
  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      // Use rAF to ensure DOM has updated
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    }
  }, [messages.length, totalHeight, loading])

  // Determine which messages are visible
  const { startIdx, endIdx, offsetTop } = useMemo(() => {
    // If not enough data for virtualization, render all
    if (!enabled || !heightMap || heightMap.size === 0 || !prefixHeights || prefixHeights.length === 0 || messages.length < 30) {
      return { startIdx: 0, endIdx: messages.length - 1, offsetTop: 0 }
    }

    // Binary search for first visible message
    const visibleTop = scrollTop
    const visibleBottom = scrollTop + viewportHeight

    let lo = 0, hi = prefixHeights.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const itemBottom = prefixHeights[mid] + (heightMap.get(mid)?.height || 60)
      if (itemBottom < visibleTop) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }

    const rawStart = Math.max(0, lo - OVERSCAN)

    // Find last visible message
    let end = lo
    while (end < messages.length - 1) {
      if (prefixHeights[end] > visibleBottom) break
      end++
    }
    const rawEnd = Math.min(messages.length - 1, end + OVERSCAN)

    return {
      startIdx: rawStart,
      endIdx: rawEnd,
      offsetTop: prefixHeights[rawStart] || 0,
    }
  }, [enabled, heightMap, prefixHeights, scrollTop, viewportHeight, messages.length])

  // Compute spacers
  const topSpacerHeight = offsetTop
  const renderedBottomOffset = useMemo(() => {
    if (!prefixHeights || prefixHeights.length === 0 || endIdx >= messages.length - 1) return 0
    const lastRenderedBottom = (prefixHeights[endIdx] || 0) + (heightMap?.get(endIdx)?.height || 60)
    return Math.max(0, totalHeight - lastRenderedBottom)
  }, [prefixHeights, endIdx, heightMap, totalHeight, messages.length])

  // Should we virtualize?
  const shouldVirtualize = enabled && heightMap && heightMap.size > 0 && messages.length >= 30

  return (
    <div
      ref={combinedRef}
      className="flex-1 overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        {messages.length === 0 && emptyState}

        {shouldVirtualize ? (
          <>
            {/* Top spacer */}
            {topSpacerHeight > 0 && (
              <div style={{ height: topSpacerHeight }} aria-hidden="true" />
            )}

            {/* Visible messages */}
            {messages.slice(startIdx, endIdx + 1).map((msg, i) => {
              const realIndex = startIdx + i
              return (
                <div key={msg.id || realIndex}>
                  {renderMessage(msg, realIndex)}
                </div>
              )
            })}

            {/* Bottom spacer */}
            {renderedBottomOffset > 0 && (
              <div style={{ height: renderedBottomOffset }} aria-hidden="true" />
            )}
          </>
        ) : (
          /* Non-virtualized: render all messages normally */
          messages.map((msg, i) => (
            <div key={msg.id || i}>
              {renderMessage(msg, i)}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && loadingIndicator}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default VirtualizedMessages
