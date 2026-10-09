# Changelog

## 0.1.0 â€” 2026-10-08

First public release.

- Append-only claim ledger: graded support (measured/inferred/reported),
  evidence links, supersession without erasure, provenance via `explain`.
- `ask()` with UNKNOWN as a first-class answer (coverage + evidence gates).
- Governed learning: propose/deny/commit authority roles; denials are logged.
- keel: durable missions; `kill -9` and resume from a clean process.
- Packs: domain-scoped stores with a minimal registry.
- Deterministic demo domain (probe MNEMOSYNE-7) with four signature moments.
- Seeded benchmark: unknown-detection 1.00, hallucination 0, recall 0.65.
- Experimental DeepSeek Harness integration adapter.

## 0.2.0 — 2026-10-09

- Real DeepSeek Harness tool plugin: credence_ask / credence_learn / credence_pulse
  (defineTool on ctx.tools; agent caller is DENIED commit by design).
- Acquisition README pass: KILL->RESUME replay asset in the first viewport,
  quickstart leads with demo:kill.
- Shareable concept cards: unknown / contradiction / governed learning.
- Good-first issues #2 and #4 specced with acceptance criteria.

## 0.2.1 — 2026-10-09

- FIX: DSH plugin and bridge imported the kernel from wrong relative paths
  (plugin could not load; bridge could not run). Both verified end to end.
- FIX: CI workflow file rejected by Actions (all runs failed) — now green on
  Node 22/24 x Linux/Windows.
- Integrations are now typechecked in CI (ambient host types in types/).
- New regression tests load the REAL plugin via host shims and drive the
  tools: 3 registrations, UNKNOWN path, worker DENIED, pulse (13 tests total).
- Bridge CLI: --caller flag; question no longer eaten as caller.
