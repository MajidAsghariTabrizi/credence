/**
 * DSH plugin integration test: loads the REAL plugin.ts (via host-package
 * shims) against a capturing tools registry, then drives each tool's
 * execute() through the real kernel — proving registration, UNKNOWN,
 * governed-learning denial, and pulse. Catches kernel import-path
 * regressions (a wrong ../../src path fails this test at import time).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../integrations/deepseek-harness/plugin.ts'

interface RegisteredTool {
  name: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, string>, exec: { signal: AbortSignal }) => Promise<string>
}

function mount(): RegisteredTool[] {
  const registered: RegisteredTool[] = []
  const ctx = { tools: { register: (tool: RegisteredTool) => { registered.push(tool) } } }
  apply(ctx as never)
  return registered
}

const exec = { signal: new AbortController().signal }

test('plugin registers exactly the three credence tools', () => {
  const tools = mount()
  assert.deepEqual(tools.map(t => t.name).sort(), ['credence_ask', 'credence_learn', 'credence_pulse'])
})

test('credence_ask returns UNKNOWN (with reason) for a question with no evidence', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'credence-plugin-'))
  const prev = process.env.CREDENCE_HOME
  process.env.CREDENCE_HOME = dir
  try {
    const ask = mount().find(t => t.name === 'credence_ask')!
    const out = await ask.execute({ question: 'who won the lottery in 1999?' }, exec)
    assert.match(out, /^UNKNOWN — /)
  } finally {
    if (prev === undefined) delete process.env.CREDENCE_HOME
    else process.env.CREDENCE_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})

test('governed learning: agent is DENIED self-commit; the proposal is recorded, not lost', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'credence-plugin-'))
  const prev = process.env.CREDENCE_HOME
  process.env.CREDENCE_HOME = dir
  try {
    const learn = mount().find(t => t.name === 'credence_learn')!
    const out = await learn.execute(
      { text: 'thruster B specific impulse is 305 s after overhaul', basis: 'bench test BENCH-9', evidence_summary: 'BENCH-9: 3 runs, mean 305.2s' },
      exec,
    )
    assert.match(out, /DENIED/)
    assert.match(out, /pending owner approval/)
  } finally {
    if (prev === undefined) delete process.env.CREDENCE_HOME
    else process.env.CREDENCE_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})

test('credence_pulse reports ledger health', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'credence-plugin-'))
  const prev = process.env.CREDENCE_HOME
  process.env.CREDENCE_HOME = dir
  try {
    const pulse = mount().find(t => t.name === 'credence_pulse')!
    const out = await pulse.execute({}, exec)
    assert.match(out, /claims: \d+ active/)
  } finally {
    if (prev === undefined) delete process.env.CREDENCE_HOME
    else process.env.CREDENCE_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})
