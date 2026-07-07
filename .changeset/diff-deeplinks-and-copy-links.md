---
"git-compare-ref-open": minor
---

Add diff deeplinks and link-copy commands. A new URI handler opens diffs from `{vscode|cursor}://MatteoGauthier.git-compare-ref-open/diff?left=&right=&file=&path=&range=` URLs, resolving the repository from `path`, validating refs, and handling added, deleted, and renamed files. **Copy Diff Link** copies that URL for the focused ref diff tab or for the active file after picking refs. **Copy Remote Diff Link** copies a GitHub, GitLab, or Bitbucket compare URL reproducing the focused ref diff — anchored to the file's diff on hosts that support it — or prompts for refs when no diff tab is focused. Both copy commands are available from the palette, the editor context menu, and the diff tab's right-click menu.
