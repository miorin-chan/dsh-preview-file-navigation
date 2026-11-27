# Workspace files

[简体中文](README.zh.md)

Browse the current session’s working directory and the files the agent read or edited
in the current turn from the left sidebar.
Select a file to open it in the built-in right sidebar preview.

## Screenshots

The DeepSeek Harness interface is shown in Chinese.

![Workspace file search filtered to paths matching release](docs/assets/screenshots/main-light.png)

- Workspace files header · [Light](docs/assets/screenshots/entry-light.png) ·
  [Dark](docs/assets/screenshots/entry-dark.png)
- File search results · [Light](docs/assets/screenshots/main-light.png) · [Dark](docs/assets/screenshots/main-dark.png)

## Install

This local bundle requires exactly **DeepSeek Harness 0.2.2-rc.5** and its Web client.
Run `pnpm install --frozen-lockfile` in a fresh checkout to install dependencies and build the plugin.
Then select this directory in **Plugins** → **Add plugin** and keep it at that path while installed.
[Workspace Atlas](../dsh-atlas-workspace/README.md) already includes Workspace files.
Choose one installation.

## Use

1. Open a session with a working directory.
   The workspace section below the session list opens in the current-turn view by default,
   showing a pruned tree of files read or edited during the current turn along
   with a trailing read/write indicator dot (collapsed folders also show a smaller dot when descendants were touched).
2. Select the workspace name or triangle button to cycle
   through **current-turn files → all workspace files → collapsed**.
3. Select the magnifying glass in the workspace header to open **Search files or paths**.
   Select a file to open the built-in preview.
   Select a folder in the search results to reveal it in the tree.
4. Press Esc or select the close button in the search field to return to the previous tree view.

[Development and compatibility notes](docs/README.md)
