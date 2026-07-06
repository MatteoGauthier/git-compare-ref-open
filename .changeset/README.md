# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versions and release notes.

When you make a user-facing change, run:

```bash
pnpm changeset
```

Commit the generated file under `.changeset/`. The release workflow opens a **Version Packages** pull request when changesets are present on `master`.

When that PR is merged, GitHub Actions packages the extension, creates a GitHub release with the `.vsix`, and publishes to Open VSX and the Visual Studio Marketplace when tokens are configured.
