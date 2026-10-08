/**
 * Append-only claim store: the event log IS the database. The current claim
 * set is always a pure fold of the log, so history is immutable by
 * construction and supersession is visible forever.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Caller, Claim, Event, Role } from './types.ts'

export class ClaimStore {
  readonly events: Event[] = []
  private readonly file: string

  constructor(storeDir: string) {
    mkdirSync(storeDir, { recursive: true })
    this.file = join(storeDir, 'events.jsonl')
    if (existsSync(this.file)) {
      for (const line of readFileSync(this.file, 'utf8').split('\n')) {
        if (line.trim() === '') continue
        this.events.push(JSON.parse(line) as Event)
      }
    }
  }

  append(event: Event): void {
    this.events.push(event)
    appendFileSync(this.file, JSON.stringify(event) + '\n', 'utf8')
  }

  /** Fold the log into the current claim set. */
  claims(): Map<string, Claim> {
    const claims = new Map<string, Claim>()
    for (const e of this.events) {
      if (e.t === 'claim-added') claims.set(e.claim.id, structuredClone(e.claim))
      else if (e.t === 'claim-superseded') {
        const old = claims.get(e.oldId)
        if (old !== undefined) {
          old.state = 'superseded'
          old.supersededBy = [...old.supersededBy, e.newId]
        }
      } else if (e.t === 'claim-disputed') {
        const c = claims.get(e.claimId)
        if (c !== undefined) c.state = 'disputed'
      } else if (e.t === 'evidence-added') {
        const c = claims.get(e.claimId)
        if (c !== undefined) c.evidence = [...c.evidence, e.evidence.id]
      }
    }
    return claims
  }

  evidence(): Map<string, import('./types.ts').EvidenceRef> {
    const out = new Map<string, import('./types.ts').EvidenceRef>()
    for (const e of this.events) if (e.t === 'evidence-added') out.set(e.evidence.id, e.evidence)
    return out
  }

  proposals(): Map<string, import('./types.ts').Proposal> {
    const out = new Map<string, import('./types.ts').Proposal>()
    for (const e of this.events) {
      if (e.t === 'learning-proposed') out.set(e.proposal.id, structuredClone(e.proposal))
      else if (e.t === 'learning-committed') {
        const p = out.get(e.proposalId)
        if (p !== undefined) p.state = 'committed'
      }
      // learning-denied records a refused COMMIT ATTEMPT; the proposal stays
      // pending — denial is not rejection, it is the authority gate working.
    }
    return out
  }

  /** Events that touched one claim, oldest first — the provenance chain. */
  history(claimId: string): Event[] {
    return this.events.filter(e =>
      (e.t === 'claim-added' && e.claim.id === claimId)
      || (e.t === 'evidence-added' && e.claimId === claimId)
      || (e.t === 'claim-disputed' && e.claimId === claimId)
      || (e.t === 'claim-superseded' && (e.oldId === claimId || e.newId === claimId))
      || (e.t === 'contradiction-raised' && e.claimIds.includes(claimId)))
  }
}

/** The authority model: who may commit durable knowledge. */
export function roleOf(caller: Caller): Role {
  if (caller === 'owner') return 'owner'
  if (caller.startsWith('lead:')) return 'lead'
  if (caller.startsWith('agent:')) return 'agent'
  return 'watcher'
}

/** Private claims are never returned to agents or watchers. */
export function canSee(caller: Caller, claim: Claim): boolean {
  return claim.sensitivity === 'public' || roleOf(caller) === 'owner' || roleOf(caller) === 'lead'
}
