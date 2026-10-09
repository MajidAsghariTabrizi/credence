/**
 * Runtime shims for testing the DSH plugin without the DSH host: a Node
 * resolve hook redirecting the two host package specifiers to local stubs
 * that capture registrations. Registered via `node --import`.
 */
import { register } from 'node:module'
import { fileURLToPath } from 'node:url'

register(new URL('./dsh-shims.mjs', import.meta.url).href)
void fileURLToPath
