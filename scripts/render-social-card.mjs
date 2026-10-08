/** Render social-card.svg → social-card.png (1200×627) for GitHub/social preview. */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
const svg = fileURLToPath(new URL('../assets/social-card.svg', import.meta.url))
const out = fileURLToPath(new URL('../assets/social-card.png', import.meta.url))
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 2 })
await page.goto(svg)
await page.screenshot({ path: out })
await browser.close()
console.log('rendered', out)
