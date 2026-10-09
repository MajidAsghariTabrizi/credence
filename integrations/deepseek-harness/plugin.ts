/**
 * credence — DeepSeek Harness tool plugin.
 *
 * Mounts a credence pack as agent tools:
 *   credence_ask    — graded retrieval; UNKNOWN is a first-class answer
 *   credence_learn  — propose durable knowledge (agents are DENIED commit
 *                     by design; proposals queue for the owner)
 *   credence_pulse  — staleness + supersession report
 *
 * Plugin shape per the public DSH extension cookbook: defineTool from
 * @deepseek-ai/dsh-tools, registered on ctx.tools (effect-based). This file
 * is the single source of the plugin; see README.md for install.
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ask } from './kernel/ask.ts'
import { propose } from './kernel/learn.ts'
import { pulse } from './kernel/pulse.ts'
import { ClaimStore } from './kernel/store.ts'
import { Keel } from './kernel/keel.ts'

export const name = 'credence'

export const inject = ['tools']

/** The agent's caller identity inside credence's authority model. */
const AGENT = 'agent:dsh' as const

export function apply(ctx: Context) {
  const home = process.env.CREDENCE_HOME ?? '.credence'
  const pack = process.env.CREDENCE_PACK ?? 'default'
  const store = new ClaimStore(`${home}/packs/${pack}`)
  const keel = new Keel(`${home}/missions`)

  ctx.tools.register(defineTool({
    name: 'credence_ask',
    description: 'Ask the durable knowledge ledger. Returns a graded answer '
      + '(supported/weak with support, basis, evidence count) or UNKNOWN with '
      + 'the reason and the nearest rejected claim. Use this before assuming.',
    parameters: {
      question: { type: 'string', required: true, description: 'Natural-language question over durable claims' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const answer = ask(store, args.question, AGENT)
      return answer.state === 'unknown'
        ? `UNKNOWN — ${answer.why}`
          + (answer.nearest !== null ? `\nnearest rejected: "${answer.nearest.text}" (score ${answer.nearest.score})` : '')
        : `${answer.state.toUpperCase()} (score ${answer.score}) — "${answer.claim.text}"\n`
          + `support: ${answer.claim.support} · basis: ${answer.claim.basis} · evidence: ${answer.claim.evidence.length} ref(s)`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'credence_learn',
    description: 'Propose a durable knowledge claim with evidence. Worker agents '
      + 'are DENIED commit by design — the proposal is recorded and waits for '
      + 'owner/lead approval. Report what was measured, not what was inferred.',
    parameters: {
      text: { type: 'string', required: true, description: 'The claim, stated as a checkable fact' },
      basis: { type: 'string', required: true, description: 'Where the claim comes from (run, test, computation)' },
      evidence_summary: { type: 'string', required: true, description: 'One-line evidence record' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const result = propose(store, {
        kind: 'add-claim', text: args.text, basis: args.basis, support: 'measured',
        evidence: { id: 'e_dsh_' + Date.now().toString(36), kind: 'test', summary: args.evidence_summary, at: new Date().toISOString() },
      }, AGENT)
      return result.ok
        ? `committed by ${AGENT} (authorized role)`
        : `${result.reason}\nproposal ${result.proposalId} is recorded and pending owner approval.`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'credence_pulse',
    description: 'Health readout of the knowledge ledger: active/superseded/disputed '
      + 'counts, stale claims, and recent supersessions.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const p = pulse(store)
      const missions = keel.state('default')
      return `claims: ${p.active} active · ${p.superseded} superseded · ${p.disputed} disputed`
        + (p.staleDays.length > 0 ? `\nstale (≥30d): ${p.staleDays.slice(0, 5).map(c => c.id).join(', ')}${p.staleDays.length > 5 ? ' …' : ''}` : '')
        + (missions !== null ? `\nmission default: ${missions.completedSteps}/${missions.totalSteps} steps, interruptions=${missions.interruptions}` : '')
    },
  }))
}
