/** Height motion for transitioning the workspace files section across collapsed, recent, and all views. */
import { useCallback, useLayoutEffect, useRef } from 'react'

/** Matches the session list toggle of dsh-session-list-toggle and the native header search motion. */
export const SECTION_MOTION_MS = 180
/** Keeps the outgoing files painted and inert while the section shrinks. */
export const SECTION_CLOSING = 'data-closing'

export type SectionView = 'recent' | 'all' | 'collapsed'
export const NEXT_VIEW = { all: 'collapsed', collapsed: 'recent', recent: 'all' } as const satisfies Record<SectionView, SectionView>

interface Sizes { readonly list: number; readonly section: number }
interface Pending { readonly next: SectionView; readonly sizes: Sizes }

function listOf(section: HTMLElement): HTMLElement | null {
  const list = section.previousElementSibling
  return list instanceof HTMLElement && list.matches('[data-sidebar-list-area]') ? list : null
}

function measure(section: HTMLElement, list: HTMLElement): Sizes {
  return { list: list.getBoundingClientRect().height, section: section.getBoundingClientRect().height }
}

function resize(element: HTMLElement, from: number, to: number, options: KeyframeAnimationOptions): Animation[] {
  if (Math.abs(from - to) < 0.5) return []
  // A flex basis keeps the animated size effective inside the native flex column.
  return [element.animate({
    flexBasis: [`${from}px`, `${to}px`],
    flexGrow: [0, 0],
    flexShrink: [0, 0],
    minBlockSize: ['0px', '0px'],
    maxBlockSize: ['none', 'none'],
  }, options)]
}

/**
 * Sync `data-open` and `data-view` on the section and animate the session list and files
 * between their sizes across collapsed, recent, and all views.
 * @param section - The files section placed after the native session list.
 * @param view - Current section view mode.
 * @param wide - Whether the sidebar is wide; a width change settles any motion.
 * @returns A function to call just before changing `view`, recording the current sizes.
 */
export function useSectionMotion(section: HTMLElement, view: SectionView, wide: boolean): (nextView: SectionView) => void {
  const shown = view !== 'collapsed' && wide
  const pending = useRef<Pending | null>(null)
  const running = useRef<readonly Animation[]>([])

  const stop = useCallback(() => {
    for (const animation of running.current) animation.cancel()
    running.current = []
    section.removeAttribute(SECTION_CLOSING)
  }, [section])

  useLayoutEffect(() => {
    const before = pending.current
    pending.current = null
    section.toggleAttribute('data-open', shown)
    section.setAttribute('data-view', view)
    const list = listOf(section)
    if (before === null || before.next !== view || list === null || !section.isConnected) return
    // Set before the first layout read so the file scroller never loses its box or offset.
    if (view === 'collapsed') section.setAttribute(SECTION_CLOSING, '')
    const after = measure(section, list)
    const options: KeyframeAnimationOptions = {
      duration: SECTION_MOTION_MS,
      easing: getComputedStyle(section).getPropertyValue('--ds-ease-in-out').trim() || 'ease-in-out',
      fill: 'both',
    }
    const animations = [
      ...resize(section, before.sizes.section, after.section, options),
      ...resize(list, before.sizes.list, after.list, options),
    ]
    running.current = animations
    if (animations.length === 0) {
      stop()
      return
    }
    void Promise.all(animations.map(animation => animation.finished)).then(
      () => { if (running.current === animations) stop() },
      () => { /* A cancelled motion was settled by `stop`. */ },
    )
  }, [section, view, shown, stop])

  useLayoutEffect(() => stop, [stop, wide])

  return (nextView: SectionView) => {
    const list = listOf(section)
    const animate = list !== null && typeof section.animate === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && (nextView !== 'collapsed' || CSS.supports('interactivity: inert'))
    // Measure before stopping so a toggle mid-motion starts from the painted sizes.
    pending.current = animate ? { next: nextView, sizes: measure(section, list) } : null
    stop()
  }
}
