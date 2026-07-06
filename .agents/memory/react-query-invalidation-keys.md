---
name: React Query invalidation must use generated key helpers
description: Orval generates path-based query keys; plain string arrays like ['products'] don't match and leave stale data.
---

**Rule:** Always import and use the generated `get*QueryKey` helpers from `@workspace/api-client-react` for cache invalidation. Never use hand-rolled string arrays like `['products']` or `['categories']`.

**Why:** Orval generates query keys as `['/api/products', params]` — the first element is the URL path, not a short label. A `queryClient.invalidateQueries({ queryKey: ['products'] })` call matches nothing and silently leaves stale data in dependent views.

**How to apply:**
```ts
import { getListProductsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
```
The helpers accept the same params as the corresponding query hook, so pass matching params when your query was filtered (e.g. by search string).
