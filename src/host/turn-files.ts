import { posix, win32 } from 'node:path'
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import { EMPTY_TURN_FILES, mergeActivity, type TurnFilesMap } from '../shared/turn-files.ts'

/** File-accessing tool invocation tracked between `tool/call` and `tool/result`. */
export interface PendingToolCall {
  readonly action: 'read' | 'write'
  readonly paths: readonly string[]
  readonly tool: 'read' | 'read_image' | 'write' | 'edit' | 'apply_patch' | 'str_replace_editor'
}

/** Per-session projection state tracking current-turn file touches and pending calls. */
export interface TurnFilesState {
  readonly cwd: string | null
  readonly turn: number | null
  readonly files: TurnFilesMap
  readonly pending: Readonly<Record<string, PendingToolCall>>
}

/** Shared empty pending-calls map. */
export const EMPTY_PENDING: Readonly<Record<string, PendingToolCall>> = Object.freeze({})

const STR_REPLACE_DIR_PREFIX = "Here's the files and directories up to 2 levels deep in "
const PATCH_HEADER_PATTERN = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/

/** Initialize projection state from immutable session header metadata. */
export function initTurnFiles(header: Pick<SessionHeader, 'cwd'>): TurnFilesState {
  return {
    cwd: typeof header.cwd === 'string' && header.cwd !== '' ? header.cwd : null,
    turn: null,
    files: EMPTY_TURN_FILES,
    pending: EMPTY_PENDING,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Resolve `rawPath` relative to `cwd` and return a normalized workspace-relative
 * POSIX path, or `undefined` when it names `cwd` itself or escapes outside `cwd`.
 */
export function normalizeWorkspaceRelativePath(rawPath: string, cwd: string): string | undefined {
  if (rawPath === '' || cwd === '') return undefined
  const isWindows = /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(cwd)
  const pathOps = isWindows ? win32 : posix
  const root = pathOps.resolve(cwd)
  const resolved = pathOps.resolve(root, rawPath)
  const rel = pathOps.relative(root, resolved)
  if (rel === '' || rel === '..' || rel.startsWith(`..${pathOps.sep}`) || pathOps.isAbsolute(rel)) {
    return undefined
  }
  const normalized = isWindows ? rel.replaceAll('\\', '/') : rel
  if (normalized === '' || normalized.startsWith('/') || normalized.endsWith('/')) {
    return undefined
  }
  return normalized
}

/** Extract target file paths from an `apply_patch` unified patch string. */
export function parsePatchPaths(input: string): string[] {
  const paths: string[] = []
  for (const line of input.split(/\r?\n/)) {
    const match = PATCH_HEADER_PATTERN.exec(line)
    if (match === null) continue
    const candidate = match[1]?.trim()
    if (candidate !== undefined && candidate !== '') paths.push(candidate)
  }
  return paths
}

/** Parse a `tool/call` event into a tracked file operation, or `undefined` if unrelated. */
export function parseToolCall(name: string, rawArgs: string): PendingToolCall | undefined {
  let args: unknown
  try {
    args = JSON.parse(rawArgs)
  } catch {
    return undefined
  }
  if (!isRecord(args)) return undefined

  if (name === 'read' || name === 'read_image') {
    return typeof args.file_path === 'string' && args.file_path !== ''
      ? { action: 'read', paths: [args.file_path], tool: name }
      : undefined
  }
  if (name === 'write' || name === 'edit') {
    return typeof args.file_path === 'string' && args.file_path !== ''
      ? { action: 'write', paths: [args.file_path], tool: name }
      : undefined
  }
  if (name === 'apply_patch') {
    if (typeof args.input !== 'string') return undefined
    const paths = parsePatchPaths(args.input)
    return paths.length > 0 ? { action: 'write', paths, tool: 'apply_patch' } : undefined
  }
  if (name === 'str_replace_editor') {
    if (typeof args.path !== 'string' || args.path === '') return undefined
    if (args.command === 'view') {
      return { action: 'read', paths: [args.path], tool: 'str_replace_editor' }
    }
    if (args.command === 'create' || args.command === 'str_replace' || args.command === 'insert') {
      return { action: 'write', paths: [args.path], tool: 'str_replace_editor' }
    }
  }
  return undefined
}

function isStrReplaceDirectoryView(content: unknown): boolean {
  if (typeof content === 'string') return content.startsWith(STR_REPLACE_DIR_PREFIX)
  if (!Array.isArray(content)) return false
  return content.some(part =>
    isRecord(part) && part.type === 'text' && typeof part.text === 'string' && part.text.startsWith(STR_REPLACE_DIR_PREFIX),
  )
}

function extractResultPaths(pendingCall: PendingToolCall, meta: unknown): readonly string[] {
  if (pendingCall.tool === 'apply_patch') {
    const paths = new Set(pendingCall.paths)
    if (isRecord(meta) && Array.isArray(meta.diffs)) {
      for (const diff of meta.diffs) {
        if (isRecord(diff) && typeof diff.path === 'string' && diff.path !== '') {
          paths.add(diff.path)
        }
      }
    }
    return [...paths]
  }
  if (pendingCall.tool !== 'str_replace_editor' && isRecord(meta) && typeof meta.path === 'string' && meta.path !== '') {
    return [meta.path]
  }
  return pendingCall.paths
}

function removePending(
  pending: Readonly<Record<string, PendingToolCall>>,
  callId: string,
): Readonly<Record<string, PendingToolCall>> {
  const next: Record<string, PendingToolCall> = {}
  let hasRemaining = false
  for (const [key, value] of Object.entries(pending)) {
    if (key === callId) continue
    next[key] = value
    hasRemaining = true
  }
  return hasRemaining ? next : EMPTY_PENDING
}

/**
 * Pure synchronous fold over session events.
 * Preserves the exact `state` and `state.files` references whenever nothing changes.
 */
export function applyTurnFilesEvent(state: TurnFilesState, event: SessionEvent): TurnFilesState {
  if (state.cwd === null) return state

  if (event.type === 'turn/start') {
    if (
      state.turn === event.data.turn
      && Object.keys(state.files).length === 0
      && Object.keys(state.pending).length === 0
    ) {
      return state
    }
    return {
      cwd: state.cwd,
      turn: event.data.turn,
      files: EMPTY_TURN_FILES,
      pending: EMPTY_PENDING,
    }
  }

  if (event.type === 'tool/call') {
    const parsed = parseToolCall(event.data.name, event.data.arguments)
    if (parsed === undefined) return state
    return {
      ...state,
      pending: { ...state.pending, [event.data.callId]: parsed },
    }
  }

  if (event.type === 'tool/result') {
    const callId = event.data.message.toolCallId
    const pendingCall = state.pending[callId]
    if (pendingCall === undefined) return state
    const nextPending = removePending(state.pending, callId)

    if (event.data.message.isError === true) {
      return { ...state, pending: nextPending }
    }
    if (
      pendingCall.tool === 'str_replace_editor'
      && pendingCall.action === 'read'
      && isStrReplaceDirectoryView(event.data.message.content)
    ) {
      return { ...state, pending: nextPending }
    }

    let nextFiles: Record<string, 'read' | 'write' | 'both'> | undefined
    for (const candidate of extractResultPaths(pendingCall, event.data.meta)) {
      const relative = normalizeWorkspaceRelativePath(candidate, state.cwd)
      if (relative === undefined) continue
      const current = (nextFiles ?? state.files)[relative]
      const merged = mergeActivity(current, pendingCall.action)
      if (merged === current) continue
      nextFiles ??= { ...state.files }
      nextFiles[relative] = merged
    }

    return nextFiles === undefined
      ? { ...state, pending: nextPending }
      : { ...state, files: nextFiles, pending: nextPending }
  }

  return state
}
