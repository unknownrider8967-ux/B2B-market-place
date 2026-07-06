---
name: Composite lib setup for tsc --build
description: Any lib listed in root tsconfig.json references must be a composite TS project
---

Root `tsconfig.json` is a solution file (`tsc --build`) listing every `lib/*` package that other packages import. If a lib is added to that references list but its own `tsconfig.json` lacks `composite: true` (plus `declarationMap` and `emitDeclarationOnly`), `tsc --build` fails with `TS6306: Referenced project '...' must have setting "composite": true`, and any artifact that depends on it fails typecheck with a confusing downstream error.

**Why:** `tsc --build` needs composite project metadata to do incremental cross-project builds and declaration emit.

**How to apply:** when creating or wiring up a new `lib/*` package (e.g. an auth helper lib), match the pattern used by sibling libs — `composite: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `outDir: "dist"`, `rootDir: "src"` — before adding it to root `tsconfig.json` references. Run `pnpm run typecheck:libs` after adding a new lib reference.
