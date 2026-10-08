/**
 * The mission worker — this is the process that gets KILLED. It appends each
 * step to the keel (durable mission state) as it completes it.
 */
import { Keel } from '../src/kernel/keel.ts'
import { demoRoot } from './seed.ts'

const missionId = process.argv[2] ?? 'm_science_backlog'
const stepArg = process.argv[3]
const keel = new Keel(`${demoRoot()}/missions`)
const state = keel.state(missionId)

const STEPS = [
  'spin up high-gain antenna',
  'queue sol-587 imagery block',
  'queue atmospheric spectrometry block',
  'compress science payload v2',
  'integrity-check payload CRC',
  'downlink burst 1 (Ka-band window 04:20)',
  'downlink burst 2',
  'verify ground receipt + close mission',
]

if (state === null) {
  keel.start(missionId, 'transmit MNEMOSYNE-7 science backlog to Earth', STEPS.length)
} else if (!state.done) {
  keel.resumed(missionId, state.completedSteps)
}

const from = stepArg !== undefined ? Number(stepArg) : (state?.completedSteps ?? 0) + 1
const total = state?.totalSteps ?? STEPS.length
for (let s = from; s <= total; s++) {
  // Do the step's work, then DURABLY record completion BEFORE announcing it.
  await new Promise(r => setTimeout(r, 350))
  keel.step(missionId, s, STEPS[s - 1]!)
  console.log(`[pid ${process.pid}] step ${s}/${total} done: ${STEPS[s - 1]}`)
}
keel.done(missionId)
console.log(`[pid ${process.pid}] MISSION COMPLETE: ${missionId}`)
