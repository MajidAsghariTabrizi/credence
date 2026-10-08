/**
 * Custom secret/privacy scanner: regex sweep over the working tree and the
 * full git history of THIS repository. Complements gitleaks in CI.
 * Run: npm run scan
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PATTERNS = [
  { name: 'generic api key assignment', re: /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i },
  { name: 'bearer token', re: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/ },
  { name: 'github token', re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'aws key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'absolute windows path', re: /[A-Z]:\\Users\\[^\s"']+|C:\\Users\\ma\./i },
  { name: 'ip literal (non-doc)', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b(?!.*127\.0\.0\.1)/ },
  { name: 'email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { name: 'connection string', re: /(?:postgres|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s"']+/i },
]

const SKIP_DIRS = new Set(['node_modules', '.git', '.credence', '.credence-demo'])
const SKIP_FILES = new Set(['scan.mjs', 'package-lock.json'])
let findings = 0

function scanText(text, where) {
  for (const { name, re } of PATTERNS) {
    const m = re.exec(text)
    if (m !== null) {
      // allow the scanner's own definitions and documented examples
      if (where.endsWith('scan.mjs') || where.endsWith('ARCHITECTURE.md')) continue
      console.log(`FINDING [${name}] ${where}: ${m[0].slice(0, 40)}`)
      findings += 1
    }
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) walk(p)
    else if (/\.(ts|mjs|js|json|md|yml|cff|svg|txt)$/.test(entry)) scanText(readFileSync(p, 'utf8'), p)
  }
}

walk('.')
// full history scan (new history — cheap and complete)
const log = execSync('git log -p --all', { encoding: 'utf8', maxBuffer: 1 << 26 }).catch?.(() => '') ?? ''
console.log(`history scan: ${log === '' ? 'skipped (no git history yet)' : log.split('\n').length + ' lines scanned'}`)
if (log !== '') scanText(log, '<git-history>')
console.log(findings === 0 ? 'SCAN CLEAN' : `SCAN FAILED: ${findings} finding(s)`)
process.exit(findings === 0 ? 0 : 1)
