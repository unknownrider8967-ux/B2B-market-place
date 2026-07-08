---
name: Imported pnpm monorepo needs install first
description: GitHub-imported pnpm workspaces ship without node_modules; workflows fail on missing binaries until installed.
---

When a pnpm-workspace project is freshly imported from GitHub, `node_modules` is not present anywhere in the tree. Any configured workflow that runs a dev/build script (Vite, esbuild, etc.) fails immediately with errors like `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'` or `sh: vite: not found`.

**Why:** git repos don't commit `node_modules`; import only brings source + lockfile, not installed deps.

**How to apply:** Before debugging a "command not found" / "module not found" workflow failure in a freshly imported project, run `pnpm install` at the workspace root first — it's almost always the root cause, not a code bug. Then restart the affected workflows.
</content>
