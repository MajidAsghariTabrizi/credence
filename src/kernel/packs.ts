/**
 * Packs: domain-scoped claim stores (hub | vendor | market style). A pack is
 * a directory with pack.json (identity) and events.jsonl (history).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ClaimStore } from './store.ts'

export interface PackMeta {
  readonly name: string
  readonly domain: 'hub' | 'vendor' | 'market' | string
  readonly description: string
}

export class PackRegistry {
  private readonly cache = new Map<string, ClaimStore>()
  private readonly packsDir: string

  constructor(packsDir: string) {
    this.packsDir = packsDir
    mkdirSync(packsDir, { recursive: true })
  }

  meta(pack: string): PackMeta | null {
    const file = join(this.packsDir, pack, 'pack.json')
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf8')) as PackMeta
  }

  /** The pack's claim store (created on first access). */
  store(pack: string): ClaimStore {
    let s = this.cache.get(pack)
    if (s === undefined) {
      s = new ClaimStore(join(this.packsDir, pack))
      this.cache.set(pack, s)
    }
    return s
  }

  list(): string[] {
    if (!existsSync(this.packsDir)) return []
    return readdirSync(this.packsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  }
}
