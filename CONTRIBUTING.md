# Contributing

The kernel is deliberately small (~700 lines, zero runtime dependencies).
Before extending it, read `src/kernel/` end to end — the event log IS the
database, and the design constraint is that it stays that way.

## Ground rules

- Keep runtime dependencies at zero. Type-only devDependencies are fine.
- Every behavior change ships with a test in `test/kernel.test.ts`.
- Benchmarks are seeded and deterministic; never tune numbers to look good.
- Keep the README's PROOF table true — claims point at commands, tests, files.

## Setup

Requires Node >= 22.6.

```bash
pnpm install     # dev-only: typescript + @types/node
pnpm typecheck
pnpm test
pnpm bench
```

## Commit style

One line, present tense, what and why.
