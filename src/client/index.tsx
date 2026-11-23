import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Button, IconChevronRightOutlineRegular, IconFolderCloseRegular, IconFolderOpenRegular, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
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
import { LeftFiles } from './LeftFiles.js'
import type { LeftFilesProps } from './LeftFiles.js'
import { leftFilesCss } from './LeftFiles.css.js'
import { dictionaries, type Key } from './locale.js'

const ID = 'dsh-preview-file-navigation'
const SLOT = 'sidebar.footer.action'
const EXCLUDED = ['.git', '.hg', '.svn', '.pnpm-store', 'node_modules']

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
.left-workspace-files { flex: none; min-width: 0; color: var(--dsw-alias-label-primary); }
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
[data-sidebar-scrollport] [data-sidebar-list-area]:has(+ .left-workspace-files[data-open]) {
  flex: 0 1 auto;
  max-block-size: 50%;
}
[data-sidebar-list-area] + .left-workspace-files[data-open] {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-block-size: 0;
}
.left-workspace-files-anchor > .left-workspace-files:not([data-rail]) { flex-basis: 100%; }
.left-workspace-files__header { display: flex; flex: none; align-items: center; min-inline-size: 0; }
.left-workspace-files__trigger { flex: none; }
.left-workspace-files:not([data-rail]) button.left-workspace-files__trigger {
  inline-size: 100%;
  min-inline-size: 0;
  overflow: hidden;
  block-size: 32px;
  border-inline: var(--dsh-sidebar-paint-inset, 3px) solid transparent;
  padding-inline: calc(var(--dsh-sidebar-row-padding, 12px) - var(--dsh-sidebar-paint-inset, 3px));
  gap: var(--dsh-sidebar-label-gap, 6px);
  justify-content: flex-start;
  text-align: start;
  background-clip: padding-box;
}
.left-workspace-files[data-rail] .left-workspace-files__trigger { inline-size: 36px; padding: 0; }
.left-workspace-files__trigger[aria-expanded='true']:not(:active) {
  background-color: var(--dsw-alias-interactive-bg-hover);
}
.left-workspace-files__trigger:focus-visible {
  outline: var(--dsw-focus-ring-width, 1px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}
.left-workspace-files__icon, .left-workspace-files__chevron { color: var(--dsw-alias-label-tertiary); }
.left-workspace-files__title {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  line-height: 20px;
}
.left-workspace-files__chevron {
  flex: none;
  transition: transform 150ms var(--ds-ease-in-out, ease-in-out);
}
.left-workspace-files__trigger:dir(rtl) .left-workspace-files__chevron { transform: rotate(180deg); }
.left-workspace-files__trigger[aria-expanded='true'] .left-workspace-files__chevron { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) {
  .left-workspace-files__chevron { transition: none; }
}
.left-workspace-files [data-left-files-pane] { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
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
  const workspaceTitle = useWorkspaces(snapshot => sessionId === undefined ? undefined
    : snapshot.items.find(workspace => workspace.sessionIds.includes(sessionId))?.title
      ?? snapshot.items.find(workspace => workspace.path === root)?.title)
  const directoryName = root?.replace(/[\\/]+$/, '').split(/[\\/]/).pop()
  const filesLabel = t('title')
  const title = workspaceTitle || directoryName || root || filesLabel
  const triggerLabel = title === filesLabel ? title : `${title} · ${filesLabel}`
  const [opened, setOpened] = useState(false)
  const [activated, setActivated] = useState(false)
  const paneId = useId()
  const session = useMemo(() => sessionId === undefined ? undefined : connect(sessionId), [sessionId, connect])
  const shown = opened && wide
  const FolderIcon = shown ? IconFolderOpenRegular : IconFolderCloseRegular
  useLayoutEffect(() => {
    container.toggleAttribute('data-open', shown)
  }, [container, shown])
  const titleButton = (
    <Tooltip label={wide ? title : triggerLabel} side="right" onlyWhenClipped={wide} portal>
      <Button
        ref={trigger}
        className="left-workspace-files__trigger"
        aria-label={triggerLabel}
        aria-expanded={shown}
        aria-controls={activated ? paneId : undefined}
        icon={<FolderIcon size={16} className="left-workspace-files__icon" />}
        onClick={() => {
          if (!wide) expand()
          setOpened(!shown)
          setActivated(true)
        }}
      >
        {wide && <>
          <span className="left-workspace-files__title">{title}</span>
          <IconChevronRightOutlineRegular size={12} className="left-workspace-files__chevron" />
        </>}
      </Button>
    </Tooltip>
  )
  return <>
    <div className="left-workspace-files-anchor" ref={anchor} />
    {createPortal(<>
      <style>{sectionCss + leftFilesCss}</style>
      {root === undefined || session === undefined ? <>
        <div className="left-workspace-files__header">{titleButton}</div>
        {activated && <div id={paneId} data-left-files-pane="" hidden={!shown}>
          <p data-left-files-notice="">{t('noSession')}</p>
        </div>}
      </> : <LeftFiles
        {...session}
        root={root}
        titleButton={titleButton}
        wide={wide}
        shown={shown}
        activated={activated}
        paneId={paneId}
        showFiles={() => {
          setOpened(true)
          setActivated(true)
          if (!wide) expand()
        }}
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
