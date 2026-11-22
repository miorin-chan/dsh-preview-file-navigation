import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import { test } from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('declares the shipped client services and a valid host companion', async () => {
  let registration
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  new Script(source).runInNewContext({ window: { __ModuleLoader__: { load(entry) { registration = entry } } } })
  assert.equal(registration?.id, manifest.name)
  const plugin = registration.factory(id => id === 'react' ? { memo: component => component } : {})
  assert.deepEqual(Array.from(plugin.inject), ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.workspaceFiles'])
  assert.equal(typeof plugin.apply, 'function')
  assert.equal(typeof (await import('../index.js')).apply, 'function')
})
