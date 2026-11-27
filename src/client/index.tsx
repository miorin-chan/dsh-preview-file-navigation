import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconFolderCloseRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-workspace-files/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspaceDirectoryEntry } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { EMPTY_TURN_FILES, TURN_FILES_PROJECTION_KEY } from '../shared/turn-files.ts'
import { LeftFiles } from './LeftFiles.js'
import type { LeftFilesProps } from './LeftFiles.js'
import { leftFilesCss } from './LeftFiles.css.js'
import { dictionaries, type Key } from './locale.js'
import { scriptRuns } from './script-runs.js'
import { NEXT_VIEW, SECTION_CLOSING, type SectionView, useSectionMotion } from './section-motion.js'

const ID = 'dsh-preview-file-navigation'
const SLOT = 'sidebar.footer.action'
const EXCLUDED = ['.git', '.hg', '.svn', '.pnpm-store', 'node_modules']

// IconTriangleRightFillRegular path from @deepseek-ai/dsh-client-ui-primitives 0.2.2-rc.5,
// rendered inline so the `recent` view can switch the glyph to an outline (`fill-opacity: 0; stroke-opacity: 1`).
const TRIANGLE = 'M5.5 4.5C5.5 4.40714 5.52586 4.31612 5.57467 4.23713C5.62349 4.15815 5.69334 4.09431 5.77639 4.05279C5.85945 4.01126 5.95242 3.99368 6.0449 4.00202C6.13738 4.01036 6.22572 4.04429 6.3 4.1L10.967 7.6C11.0291 7.64657 11.0795 7.70697 11.1142 7.77639C11.1489 7.84582 11.167 7.92238 11.167 8C11.167 8.07762 11.1489 8.15418 11.1142 8.22361C11.0795 8.29303 11.0291 8.35343 10.967 8.4L6.3 11.9C6.22572 11.9557 6.13738 11.9896 6.0449 11.998C5.95242 12.0063 5.85945 11.9887 5.77639 11.9472C5.69334 11.9057 5.62349 11.8419 5.57467 11.7629C5.52586 11.6839 5.5 11.5929 5.5 11.5V4.5Z'

const NEXT_LABEL = {
  all: 'collapse',
  collapsed: 'showRecent',
  recent: 'showAll',
} as const satisfies Record<SectionView, Key>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    [ID]: Key
  }
}

