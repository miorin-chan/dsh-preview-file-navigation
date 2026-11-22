# AGENTS.local

This file supplements [AGENTS.md](AGENTS.md) with rules for this local DSH bundle.

## Documentation and localization

- Keep [the English README](README.md) and [the Chinese README](README.zh.md) aligned.
  Update them when installation, behavior, or compatibility changes.
  Keep maintainer notes and upstream links in the [docs index](docs/README.md).
- Keep the Plugin Manager title and description in all eight `locale/*.json` files (`en`,
  `zh`, `ja`, `de`, `es`, `fr`, `pt`, and `ru`).
  Preserve the upstream runtime translations in the distributed client.
- Format edited Markdown with the [standalone reflow script](docs/scripts/reflow), which requires Python 3.11 or newer.

## Distribution

- Build from the upstream checkout pinned in the [docs index](docs/README.md).
  Regenerate the distributed client with [the build script](scripts/build.mjs)
  and retain the upstream [MIT license](LICENSE).
- The Loader layer must deactivate the original Files plugin while the local bundle is enabled.
  Preserve the native file tab and Factory registrations so the built-in document preview can keep using them.
  Keep installed DSH files intact.
- Treat the exact DSH runtime version as part of the compatibility contract.
  Check the existing provider entry, component Factory declarations, stylesheets, and registrations before updating it.
  Follow the verification in the [docs index](docs/README.md) for changes to the distribution or runtime version.
