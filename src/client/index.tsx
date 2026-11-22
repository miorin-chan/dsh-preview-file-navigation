import { useMemo, useState } from 'react'
import { Button, IconFolderCloseRegular, IconFolderOpenRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
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
  readonly useMountedSession: <T>(select: (session: SessionId | undefined) => T) => T
  readonly connect: (sessionId: SessionId) => SessionFiles
  readonly expand: () => void
  readonly t: (key: Key) => string
}

const footerCss = `
/* The footer is a flex row and its slot anchor is display: contents. */
div:has(> [data-slot="sidebar.footer.action"] > .left-workspace-files:not([data-rail])) { flex-wrap: wrap; }
.left-workspace-files { flex: 0 0 100%; min-width: 0; color: var(--dsw-alias-label-primary); }
.left-workspace-files[data-rail] { flex-basis: auto; }
.left-workspace-files > button { width: 100%; justify-content: flex-start; text-align: start; }
.left-workspace-files__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.left-workspace-files > button[aria-expanded=true] { background: var(--dsw-alias-interactive-bg-active); }
.left-workspace-files[data-rail] > button { width: 36px; justify-content: center; padding: 0; }
.left-workspace-files [data-left-files-pane] { height: min(36vh, 360px); min-height: 0; display: flex; flex-direction: column; }
.left-workspace-files [data-left-files-pane][hidden] { display: none; }
.left-workspace-files [data-left-files-notice] { margin: 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
`

function Footer({ wide, useMountedSession, useSessions, connect, expand, t }: FooterProps) {
  const sessionId = useMountedSession(session => session)
  const root = useSessions(snapshot => sessionId === undefined ? undefined : snapshot.byId[sessionId]?.cwd)
  const [opened, setOpened] = useState(false)
  const [activated, setActivated] = useState(false)
  const [openFailed, setOpenFailed] = useState(false)
  const session = useMemo(() => sessionId === undefined ? undefined : connect(sessionId), [sessionId, connect])
  const shown = opened && wide
  return <section className="left-workspace-files" data-rail={wide ? undefined : ''}>
    <style>{footerCss + leftFilesCss}</style>
    <Tooltip label={t('title')} side="right" disabled={wide} portal>
      <Button aria-label={t('title')} aria-expanded={shown}
        icon={shown ? <IconFolderOpenRegular size={16} /> : <IconFolderCloseRegular size={16} />}
        onClick={() => {
          if (!wide) expand()
          setOpened(!shown)
          setActivated(true)
        }}>
        {wide && <span className="left-workspace-files__title">{t('title')}</span>}
      </Button>
    </Tooltip>
    {activated && <div data-left-files-pane="" hidden={!shown}>
      {root === undefined || session === undefined
        ? <p data-left-files-notice="">{t('noSession')}</p>
        : <LeftFiles root={root} list={session.list} search={session.search} t={t} open={path => setOpenFailed(!session.open(path))} />}
      {openFailed && shown && root !== undefined && <p data-left-files-notice="" role="status">{t('openFailed')}</p>}
    </div>}
  </section>
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
  }, Footer)), `${ID}: left sidebar files`)
}
