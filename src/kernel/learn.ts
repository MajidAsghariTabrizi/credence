/**
 * learn(): governed knowledge change. Agents may propose; only owner/lead
 * commit. Supersede never erases — the old claim stays, marked.
 */
import { randomUUID } from 'node:crypto'
import type { Caller, Delta, Event, EvidenceRef } from './types.ts'
import { roleOf, type ClaimStore } from './store.ts'

export interface LearnResult {
  readonly ok: boolean
  readonly denied?: boolean
  readonly reason?: string
  readonly proposalId?: string
  readonly claimId?: string
}

function now(): string { return new Date().toISOString() }

/** Worker/watcher path: record the proposal, deny the commit. */
export function propose(store: ClaimStore, delta: Delta, caller: Caller): LearnResult {
  const role = roleOf(caller)
  const id = 'p_' + randomUUID().slice(0, 8)
  if (role === 'owner' || role === 'lead') {
    // Authorized roles commit directly (their proposal IS the commit).
    store.append({ t: 'learning-proposed', at: now(), proposal: { id, caller, delta, at: now(), state: 'pending' } })
    const applied = applyDelta(store, delta)
    if (!applied.ok) return applied
    store.append({ t: 'learning-committed', at: now(), proposalId: id, by: caller })
    return applied.claimId === undefined ? { ok: true, proposalId: id } : { ok: true, proposalId: id, claimId: applied.claimId }
  }
  store.append({ t: 'learning-proposed', at: now(), proposal: { id, caller, delta, at: now(), state: 'pending' } })
  store.append({
    t: 'learning-denied', at: now(), proposalId: id, by: caller,
    reason: `role ${role} may propose learning but not commit durable knowledge`,
  })
  return { ok: false, denied: true, proposalId: id, reason: `DENIED: ${role} cannot commit. An owner or lead must approve proposal ${id}.` }
}

/** Owner/lead approving a pending proposal. */
export function commitProposal(store: ClaimStore, proposalId: string, caller: Caller): LearnResult {
  if (roleOf(caller) !== 'owner' && roleOf(caller) !== 'lead') {
    return { ok: false, denied: true, reason: `DENIED: ${roleOf(caller)} cannot approve learning` }
  }
  const proposal = store.proposals().get(proposalId)
  if (proposal === undefined) return { ok: false, reason: `no proposal ${proposalId}` }
  if (proposal.state !== 'pending') return { ok: false, reason: `proposal ${proposalId} already ${proposal.state}` }
  const applied = applyDelta(store, proposal.delta)
  if (!applied.ok) return applied
  store.append({ t: 'learning-committed', at: now(), proposalId, by: caller })
  return applied.claimId === undefined ? { ok: true, proposalId } : { ok: true, proposalId, claimId: applied.claimId }
}

function applyDelta(store: ClaimStore, delta: Delta): LearnResult {
  const at = now()
  if (delta.kind === 'add-claim') {
    if (delta.text === undefined || delta.basis === undefined) return { ok: false, reason: 'add-claim needs text and basis' }
    const id = 'c_' + randomUUID().slice(0, 8)
    // The claim enters with empty evidence; the evidence event adds the link,
    // so the fold never double-counts and provenance reads from the log alone.
    const claim = {
      id, text: delta.text, tags: delta.tags ?? [], support: delta.support ?? 'reported', state: 'active' as const,
      basis: delta.basis, evidence: [], sensitivity: 'public' as const,
      createdAt: at, verifiedAt: at, supersededBy: [],
    }
    store.append({ t: 'claim-added', at, claim })
    if (delta.evidence !== undefined) {
      store.append({ t: 'evidence-added', at, claimId: id, evidence: delta.evidence as EvidenceRef })
    }
    return { ok: true, claimId: id }
  }
  if (delta.kind === 'add-evidence') {
    if (delta.claimId === undefined || delta.evidence === undefined) return { ok: false, reason: 'add-evidence needs claimId and evidence' }
    store.append({ t: 'evidence-added', at, claimId: delta.claimId, evidence: delta.evidence as EvidenceRef })
    return { ok: true, claimId: delta.claimId }
  }
  if (delta.kind === 'supersede') {
    if (delta.oldId === undefined || delta.newId === undefined) return { ok: false, reason: 'supersede needs oldId and newId' }
    store.append({ t: 'contradiction-raised', at, claimIds: [delta.oldId, delta.newId], note: delta.basis ?? 'counter-evidence' })
    store.append({ t: 'claim-superseded', at, oldId: delta.oldId, newId: delta.newId })
    return { ok: true, claimId: delta.newId }
  }
  return { ok: false, reason: 'unknown delta kind' }
}

/**
 * investigate(): the escalation path for UNKNOWN answers. Collectors are
 * deterministic evidence sources (probes, tests, computation). Their findings
 * split into durable candidates (commit them via learn) and ephemeral
 * observations (never commit — a measured value is wrong tomorrow).
 */
export interface Finding {
  readonly durableCandidates: Delta[]
  readonly ephemeralObservations: readonly { readonly summary: string; readonly at: string }[]
}

export function investigate(
  store: ClaimStore,
  question: string,
  collectors: readonly ((question: string) => Finding)[],
): Finding {
  let merged: Finding = { durableCandidates: [], ephemeralObservations: [] }
  for (const collect of collectors) {
    const f = collect(question)
    merged = {
      durableCandidates: [...merged.durableCandidates, ...f.durableCandidates],
      ephemeralObservations: [...merged.ephemeralObservations, ...f.ephemeralObservations],
    }
  }
  return merged
}
