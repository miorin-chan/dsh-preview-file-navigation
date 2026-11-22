import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const [checkout, ...args] = process.argv.slice(2)
if (!checkout || args.some(arg => arg !== '--check')) {
  throw new Error('Usage: npm run build -- <built upstream checkout> [--check]')
}
const root = resolve(checkout)
const upstream = resolve(root, 'packages/client/ui-sidebar-files')
const sourcePath = 'packages/client/ui-sidebar-files'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
if (git('rev-parse', `HEAD:${sourcePath}`) !== '542143b611d9ccb00e2d6589fb7f2f8e89c98937'
  || git('status', '--porcelain', '--', sourcePath) !== '') {
  throw new Error('Apply the preview-file-navigation patch to dsh-v0.2.2-rc.5 and build the committed source')
}
const { name, version } = JSON.parse(await readFile(resolve(upstream, 'package.json'), 'utf8'))
if (name !== '@deepseek-ai/dsh-client-ui-sidebar-files' || version !== '0.2.2-rc.5') {
  throw new Error(`Unexpected upstream package ${name}@${version}`)
}
const bundle = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const source = await readFile(resolve(upstream, 'lib/client.js'), 'utf8')
const marker = `id:\`${name}\`,factory:`
if (source.split(marker).length !== 2 || !source.includes(`FILES_ID=\`${name}\``)) {
  throw new Error('Upstream browser artifact has an unexpected registration format')
}
const client = source
  .replace(marker, `id:\`${bundle.name}\`,factory:`)
  .replaceAll(`${name}/`, `${bundle.name}/`)
  .replaceAll(`tag.dataset.plugin=\`${name}\``, `tag.dataset.plugin=\`${bundle.name}\``)
  .replace(/\n\/\/# sourceMappingURL=.*$/m, '')
const outputs = {
  'index.js': '/** Host companion for the workspace file navigator. */\nexport function apply() {}\n',
  'client.js': `/*! @deepseek-ai/dsh-client-ui-sidebar-files ${version}, eb19c634, ${sourcePath}/src/client/index.ts (apply). MIT. */\n${client.trim()}\n`,
}
for (const [file, text] of Object.entries(outputs)) {
  const target = new URL(`../${file}`, import.meta.url)
  if (args.includes('--check')) {
    if (await readFile(target, 'utf8') !== text) throw new Error(`${file} differs from the build`)
  } else {
    await writeFile(target, text)
  }
}
