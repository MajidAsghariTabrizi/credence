/**
 * Moment 02 — "I CHANGED MY MIND": firmware 2.1 recalibration contradicts the
 * old star-tracker drift belief. The old truth is superseded — never erased —
 * and the full chain stays inspectable: old claim, counter-evidence,
 * contradiction event, new active claim, superseded history.
 */
import { rmSync } from 'node:fs'
import { ClaimStore } from '../src/kernel/store.ts'
import { ask } from '../src/kernel/ask.ts'
import { propose } from '../src/kernel/learn.ts'
import { PACK_NAME, demoRoot, seed } from './seed.ts'

export function run(): void {
  rmSync(demoRoot(), { recursive: true, force: true })
  const store = new ClaimStore(`${demoRoot()}/packs/${PACK_NAME}`)
  const ids = seed(store)
  const oldDriftId = ids.c_drift03!

  console.log('GROUND CONTROL — firmware 2.1 recalibration arrives')
  console.log('─'.repeat(72))
  console.log('BEFORE  claim ' + ids.c_drift03 + ': "MNEMOSYNE-7 star tracker drifts 0.3 degrees per sol"')
  const before = ask(store, 'how much does the star tracker drift per sol?', 'owner')
  if (before.state !== 'unknown') console.log(`        answer: ${before.state.toUpperCase()} — "${before.claim.text}" (support=${before.claim.support})`)
  console.log()

  // New evidence: the post-recalibration series contradicts the old slope.
  const T1 = '2031-03-04T14:00:00Z'
  const newClaim = propose(store, {
    kind: 'add-claim',
    text: 'MNEMOSYNE-7 star tracker drifts 0.02 degrees per sol after firmware 2.1 recalibration',
    basis: 'post-firmware-2.1 calibration run GC-CAL-0051',
    support: 'measured',
    tags: ['probe'],
    evidence: { id: 'e_cal0051', kind: 'calibration', summary: 'GC-CAL-0051: 21-sol drift series post-2.1, slope 0.019 deg/sol, r2=0.99', at: T1 },
  }, 'owner').claimId!
  propose(store, {
    kind: 'supersede',
    oldId: oldDriftId,
    newId: newClaim!,
    basis: 'GC-CAL-0051 contradicts GC-CAL-0042 by 15x; recalibration is the causal explanation',
  }, 'owner')

  console.log('EVIDENCE  GC-CAL-0051: 21-sol drift series post-firmware-2.1, slope 0.019 deg/sol')
  console.log('CONTRADICTS GC-CAL-0042 (slope 0.31 deg/sol)')
  console.log()
  const after = ask(store, 'how much does the star tracker drift per sol?', 'owner')
  console.log('AFTER   ask: "how much does the star tracker drift per sol?"')
  if (after.state !== 'unknown') {
    console.log(`        answer: ${after.state.toUpperCase()} — "${after.claim.text}"`)
  }
  console.log()
  console.log('HISTORY (immutable — nothing was deleted):')
  for (const e of store.history(oldDriftId)) {
    if (e.t === 'claim-added') console.log(`  ${e.at}  claim-added        "${e.claim.text}"`)
    else if (e.t === 'contradiction-raised') console.log(`  ${e.at}  contradiction      ${e.claimIds[0]} ↔ ${e.claimIds[1]} — ${e.note.slice(0, 48)}…`)
    else if (e.t === 'claim-superseded') console.log(`  ${e.at}  SUPERSEDED        ${e.oldId} → ${e.newId}`)
  }
  const old = store.claims().get(oldDriftId)
  if (old !== undefined) {
    console.log()
    console.log(`OLD CLAIM NOW: state=${old.state}  supersededBy=[${old.supersededBy.join(', ')}]  — still readable, forever`)
  }
  console.log()
  console.log('It changed its mind without deleting its past.')
}
