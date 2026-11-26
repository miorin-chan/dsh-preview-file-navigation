import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session-projection'
import { z } from 'zod'
import { TURN_FILES_PROJECTION_KEY, type FileActivity, type TurnFilesMap } from '../shared/turn-files.ts'
import { applyTurnFilesEvent, initTurnFiles, type PendingToolCall, type TurnFilesState } from './turn-files.ts'

const fileActivitySchema = z.enum(['read', 'write', 'both']) as z.ZodType<FileActivity>

export const turnFilesMapSchema: z.ZodType<TurnFilesMap> = z.record(z.string(), fileActivitySchema)

const pendingCallSchema: z.ZodType<PendingToolCall> = z.object({
  action: z.enum(['read', 'write']),
  paths: z.array(z.string()),
  tool: z.enum(['read', 'read_image', 'write', 'edit', 'apply_patch', 'str_replace_editor']),
})

export const turnFilesStateSchema: z.ZodType<TurnFilesState> = z.object({
  cwd: z.string().nullable(),
  turn: z.number().int().nonnegative().nullable(),
  files: turnFilesMapSchema,
  pending: z.record(z.string(), pendingCallSchema),
})

/** Register the host session projection when `sessionProjections` is mounted. */
export function apply(ctx: Context): void {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['sessionProjections'], (scoped) => {
    const start = () => {
      let disposed = false
      let handle: { dispose?: () => void | Promise<void> } | undefined
      void Promise.resolve(scoped.sessionProjections.register({
        key: TURN_FILES_PROJECTION_KEY,
        stateSchema: turnFilesStateSchema,
        stateVersion: 1,
        init: header => initTurnFiles(header),
        apply: applyTurnFilesEvent,
        wire: {
          viewSchema: turnFilesMapSchema,
          view: state => state.files,
          summary: false,
        },
      })).then(
        registered => {
          if (disposed) {
            void registered?.dispose?.()
            return
          }
          handle = registered
        },
        error => {
          const message = error instanceof Error ? error.message : String(error)
          scoped.logger?.warn?.('dsh-preview-file-navigation: failed to register turnFiles projection: %s', message)
        },
      )
      return () => {
        disposed = true
        const current = handle
        handle = undefined
        void current?.dispose?.()
      }
    }
    if (typeof scoped.effect === 'function') scoped.effect(start, 'dsh-preview-file-navigation: turnFiles projection')
    else start()
  })
}
