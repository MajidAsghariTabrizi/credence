# credence × DeepSeek Harness

A real DSH tool plugin: mount a credence pack as agent tools.

| Tool | What the agent gets |
|---|---|
| `credence_ask` | Graded answer or **UNKNOWN with the reason** — never a guess |
| `credence_learn` | Propose durable knowledge — **DENIED commit by design**; proposals queue for the owner |
| `credence_pulse` | Ledger health: active/superseded/disputed, staleness, mission state |

The agent runs as caller `agent:dsh` inside credence's authority model, so it
can consult everything public and propose anything — but it cannot teach
itself. Approvals happen on the owner side (`credence approve <pack> <id>` or
the `approve` bridge command).

## Install

Credence is a zero-dependency package; the plugin is one file.

1. Clone credence next to your DSH profile or vendor it into your plugin tree:
   ```bash
   git clone https://github.com/MajidAsghariTabrizi/credence
   ```
2. Register the plugin with your DSH profile's patch layer (cordis patch row
   pointing at this file's compiled entry, or vendor it as a workspace
   package — see the DSH extension cookbook's "A tool plugin"):
   ```yaml
   # your cordis.patch.yml
   - id: credence
     disabled: false
   ```
   with the package resolvable as `credence` (path dependency works).
3. Point it at a pack:
   ```bash
   export CREDENCE_HOME=.credence      # store root (default)
   export CREDENCE_PACK=ground-control # pack name (default: default)
   ```

The plugin entry is `integrations/deepseek-harness/plugin.ts` (TypeScript,
runs on Node ≥ 22.6 type-stripping the same as the kernel).

## Try the governed-learning demo against the bridge

```bash
node integrations/deepseek-harness/harness-bridge.ts ask ground-control "how much does the star tracker drift?"
node integrations/deepseek-harness/harness-bridge.ts propose ground-control agent:dsh --text "..." --basis "..."
# → DENIED: agent cannot commit. Proposal recorded, awaiting owner.
node integrations/deepseek-harness/harness-bridge.ts approve ground-control <proposalId>
```

**Status: EXPERIMENTAL.** The plugin follows the public DSH extension API
(`defineTool` / `ctx.tools.register`) and the bridge is fully runnable, but it
has not been mounted inside a released DSH profile in CI — issue
[#6](https://github.com/MajidAsghariTabrizi/credence/issues/6) tracks the
first end-to-end mount. Independent project; not affiliated with DeepSeek.
