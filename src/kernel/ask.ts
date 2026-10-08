/**
 * ask(): graded retrieval over active claims. Insufficient evidence is
 * UNKNOWN — a first-class answer, not generated confidence.
 *
 * Retrieval rule: query coverage — the fraction of the question's content
 * tokens found in the claim, weighted by support grade. A single shared noun
 * cannot carry an answer (coverage 1/4 fails the weak threshold); a real
 * paraphrase covers most of the question.
 */
import type { AskAnswer, Caller, Claim, Support } from './types.ts'
import { canSee } from './store.ts'

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'of', 'on', 'in', 'and', 'or', 'to', 'it', 'does', 'do',
  'what', 'how', 'much', 'who', 'when', 'i', 'me', 'my', 'we',
])
const SUPPORT_WEIGHT: Record<Support, number> = { measured: 1, inferred: 0.6, reported: 0.4 }

export const THRESHOLD_STRONG = 0.6
export const THRESHOLD_WEAK = 0.45

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9°%.-]+/).filter(t => t !== '' && !STOP.has(t))
}

/** Query coverage weighted by support: hits(queryTokens) / queryTokens × support. */
export function scoreClaim(question: string, claim: Claim): number {
  const q = tokens(question)
  if (q.length === 0) return 0
  const c = new Set(tokens(claim.text))
  let hits = 0
  for (const t of q) if (c.has(t)) hits += 1
  return (hits / q.length) * SUPPORT_WEIGHT[claim.support]
}

export function ask(store: import('./store.ts').ClaimStore, question: string, caller: Caller = 'owner'): AskAnswer {
  let best: { claim: Claim; score: number } | null = null
  for (const claim of store.claims().values()) {
    if (claim.state !== 'active' || !canSee(caller, claim)) continue
    const score = scoreClaim(question, claim)
    if (best === null || score > best.score) best = { claim, score }
  }
  if (best === null) {
    return { state: 'unknown', why: 'no active claims visible to this caller', nearest: null }
  }
  if (best.claim.evidence.length === 0) {
    return {
      state: 'unknown',
      why: `closest claim "${best.claim.id}" carries no evidence`,
      nearest: { id: best.claim.id, text: best.claim.text, score: Number(best.score.toFixed(3)) },
    }
  }
  if (best.score < THRESHOLD_WEAK) {
    return {
      state: 'unknown',
      why: `best match scored ${best.score.toFixed(3)} below the evidence threshold ${THRESHOLD_WEAK}`,
      nearest: { id: best.claim.id, text: best.claim.text, score: Number(best.score.toFixed(3)) },
    }
  }
  return { state: best.score >= THRESHOLD_STRONG ? 'supported' : 'weak', claim: best.claim, score: Number(best.score.toFixed(3)) }
}
