/**
 * Ambient type declarations for the DeepSeek Harness host packages, so the
 * integration typechecks in credence's own CI without depending on the DSH
 * monorepo. Shape follows the public extension cookbook's defineTool example;
 * the real packages provide the runtime inside DSH.
 */
declare module '@deepseek-ai/cordis' {
  export interface Context {
    tools: {
      register(tool: unknown): unknown
    }
  }
}

declare module '@deepseek-ai/dsh-tools' {
  export interface ToolParameterSpec {
    type: 'string' | 'number' | 'boolean'
    required?: boolean
    description?: string
  }
  export interface ToolDefinition<A, R> {
    name: string
    description: string
    parameters: Record<string, ToolParameterSpec>
    output: {
      schema: unknown
      render: (args: A, value: R) => Array<{ type: 'text'; text: string }>
    }
    execute(args: A, exec: { signal: AbortSignal }): Promise<R>
  }
  export type InferArgs<P> = { [K in keyof P]: P[K] extends { type: 'number' } ? number : P[K] extends { type: 'boolean' } ? boolean : string }
  export function defineTool<P extends Record<string, ToolParameterSpec>>(definition: { name: string; description: string; parameters: P; output: { schema: unknown; render: (args: InferArgs<P>, value: string) => Array<{ type: 'text'; text: string }> }; execute(args: InferArgs<P>, exec: { signal: AbortSignal }): Promise<string> }): { name: string }
}
