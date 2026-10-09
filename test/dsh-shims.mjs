/**
 * Resolve hook: redirect the two DSH host packages to test doubles.
 * defineTool passes definitions through; cordis Context is supplied by the
 * test itself. The plugin's real module graph (including its ../../src
 * kernel imports) loads under Node type-stripping exactly as shipped.
 */

const DSH_TOOLS_STUB = `
export function defineTool(definition) { return definition }
`

const CORDIS_STUB = `
export const name = 'cordis-stub'
`

export function resolve(specifier, context, nextResolve) {
  if (specifier === '@deepseek-ai/dsh-tools') {
    return { url: 'data:text/javascript;base64,' + Buffer.from(DSH_TOOLS_STUB).toString('base64'), shortCircuit: true }
  }
  if (specifier === '@deepseek-ai/cordis') {
    return { url: 'data:text/javascript;base64,' + Buffer.from(CORDIS_STUB).toString('base64'), shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
