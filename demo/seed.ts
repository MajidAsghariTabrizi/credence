/**
 * Synthetic demo domain: MNEMOSYNE-7, a fictional deep-space probe, and its
 * ground-control knowledge pack. All data is invented from zero — no private
 * telemetry, no real systems.
 */
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Delta, EvidenceRef } from '../src/kernel/types.ts'
import { propose } from '../src/kernel/learn.ts'
import type { ClaimStore } from '../src/kernel/store.ts'

export const PACK_NAME = 'ground-control'

export function demoRoot(): string {
  return join(process.cwd(), '.credence-demo')
}

export function ev(id: string, kind: EvidenceRef['kind'], summary: string, at: string): EvidenceRef {
  return { id, kind, summary, at }
}

/** Seed the ground-control pack with its starting knowledge; returns the minted id map. */
export function seed(store: ClaimStore): Record<string, string> {
  const T0 = '2031-03-02T09:00:00Z'
  const claims: { id: string; text: string; support: 'measured' | 'inferred' | 'reported'; basis: string; evidence: EvidenceRef[] }[] = [
    {
      id: 'c_drift03', text: 'MNEMOSYNE-7 star tracker drifts 0.3 degrees per sol', support: 'measured',
      basis: 'pre-firmware-2.1 calibration run GC-CAL-0042',
      evidence: [ev('e_cal0042', 'calibration', 'GC-CAL-0042: 14-sol drift series, slope 0.31 deg/sol', T0)],
    },
    {
      id: 'c_uplink', text: 'Ka-band uplink window opens 04:20 to 05:05 UTC daily', support: 'measured',
      basis: 'DSN schedule allocation DSN-7712',
      evidence: [ev('e_dsn7712', 'log', 'DSN-7712 allocation table, weekly rotation', T0)],
    },
    {
      id: 'c_battery', text: 'battery A degradation is 0.02 percent per sol', support: 'measured',
      basis: 'telemetry regression over 400 sols',
      evidence: [ev('e_bat400', 'probe-reading', '400-sol coulomb-count regression, r2=0.98', T0)],
    },
    {
      id: 'c_dust', text: 'seasonal dust opacity peaks around sol 610', support: 'inferred',
      basis: 'orbital climatology model v3 projection',
      evidence: [ev('e_clim3', 'computation', 'climatology model v3 ensemble, 61 members', T0)],
    },
    {
      id: 'c_hydrazine_rumor', text: 'hydrazine secondary loop may be primed', support: 'reported',
      basis: 'relay operator hearsay, sol 588 voice loop',
      evidence: [],
    },
  ]
  const ids: Record<string, string> = {}
  for (const c of claims) {
    const delta: Delta = { kind: 'add-claim', text: c.text, basis: c.basis, support: c.support, tags: ['probe'] }
    let minted: string | undefined
    if (c.evidence.length > 0) {
      const first = c.evidence[0]!
      const withEvidence: Delta = { ...delta, evidence: first }
      minted = propose(store, withEvidence, 'owner').claimId
      for (const e of c.evidence.slice(1)) propose(store, { kind: 'add-evidence', claimId: minted!, evidence: e as import('../src/kernel/types.ts').EvidenceRef }, 'owner')
    } else {
      minted = propose(store, delta, 'owner').claimId
    }
    ids[c.id] = minted!
  }
  // pack meta
  const metaDir = join(demoRoot(), 'packs', PACK_NAME)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'pack.json'), JSON.stringify({
    name: PACK_NAME, domain: 'hub', description: 'MNEMOSYNE-7 ground control (synthetic demo domain)',
  }, null, 2) + '\n', 'utf8')
  return ids
}
