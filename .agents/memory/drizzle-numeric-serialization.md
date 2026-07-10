---
name: Drizzle numeric columns serialize as strings, not numbers
description: Runtime mismatch between Postgres numeric/decimal columns (Drizzle) and Zod response schemas expecting `number`.
---

Drizzle (via node-postgres) returns Postgres `numeric`/`decimal` columns as JS strings (e.g. `"0.00"`), not numbers — this avoids float precision loss but means any row selected straight from such a table cannot be passed directly into a Zod schema that declares that field as `z.number()`.

**Why:** In this stack, generated Zod response schemas (from OpenAPI) declare decimal fields (e.g. a company's `outstandingBalance`, `creditLimit`) as `number`. A route that does `ResponseSchema.parse(dbRow)` on a row with a non-null decimal column throws a `ZodError` ("Expected number, received string") at request time — this only surfaces when that non-null-with-default column is hit, so it can silently ship broken (e.g. a signup/onboarding flow returning 500 to every user) until someone exercises that exact path.

**How to apply:** Before validating/returning any DB row that includes `numeric`/`decimal` columns through a Zod response schema, coerce those fields with `Number(value)` (skip `null`). Prefer centralizing this in one serializer per entity (e.g. `serializeCompany()`) and reusing it everywhere that table's rows are returned, rather than fixing call sites ad hoc — the same row shape tends to get returned from several routes (profile, admin list, status-update, etc.), and it's easy to fix one call site and miss the others.
