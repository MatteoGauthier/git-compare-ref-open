# Change Log

## 0.1.0

### Minor Changes

- 7adffec: Follow file renames in the active-file compare commands. When the active file was moved or renamed relative to the selected ref, the diff now opens against the file's old path at that ref instead of failing, and the diff title shows the rename (`old.ts → new.ts`). Files that genuinely do not exist at the ref are compared against an empty document, matching the behavior for added files in the changed-files browser.

## 0.0.2

### Patch Changes

- a17b434: First release

All notable changes to the "git-compare-ref-open" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.1] - 2026-07-06

### Added

- Extension icon based on IBM Carbon `compare` (via Iconify)
- Default keyboard shortcuts for active-file compare and changed-file browsing
- Concise command titles under the Git Compare Ref category
- Compare active file with a Git ref, with current on the left or right
- Compare active file between two Git refs
- Browse changed files between two refs in a searchable QuickPick
- Open selected diffs in VS Code's native diff editor via `vscode.diff`
- Configurable default diff range (`threeDot` or `twoDot`)
- Integration with the built-in VS Code Git extension for repository discovery and Git-backed document URIs
