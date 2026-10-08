#!/usr/bin/env node
// credence CLI shim — zero build: Node >= 22.6 runs the TypeScript directly.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cli = join(here, '..', 'src', 'cli.ts')
const result = spawnSync(process.execPath, ['--experimental-strip-types', cli, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(result.status ?? 1)
