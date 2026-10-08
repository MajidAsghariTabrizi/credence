/**
 * Moment 03 — "KILL ME": start a multi-step mission as a real child process,
 * hard-kill it mid-flight (SIGKILL / taskkill /F — not graceful), then resume
 * from a CLEAN process. The mission finishes, and the log shows both PIDs,
 * the interruption, and every step — nothing was lost.
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { Keel } from '../src/kernel/keel.ts'
import { demoRoot } from './seed.ts'

const MISSION = 'm_science_backlog'

function runChild(mode: 'start' | 'resume'): Promise<number> {
  return new Promise((resolve, reject) => {
    // A real, separate Node process — no shared memory with this supervisor.
    const child = spawn(process.execPath, ['--experimental-strip-types', 'demo/mission-child.ts', MISSION], {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', code => resolve(code ?? -1))
    if (mode === 'start') {
      // Kill mid-flight: after ~4 steps (~1.6s), hard kill. No SIGTERM grace.
      setTimeout(() => {
        try {
          if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/F', '/T'])
          else process.kill(child.pid!, 'SIGKILL')
        } catch { /* already gone */ }
      }, 1_600)
    }
  })
}

export async function run(): Promise<void> {
  rmSync(demoRoot(), { recursive: true, force: true })
  const keel = new Keel(`${demoRoot()}/missions`)

  console.log('GROUND CONTROL — mission: transmit science backlog to Earth (8 steps)')
  console.log('─'.repeat(72))
  console.log('[supervisor] starting mission process…')
  const firstCode = await runChild('start')
  const after = keel.state(MISSION)
  console.log(`[supervisor] process EXITED code=${firstCode} (killed). mission state:`)
  if (after !== null) {
    console.log(`            steps ${after.completedSteps}/${after.totalSteps} done=${after.done} lastPid=${after.lastPid} — DURABLE`)
  }
  console.log()
  console.log('[supervisor] process is DEAD. restarting from a CLEAN process — resuming from durable state…')
  const secondCode = await runChild('resume')
  const final = keel.state(MISSION)
  console.log()
  console.log(`[supervisor] second process EXITED code=${secondCode}`)
  if (final !== null) {
    console.log(`MISSION: ${final.done ? 'COMPLETE' : 'INCOMPLETE'}  steps=${final.completedSteps}/${final.totalSteps}  interruptions=${final.interruptions}`)
    console.log()
    console.log('DURABLE MISSION LOG (immutable):')
    for (const e of keel.events(MISSION)) {
      if (e.t === 'mission-started') console.log(`  ${e.at}  started     objective="${e.objective}" steps=${e.totalSteps}`)
      else if (e.t === 'mission-step') console.log(`  ${e.at}  step ${String(e.step).padStart(2)}/8      ${e.label}  [pid ${e.pid}]`)
      else if (e.t === 'mission-resumed') console.log(`  ${e.at}  RESUMED     from step ${e.fromStep}  [pid ${e.pid}] ← clean process, zero memory`)
      else if (e.t === 'mission-done') console.log(`  ${e.at}  done`)
    }
  }
  console.log()
  console.log('Kill the process. The mission continues.')
}
