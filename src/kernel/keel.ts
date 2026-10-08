/**
 * keel: the durable mission runner. Mission progress is append-only state on
 * disk; a killed process loses nothing and a fresh process resumes from the
 * fold. (Named for the spine that keeps a long voyage upright.)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { MissionEvent, MissionState } from './types.ts'

export class Keel {
  private readonly file: string

  constructor(missionsDir: string) {
    mkdirSync(missionsDir, { recursive: true })
    this.file = join(missionsDir, 'missions.jsonl')
  }

  private read(): MissionEvent[] {
    if (!existsSync(this.file)) return []
    const out: MissionEvent[] = []
    for (const line of readFileSync(this.file, 'utf8').split('\n')) {
      if (line.trim() !== '') out.push(JSON.parse(line) as MissionEvent)
    }
    return out
  }

  private append(e: MissionEvent): void {
    appendFileSync(this.file, JSON.stringify(e) + '\n', 'utf8')
  }

  /** Fold all events for one mission into its current state. */
  state(missionId: string): MissionState | null {
    const events = this.read().filter(e => e.missionId === missionId)
    if (events.length === 0) return null
    let objective = ''
    let totalSteps = 0
    let completedSteps = 0
    let done = false
    let lastPid: number | null = null
    let interruptions = 0
    for (const e of events) {
      if (e.t === 'mission-started') { objective = e.objective; totalSteps = e.totalSteps }
      else if (e.t === 'mission-step') { completedSteps = e.step; lastPid = e.pid }
      else if (e.t === 'mission-resumed') { lastPid = e.pid; interruptions += 1 }
      else if (e.t === 'mission-done') done = true
    }
    return { missionId, objective, totalSteps, completedSteps, done, lastPid, interruptions }
  }

  start(missionId: string, objective: string, totalSteps: number): void {
    this.append({ t: 'mission-started', at: new Date().toISOString(), missionId, objective, totalSteps })
  }

  step(missionId: string, step: number, label: string): void {
    this.append({ t: 'mission-step', at: new Date().toISOString(), missionId, step, label, pid: process.pid })
  }

  resumed(missionId: string, fromStep: number): void {
    this.append({ t: 'mission-resumed', at: new Date().toISOString(), missionId, fromStep, pid: process.pid })
  }

  done(missionId: string): void {
    this.append({ t: 'mission-done', at: new Date().toISOString(), missionId })
  }

  events(missionId: string): MissionEvent[] {
    return this.read().filter(e => e.missionId === missionId)
  }
}
