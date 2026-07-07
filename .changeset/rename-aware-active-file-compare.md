---
"git-compare-ref-open": minor
---

Follow file renames in the active-file compare commands. When the active file was moved or renamed relative to the selected ref, the diff now opens against the file's old path at that ref instead of failing, and the diff title shows the rename (`old.ts → new.ts`). Files that genuinely do not exist at the ref are compared against an empty document, matching the behavior for added files in the changed-files browser.
