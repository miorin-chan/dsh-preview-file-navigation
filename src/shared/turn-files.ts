import type { SessionProjectionSummaryExcluded } from '@deepseek-ai/dsh-session-projection/types'

/** Projection unit key for current-turn file reads and writes. */
export const TURN_FILES_PROJECTION_KEY = 'dshPreviewFileNavigation.turnFiles' as const

/** How the agent interacted with a workspace file during the current turn. */
export type FileActivity = 'read' | 'write' | 'both'

/** Map of workspace-relative POSIX file paths to current-turn activity. */
export type TurnFilesMap = Readonly<Record<string, FileActivity>>

/** Shared empty map so empty turns preserve reference identity. */
export const EMPTY_TURN_FILES: TurnFilesMap = Object.freeze({})

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    'dshPreviewFileNavigation.turnFiles': SessionProjectionSummaryExcluded<TurnFilesMap>
  }
}

/** A single row in the pruned current-turn directory tree. */
export interface PrunedTreeRow {
  readonly path: string
  readonly name: string
  readonly type: 'directory' | 'file'
  readonly depth: number
}

/** Combine an existing file or directory activity with a new observation. */
export function mergeActivity(current: FileActivity | undefined, incoming: FileActivity): FileActivity {
  if (current === undefined || current === incoming) return incoming
  return 'both'
}

/**
 * Propagate file activities up to every ancestor directory path so collapsed
 * directories can show whether they contain files read or edited this turn.
 */
export function ancestorActivities(files: TurnFilesMap): ReadonlyMap<string, FileActivity> {
  const ancestors = new Map<string, FileActivity>()
  for (const [filePath, activity] of Object.entries(files)) {
    let split = filePath.lastIndexOf('/')
    while (split > 0) {
      const dir = filePath.slice(0, split)
      ancestors.set(dir, mergeActivity(ancestors.get(dir), activity))
      split = dir.lastIndexOf('/')
    }
  }
  return ancestors
}

/**
 * Build flattened visible tree rows for the pruned current-turn view.
 * Every ancestor directory is expanded by default unless named in `collapsed`.
 */
export function buildRecentTreeRows(
  files: TurnFilesMap,
  collapsed: ReadonlySet<string>,
  compareName: (a: string, b: string) => number,
): readonly PrunedTreeRow[] {
  const levels = new Map<string, Map<string, 'directory' | 'file'>>()

  function ensureChild(parent: string, name: string, type: 'directory' | 'file'): void {
    let level = levels.get(parent)
    if (level === undefined) {
      level = new Map()
      levels.set(parent, level)
    }
    const existing = level.get(name)
    if (existing === 'directory') return
    level.set(name, type)
  }

  for (const filePath of Object.keys(files)) {
    if (filePath === '') continue
    const segments = filePath.split('/')
    for (let index = 0; index < segments.length; index++) {
      const name = segments[index]!
      const parent = index === 0 ? '' : segments.slice(0, index).join('/')
      const type = index === segments.length - 1 ? 'file' : 'directory'
      ensureChild(parent, name, type)
    }
  }

  const rows: PrunedTreeRow[] = []
  function visit(parent: string, depth: number): void {
    const level = levels.get(parent)
    if (level === undefined) return
    const ordered = [...level.entries()].sort((a, b) =>
      Number(b[1] === 'directory') - Number(a[1] === 'directory') || compareName(a[0], b[0]),
    )
    for (const [name, type] of ordered) {
      const path = parent === '' ? name : `${parent}/${name}`
      rows.push({ path, name, type, depth })
      if (type === 'directory' && !collapsed.has(path)) {
        visit(path, depth + 1)
      }
    }
  }

  visit('', 0)
  return rows
}
