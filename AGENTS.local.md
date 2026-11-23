# AGENTS.local

This file supplements [AGENTS.md](AGENTS.md) with rules for the Workspace files bundle.

## Documentation and localization

- Maintain the [English README](README.md) and [Chinese README](README.zh.md) together.
  Keep development and compatibility notes in the [docs index](docs/README.md).
- Keep Plugin Manager copy in `locale/*.json` and runtime copy in [the client dictionary](src/client/locale.ts).
  Update all eight locales (`en`, `zh`, `ja`, `de`, `es`, `fr`, `pt`, and `ru`).
- Format edited Markdown with the [standalone reflow script](docs/scripts/reflow).

## Implementation and verification

- Place the file browser below the session list in the left sidebar.
  Use the current session’s working directory and send file opens through the native right sidebar preview.
- Write source in TypeScript and regenerate the distributed JavaScript with [the build script](scripts/build.mjs).
- The bundle targets exactly DeepSeek Harness 0.2.2-rc.5.
  Follow the [build and verification instructions](docs/README.md) when changing the source or runtime version.
