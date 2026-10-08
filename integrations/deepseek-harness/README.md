# DeepSeek Harness integration (experimental)

Expose a credence pack to a [DeepSeek Harness](https://github.com/) agent
session: the agent can consult the ledger (`ask`), inspect provenance
(`explain`), check staleness (`pulse`), and propose learning (`propose` —
which will be **correctly denied** if the caller is an agent; route commits
through an owner-side approval step).

Status: **EXPERIMENTAL** — the adapter is a thin programmatic client, not a
packaged plugin. It speaks credence's zero-dependency kernel API; the host
side (tool registration) follows DeepSeek Harness's client-plugin shape.

## Use

```bash
cd integrations/deepseek-harness
node harness-bridge.ts ask ground-control "how much does the star tracker drift?"
node harness-bridge.ts propose ground-control agent:nav --text "..." --basis "..."
```

Or from a harness client plugin (schematic):

```ts
import { register } from 'node:module' // your plugin runtime instead
import { ClaimStore } from '../../../src/kernel/store.ts'
import { ask } from '../../../src/kernel/ask.ts'
import { propose } from '../../../src/kernel/learn.ts'

const store = new ClaimStore('.credence/packs/ground-control')
// tool: brain_ask → const answer = ask(store, q, caller)
// tool: brain_learn → propose(store, delta, caller)  // agents are denied by design
```

The integration deliberately gives the agent **no** commit path: denials are
the feature. Approvals belong to the operator loop.

Unaffiliated with DeepSeek; this is a community integration target.
