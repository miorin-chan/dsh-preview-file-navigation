/** Workspace file browsing and search for a height-bounded sidebar. */
import { useCallback, useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import {
  Button, FileTypeIcon, IconCloseFillRegular, IconFolderCloseRegular, IconFolderOpenRegular,
  IconSearchOutlineRegular, Tooltip, classifyFileType,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useTitleMarquee } from './useTitleMarquee.js'

type EntryType = 'directory' | 'file' | 'other'
type DirectoryEntry = { readonly name: string; readonly type: EntryType }
type SearchEntry = { readonly path: string; readonly type: EntryType }
type NoticeKey = 'empty' | 'loading' | 'error'
type TranslationKey = NoticeKey | 'search' | 'retry' | 'closeSearch' | 'openFailed'

/** Data, actions, and controls supplied by the sidebar owner. */
export interface LeftFilesProps {
  /** Absolute workspace directory. The root identifies its state within this mount. */
  readonly root: string
  /** List immediate children of an absolute directory. */
  readonly list: (path: string, signal: AbortSignal) => Promise<readonly DirectoryEntry[]>
  /** Return workspace-relative paths with `/` separators in display order. */
  readonly search: (query: string, signal: AbortSignal) => Promise<readonly SearchEntry[]>
  /** Open a workspace-relative file path and report whether a preview was available. */
  readonly open: (relativePath: string) => boolean
  readonly titleButton: ReactNode
  readonly wide: boolean
  readonly shown: boolean
  readonly activated: boolean
  readonly paneId: string
  readonly showFiles: () => void
  /** Provide the labels for the current locale. */
  readonly t: (key: TranslationKey) => string
}

type Result<T> = { readonly kind: 'ready'; readonly entries: readonly T[] } | { readonly kind: 'error' }
type View = 'browse' | 'search'
type Row = SearchEntry & { readonly name: string; readonly depth: number }
type BrowseLine = { readonly kind: 'row'; readonly row: Row }
  | { readonly kind: 'status'; readonly path: string; readonly depth: number; readonly status: NoticeKey }

type Workspace = {
  readonly searchOpen: boolean
  readonly query: string
  readonly expanded: ReadonlySet<string>
  readonly listings: ReadonlyMap<string, Result<DirectoryEntry>>
  readonly matches?: Result<SearchEntry> | undefined
  readonly active: Readonly<Partial<Record<View, string | undefined>>>
}

const initialWorkspace: Workspace = { searchOpen: false, query: '', expanded: new Set(), listings: new Map(), active: {} }
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function endSearch(workspace: Workspace): Workspace {
  return { ...workspace, searchOpen: false, query: '', matches: undefined, active: { browse: workspace.active.browse } }
}

function absoluteDirectory(root: string, relative: string): string {
  if (relative === '') return root
  const separator = /^(?:[a-z]:\\|\\\\)/i.test(root) ? '\\' : '/'
  const base = root.endsWith(separator) ? root : root + separator
  return base + (separator === '\\' ? relative.replaceAll('/', '\\') : relative)
}

function parentOf(path: string): string {
  const split = path.lastIndexOf('/')
  return split < 0 ? '' : path.slice(0, split)
}

/** Mark the portion of each match that falls within this label segment. */
function markedText(text: string, matches: Iterable<RegExpMatchArray>, offset = 0): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of matches) {
    const start = (match.index ?? 0) - offset
    const end = Math.min(text.length, start + match[0].length)
    if (end <= 0 || start >= text.length) continue
    const from = Math.max(0, start)
    parts.push(text.slice(cursor, from), <mark key={from}>{text.slice(from, end)}</mark>)
    cursor = end
  }
  return cursor === 0 ? text : [...parts, text.slice(cursor)]
}

/** Draw one guide per ancestor level, so the lines join across the flat list of tree lines. */
function IndentGuides({ depth }: { readonly depth: number }) {
  if (depth === 0) return null
  return (
    <span className="dsh-left-files__guides" aria-hidden="true">
      {Array.from({ length: depth }, (_, level) => (
        <span key={level} className="dsh-left-files__guide" style={{ '--left-files-level': level } as CSSProperties} />
      ))}
    </span>
  )
}

