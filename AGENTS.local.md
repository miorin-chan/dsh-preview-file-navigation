# AGENTS.local

This file supplements [AGENTS.md](AGENTS.md) with rules for the Workspace files bundle.

## Documentation and localization

- Maintain the [English README](README.md) and [Chinese README](README.zh.md) together.
  Keep development and compatibility notes in the [docs index](docs/README.md).
- Keep Plugin Manager copy in `locale/*.json` and runtime copy in [the client dictionary](src/client/locale.ts).
  Update all eight locales (`en`, `zh`, `ja`, `de`, `es`, `fr`, `pt`, and `ru`).
- Keep the plugin detail page short and easy to scan.
  Use plain language and show only what the user needs to know or do right away.
  Reveal details as needed.
- Format edited Markdown with the [standalone reflow script](docs/scripts/reflow).

## Implementation and verification

- Place the file browser below the session list in the left sidebar.
  Use the current session’s working directory and send file opens through the native right sidebar preview.
- Use TypeScript for plugin source unless otherwise specified.
  Regenerate the distributed JavaScript with [the build script](scripts/build.mts).
- The bundle targets exactly DeepSeek Harness 0.2.2-rc.5.
  Follow the [build and verification instructions](docs/README.md) when changing the source or runtime version.

`npm run build:tools` 从 `scripts/` 下的 `.mts` 生成同路径 `.mjs`，Git 跟踪 TypeScript 源码。
Node.js 22.18 或更新版本直接运行 `.test.mts`。