export const inject = ['slots', 'locale', 'layout', 'sidebarRight', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

interface SessionFiles {
  readonly list: LeftFilesProps['list']
  readonly search: LeftFilesProps['search']
  readonly open: (path: string) => boolean
}

interface FooterProps extends PropsRuntime<typeof SLOT> {
  readonly useSessions: <T>(select: (snapshot: SessionListState) => T) => T
  readonly useWorkspaces: <T>(select: (snapshot: WorkspaceSnapshot) => T) => T
  readonly useMountedSession: <T>(select: (session: SessionId | undefined) => T) => T
  readonly connect: (sessionId: SessionId) => SessionFiles
  readonly expand: () => void
  readonly t: (key: Key) => string
}

const sectionCss = `
.left-workspace-files-anchor { display: contents; }
div:has(> [data-slot="sidebar.footer.action"] > .left-workspace-files-anchor > .left-workspace-files:not([data-rail])) {
  flex-wrap: wrap;
}
.left-workspace-files {
  --left-files-header-size: 36px;
  flex: none;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
}
/* DSH rc.5 normally gives the workspace browser a full viewport below navigation.
   Bound its grid row to the space left by navigation so the files stay visible. */
[data-sidebar-scrollport]:has([data-sidebar-list-area] + .left-workspace-files) {
  grid-template-rows: 8px max-content 2px minmax(112px, 1fr);
}
[data-sidebar-scrollport] :has(> [data-sidebar-list-area] + .left-workspace-files) {
  max-block-size: 100%;
}
[data-sidebar-scrollport] :has(> [data-sidebar-list-area] + .left-workspace-files[data-open]) {
  block-size: 100%;
}
/* Both panes share the height left after the workspace header (and watched sessions).
   Capping a pane at max-content lets it shrink to its rows so the sibling can claim
   unused space, while equal flex-grow splits the space evenly when both overflow. */
[data-sidebar-scrollport] [data-sidebar-list-area]:has(+ .left-workspace-files[data-open]) {
  flex: 1 1 0;
  min-block-size: 0;
  max-block-size: max-content;
}
[data-sidebar-list-area] + .left-workspace-files[data-open] {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-block-size: 0;
}
[data-sidebar-list-area] + .left-workspace-files[data-open][data-view='recent']:not([data-searching]) {
  max-block-size: max-content;
}
/* While closing, the section rests at its header size and the files stay painted but
   inert, so section-motion.ts can shrink them away. */
[data-sidebar-list-area] + .left-workspace-files[${SECTION_CLOSING}] {
  display: flex;
  flex: none;
  flex-direction: column;
  block-size: var(--left-files-header-size);
  min-block-size: 0;
  overflow: clip;
}
.left-workspace-files[${SECTION_CLOSING}] [data-left-files-pane] { interactivity: inert; }
.left-workspace-files[${SECTION_CLOSING}] [data-left-files-pane][hidden] { display: flex; }
.left-workspace-files-anchor > .left-workspace-files:not([data-rail]) { flex-basis: 100%; }
.left-workspace-files__header { display: flex; flex: none; align-items: center; min-inline-size: 0; }
.left-workspace-files__trigger { flex: none; }
.left-workspace-files__trigger:focus-visible {
  outline: var(--dsw-focus-ring-width, 1px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}
.left-workspace-files[data-rail] .left-workspace-files__trigger { inline-size: 36px; padding: 0; }
.left-workspace-files__icon { color: var(--dsw-alias-label-tertiary); }
/* Match the heading box and disclosure of Watched sessions and Background jobs.
   The label, count, and arrow follow .sectionLabel in src/client/rows/WorkspaceBrowser.module.css,
   .arrow / .chevron in src/client/rows/Rows.module.css of @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5,
   and .labelGroup / .count / hollow attention triangle in dsh-watched-sessions. */
.left-workspace-files:not([data-rail]) .left-workspace-files__header { block-size: var(--left-files-header-size); }
.left-workspace-files__heading {
  display: flex;
  inline-size: fit-content;
  min-inline-size: 0;
  max-inline-size: calc(100% - var(--dsh-sidebar-row-padding, 12px) + 5px);
  margin: 0;
  margin-inline-start: calc(var(--dsh-sidebar-row-padding, 12px) - 5px);
  font: inherit;
}
.left-workspace-files__heading .left-workspace-files__trigger {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-inline-size: 0;
  max-inline-size: 100%;
  block-size: 24px;
  margin: 0;
  padding: 0;
  padding-inline-start: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: color 100ms ease;
}
.left-workspace-files__label-group {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-inline-size: 0;
  line-height: 20px;
}
.left-workspace-files__title {
  flex: 0 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
}
.left-workspace-files__count {
  flex: none;
  font-variant-numeric: tabular-nums;
}
/* Balance alphabetic workspace names against CJK section labels, following 跨文字标题平衡
   in tools/new-dsh-plugin/README.md of default-workspace. */
.left-workspace-files__title [data-script='alphabetic']:lang(zh) { font-size-adjust: ex-height 0.56; font-weight: 500; }
.left-workspace-files__arrow {
  display: inline-grid;
  flex: none;
  place-items: center;
  inline-size: 22px;
  block-size: 24px;
  color: var(--dsw-alias-label-caption);
  transition: color 100ms ease;
}
.left-workspace-files__arrow > svg { transition: transform 150ms var(--ds-ease-in-out, ease-in-out); }
.left-workspace-files__trigger:dir(rtl) .left-workspace-files__arrow > svg { transform: rotate(180deg); }
.left-workspace-files__trigger[aria-expanded='true'] .left-workspace-files__arrow > svg { transform: rotate(90deg); }
.left-workspace-files__arrow path {
  stroke-opacity: 0;
  transition:
    fill-opacity 150ms var(--ds-ease-in-out, ease-in-out),
    stroke-opacity 150ms var(--ds-ease-in-out, ease-in-out);
}
.left-workspace-files__trigger[data-view='recent'] .left-workspace-files__arrow path {
  fill-opacity: 0;
  stroke-opacity: 1;
}
@media (hover: hover) {
  .left-workspace-files:not([data-rail]) .left-workspace-files__trigger:hover,
  .left-workspace-files__trigger:hover .left-workspace-files__arrow { color: var(--dsw-alias-label-secondary); }
}
@media (prefers-reduced-motion: reduce) {
  .left-workspace-files:not([data-rail]) .left-workspace-files__trigger,
  .left-workspace-files__arrow,
  .left-workspace-files__arrow > svg,
  .left-workspace-files__arrow path { transition: none; }
}
.left-workspace-files [data-left-files-pane] { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.left-workspace-files [data-left-files-pane][hidden] { display: none; }
.left-workspace-files [data-left-files-notice] { margin: 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
`

function WorkspaceFiles({ wide, useMountedSession, useSessions, useWorkspaces, connect, expand, t }: FooterProps) {
  const anchor = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreTriggerFocus = useRef(false)
  const [container] = useState(() => {
    const section = document.createElement('section')
    section.className = 'left-workspace-files'
    return section
  })
  useLayoutEffect(() => {
    const footer = anchor.current
    if (footer === null) return
    container.toggleAttribute('data-rail', !wide)
    // DSH 0.2.2-rc.5 exposes the list DOM marker but no slot after the list.
    let list: Element | null = null
    if (wide) {
      for (let parent = footer.parentElement; parent !== null; parent = parent.parentElement) {
        list = parent.querySelector('[data-sidebar-scrollport] [data-sidebar-list-area]')
        if (list !== null) break
      }
    }
    if (list === null) footer.append(container)
    else list.after(container)
    if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false
      trigger.current?.focus({ preventScroll: true })
    }
    // Let the file scroller use the browser's default wheel behavior. The
    // enclosing DSH viewport otherwise sends its wheel events to the session list.
    const keepFileWheel = (event: WheelEvent): void => {
      if (event.target instanceof Element && event.target.closest('.dsh-left-files__scroll') !== null) {
        event.stopPropagation()
      }
    }
    container.addEventListener('wheel', keepFileWheel, { passive: true })
    return () => {
      // Moving the section between the footer and session list drops focus.
      restoreTriggerFocus.current = trigger.current !== null && document.activeElement === trigger.current
      container.removeEventListener('wheel', keepFileWheel)
      container.remove()
    }
  }, [container, wide])

  const sessionId = useMountedSession(session => session)
  const root = useSessions(snapshot => sessionId === undefined ? undefined : snapshot.byId[sessionId]?.cwd)
  const turnFiles = useSessions(snapshot =>
    sessionId === undefined ? undefined : snapshot.projectionsBySession?.[sessionId]?.values[TURN_FILES_PROJECTION_KEY],
  ) ?? EMPTY_TURN_FILES
  const recentCount = Object.keys(turnFiles).length
  const workspaceTitle = useWorkspaces(snapshot => sessionId === undefined ? undefined
    : snapshot.items.find(workspace => workspace.sessionIds.includes(sessionId))?.title
      ?? snapshot.items.find(workspace => workspace.path === root)?.title)
  const directoryName = root?.replace(/[\\/]+$/, '').split(/[\\/]/).pop()
  const filesLabel = t('title')
  const title = workspaceTitle || directoryName || root || filesLabel
  const [view, setView] = useState<SectionView>('recent')
  const shown = view !== 'collapsed' && wide
  const [activated, setActivated] = useState(shown)
  const [searching, setSearching] = useState(false)
  useLayoutEffect(() => {
    if (shown && !activated) setActivated(true)
  }, [shown, activated])
  useLayoutEffect(() => {
    container.toggleAttribute('data-searching', searching && shown)
  }, [container, searching, shown])
  const paneId = useId()
  const session = useMemo(() => sessionId === undefined ? undefined : connect(sessionId), [sessionId, connect])
  const prepareMotion = useSectionMotion(container, view, wide)
  const nextLabel = t(NEXT_LABEL[view])
  const triggerLabel = title === filesLabel ? nextLabel : `${title} · ${nextLabel}`
  const triggerProps = {
    ref: trigger,
    className: 'left-workspace-files__trigger',
    'data-view': view,
    'aria-label': triggerLabel,
    'aria-expanded': shown,
    'aria-controls': activated ? paneId : undefined,
    onClick: () => {
      if (!wide) {
        expand()
        if (view === 'collapsed') setView('recent')
        setActivated(true)
        return
      }
      const next = NEXT_VIEW[view]
      prepareMotion(next)
      setView(next)
      setActivated(true)
    },
  }
  // The wide sidebar shows a section header; the rail keeps a 36px icon button.
  const titleButton = (
    <Tooltip label={wide ? triggerLabel : `${title} · ${filesLabel}`} side="right" portal>
      {wide ? (
        <button type="button" {...triggerProps}>
          <span className="left-workspace-files__label-group">
            <span className="left-workspace-files__title">
              {scriptRuns(title).map((run, index) => <span key={index} data-script={run.script}>{run.text}</span>)}
            </span>
            {recentCount > 0 && (
              <span className="left-workspace-files__count" aria-hidden="true">{recentCount}</span>
            )}
          </span>
          <span className="left-workspace-files__arrow" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
              stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
              <path d={TRIANGLE} />
            </svg>
          </span>
        </button>
      ) : (
        <Button {...triggerProps} icon={<IconFolderCloseRegular size={16} className="left-workspace-files__icon" />} />
      )}
    </Tooltip>
  )
  const titleControl = wide ? <h2 className="left-workspace-files__heading">{titleButton}</h2> : titleButton
  return <>
    <div className="left-workspace-files-anchor" ref={anchor} />
    {createPortal(<>
      <style>{sectionCss + leftFilesCss}</style>
      {root === undefined || session === undefined ? <>
        <header className="left-workspace-files__header">{titleControl}</header>
        {activated && <div id={paneId} className="dsh-left-files" data-left-files-pane="" hidden={!shown}>
          <div className="dsh-left-files__scroll">
            <div className="dsh-left-files__empty" data-left-files-empty="no-session">
              <IconFolderCloseRegular size={24} />
              <div role="status">{t('noSession')}</div>
            </div>
          </div>
        </div>}
      </> : <LeftFiles
        {...session}
        root={root}
        titleControl={titleControl}
        wide={wide}
        shown={shown}
        activated={activated}
        viewMode={view}
        turnFiles={turnFiles}
        paneId={paneId}
        showFiles={() => {
          if (view === 'collapsed') {
            if (wide) prepareMotion('all')
            setView('all')
          }
          setActivated(true)
          if (!wide) expand()
        }}
        onSearchingChange={setSearching}
        t={t}
      />}
    </>, container)}
  </>
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(ID, dictionaries), `${ID}: dictionaries`)
  const connect = (sessionId: SessionId): SessionFiles => ({
    list: async (path, signal) => {
      const result = await ctx.remote.workspaceFiles.list(sessionId, path, signal)
      if (!result.ok) throw result.error
      return result.value.entries.filter((entry: WorkspaceDirectoryEntry) => !entry.name.startsWith('.'))
    },
    search: async (query, signal) => {
      const result = await ctx.remote.workspaceFiles.search(sessionId, {
        query, excludedPaths: EXCLUDED, includeHidden: false, respectGitignore: true,
      }, signal)
      if (!result.ok) throw result.error
      return result.value.matches
    },
    open: path => {
      if (ctx.sidebarRight.mounted.getSnapshot() !== sessionId) return false
      // Address format from dsh-util-workspace-path at dsh-v0.2.2-rc.5, sessionFileAddress.
      const address = `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${path.split('/').map(encodeURIComponent).join('/')}`
      if (ctx.sidebarRightTabs.candidates(address).length === 0) return false
      ctx.sidebarRight.openResource(address)
      return true
    },
  })
  ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({
    name: SLOT, id: ID, order: 20, locale: ID,
    inject: () => ({
      hooks: { mountedSession: ctx.sidebarRight.mounted },
      connect,
      expand: () => ctx.layout.toggleSidebar(),
    }),
  }, WorkspaceFiles)), `${ID}: left sidebar files`)
}
