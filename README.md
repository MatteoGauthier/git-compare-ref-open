# Git Compare Ref Open

Quickly compare Git refs and open file diffs in VS Code's native diff editor. Get it on [Open VSX](https://open-vsx.org/extension/MatteoGauthier/git-compare-ref-open) — not the VS Code Marketplace — or from [GitHub Releases](https://github.com/MatteoGauthier/git-compare-ref-open/releases).

## Features

- Compare the active file with a Git ref, with current on the left or right
- Compare the active file between two Git refs
- Browse changed files between two refs in a searchable QuickPick
- Open the selected file directly in VS Code's native Git diff tab

## Commands

All commands are available from the Command Palette under **Git Compare Ref**:

| Command | Description |
| --- | --- |
| Compare File with Ref (Current Right) | Opens `ref:file` on the left and the current file on the right |
| Compare File with Ref (Current Left) | Opens the current file on the left and `ref:file` on the right |
| Compare File Between Refs | Opens the active file path at the resolved left and right refs |
| Browse Changed Files Between Refs | Lists changed files between two refs and opens the selected diff |

Active-file commands are also available from the editor context menu for file-backed editors.

## Keyboard Shortcuts

| Shortcut | Command |
| --- | --- |
| `Cmd+Alt+D` on macOS, `Ctrl+Alt+D` elsewhere | Compare File with Ref (Current Right) |
| `Cmd+Alt+Shift+D` on macOS, `Ctrl+Alt+Shift+D` elsewhere | Browse Changed Files Between Refs |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `gitCompareRefOpen.defaultDiffRange` | `threeDot` | Diff range for ref-vs-ref commands. Use `threeDot` for `refA...refB` or `twoDot` for `refA..refB`. |

### Diff range behavior

- `threeDot`: lists files with `refA...refB` and opens left side from `merge-base(refA, refB)` and right side from `refB`
- `twoDot`: lists files with `refA..refB` and opens left side from `refA` and right side from `refB`

## Requirements

- VS Code or Cursor compatible with VS Code `1.105.0` or newer
- The built-in **Git** extension (`vscode.git`)
- Git available on your `PATH`

## Usage examples

1. Open a file in the editor.
2. Run **Git Compare Ref: Compare File with Ref (Current Right)**.
3. Pick a branch, tag, or commit.
4. VS Code opens the native diff editor for that file.

To review a large branch or pull request:

1. Run **Git Compare Ref: Browse Changed Files Between Refs**.
2. Pick base ref and compare ref.
3. Search the changed-file list and open the file you want to review.

## TODO

- Show recent refs at the top of the ref picker
- Filter changed-file browsing by status (`M`, `A`, `D`, `R`)
- Open the next or previous changed file after viewing one diff
- Compare from SCM and file explorer context menus without needing the active editor

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

<details>
<summary><strong>Releasing</strong></summary>

This project uses [Changesets](https://github.com/changesets/changesets) for version bumps, changelog updates, GitHub releases, and marketplace publishing.

### One-time setup

1. Create an [Open VSX](https://open-vsx.org/) account and [personal access token](https://open-vsx.org/user-settings/tokens).
2. Create the Open VSX namespace that matches `publisher` in `package.json`:

```bash
pnpm exec ovsx create-namespace <publisher> --pat "$OVSX_PAT"
```

3. Optional: create a [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) publisher and an Azure DevOps PAT with `Marketplace > Manage`.
4. Add GitHub repository secrets:
   - `OVSX_PAT`
   - `VSCE_PAT` (optional, for official VS Code Marketplace)

Before the first publish, make sure `publisher` in `package.json` matches your Open VSX namespace and Marketplace publisher ID.

### Ship a change

1. Make your code changes.
2. Add a changeset:

```bash
pnpm changeset
```

3. Commit the changeset file and push to `master`.
4. Merge the **Version Packages** pull request created by GitHub Actions.
5. The release workflow will then:
   - validate the extension in an isolated build job
   - publish from a separate job that only installs tooling with `--ignore-scripts`
   - create a GitHub release
   - attach the `.vsix` to the release
   - publish to Open VSX when `OVSX_PAT` is configured
   - publish to the Visual Studio Marketplace when `VSCE_PAT` is configured

GitHub Actions follow a default-deny permission model, pin third-party actions to commit SHAs, skip forked pull requests in CI, and split build from publish as recommended in [One repo, every workflow](https://bomb.sh/blog/one-repo-every-workflow/). Dependabot opens weekly PRs to bump pinned action SHAs.

Missing publish secrets are skipped. You still get the GitHub release with the VSIX attached.

</details>
