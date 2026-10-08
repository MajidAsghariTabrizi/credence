/**
 * Kernel acceptance tests — every headline claim of the README has a test.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ClaimStore, canSee, roleOf } from '../src/kernel/store.ts'
import { ask } from '../src/kernel/ask.ts'
import { commitProposal, propose } from '../src/kernel/learn.ts'
import { pulse } from '../src/kernel/pulse.ts'
import { Keel } from '../src/kernel/keel.ts'

function fresh(): { dir: string; store: ClaimStore } {
  const dir = mkdtempSync(join(tmpdir(), 'credence-'))
  return { dir, store: new ClaimStore(join(dir, 'pack')) }
}

function addClaim(store: ClaimStore, text: string, caller: Parameters<typeof propose>[2] = 'owner', evidence = true) {
  if (evidence) {
    return propose(store, {
      kind: 'add-claim', text, basis: 'test basis', support: 'measured',
      evidence: { id: 'e_' + Math.random().toString(36).slice(2, 8), kind: 'test', summary: 'test evidence', at: new Date().toISOString() },
    }, caller)
  }
  return propose(store, { kind: 'add-claim', text, basis: 'test basis', support: 'measured' }, caller)
}

test('ask returns UNKNOWN when no evidence exists', () => {
  const { dir, store } = fresh()
  addClaim(store, 'the gantry arm is 2.1 meters long', 'owner', false)
  const answer = ask(store, 'how long is the gantry arm?')
  assert.equal(answer.state, 'unknown')
  assert.match(answer.why, /no evidence|threshold/)
  rmSync(dir, { recursive: true, force: true })
})

test('ask answers supported with support, basis, evidence count', () => {
  const { dir, store } = fresh()
  addClaim(store, 'the gantry arm is 2.1 meters long')
  const answer = ask(store, 'how long is the gantry arm?')
  assert.notEqual(answer.state, 'unknown')
  if (answer.state !== 'unknown') {
    assert.equal(answer.claim.support, 'measured')
    assert.equal(answer.claim.evidence.length, 1)
    assert.ok(answer.claim.basis.length > 0)
  }
  rmSync(dir, { recursive: true, force: true })
})

test('contradiction supersedes without erasing history', () => {
  const { dir, store } = fresh()
  const oldId = addClaim(store, 'thruster B specific impulse is 210 s').claimId!
  const newId = addClaim(store, 'thruster B specific impulse is 305 s after overhaul').claimId!
  propose(store, { kind: 'supersede', oldId, newId, basis: 'bench test contradicts old spec' }, 'owner')
  const claims = store.claims()
  assert.equal(claims.get(oldId)!.state, 'superseded')
  assert.deepEqual(claims.get(oldId)!.supersededBy, [newId])
  assert.equal(claims.get(newId)!.state, 'active')
  // history intact
  const events = store.history(oldId)
  assert.ok(events.some(e => e.t === 'claim-added'))
  assert.ok(events.some(e => e.t === 'claim-superseded'))
  // ask now returns the new truth
  const answer = ask(store, 'what is thruster B specific impulse?')
  if (answer.state !== 'unknown') assert.equal(answer.claim.id, newId)
  rmSync(dir, { recursive: true, force: true })
})

test('authority: worker agents cannot commit durable knowledge', () => {
  const { dir, store } = fresh()
  const denied = addClaim(store, 'I taught myself a new truth', 'agent:nav')
  assert.equal(denied.ok, false)
  assert.equal(denied.denied, true)
  assert.match(denied.reason!, /DENIED/)
  // store unchanged: no claim added
  assert.equal(store.claims().size, 0)
  // but the proposal is pending for review
  const proposals = [...store.proposals().values()]
  assert.equal(proposals.length, 1)
  assert.equal(proposals[0]!.state, 'pending')
  // owner commits it
  const committed = commitProposal(store, denied.proposalId!, 'owner')
  assert.equal(committed.ok, true)
  assert.equal(store.claims().size, 1)
  rmSync(dir, { recursive: true, force: true })
})

test('authority: watchers cannot approve', () => {
  const { dir, store } = fresh()
  const denied = addClaim(store, 'watcher proposal', 'watcher')
  assert.equal(denied.denied, true)
  const alsoDenied = commitProposal(store, denied.proposalId!, 'watcher')
  assert.equal(alsoDenied.ok, false)
  rmSync(dir, { recursive: true, force: true })
})

test('sensitivity: private claims are invisible to agents', () => {
  const { dir, store } = fresh()
  const r = propose(store, {
    kind: 'add-claim', text: 'secret fuel reserve is 22 kg', basis: 'test', support: 'measured',
  }, 'owner')
  // owner path is public by default in this minimal core; sensitivity is enforced on read:
  const claims = store.claims()
  const claim = claims.get(r.claimId!)!
  assert.ok(!canSee('agent:nav', { ...claim, sensitivity: 'private' }))
  assert.ok(canSee('agent:nav', claim))
  rmSync(dir, { recursive: true, force: true })
})

test('roles parse from caller strings', () => {
  assert.equal(roleOf('owner'), 'owner')
  assert.equal(roleOf('lead:ops'), 'lead')
  assert.equal(roleOf('agent:nav'), 'agent')
  assert.equal(roleOf('watcher'), 'watcher')
})

test('mission state survives across processes (fold from disk)', () => {
  const { dir } = fresh()
  const missionsDir = join(dir, 'missions')
  const keel1 = new Keel(missionsDir)
  keel1.start('m1', 'test objective', 4)
  keel1.step('m1', 1, 'first')
  // NEW process, NEW Keel instance — only durable state exists
  const keel2 = new Keel(missionsDir)
  const state = keel2.state('m1')
  assert.notEqual(state, null)
  assert.equal(state!.completedSteps, 1)
  assert.equal(state!.done, false)
  keel2.resumed('m1', 1)
  keel2.step('m1', 2, 'second')
  keel2.done('m1')
  const final = new Keel(missionsDir).state('m1')
  assert.equal(final!.done, true)
  assert.equal(final!.interruptions, 1)
  rmSync(dir, { recursive: true, force: true })
})

test('pulse reports staleness and supersessions', () => {
  const { dir, store } = fresh()
  const a = addClaim(store, 'claim alpha').claimId!
  const b = addClaim(store, 'claim beta revised').claimId!
  propose(store, { kind: 'supersede', oldId: a, newId: b, basis: 'x' }, 'owner')
  const report = pulse(store, 30)
  assert.equal(report.active, 1)
  assert.equal(report.superseded, 1)
  assert.equal(report.recentSupersessions.length, 1)
  rmSync(dir, { recursive: true, force: true })
})
