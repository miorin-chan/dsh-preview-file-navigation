import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyTurnFilesEvent, initTurnFiles, normalizeWorkspaceRelativePath } from '../src/host/turn-files.ts'
import { EMPTY_TURN_FILES, TURN_FILES_PROJECTION_KEY } from '../src/shared/turn-files.ts'

function turnStart(turn) {
  return { type: 'turn/start', data: { turn } }
}

function turnEnd(turn) {
  return { type: 'turn/end', data: { turn, reason: { kind: 'stop' } } }
}

function toolCall(callId, name, args) {
  return {
    type: 'tool/call',
    data: {
      turn: 1,
      step: 1,
      callId,
      name,
      arguments: typeof args === 'string' ? args : JSON.stringify(args),
    },
  }
}

function toolResult(callId, { isError = false, content = '', meta } = {}) {
  return {
    type: 'tool/result',
    data: {
      turn: 1,
      step: 1,
      message: {
        role: 'tool',
        toolCallId: callId,
        isError,
        content,
      },
      ...(meta === undefined ? {} : { meta }),
    },
  }
}

test('normalizes workspace-relative POSIX and Windows paths and rejects escapes', () => {
  assert.equal(normalizeWorkspaceRelativePath('src/app.ts', '/repo'), 'src/app.ts')
  assert.equal(normalizeWorkspaceRelativePath('/repo/src/../lib/util.ts', '/repo/'), 'lib/util.ts')
  assert.equal(normalizeWorkspaceRelativePath('.', '/repo'), undefined)
  assert.equal(normalizeWorkspaceRelativePath('/repo', '/repo'), undefined)
  assert.equal(normalizeWorkspaceRelativePath('../secret.txt', '/repo'), undefined)
  assert.equal(normalizeWorkspaceRelativePath('/other/file.ts', '/repo'), undefined)

  assert.equal(normalizeWorkspaceRelativePath('src\\main.ts', 'C:\\work\\app'), 'src/main.ts')
  assert.equal(normalizeWorkspaceRelativePath('C:\\work\\app\\docs\\a.md', 'C:\\work\\app'), 'docs/a.md')
  assert.equal(normalizeWorkspaceRelativePath('D:\\other\\a.md', 'C:\\work\\app'), undefined)
  assert.equal(normalizeWorkspaceRelativePath('..\\outside.txt', 'C:\\work\\app'), undefined)
})

test('tracks read, write, edit, apply_patch, and str_replace_editor for current turn only', () => {
  let state = initTurnFiles({ cwd: '/workspace' })
  state = applyTurnFilesEvent(state, turnStart(1))
  assert.equal(state.files, EMPTY_TURN_FILES)

  // read & read_image prefer canonical meta.path
  state = applyTurnFilesEvent(state, toolCall('c1', 'read', { file_path: './a.ts' }))
  const filesAfterCall = state.files
  state = applyTurnFilesEvent(state, toolResult('c1', { meta: { path: '/workspace/src/a.ts' } }))
  assert.notEqual(state.files, filesAfterCall)
  assert.deepEqual(state.files, { 'src/a.ts': 'read' })

  state = applyTurnFilesEvent(state, toolCall('c2', 'read_image', { file_path: 'img/logo.png' }))
  state = applyTurnFilesEvent(state, toolResult('c2', { meta: { path: '/workspace/img/logo.png' } }))
  assert.deepEqual(state.files, { 'src/a.ts': 'read', 'img/logo.png': 'read' })

  // edit upgrades read -> both; read after write upgrades write -> both
  state = applyTurnFilesEvent(state, toolCall('c3', 'edit', { file_path: 'src/a.ts' }))
  state = applyTurnFilesEvent(state, toolResult('c3', { meta: { path: '/workspace/src/a.ts' } }))
  state = applyTurnFilesEvent(state, toolCall('c4', 'write', { file_path: 'src/b.ts' }))
  state = applyTurnFilesEvent(state, toolResult('c4', { meta: { path: '/workspace/src/b.ts' } }))
  state = applyTurnFilesEvent(state, toolCall('c5', 'read', { file_path: 'src/b.ts' }))
  state = applyTurnFilesEvent(state, toolResult('c5', { meta: { path: '/workspace/src/b.ts' } }))
  assert.deepEqual(state.files, {
    'src/a.ts': 'both',
    'img/logo.png': 'read',
    'src/b.ts': 'both',
  })

  // apply_patch marks Add File even when meta.diffs omits additions, plus Update/Delete/Move
  const patch = [
    '*** Begin Patch',
    '*** Add File: docs/new.md',
    '+hello',
    '*** Update File: src/old.ts',
    '*** Move to: src/moved.ts',
    '@@',
    '-a',
    '+b',
    '*** Delete File: dead.ts',
    '*** End Patch',
  ].join('\n')
  state = applyTurnFilesEvent(state, toolCall('c6', 'apply_patch', { input: patch }))
  state = applyTurnFilesEvent(state, toolResult('c6', { meta: { diffs: [], stopped: false } }))
  assert.equal(state.files['docs/new.md'], 'write')
  assert.equal(state.files['src/old.ts'], 'write')
  assert.equal(state.files['src/moved.ts'], 'write')
  assert.equal(state.files['dead.ts'], 'write')

  // str_replace_editor: directory view ignored, file view -> read, insert -> write
  state = applyTurnFilesEvent(state, toolCall('c7', 'str_replace_editor', { command: 'view', path: '/workspace/src' }))
  state = applyTurnFilesEvent(state, toolResult('c7', {
    content: [{ type: 'text', text: "Here's the files and directories up to 2 levels deep in /workspace/src, excluding hidden items:" }],
  }))
  assert.equal(state.files['src'], undefined)

  state = applyTurnFilesEvent(state, toolCall('c8', 'str_replace_editor', { command: 'view', path: '/workspace/README.md' }))
  state = applyTurnFilesEvent(state, toolResult('c8', { content: [{ type: 'text', text: '1\t# Title' }] }))
  assert.equal(state.files['README.md'], 'read')

  state = applyTurnFilesEvent(state, toolCall('c9', 'str_replace_editor', { command: 'insert', path: '/workspace/notes.md' }))
  state = applyTurnFilesEvent(state, toolResult('c9', { content: [{ type: 'text', text: 'updated' }] }))
  assert.equal(state.files['notes.md'], 'write')

  // turn/end keeps current turn files until the next turn/start
  const atEnd = applyTurnFilesEvent(state, turnEnd(1))
  assert.equal(atEnd, state)

  // next turn/start clears previous turn files
  const turn2 = applyTurnFilesEvent(atEnd, turnStart(2))
  assert.equal(turn2.turn, 2)
  assert.equal(turn2.files, EMPTY_TURN_FILES)
})

