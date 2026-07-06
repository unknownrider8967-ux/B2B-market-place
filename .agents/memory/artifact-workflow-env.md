---
name: Artifact workflow PORT and BASE_PATH
description: Manually configured artifact workflows don't auto-inject PORT or BASE_PATH — must be set in the command prefix.
---

When an artifact service workflow is created via `configureWorkflow()` instead of being auto-registered from artifact.toml, Replit does NOT inject PORT or BASE_PATH automatically.

**Rule:** Always prefix the command with the required env vars:
```
PORT=20787 BASE_PATH=/ pnpm --filter @workspace/marketplace run dev
PORT=8080 pnpm --filter @workspace/api-server run dev
```

**Why:** The artifact's `artifact.toml` declares `localPort` and a `[services.env]` section — those values are only injected by the managed artifact runtime. A plain `configureWorkflow` call is a generic workflow and gets no artifact context.

**How to apply:** Any time you manually configure a workflow for an artifact service (because the managed workflow doesn't exist yet), include PORT and BASE_PATH in the command string itself.
