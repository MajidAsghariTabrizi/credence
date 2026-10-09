/**
 * harness-bridge: CLI access to a credence pack from an agent-harness host.
 * Zero-dependency; runs on Node >= 22.6 type stripping like the kernel.
 */
import { ClaimStore } from '../../src/kernel/store.ts'
import { ask } from '../../src/kernel/ask.ts'
import { propose, commitProposal } from '../../src/kernel/learn.ts'
import { pulse } from '../../src/kernel/pulse.ts'

const home = process.env.CREDENCE_HOME ?? '.credence'
const [cmd, pack, ...rest] = process.argv.slice(2)
if (cmd === undefined || pack === undefined) {
  console.log('usage: harness-bridge <ask|pulse|propose|approve> <pack> [args]')
  process.exit(1)
}
const store = new ClaimStore(`${home}/packs/${pack}`)

switch (cmd) {
  case 'ask': {
    const flag = rest.indexOf('--caller')
    const caller = (flag >= 0 ? rest[flag + 1] : 'agent:harness') as 'agent:harness'
    const q = (flag >= 0 ? [...rest.slice(0, flag), ...rest.slice(flag + 2)] : rest).join(' ')
    if (q === '') { console.error('ask needs a question'); process.exit(1) }
    console.log(JSON.stringify(ask(store, q, caller), null, 2))
    break
  }
  case 'pulse':
    console.log(JSON.stringify(pulse(store), null, 2))
    break
  case 'propose': {
    // propose <pack> <caller> --text "..." --basis "..."
    const caller = (rest[0] ?? 'agent:harness') as 'agent:harness'
    const arg = (n: string): string | undefined => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined }
    const text = arg('text')
    const basis = arg('basis')
    if (text === undefined || basis === undefined) { console.error('propose needs --text and --basis'); process.exit(1) }
    console.log(JSON.stringify(propose(store, { kind: 'add-claim', text, basis, support: 'measured' }, caller), null, 2))
    break
  }
  case 'approve': {
    const [proposalId] = rest
    if (proposalId === undefined) { console.error('approve needs a proposalId'); process.exit(1) }
    console.log(JSON.stringify(commitProposal(store, proposalId, 'owner'), null, 2))
    break
  }
  default:
    console.log('unknown command: ' + cmd)
    process.exit(1)
}
