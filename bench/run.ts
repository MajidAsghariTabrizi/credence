/**
 * Reproducible benchmark: honest synthetic measurements over generated
 * fixtures. No private data, no private numbers. Run: npm run bench
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { ClaimStore } from '../src/kernel/store.ts'
import { ask } from '../src/kernel/ask.ts'
import { propose } from '../src/kernel/learn.ts'

const N_CLAIMS = 200
const N_QUERIES = 120

/** Deterministic pseudo-random so results reproduce exactly. */
function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

interface Fixture {
  store: ClaimStore
  questions: { q: string; expectedId: string | null }[]
}

function build(): Fixture {
  const rand = rng(42)
  const dir = mkdtempSync(join(tmpdir(), 'credence-bench-'))
  const store = new ClaimStore(join(dir, 'pack'))
  const nouns = ['thruster', 'antenna', 'battery', 'gyroscope', 'radiator', 'sensor', 'valve', 'transponder', 'bearing', 'coil', 'panel', 'actuator', 'filter', 'pump', 'lens', 'mirror', 'cable', 'relay', 'seal', 'wheel']
  const props = ['drift rate', 'temperature limit', 'vibration band', 'power draw', 'calibration slope', 'duty cycle', 'idle current', 'mass', 'resonance frequency', 'leak rate', 'wear margin', 'latency', 'gain', 'offset', 'noise floor']
  const truth = new Map<string, string>()
  for (let i = 0; i < N_CLAIMS; i++) {
    const n = nouns[Math.floor(rand() * nouns.length)]!
    const p = props[Math.floor(rand() * props.length)]!
    const v = (rand() * 10).toFixed(2)
    const text = `the ${n} ${p} is ${v} units in nominal mode`
    const r = propose(store, {
      kind: 'add-claim', text, basis: 'synthetic fixture', support: 'measured',
      evidence: { id: `e_b${i}`, kind: 'probe-reading', summary: `fixture ${i}`, at: new Date().toISOString() },
    }, 'owner')
    if (r.claimId !== undefined) truth.set(`${n}|${p}`, r.claimId)
  }
  // paraphrase queries: half paraphrased hits, half unanswerable
  const questions: { q: string; expectedId: string | null }[] = []
  const keys = [...truth.keys()]
  for (let i = 0; i < N_QUERIES; i++) {
    if (i % 2 === 0) {
      const [n, p] = keys[Math.floor(rand() * keys.length)]!.split('|')
      const forms = [`what is the ${n} ${p}?`, `${n} ${p} nominal?`, `nominal ${n} ${p} value`]
      questions.push({ q: forms[i % 3]!, expectedId: truth.get(`${n}|${p}`) ?? null })
    } else {
      questions.push({ q: `who won the ${nouns[Math.floor(rand() * 10)]!} lottery in 1999?`, expectedId: null })
    }
  }
  return { store, questions }
}

function run(): void {
  const { store, questions } = build()
  let paraphraseHits = 0
  let paraphraseTotal = 0
  let unknownCorrect = 0
  let unknownTotal = 0
  let wrongAnswer = 0
  const latencies: number[] = []
  for (const { q, expectedId } of questions) {
    const t0 = performance.now()
    const answer = ask(store, q, 'owner')
    latencies.push(performance.now() - t0)
    if (expectedId === null) {
      unknownTotal += 1
      if (answer.state === 'unknown') unknownCorrect += 1
      else wrongAnswer += 1
    } else {
      paraphraseTotal += 1
      if (answer.state !== 'unknown' && answer.claim.id === expectedId) paraphraseHits += 1
    }
  }
  latencies.sort((a, b) => a - b)
  const p = (q: number): number => latencies[Math.floor(q * latencies.length)]!
  const report = {
    claims: store.claims().size,
    queries: questions.length,
    paraphraseRecall: Number((paraphraseHits / paraphraseTotal).toFixed(3)),
    unknownDetection: Number((unknownCorrect / unknownTotal).toFixed(3)),
    hallucinatedOnUnknown: wrongAnswer,
    askLatencyMs: { p50: Number(p(0.5).toFixed(2)), p95: Number(p(0.95).toFixed(2)) },
    runtime: `node ${process.version} ${process.platform}`,
    methodology: '200 deterministic synthetic claims, one truth per component+property (seed 42); 120 queries: 60 paraphrase hits + 60 unanswerable; retrieval = query-coverage x support weight; thresholds strong=0.60 weak=0.45',
  }
  console.log(JSON.stringify(report, null, 2))
}

run()
