---
name: React Query provider must be set up explicitly
description: Vite React app entry points don't come with QueryClientProvider pre-wired
---

A bare Vite React `main.tsx` (`createRoot(...).render(<App />)`) does not include `QueryClientProvider` by default. Any page using generated `@workspace/api-client-react` query hooks (`useListXxx`, `useGetXxx`, etc.) will typecheck fine but crash at runtime with `No QueryClient set, use QueryClientProvider to set one` — this only surfaces when the route is actually visited, not during typecheck or build.

**Why:** typechecking doesn't catch missing React context providers; this is a pure runtime error that only a screenshot/manual visit of an authenticated-feeling route (e.g. onboarding, dashboard) will reveal.

**How to apply:** when scaffolding a new frontend artifact that uses the generated query-hook client, verify `main.tsx` wraps `<App />` in a `QueryClientProvider` with a `new QueryClient()` instance before considering the app done. Screenshot multiple routes (not just the landing page) to catch this class of bug.
