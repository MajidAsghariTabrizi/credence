/**
 * pulse(): staleness and health report over the claim set — what is going
 * stale, what is disputed, what superseded recently. Refusals are answers.
 */
import type { ClaimStore } from './store.ts'

export interface PulseReport {
  readonly active: number
  readonly superseded: number
  readonly disputed: number
  readonly staleDays: { readonly id: string; readonly text: string; readonly daysSinceVerified: number }[]
  readonly recentSupersessions: { readonly oldId: string; readonly newId: string; readonly at: string }[]
}

export function pulse(store: ClaimStore, staleAfterDays = 30): PulseReport {
  const claims = [...store.claims().values()]
  const now = Date.now()
  const staleDays = claims
    .filter(c => c.state === 'active')
    .map(c => ({ id: c.id, text: c.text, daysSinceVerified: Math.floor((now - Date.parse(c.verifiedAt)) / 86_400_000) }))
    .filter(c => c.daysSinceVerified >= staleAfterDays)
    .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified)
  const recentSupersessions = store.events
    .filter(e => e.t === 'claim-superseded')
    .slice(-5)
    .map(e => (e as { oldId: string; newId: string; at: string })
      ? { oldId: (e as { oldId: string }).oldId, newId: (e as { newId: string }).newId, at: (e as { at: string }).at }
      : { oldId: '', newId: '', at: '' })
  return {
    active: claims.filter(c => c.state === 'active').length,
    superseded: claims.filter(c => c.state === 'superseded').length,
    disputed: claims.filter(c => c.state === 'disputed').length,
    staleDays,
    recentSupersessions,
  }
}
