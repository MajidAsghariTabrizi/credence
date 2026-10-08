/**
 * credence CLI: ask | explain | learn | investigate | pulse | status | mission | demo
 */
import { ClaimStore } from './kernel/store.ts'
import { ask } from './kernel/ask.ts'
import { commitProposal, investigate, propose } from './kernel/learn.ts'
import { pulse } from './kernel/pulse.ts'
import { PackRegistry } from './kernel/packs.ts'
import type { Caller, Delta } from './kernel/types.ts'

function root(): string {
  return process.env.CREDENCE_HOME !== undefined ? process.env.CREDENCE_HOME : `${process.cwd()}/.credence`
}

function registry(): PackRegistry { return new PackRegistry(`${root()}/packs`) }

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2)
  switch (cmd) {
    case 'ask': {
      const [pack, ...q] = rest
      if (pack === undefined) { console.error('usage: credence ask <pack> <question>'); process.exitCode = 1; break }
      const answer = ask(registry().store(pack), q.join(' '), 'owner')
      console.log(JSON.stringify(answer, null, 2))
      if (answer.state === 'unknown') process.exitCode = 3
      break
    }
    case 'explain': {
      const [pack, id] = rest
      if (pack === undefined || id === undefined) { console.error('usage: credence explain <pack> <claimId>'); process.exitCode = 1; break }
      const store = registry().store(pack)
      const claim = store.claims().get(id)
      if (claim === undefined) { console.error(`no claim ${id}`); process.exitCode = 1; break }
      console.log(JSON.stringify({ claim, history: store.history(id) }, null, 2))
      break
    }
    case 'learn': {
      // learn <pack> --caller <caller> --text "..." --basis "..." [--support measured]
      const [pack] = rest
      if (pack === undefined) { console.error('learn needs a pack'); process.exitCode = 1; break }
      const arg = (name: string): string | undefined => {
        const i = rest.indexOf(`--${name}`)
        return i >= 0 ? rest[i + 1] : undefined
      }
      const caller = (arg('caller') ?? 'owner') as Caller
      const text = arg('text')
      const basis = arg('basis')
      if (text === undefined || basis === undefined) { console.error('learn needs --text and --basis'); process.exitCode = 1; break }
      const delta: Delta = { kind: 'add-claim', text, basis, support: (arg('support') as Delta['support']) ?? 'reported' }
      const result = propose(registry().store(pack), delta, caller)
      console.log(JSON.stringify(result, null, 2))
      if (result.denied === true) process.exitCode = 5
      break
    }
    case 'approve': {
      const [pack, proposalId] = rest
      if (pack === undefined || proposalId === undefined) { console.error('usage: credence approve <pack> <proposalId>'); process.exitCode = 1; break }
      const result = commitProposal(registry().store(pack), proposalId, 'owner')
      console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'investigate': {
      const [pack, ...q] = rest
      if (pack === undefined) { console.error('usage: credence investigate <pack> <question>'); process.exitCode = 1; break }
      // Deterministic no-network collector: demonstrates the escalation shape.
      const finding = investigate(registry().store(pack), q.join(' '), [
        question => ({
          durableCandidates: [{
            kind: 'add-claim' as const,
            text: `investigated: ${question}`,
            basis: 'deterministic demo collector (no network in the default path)',
            support: 'inferred' as const,
          }],
          ephemeralObservations: [{ summary: 'measured values are ephemeral — never commit them', at: new Date().toISOString() }],
        }),
      ])
      console.log(JSON.stringify(finding, null, 2))
      break
    }
    case 'pulse': {
      const [pack] = rest
      if (pack === undefined) { console.error('usage: credence pulse <pack>'); process.exitCode = 1; break }
      console.log(JSON.stringify(pulse(registry().store(pack)), null, 2))
      break
    }
    case 'status': {
      const reg = registry()
      const out: Record<string, { claims: number; active: number; superseded: number }> = {}
      for (const p of reg.list()) {
        const claims = [...reg.store(p).claims().values()]
        out[p] = {
          claims: claims.length,
          active: claims.filter(c => c.state === 'active').length,
          superseded: claims.filter(c => c.state === 'superseded').length,
        }
      }
      console.log(JSON.stringify({ home: root(), packs: out }, null, 2))
      break
    }
    case 'demo': {
      const which = rest[0] ?? 'all'
      const { run: unknownRun } = await import('../demo/unknown.ts')
      const { run: contradictionRun } = await import('../demo/contradiction.ts')
      const { run: governedRun } = await import('../demo/governed.ts')
      const { run: killRun } = await import('../demo/kill.ts')
      if (which === 'unknown' || which === 'all') unknownRun()
      if (which === 'contradiction' || which === 'all') contradictionRun()
      if (which === 'governed' || which === 'all') governedRun()
      if (which === 'kill' || which === 'all') await killRun()
      break
    }
    default:
      console.log('credence — a durable cognitive runtime for long-running agents')
      console.log('usage: credence <ask|explain|learn|approve|investigate|pulse|status|demo> [pack] [args]')
  }
}

await main()
