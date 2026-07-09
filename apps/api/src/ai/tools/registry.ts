import { zodToJsonSchema } from './zod-to-schema'
import type { Tool, ToolContext, ToolResult } from './types'

/**
 * Central list of all registered tools. Adding a new tool later means
 * writing one file matching the Tool interface, then adding it here —
 * nothing else in the system needs to change.
 */
const tools: Tool<any>[] = []

/**
 * Registers a tool into the system. Called once per tool at startup
 * (from tools/index.ts), not per-request.
 */
export const registerTool = (tool: Tool<any>): void => {
  tools.push(tool)
}

/**
 * Converts all registered tools into the format Groq's tool-calling API
 * expects. Called once per conversation turn, passed alongside the
 * messages array to Groq.
 */
export const getToolDefinitions = () => {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.inputSchema)
    }
  }))
}

/**
 * Looks up a tool by name (as Groq specified in its tool_call response),
 * validates the input Groq provided against that tool's Zod schema, and
 * executes it. Returns a ToolResult either way — including a clean
 * failure result if the tool name is unknown or input validation fails,
 * so the caller never has to handle a thrown exception here.
 */
export const executeTool = async (
  toolName: string,
  rawInput: unknown,
  context: ToolContext
): Promise<ToolResult> => {
  const tool = tools.find((t) => t.name === toolName)

  if (!tool) {
    return {
      success: false,
      message: `Unknown tool: ${toolName}`
    }
  }

  const parsed = tool.inputSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      success: false,
      message: `Invalid input for tool ${toolName}: ${JSON.stringify(parsed.error.flatten())}`
    }
  }

  try {
    return await tool.execute(parsed.data, context)
  } catch (error) {
    console.error(`[tool-registry] Tool "${toolName}" execution failed:`, error)
    return {
      success: false,
      message: `Tool ${toolName} failed to execute.`
    }
  }
}