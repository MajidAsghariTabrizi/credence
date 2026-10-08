# Architecture

One process, one directory, zero dependencies. The event log **is** the database.

## The one idea

Knowledge changes are events, never edits. Every store is a single
`events.jsonl` file; every read is a pure fold over that file. This single
decision buys the three properties the project exists for:

1. **Immutability** — supersession appends two events (`contradiction-raised`,
   `claim-superseded`); nothing is rewritten, so history is inspectable forever.
2. **Crash safety** — a torn process leaves a prefix of the log; the fold of a
   prefix is a valid state. Missions resume by folding.
3. **Provenance** — `explain(id)` is "filter the log by id"; no shadow tables.

## Surfaces

```text
ClaimStore  append(events) · claims() fold · evidence() fold · proposals() fold · history(id)
ask         query-coverage × support-weight retrieval; UNKNOWN below threshold or without evidence
learn       propose(delta, caller) — role gate; commitProposal(id, caller)
investigate collectors → { durableCandidates, ephemeralObservations }
keel        durable missions: start/step/resumed/done events; state() folds
pulse       staleness + supersession report
PackRegistry domain stores under packs/<name>/
```

## The epistemic contract

- **Support grades**: `measured > inferred > reported` (weights 1.0 / 0.6 / 0.4).
- **Retrieval**: query coverage — hits(questionTokens)/questionTokens × support.
  Thresholds: supported ≥ 0.60, weak ≥ 0.45, else UNKNOWN. One shared noun
  cannot carry an answer (coverage 0.25 fails); a paraphrase can.
- **Evidence gate**: the best match must carry ≥ 1 evidence ref, or the answer
  is UNKNOWN with that claim named as `nearest`. Hearsay never answers.
- **Authority**: `owner`/`lead` commit; `agent`/`watcher` proposals are
  recorded and their commit attempts denied — the denial is an event.
- **Sensitivity**: `private` claims are filtered from agent/watcher reads at
  the store boundary (`canSee`).

## Deliberate limits

- Retrieval is token coverage, not embeddings — measurable, explainable, and
  honest about being v0.1. An embedding retriever that preserves the UNKNOWN
  gates is the intended upgrade path.
- The `keel` runner is a library, not a supervisor: the *user* of the library
  demonstrates kill/resume by killing the process. A mission supervisor that
  does this automatically is a planned integration, not core.
- No server, no protocol, no LLM. Collectors are functions you supply.

## Provenance of this project

Clean-room implementation written for this repository. The conceptual model
(knowledge with epistemics, governed learning, durable missions) reflects
patterns from the author's private agent tooling, reimplemented from scratch;
no private code, data, or telemetry is included, and the demo domain
(probe MNEMOSYNE-7) is fiction.
