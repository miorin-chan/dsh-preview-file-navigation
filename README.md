# Compact file navigation

[简体中文](README.zh.md)

Browse the Session’s workspace tree or search for files beside the built-in document preview.
The navigator works in docked and floating previews and in the right sidebar’s Files tab.

## Install

This local bundle requires **DeepSeek Harness 0.2.2-rc.5** and a Web client
with the built-in Files and Document preview plugins available.
In **Plugins** → **Add plugin**, select this package directory.
Keep the directory at the selected path while the bundle is installed.
Disable **Compact file navigation** in **Plugins** to restore the profile’s built-in Files provider.

## Use

- Open a document preview and use the navigator toggle at the end of its header.
  Select a file from the tree or the search results to open it in that preview.
  The navigator retains its width, expanded folders, and scroll position per pane.
  In narrow layouts, it can cover the preview and closes when you open a file there.
- Open **Files** from the right sidebar’s start page to browse the workspace without opening a preview first.
  Use the magnifier in the Files header to show its search field.
- Search matches names case-insensitively across the Session’s workspace.
  Include `/` to match workspace-relative paths.
  The eye button shows hidden entries, and the search settings control exclusions and ignore files.
  Search covers file and directory names and paths only.

[Source, compatibility, and rebuild notes](docs/README.md)