test('ignores failed tools, outside paths, malformed args, and preserves reference identity', () => {
  let state = initTurnFiles({ cwd: '/workspace' })
  const idleAfterTurn1 = applyTurnFilesEvent(state, turnStart(1))
  assert.equal(applyTurnFilesEvent(idleAfterTurn1, turnStart(1)), idleAfterTurn1)

  // Unrelated tool & malformed JSON keep exact state reference
  assert.equal(applyTurnFilesEvent(idleAfterTurn1, toolCall('b1', 'bash', { command: 'ls' })), idleAfterTurn1)
  assert.equal(applyTurnFilesEvent(idleAfterTurn1, toolCall('b2', 'read', '{bad json')), idleAfterTurn1)

  // Failed tool call does not record file
  state = applyTurnFilesEvent(idleAfterTurn1, toolCall('r1', 'read', { file_path: 'missing.ts' }))
  assert.equal(state.files, EMPTY_TURN_FILES)
  state = applyTurnFilesEvent(state, toolResult('r1', { isError: true }))
  assert.equal(state.files, EMPTY_TURN_FILES)

  // Successful read records file, then duplicate read keeps exact files reference
  state = applyTurnFilesEvent(state, toolCall('r2', 'read', { file_path: 'a.ts' }))
  state = applyTurnFilesEvent(state, toolResult('r2', { meta: { path: '/workspace/a.ts' } }))
  const recordedFiles = state.files
  state = applyTurnFilesEvent(state, toolCall('r3', 'read', { file_path: 'a.ts' }))
  assert.equal(state.files, recordedFiles)
  state = applyTurnFilesEvent(state, toolResult('r3', { meta: { path: '/workspace/a.ts' } }))
  assert.equal(state.files, recordedFiles)

  // Path outside cwd does not modify files
  state = applyTurnFilesEvent(state, toolCall('r4', 'read', { file_path: '/etc/passwd' }))
  state = applyTurnFilesEvent(state, toolResult('r4', { meta: { path: '/etc/passwd' } }))
  assert.equal(state.files, recordedFiles)
})

test('built host plugin registers summary-excluded projection with valid schemas', async () => {
  const host = await import('../index.js')
  const registered = []
  const ctx = {
    inject(services, callback) {
      assert.deepEqual(services, ['sessionProjections'])
      return callback({
        sessionProjections: {
          register: async definition => {
            registered.push(definition)
            return { stateOf: () => definition.init({ cwd: '/workspace' }, 0), readerFor: () => () => ({}), dispose: async () => {} }
          },
        },
      })
    },
  }
  host.apply(ctx)
  await Promise.resolve()
  assert.equal(registered.length, 1)
  const def = registered[0]
  assert.equal(def.key, TURN_FILES_PROJECTION_KEY)
  assert.equal(def.wire.summary, false)

  let state = def.init({ cwd: '/workspace' }, 0)
  state = def.apply(state, turnStart(1))
  state = def.apply(state, toolCall('c1', 'edit', { file_path: 'src/index.ts' }))
  state = def.apply(state, toolResult('c1', { meta: { path: '/workspace/src/index.ts' } }))

  const parsedState = def.stateSchema.parse(state)
  const parsedView = def.wire.viewSchema.parse(def.wire.view(parsedState))
  assert.deepEqual(parsedView, { 'src/index.ts': 'write' })
})

test('built host plugin disposes registered projection on unload and when unloaded before resolve', async () => {
  const host = await import('../index.js')

  let disposedAfter = 0
  const cleanupsAfter = []
  host.apply({
    inject(services, callback) {
      assert.deepEqual(services, ['sessionProjections'])
      callback({
        effect(fn) { cleanupsAfter.push(fn()) },
        sessionProjections: {
          register: async () => ({ dispose: async () => { disposedAfter += 1 } }),
        },
      })
    },
  })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(cleanupsAfter.length, 1)
  cleanupsAfter[0]()
  assert.equal(disposedAfter, 1)

  let disposedEarly = 0
  const deferred = Promise.withResolvers()
  const cleanupsEarly = []
  host.apply({
    inject(_services, callback) {
      callback({
        effect(fn) { cleanupsEarly.push(fn()) },
        sessionProjections: {
          register: () => deferred.promise,
        },
      })
    },
  })
  cleanupsEarly[0]()
  deferred.resolve({ dispose: async () => { disposedEarly += 1 } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(disposedEarly, 1)
})