function FileRow({ row, root, shown, expanded, query, matchPattern, tabIndex, onFocus, onClick }: {
  readonly row: Row
  readonly root: string
  readonly shown: boolean
  readonly expanded: boolean | undefined
  readonly query: string
  readonly matchPattern: RegExp
  readonly tabIndex: 0 | -1
  readonly onFocus: () => void
  readonly onClick: () => void
}) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const marquee = useTitleMarquee(nameRef)
  useLayoutEffect(() => {
    if (shown && rowRef.current?.matches(':hover') && window.matchMedia('(any-hover: hover)').matches) {
      marquee.enter()
    }
    return marquee.leave
  }, [root, shown, marquee])

  const searching = query !== ''
  const parent = searching ? parentOf(row.path) : ''
  const pathQuery = query.includes('/')
  const pathMatches = pathQuery ? [...row.path.matchAll(matchPattern)] : []
  const name = !searching ? row.name : pathQuery
    ? markedText(row.name, pathMatches, parent.length + (parent === '' ? 0 : 1))
    : markedText(row.name, row.name.matchAll(matchPattern))
  const tailStart = parent.lastIndexOf('/') + 1
  return (
    <button
      ref={rowRef}
      type="button"
      className="dsh-left-files__row"
      role={searching ? undefined : 'treeitem'}
      aria-level={searching ? undefined : row.depth + 1}
      aria-expanded={expanded}
      aria-disabled={row.type === 'other' || undefined}
      aria-label={searching ? row.path : undefined}
      title={row.path}
      data-path={row.path}
      data-type={row.type}
      tabIndex={tabIndex}
      style={{ '--left-files-depth': row.depth } as CSSProperties}
      onFocus={onFocus}
      onClick={onClick}
      onPointerEnter={marquee.enter}
      onPointerLeave={marquee.leave}
    >
      {!searching && <IndentGuides depth={row.depth} />}
      {row.type === 'directory'
        ? expanded
          ? <IconFolderOpenRegular size={16} className="dsh-left-files__icon" />
          : <IconFolderCloseRegular size={16} className="dsh-left-files__icon" />
        : <FileTypeIcon kind={classifyFileType(row.name)} size={16} className="dsh-left-files__icon" />}
      <span className="dsh-left-files__label">
        <span ref={nameRef} className="dsh-left-files__name">{name}</span>
        {parent !== '' && (
          <span className="dsh-left-files__path" aria-hidden="true">
            {tailStart > 0 && <span className="dsh-left-files__prefix"><bdi dir="ltr">{markedText(parent.slice(0, tailStart), pathMatches)}</bdi></span>}
            <span className="dsh-left-files__tail"><bdi dir="ltr">{markedText(parent.slice(tailStart), pathMatches, tailStart)}</bdi></span>
          </span>
        )}
      </span>
    </button>
  )
}

function browseLines(listings: Workspace['listings'], expanded: Workspace['expanded']): BrowseLine[] {
  const lines: BrowseLine[] = []
  function visit(path: string, depth: number): void {
    const result = listings.get(path)
    if (result?.kind !== 'ready' || result.entries.length === 0) {
      const status = result === undefined ? 'loading' : result.kind === 'error' ? 'error' : 'empty'
      lines.push({ kind: 'status', path, depth, status })
      return
    }
    for (const { name, type } of result.entries) {
      const child = path === '' ? name : `${path}/${name}`
      lines.push({ kind: 'row', row: { path: child, name, type, depth } })
      if (type === 'directory' && expanded.has(child)) visit(child, depth + 1)
    }
  }
  visit('', 0)
  return lines
}

/** A request exists while its unset directory listing or search is visible. */
function LoadEntries<T>({ target, load, settle }: {
  target: string
  load: (target: string, signal: AbortSignal) => Promise<readonly T[]>
  settle: (target: string, result: Result<T>) => void
}): null {
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void (async () => {
      let result: Result<T>
      try {
        result = { kind: 'ready', entries: await load(target, signal) }
      } catch {
        result = { kind: 'error' }
      }
      if (!signal.aborted) settle(target, result)
    })()
    return () => controller.abort()
  }, [target, load, settle])
  return null
}

/**
 * Draw the header search and the file navigator. The sidebar supplies the title button.
 * @param props - Workspace and adapter callbacks for this sidebar.
 * @returns The file navigator and its header.
 */
