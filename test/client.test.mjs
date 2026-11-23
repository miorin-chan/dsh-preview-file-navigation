import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import { test } from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

async function client() {
  let registration
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  new Script(source).runInNewContext({ window: { __ModuleLoader__: { load(entry) { registration = entry } } } })
  assert.equal(registration?.id, manifest.name)
  return registration.factory(id => {
    assert.ok(['react', 'react-dom', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'].includes(id))
    return {}
  })
}

test('registers and disposes the workspace files mount', async () => {
  const plugin = await client()
  const effects = []
  const entries = new Map()
  const dictionaries = new Map()
  const ctx = {
    effect: effect => effects.push(effect()),
    locale: { register: (id, labels) => {
      dictionaries.set(id, labels)
      return () => dictionaries.delete(id)
    } },
    slots: {
      inject: (slot, setup) => {
        assert.equal(slot, 'sidebar.footer.action')
        return setup()
      },
      register: (options, component) => {
        entries.set(options.name, { options, component })
        return () => entries.delete(options.name)
      },
    },
  }
  plugin.apply(ctx)
  assert.deepEqual([...entries.keys()], ['sidebar.footer.action'])
  assert.equal(entries.get('sidebar.footer.action').options.id, manifest.name)
  assert.equal(Object.keys(dictionaries.get(manifest.name)).length, 8)
  for (const dispose of effects.reverse()) dispose()
  assert.equal(entries.size, 0)
  assert.equal(dictionaries.size, 0)
})

test('package patch leaves the native right sidebar plugin active', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.doesNotMatch(patch, /ui-sidebar-files|disabled:/)
  assert.match(patch, /name: dsh-preview-file-navigation/)
  assert.equal(typeof (await import('../index.js')).apply, 'function')
})
