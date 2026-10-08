/**
 * Credence kernel types: the durable cognitive contract.
 *
 * Knowledge is a set of claims. Every claim carries its epistemics — graded
 * support, basis, evidence, freshness, and sensitivity — and history is an
 * append-only event log: corrections supersede, nothing is erased.
 */

/** Graded support: how the claim came to be held. */
export type Support = 'measured' | 'inferred' | 'reported'

/** Lifecycle of a claim. Disputed claims stay active until resolved. */
export type ClaimState = 'active' | 'superseded' | 'disputed'

/** Sensitivity: private claims are never returned to worker agents. */
export type Sensitivity = 'public' | 'private'

/** Caller identity: determines what the caller may learn and commit. */
export type Caller = 'owner' | `lead:${string}` | `agent:${string}` | 'watcher'

/** The four authority roles. */
export type Role = 'owner' | 'lead' | 'agent' | 'watcher'

export interface EvidenceRef {
  readonly id: string
  readonly kind: 'probe-reading' | 'calibration' | 'log' | 'computation' | 'test' | 'observation'
  readonly summary: string
  readonly at: string
}

export interface Claim {
  readonly id: string
  readonly text: string
  readonly tags: readonly string[]
  readonly support: Support
  state: ClaimState
  readonly basis: string
  /** Evidence ids; mutable in the fold (the log is the source of truth). */
  evidence: string[]
  readonly sensitivity: Sensitivity
  readonly createdAt: string
  readonly verifiedAt: string
  /** Ids of claims that superseded this one; grows in the fold. */
  supersededBy: string[]
}

/** A proposed change to durable knowledge. */
export interface Delta {
  readonly kind: 'add-claim' | 'add-evidence' | 'supersede'
  readonly text?: string
  readonly basis?: string
  readonly support?: Support
  readonly tags?: readonly string[]
  readonly claimId?: string
  readonly evidence?: EvidenceRef
  readonly oldId?: string
  readonly newId?: string
}

/** Pending governed-learning proposal. */
export interface Proposal {
  readonly id: string
  readonly caller: Caller
  readonly delta: Delta
  readonly at: string
  state: 'pending' | 'committed' | 'denied'
}

export type Event =
  | { readonly t: 'claim-added'; readonly at: string; readonly claim: Claim }
  | { readonly t: 'evidence-added'; readonly at: string; readonly claimId: string; readonly evidence: EvidenceRef }
  | { readonly t: 'contradiction-raised'; readonly at: string; readonly claimIds: readonly [string, string]; readonly note: string }
  | { readonly t: 'claim-disputed'; readonly at: string; readonly claimId: string; readonly note: string }
  | { readonly t: 'claim-superseded'; readonly at: string; readonly oldId: string; readonly newId: string }
  | { readonly t: 'learning-proposed'; readonly at: string; readonly proposal: Proposal }
  | { readonly t: 'learning-committed'; readonly at: string; readonly proposalId: string; readonly by: Caller }
  | { readonly t: 'learning-denied'; readonly at: string; readonly proposalId: string; readonly by: Caller; readonly reason: string }

/** Mission events — the keel (durable mission runner) appends these. */
export type MissionEvent =
  | { readonly t: 'mission-started'; readonly at: string; readonly missionId: string; readonly objective: string; readonly totalSteps: number }
  | { readonly t: 'mission-step'; readonly at: string; readonly missionId: string; readonly step: number; readonly label: string; readonly pid: number }
  | { readonly t: 'mission-resumed'; readonly at: string; readonly missionId: string; readonly fromStep: number; readonly pid: number }
  | { readonly t: 'mission-done'; readonly at: string; readonly missionId: string }

export interface MissionState {
  readonly missionId: string
  readonly objective: string
  readonly totalSteps: number
  readonly completedSteps: number
  readonly done: boolean
  readonly lastPid: number | null
  readonly interruptions: number
}

/** Answer envelope for `ask`. */
export interface AskAnswerKnown {
  readonly state: 'supported' | 'weak'
  readonly claim: Claim
  readonly score: number
}
export interface AskAnswerUnknown {
  readonly state: 'unknown'
  readonly why: string
  readonly nearest: { readonly id: string; readonly text: string; readonly score: number } | null
}
export type AskAnswer = AskAnswerKnown | AskAnswerUnknown
