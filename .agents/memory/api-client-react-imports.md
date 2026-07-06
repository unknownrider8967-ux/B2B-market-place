---
name: api-client-react imports
description: How to correctly import hooks, types, and query-key helpers from @workspace/api-client-react
---

`lib/api-client-react/package.json` only declares a single export map entry (`"."` → `./src/index.ts`). Deep imports like `@workspace/api-client-react/src/generated/api` or `.../api.schemas` resolve fine in the editor/LSP (which can see the filesystem) but fail `tsc -p ... --noEmit` with `TS2307: Cannot find module`, because Node's package exports map blocks the subpath at build time.

**Why:** the generated Orval output (`api.ts`, `api.schemas.ts`) is re-exported through `src/index.ts`, and the package intentionally exposes only that barrel.

**How to apply:** always `import { useXxx, XxxSchema, getXxxQueryKey } from "@workspace/api-client-react"`. Never import from a `/src/generated/...` subpath, even if it typechecks in the editor — verify with `pnpm --filter <artifact> run typecheck` before trusting it.
