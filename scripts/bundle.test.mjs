import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import test from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const upstream = '@deepseek-ai/dsh-client-ui-sidebar-files'

test('registers a separate browser module and retains the built-in file tab identity', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  const modules = []
  new Script(source).runInNewContext({ window: { __ModuleLoader__: { load: module => modules.push(module) } } })
  assert.deepEqual(modules.map(module => module.id), [manifest.name])
  assert.equal(typeof modules[0].factory, 'function')
  assert.ok(source.includes(`const FILES_ID=\`${upstream}\``))
  for (const style of ['FileTree.module.css', 'FilesBody.module.css']) {
    assert.ok(source.includes(`${manifest.name}/${style}`))
    assert.ok(!source.includes(`${upstream}/${style}`))
  }
})
