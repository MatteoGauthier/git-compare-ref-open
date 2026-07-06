# Git Compare Ref Open

Quickly compare Git refs and open file diffs in VS Code's native diff editor.

## Features

- Compare the active file with a Git ref, with current on the left or right
- Compare the active file between two Git refs
- Browse changed files between two refs in a searchable QuickPick
- Open the selected file directly in VS Code's native Git diff tab

## Commands

All commands are available from the Command Palette under **Git Compare Ref**:

| Command | Description |
| --- | --- |
| Compare Active File With Ref (Current on Right) | Opens `ref:file` on the left and the current file on the right |
| Compare Active File With Ref (Current on Left) | Opens the current file on the left and `ref:file` on the right |
| Compare Active File Between Refs | Opens the active file path at the resolved left and right refs |
| Browse Changed Files Between Refs | Lists changed files between two refs and opens the selected diff |

Active-file commands are also available from the editor context menu for file-backed editors.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `gitCompareRefOpen.defaultDiffRange` | `threeDot` | Diff range for ref-vs-ref commands. Use `threeDot` for `refA...refB` or `twoDot` for `refA..refB`. |

### Diff range behavior

- `threeDot`: lists files with `refA...refB` and opens left side from `merge-base(refA, refB)` and right side from `refB`
- `twoDot`: lists files with `refA..refB` and opens left side from `refA` and right side from `refB`

## Requirements

- VS Code `1.125.0` or newer
- The built-in **Git** extension (`vscode.git`)
- Git available on your `PATH`

## Usage examples

1. Open a file in the editor.
2. Run **Git Compare Ref: Compare Active File With Ref (Current on Right)**.
3. Pick a branch, tag, or commit.
4. VS Code opens the native diff editor for that file.

To review a large branch or pull request:

1. Run **Git Compare Ref: Browse Changed Files Between Refs**.
2. Pick base ref and compare ref.
3. Search the changed-file list and open the file you want to review.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
