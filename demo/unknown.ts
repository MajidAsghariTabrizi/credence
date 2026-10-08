/**
 * Moment 01 — "I DON'T KNOW": ask about the hydrazine secondary loop with no
 * durable evidence anywhere. The runtime answers UNKNOWN, on purpose, and
 * says exactly why — the hearsay claim exists but carries zero evidence.
 */
import { rmSync } from 'node:fs'
import { ClaimStore } from '../src/kernel/store.ts'
import { ask } from '../src/kernel/ask.ts'
import { PACK_NAME, demoRoot, seed } from './seed.ts'

export function run(): void {
  rmSync(demoRoot(), { recursive: true, force: true })
  const store = new ClaimStore(`${demoRoot()}/packs/${PACK_NAME}`)
  seed(store)

  const q = 'is the hydrazine secondary loop primed?'
  console.log('GROUND CONTROL — ask:', q)
  console.log('─'.repeat(72))
  const answer = ask(store, q, 'owner')
  if (answer.state === 'unknown') {
    console.log('STATE:   UNKNOWN')
    console.log('WHY:     ' + answer.why)
    if (answer.nearest !== null) {
      console.log('NEAREST: ' + answer.nearest.id + '  "' + answer.nearest.text + '"  score=' + answer.nearest.score)
      console.log('         (reported hearsay — 0 evidence refs — below the evidence threshold)')
    }
    console.log()
    console.log('No evidence, no answer. UNKNOWN is a first-class state, not a failure to guess.')
  } else {
    console.log(JSON.stringify(answer, null, 2))
  }
  console.log()
  // Contrast: a measured, evidenced question answers firmly.
  const known = ask(store, 'when does the Ka-band uplink window open?', 'owner')
  console.log('CONTROL — ask: "when does the Ka-band uplink window open?"')
  if (known.state !== 'unknown') {
    console.log(`STATE:   ${known.state.toUpperCase()}  score=${known.score}`)
    console.log(`CLAIM:   "${known.claim.text}"`)
    console.log(`SUPPORT: ${known.claim.support} · BASIS: ${known.claim.basis}`)
    console.log(`EVIDENCE: ${known.claim.evidence.length} ref(s)`)
  }
}
