---
name: Wallet/ledger financial mutations need transactions + terminal-state guards
description: Pattern for building money-moving features (wallets, payouts, commission settlement) safely on top of Drizzle/Postgres in this stack.
---

When a feature moves money between balance columns (e.g. vendor wallet available/pending balance) or writes ledger rows tied to a status transition (e.g. crediting a wallet when an order becomes "completed"), read-then-write balance updates and unguarded status flips are not safe under concurrency.

**Why:** A first implementation of vendor wallet payouts used `SELECT balance` then `UPDATE ... SET balance = <computed>`, and gated wallet-crediting only by comparing the order's previous status in application code. An architect code review caught three real bugs this pattern produces: (1) concurrent requests can both pass a stale balance check and overdraw, (2) two concurrent order-completion calls can both observe "not yet completed" and double-credit, (3) if status commits but the ledger write fails afterward, the order is stuck "completed" with no credit and no way to retry (non-terminal-state design blocks correction).

**How to apply:**
- Use SQL-expression increments (`sql`${col} + ${amount}``) inside the `UPDATE ... WHERE` guard itself, never read-then-write in JS.
- Guard status transitions with a conditional `WHERE status = <expected>` (or `NOT IN (<terminal states>)`) so the DB — not application logic — decides atomically whether the transition is valid.
- Wrap the status transition and all resulting financial side effects (balance updates + ledger inserts) in one `db.transaction(...)` so they commit or roll back together.
- Do side effects that must not block/abort the financial transaction (e.g. notifications) strictly after that transaction resolves.
