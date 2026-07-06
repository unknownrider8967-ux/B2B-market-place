---
name: OpenAPI duplicate path keys break orval codegen
description: All HTTP verbs for the same path must share one path entry; duplicates cause orval to fail.
---

**Rule:** In OpenAPI YAML, every path (e.g. `/products/{id}`) must appear exactly once in the `paths:` block. All HTTP methods (get, post, patch, delete) must be nested under that single entry.

**Why:** YAML allows duplicate keys but most parsers (including the one orval uses) silently drop or error on duplicates. When we added PATCH and DELETE for `/products/{id}` as a second `paths:` entry, orval failed with "Failed to resolve input".

**How to apply:** When adding new verbs to an existing path, find the existing path entry and append the new methods there — never create a second entry for the same path.
