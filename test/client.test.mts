import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import { test } from 'node:test'
import { leftFilesCss } from '../src/client/LeftFiles.css.ts'
import { dictionaries } from '../src/client/locale.ts'
import { scriptRuns } from '../src/client/script-runs.ts'
import { NEXT_VIEW } from '../src/client/section-motion.ts'
import { ancestorActivities, buildRecentTreeRows } from '../src/shared/turn-files.ts'

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

test('activity markers distinguish read, write, and both by shape as well as DSH state colour', () => {
  const rule = (selector: string) => leftFilesCss.match(new RegExp(`(?<!,)\\n${selector.replace(/[[\]()]/g, '\\$&')} \\{([^}]+)\\}`))?.[1] ?? ''
  const base = rule(".dsh-left-files__activity")
  assert.match(base, /border: var\(--left-files-activity-ring\) solid currentColor;/)
  assert.match(base, /box-sizing: border-box;/)
  assert.match(rule(".dsh-left-files__activity[data-activity='read']"), /color: var\(--dsw-alias-state-business-primary\);/)
  assert.doesNotMatch(rule(".dsh-left-files__activity[data-activity='read']"), /background/)
  assert.match(leftFilesCss, /\.dsh-left-files__activity\[data-activity='write'\],\s*\.dsh-left-files__activity\[data-activity='both'\]\s*\{\s*color:\s*var\(--dsw-alias-state-warn-primary\);/)
  assert.match(rule(".dsh-left-files__activity[data-activity='write']"), /background: currentColor;/)
  assert.match(rule(".dsh-left-files__activity[data-activity='both']"), /background: linear-gradient\(to top, currentColor 50%, transparent 50%\);/)
  // Regression: write and both once shared one filled orange dot and were indistinguishable.
  assert.notEqual(rule(".dsh-left-files__activity[data-activity='write']"), rule(".dsh-left-files__activity[data-activity='both']"))
  assert.match(rule(".dsh-left-files__activity[data-activity-scope='ancestor']"), /--left-files-activity-ring: 1px;/)
})

test('read-only rows step back one grey level while written rows keep the primary label', () => {
  assert.match(leftFilesCss, /\.dsh-left-files__row\[data-read-only\] > \.dsh-left-files__label \{\s*color: var\(--dsw-alias-label-secondary\);/)
  const ancestors = ancestorActivities({ 'docs/a.md': 'read', 'src/a.ts': 'read', 'src/b.ts': 'write' })
  assert.equal(ancestors.get('docs'), 'read')
  assert.equal(ancestors.get('src'), 'both')
})

test('section tri-state cycles all -> collapsed -> recent -> all and uses hollow triangle for recent', async () => {
  assert.deepEqual(NEXT_VIEW, { all: 'collapsed', collapsed: 'recent', recent: 'all' })
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(source, /\.left-workspace-files__trigger\[data-view='recent'\] \.left-workspace-files__arrow path \{\s*fill-opacity:\s*0;\s*stroke-opacity:\s*1;\s*\}/)
})

test('recent view preserves a definite sidebar height and does not collapse the session list to zero basis', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(source, /\[data-sidebar-scrollport\] :has\(> \[data-sidebar-list-area\] \+ \.left-workspace-files\[data-open\]\) \{\s*block-size:\s*100%;\s*\}/)
  assert.match(source, /\[data-sidebar-scrollport\] \[data-sidebar-list-area\]:has\(\+ \.left-workspace-files\[data-open\]\[data-view='recent'\]:not\(\[data-searching\]\)\) \{\s*flex:\s*0 1 auto;\s*min-block-size:\s*0;\s*\}/)
  assert.match(source, /\[data-sidebar-list-area\] \+ \.left-workspace-files\[data-open\]\[data-view='recent'\]:not\(\[data-searching\]\) \{\s*display:\s*flex;\s*flex:\s*0 0 auto;\s*flex-direction:\s*column;\s*max-block-size:\s*50%;\s*min-block-size:\s*0;\s*\}/)
  assert.match(source, /\.left-workspace-files \[data-left-files-pane\] \{\s*flex:\s*1 1 auto;\s*min-height:\s*0;\s*display:\s*flex;\s*flex-direction:\s*column;\s*\}/)
})

test('builds pruned recent tree and bubbles ancestor directory activities', () => {
  const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare
  const files = {
    'src/client/index.tsx': 'write',
    'src/shared/types.ts': 'read',
    'README.md': 'read',
  }

  const ancestors = ancestorActivities(files)
  assert.equal(ancestors.get('src/client'), 'write')
  assert.equal(ancestors.get('src/shared'), 'read')
  assert.equal(ancestors.get('src'), 'both')

  const expandedRows = buildRecentTreeRows(files, new Set(), byName)
  assert.deepEqual(
    expandedRows.map(row => `${row.depth}:${row.type}:${row.path}`),
    [
      '0:directory:src',
      '1:directory:src/client',
      '2:file:src/client/index.tsx',
      '1:directory:src/shared',
      '2:file:src/shared/types.ts',
      '0:file:README.md',
    ],
  )

  const collapsedRows = buildRecentTreeRows(files, new Set(['src/client']), byName)
  assert.deepEqual(
    collapsedRows.map(row => `${row.depth}:${row.type}:${row.path}`),
    [
      '0:directory:src',
      '1:directory:src/client',
      '1:directory:src/shared',
      '2:file:src/shared/types.ts',
      '0:file:README.md',
    ],
  )
})

test('hover-capable file rows drop the ellipsis so the marquee can reveal the suffix', () => {
  const hoverClip = /@media \(hover: hover\)\s*\{\s*\.dsh-left-files__row:hover \.dsh-left-files__name\s*\{\s*text-overflow: clip;/
  assert.ok(hoverClip.test(leftFilesCss))
})

test('marks alphabetic runs of workspace titles for size and weight balancing, leaving CJK runs alone', () => {
  assert.deepEqual(scriptRuns('default-workspace'), [{ text: 'default-workspace', script: 'alphabetic' }])
  assert.deepEqual(scriptRuns('默认工作区'), [{ text: '默认工作区', script: 'cjk' }])
  assert.deepEqual(scriptRuns('my-app 前端'), [
    { text: 'my-app ', script: 'alphabetic' },
    { text: '前端', script: 'cjk' },
  ])
})

test('empty states match the session list icon-over-text layout across all locales', async () => {
  const emptyRule = leftFilesCss.match(/\.dsh-left-files__empty \{([^}]+)\}/)?.[1] ?? ''
  assert.match(emptyRule, /display:\s*flex;/)
  assert.match(emptyRule, /flex-direction:\s*column;/)
  assert.match(emptyRule, /align-items:\s*center;/)
  assert.match(emptyRule, /color:\s*var\(--dsw-alias-label-tertiary\);/)
  assert.match(emptyRule, /font-size:\s*13px;/)
  assert.match(emptyRule, /line-height:\s*20px;/)
  assert.match(emptyRule, /text-align:\s*center;/)

  const iconRule = leftFilesCss.match(/\.dsh-left-files__empty > svg \{([^}]+)\}/)?.[1] ?? ''
  assert.match(iconRule, /margin-block-end:\s*4px;/)
  assert.match(iconRule, /color:\s*var\(--dsw-alias-label-caption\);/)

  const leftFilesSource = await readFile(new URL('../src/client/LeftFiles.tsx', import.meta.url), 'utf8')
  assert.match(leftFilesSource, /<div className="dsh-left-files__empty" data-left-files-empty="recent">[\s\S]*?<IconFolderOpenOutlineRegular size=\{24\} \/>[\s\S]*?<div role="status">\{t\('recentEmpty'\)\}<\/div>/)
  assert.doesNotMatch(leftFilesSource, /renderNotice\('recentEmpty'/)

  const indexSource = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(indexSource, /<div className="dsh-left-files__empty" data-left-files-empty="no-session">[\s\S]*?<IconFolderCloseRegular size=\{24\} \/>[\s\S]*?<div role="status">\{t\('noSession'\)\}<\/div>/)
  assert.doesNotMatch(indexSource, /<p data-left-files-notice="">\{t\('noSession'\)\}<\/p>/)

  const locales = Object.entries(dictionaries)
  assert.equal(locales.length, 8)
  for (const [locale, dict] of locales) {
    assert.ok(dict.recentEmpty.length > 0, `${locale} recentEmpty must not be empty`)
    assert.doesNotMatch(dict.recentEmpty, /[.。]$/, `${locale} recentEmpty should omit trailing sentence period`)
    assert.ok(dict.noSession.length > 0, `${locale} noSession must not be empty`)
    assert.doesNotMatch(dict.noSession, /[.。]$/, `${locale} noSession should omit trailing sentence period`)
  }
})
