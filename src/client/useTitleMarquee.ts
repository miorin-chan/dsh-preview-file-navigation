/**
 * Adapted from @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5,
 * src/client/rows/Rows.tsx (useTitleMarquee, placeTitle, restTitle).
 * Copyright (c) 2026 DeepSeek. MIT license, see LICENSE.
 */
import { useCallback, useMemo, useRef } from 'react'
import type { PointerEvent, RefObject } from 'react'

const MIN_TITLE_REVEAL_PX = 8
const TITLE_MARQUEE_PX_PER_MS = 0.03

function placeTitle(title: HTMLSpanElement, left: number, range: number): void {
  if (typeof title.scrollTo === 'function') title.scrollTo({ left, behavior: 'instant' })
  else title.scrollLeft = left
  if (left > 0) title.dataset.scrolled = ''
  else delete title.dataset.scrolled
  if (left < range) title.dataset.clipped = ''
  else delete title.dataset.clipped
}

function restTitle(title: HTMLSpanElement): void {
  if (title.dataset.scrolled !== undefined) {
    if (typeof title.scrollTo === 'function') title.scrollTo({ left: 0, behavior: 'instant' })
    else title.scrollLeft = 0
  }
  delete title.dataset.scrolled
  delete title.dataset.clipped
}

/** Scroll to the far edge at native speed and restore the resting ellipsis on leave. */
export function useTitleMarquee(title: RefObject<HTMLSpanElement>): {
  enter: (event?: PointerEvent) => void
  leave: () => void
  cancel: () => void
} {
  const frame = useRef<number | undefined>(undefined)
  const revealing = useRef(false)
  const cancel = useCallback(() => {
    revealing.current = false
    if (frame.current === undefined) return
    cancelAnimationFrame(frame.current)
    frame.current = undefined
  }, [])
  return useMemo(() => ({
    enter: (event?: PointerEvent): void => {
      if (event?.pointerType === 'touch' || title.current === null || revealing.current) return
      revealing.current = true
      const element = title.current
      const range = element.scrollWidth - element.clientWidth
      if (range <= MIN_TITLE_REVEAL_PX) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        placeTitle(element, range, range)
        return
      }
      let previous: number | undefined
      let position = 0
      const step = (now: DOMHighResTimeStamp): void => {
        position += previous === undefined ? 0 : (now - previous) * TITLE_MARQUEE_PX_PER_MS
        previous = now
        placeTitle(element, Math.min(position, range), range)
        frame.current = position < range ? requestAnimationFrame(step) : undefined
      }
      frame.current = requestAnimationFrame(step)
    },
    leave: (): void => {
      cancel()
      if (title.current !== null) restTitle(title.current)
    },
    cancel,
  }), [cancel, title])
}
