/**
 * Moment 04 — "I LEARNED — BUT I DIDN'T GIVE MYSELF PERMISSION": the nav
 * agent runs a procedure, captures the outcome, proposes it as durable
 * learning as a WORKER — DENIED — and the owner commits it. Later, the
 * learned procedure is retrieved and reused by the same worker.
 */
import { rmSync } from 'node:fs'
import { ClaimStore } from '../src/kernel/store.ts'
import { ask } from '../src/kernel/ask.ts'
import { commitProposal, propose } from '../src/kernel/learn.ts'
import { PACK_NAME, demoRoot, seed } from './seed.ts'

export function run(): void {
  rmSync(demoRoot(), { recursive: true, force: true })
  const store = new ClaimStore(`${demoRoot()}/packs/${PACK_NAME}`)
  seed(store)

  console.log('GROUND CONTROL — deep-spin star-tracker recalibration (procedure)')
  console.log('─'.repeat(72))
  console.log('[agent:nav] runs deep-spin calibration procedure… it works (14 min, slope stable)')
  console.log()
  console.log('[agent:nav] outcome captured. proposing durable learning as a WORKER:')
  const attempt = propose(store, {
    kind: 'add-claim',
    text: 'deep-spin recalibration procedure: spin 2 rpm for 3 sols, then re-fit drift slope — restores tracker accuracy',
    basis: 'successful run on sol 589 (14 min operator time)',
    support: 'measured',
    tags: ['procedure', 'calibration'],
    evidence: { id: 'e_run589', kind: 'test', summary: 'sol 589 deep-spin run: post-fit residual 0.003 deg, 14 min wall', at: '2031-03-05T11:00:00Z' },
  }, 'agent:nav')
  console.log(`          ${attempt.reason ?? 'committed'}`)
  console.log(`          proposal recorded: ${attempt.proposalId}  (state: pending — awaiting authority)`)
  console.log()
  console.log('[owner] reviews the proposal (evidence attached: yes) and COMMITS it:')
  const committed = commitProposal(store, attempt.proposalId!, 'owner')
  console.log(`          ok=${committed.ok}  claimId=${committed.claimId}`)
  console.log()
  console.log('[agent:nav] later, on sol 640 — ask: "what is the deep-spin recalibration procedure?"')
  const reuse = ask(store, 'what is the deep-spin recalibration procedure?', 'agent:nav')
  if (reuse.state !== 'unknown') {
    console.log(`          answer: ${reuse.state.toUpperCase()} — "${reuse.claim.text}"`)
    console.log(`          the worker now reuses learned knowledge it was DENIED the right to teach itself.`)
  }
  console.log()
  console.log('Learning ≠ uncontrolled self-modification. Agents propose. Authority commits.')
}
