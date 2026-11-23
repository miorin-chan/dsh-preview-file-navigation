import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import { test } from 'node:test'
import { leftFilesCss } from '../src/client/LeftFiles.css.ts'

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
  assert.equal(entries.get('sidebar.footer.action').options.id, 'dsh-preview-file-navigation')
  assert.equal(Object.keys(dictionaries.get('dsh-preview-file-navigation')).length, 8)
  for (const dispose of effects.reverse()) dispose()
  assert.equal(entries.size, 0)
  assert.equal(dictionaries.size, 0)
})

test('package patch leaves the native right sidebar plugin active', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.doesNotMatch(patch, /ui-sidebar-files|disabled:/)
  assert.ok(patch.includes(`name: '${manifest.name}'`))
  assert.equal(typeof (await import('../index.js')).apply, 'function')
})

test('tree lines draw a native hairline for every ancestor level, through each ancestor icon centre', () => {
  // Regression: each row drew only its parent's guide, left of the icon, so ancestor lines broke across subtrees.
  const guides = leftFilesCss.match(/\.dsh-left-files__notice::before \{([^}]+)\}/)?.[1] ?? ''
  assert.match(leftFilesCss, /\.dsh-left-files__row\[aria-level\]:not\(\[aria-level='1'\]\)::before,/)
  assert.match(guides, /inset-inline-start: 24px;/)
  assert.match(guides, /inline-size: max\(0px, calc\(var\(--left-files-content-start\) \+ var\(--left-files-indent\) - 25px\)\);/)
  assert.match(guides, /background-image: repeating-linear-gradient\([\s\S]*var\(--dsw-alias-border-l3\) 0 0\.5px,\s*transparent 0\.5px var\(--left-files-step\)/)
  assert.match(leftFilesCss, /:dir\(rtl\)::before \{\s*--left-files-guide-direction: to left;/)
  assert.match(leftFilesCss, /\.dsh-left-files__row \{\s*--left-files-content-start: 16px;/)
})

test('hover-capable file rows drop the ellipsis so the marquee can reveal the suffix', () => {
  const hoverClip = /@media \(hover: hover\)\s*\{\s*\.dsh-left-files__row:hover \.dsh-left-files__name\s*\{\s*text-overflow: clip;/
  assert.ok(hoverClip.test(leftFilesCss))
})