export function LeftFiles({ root, list, search, open, titleButton, wide, shown, activated, paneId, showFiles, t }: LeftFilesProps) {
  const [workspaces, setWorkspaces] = useState<ReadonlyMap<string, Workspace>>(() => new Map())
  const [openFailed, setOpenFailed] = useState(false)
  const workspace = workspaces.get(root) ?? initialWorkspace
  const searchVisible = shown && workspace.searchOpen
  const query = workspace.query.trim()
  const matchPattern = useMemo(() => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), [query])
  const searching = query !== ''
  const view: View = searching ? 'search' : 'browse'
  const { expanded, listings, matches } = workspace
  const lines = useMemo(() => searching ? [] : browseLines(listings, expanded), [searching, listings, expanded])
  const rows = useMemo<Row[]>(() => {
    if (!searching) return lines.flatMap(line => line.kind === 'row' ? [line.row] : [])
    if (matches?.kind !== 'ready') return []
    return matches.entries.map(entry => ({
      ...entry,
      name: entry.path.slice(entry.path.lastIndexOf('/') + 1),
      depth: 0,
    }))
  }, [lines, matches, searching])
  const activePath = workspace.active[view]
  const tabPath = rows.find(row => row.path === activePath)?.path ?? rows[0]?.path

  const searchBox = useRef<HTMLDivElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchFocus = useRef<'input' | 'button' | null>(null)
  const wasWide = useRef(wide)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrollOffsets = useRef(new Map<string, Record<View, number>>())
  const displayed = useRef<{ root: string; query: string } | null>(null)
  const focusWithin = useRef(false)
  const rowFocused = useRef(false)
  const pendingFocus = useRef<{ root: string; path: string } | null>(null)

  const update = useCallback((change: (previous: Workspace) => Workspace) => {
    setWorkspaces(previous => {
      const current = previous.get(root) ?? initialWorkspace
      const next = change(current)
      if (next === current) return previous
      return new Map(previous).set(root, next)
    })
  }, [root])

  useEffect(() => {
    const enteringWide = wide && !wasWide.current
    wasWide.current = wide
    const request = searchFocus.current
    // The sidebar has finished moving the section before the input takes focus.
    const target = searchVisible && (enteringWide || request === 'input') ? inputRef.current
      : !searchVisible && request === 'button' ? searchButton.current
        : null
    if (target === null) return
    searchFocus.current = null
    target.focus({ preventScroll: true })
  }, [searchVisible, wide])

  useEffect(() => {
    if (!searchVisible) return
    const dismiss = (event: MouseEvent): void => {
      if (!(event.target instanceof Node) || searchBox.current?.contains(event.target)) return
      inputRef.current?.blur()
      if (query === '') update(endSearch)
    }
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [query, searchVisible, update])

  const loadDirectory = useCallback((path: string, signal: AbortSignal) => list(absoluteDirectory(root, path), signal), [root, list])

  const settleDirectory = useCallback((path: string, result: Result<DirectoryEntry>) => {
    const ordered: Result<DirectoryEntry> = result.kind === 'ready' ? {
      kind: 'ready',
      entries: [...result.entries].sort((a, b) => Number(b.type === 'directory') - Number(a.type === 'directory') || byName.compare(a.name, b.name)),
    } : result
    update(previous => ({ ...previous, listings: new Map(previous.listings).set(path, ordered) }))
  }, [update])

  const settleSearch = useCallback((target: string, matches: Result<SearchEntry>) => {
    update(previous => previous.query.trim() === target ? { ...previous, matches } : previous)
  }, [update])

  function findRow(path: string): HTMLButtonElement | undefined {
    return Array.from(scrollerRef.current?.querySelectorAll<HTMLButtonElement>('button[data-path]') ?? [])
      .find(row => row.dataset.path === path)
  }

  function focusRow(path: string, reveal = true): boolean {
    const scroller = scrollerRef.current
    const button = findRow(path)
    if (!scroller || !button) return false
    const viewport = scroller.getBoundingClientRect()
    const row = button.getBoundingClientRect()
    if (reveal) {
      if (row.top < viewport.top) scroller.scrollTop -= viewport.top - row.top
      else if (row.bottom > viewport.bottom) scroller.scrollTop += row.bottom - viewport.bottom
    } else if (row.bottom <= viewport.top || row.top >= viewport.bottom) {
      return false
    }
    button.focus({ preventScroll: true })
    return true
  }

  // Apply the saved offset after the new rows commit, before the viewport paints.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !shown) {
      displayed.current = null
      return
    }
    const previous = displayed.current
    if (previous?.root !== root || previous.query !== query) {
      displayed.current = { root, query }
      scroller.scrollTop = scrollOffsets.current.get(root)?.[view] ?? 0
      if (previous && previous.root !== root) {
        pendingFocus.current = null
        if (focusWithin.current && rowFocused.current && (tabPath === undefined || !focusRow(tabPath, false))) {
          scroller.focus({ preventScroll: true })
        }
      }
    }
    const target = pendingFocus.current
    if (target?.root === root && focusWithin.current && focusRow(target.path)) pendingFocus.current = null
  })

  function rememberScroll(scroller: HTMLDivElement): void {
    const offsets = scrollOffsets.current.get(root) ?? { browse: 0, search: 0 }
    offsets[view] = scroller.scrollTop
    scrollOffsets.current.set(root, offsets)
  }

  function resetSearchScroll(): void {
    if (scrollerRef.current) rememberScroll(scrollerRef.current)
    const offsets = scrollOffsets.current.get(root)
    if (offsets) offsets.search = 0
  }

  function changeQuery(value: string): void {
    const target = value.trim()
    if (target !== query) resetSearchScroll()
    pendingFocus.current = null
    update(previous => target === previous.query.trim()
      ? { ...previous, query: value }
      : { ...previous, query: value, matches: undefined, active: { browse: previous.active.browse } })
  }

  function startSearch(): void {
    searchFocus.current = 'input'
    update(previous => ({ ...previous, searchOpen: true }))
    showFiles()
  }

  function closeSearch(): void {
    resetSearchScroll()
    pendingFocus.current = null
    searchFocus.current = 'button'
    update(endSearch)
  }

  function toggle(path: string): void {
    update(previous => {
      const expanded = new Set(previous.expanded)
      if (!expanded.delete(path)) expanded.add(path)
      return { ...previous, expanded }
    })
  }

  function activate(row: Row): void {
    if (row.type === 'file') {
      setOpenFailed(!open(row.path))
      return
    }
    if (row.type !== 'directory') return
    if (!searching) {
      toggle(row.path)
      return
    }
    pendingFocus.current = { root, path: row.path }
    resetSearchScroll()
    scrollerRef.current?.focus({ preventScroll: true })
    update(previous => {
      const expanded = new Set(previous.expanded)
      for (let path = row.path; path !== ''; path = parentOf(path)) expanded.add(path)
      return { ...endSearch(previous), expanded, active: { browse: row.path } }
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const { key, target } = event
    const atInput = target === inputRef.current
    const atScroller = target === scrollerRef.current

    if (key === 'Escape' && searchVisible) {
      event.preventDefault()
      event.stopPropagation()
      closeSearch()
      return
    }
    const targetPath = target instanceof HTMLButtonElement ? target.dataset.path : undefined
    const index = targetPath === undefined ? -1 : rows.findIndex(row => row.path === targetPath)
    const row = rows[index]
    if (atInput && searching && key === 'Enter') {
      const result = rows.find(entry => entry.path === tabPath)
      if (result) {
        event.preventDefault()
        activate(result)
      }
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (!atInput && !atScroller && !row) return
      const step = key === 'ArrowDown' ? 1 : -1
      if (atScroller && step === 1) {
        for (const entry of rows) {
          if (!focusRow(entry.path, false)) continue
          event.preventDefault()
          pendingFocus.current = null
          return
        }
      }
      const next = atInput || atScroller ? (step === 1 ? rows[0] : undefined) : rows[index + step]
      if (next) {
        event.preventDefault()
        pendingFocus.current = null
        focusRow(next.path)
      } else if (!atInput && key === 'ArrowUp') {
        event.preventDefault()
        pendingFocus.current = null
        const control = inputRef.current ?? searchButton.current
        control?.focus({ preventScroll: true })
      }
      return
    }
    if (!row || searching) return
    if (key === 'ArrowRight' && row.type === 'directory') {
      event.preventDefault()
      if (!workspace.expanded.has(row.path)) toggle(row.path)
      else {
        const child = rows[index + 1]
        if (child?.depth === row.depth + 1) focusRow(child.path)
      }
    } else if (key === 'ArrowLeft') {
      event.preventDefault()
      if (row.type === 'directory' && workspace.expanded.has(row.path)) toggle(row.path)
      else if (row.depth > 0) focusRow(parentOf(row.path))
    }
  }

  function renderRow(row: Row) {
    const expanded = !searching && row.type === 'directory' ? workspace.expanded.has(row.path) : undefined
    return (
      <FileRow
        key={`row:${row.path}`}
        row={row}
        root={root}
        shown={shown}
        expanded={expanded}
        query={query}
        matchPattern={matchPattern}
        tabIndex={row.path === tabPath ? 0 : -1}
        onFocus={() => {
          rowFocused.current = true
          update(previous => previous.active[view] === row.path ? previous : { ...previous, active: { ...previous.active, [view]: row.path } })
        }}
        onClick={() => { pendingFocus.current = null; activate(row) }}
      />
    )
  }

  function renderNotice(status: NoticeKey, depth: number, retry: () => void) {
    return (
      <div className="dsh-left-files__notice" style={{ '--left-files-depth': depth } as CSSProperties}>
        <IndentGuides depth={depth} />
        <span role={status === 'error' ? 'alert' : 'status'}>{t(status)}</span>
        {status === 'error' && (
          <Button size="sm" onClick={retry}>{t('retry')}</Button>
        )}
      </div>
    )
  }

  return (
    <div
      className="left-workspace-files__navigator"
      onKeyDown={onKeyDown}
      onFocusCapture={event => {
        focusWithin.current = true
        rowFocused.current = event.target === scrollerRef.current
      }}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusWithin.current = false
          pendingFocus.current = null
        }
      }}
    >
      <div className="left-workspace-files__header" data-search-open={searchVisible || undefined}>
        <div className="left-workspace-files__title-slot" {...{ inert: searchVisible ? '' : undefined }}>
          {titleButton}
        </div>
        <div className="left-workspace-files__search" ref={searchBox} role={searchVisible ? 'search' : undefined}>
          <Tooltip label={t('search')} delayMs={500} side={wide ? 'bottom' : 'right'} disabled={searchVisible} portal>
            <button
              ref={searchButton}
              type="button"
              className="left-workspace-files__search-open"
              aria-label={t('search')}
              aria-expanded={searchVisible}
              tabIndex={searchVisible ? -1 : 0}
              onClick={() => {
                if (searchVisible) inputRef.current?.focus({ preventScroll: true })
                else startSearch()
              }}
            >
              <IconSearchOutlineRegular size={searchVisible ? 11 : wide ? 14 : 18} />
            </button>
          </Tooltip>
          <input
            ref={inputRef}
            className="left-workspace-files__search-input"
            type="search"
            autoComplete="off"
            aria-label={t('search')}
            placeholder={t('search')}
            value={workspace.query}
            disabled={!searchVisible}
            onChange={event => changeQuery(event.currentTarget.value)}
          />
          <button type="button" className="left-workspace-files__search-close" aria-label={t('closeSearch')} disabled={!searchVisible} onClick={closeSearch}>
            <IconCloseFillRegular size={16} />
          </button>
        </div>
      </div>
      {activated && (
        <div id={paneId} className="dsh-left-files" data-left-files-pane="" hidden={!shown}>
          <div
            className="dsh-left-files__scroll"
            ref={scrollerRef}
            tabIndex={-1}
            onScroll={event => { if (shown) rememberScroll(event.currentTarget) }}
          >
            {searching ? (
              <div role="group" aria-label={t('search')}>
                {workspace.matches === undefined && <LoadEntries key={query} target={query} load={search} settle={settleSearch} />}
                {rows.map(renderRow)}
                {rows.length === 0 && renderNotice(
                  workspace.matches === undefined ? 'loading' : workspace.matches.kind === 'error' ? 'error' : 'empty',
                  0,
                  () => { inputRef.current?.focus({ preventScroll: true }); update(previous => ({ ...previous, matches: undefined })) },
                )}
              </div>
            ) : (
              <div role="tree" aria-label={root}>
                {lines.map(line => {
                  if (line.kind === 'row') return renderRow(line.row)
                  const { path, depth, status } = line
                  return (
                    <div role="none" key={`status:${path}`}>
                      {status === 'loading' && <LoadEntries key={root} target={path} load={loadDirectory} settle={settleDirectory} />}
                      {renderNotice(status, depth, () => {
                        if (!focusRow(path, false)) scrollerRef.current?.focus({ preventScroll: true })
                        update(previous => {
                          const listings = new Map(previous.listings)
                          listings.delete(path)
                          return { ...previous, listings }
                        })
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {openFailed && shown && <p data-left-files-notice="" role="status">{t('openFailed')}</p>}
        </div>
      )}
    </div>
  )
}
