import { registerTool } from './registry'
import { businessHoursTool } from './business-hours'
import { saveLeadTool } from './save-lead'
import { notifyAgentTool } from './notify-agent'

registerTool(businessHoursTool)
registerTool(saveLeadTool)
registerTool(notifyAgentTool)

export { getToolDefinitions, executeTool } from './registry'
export type { ToolContext, ToolResult, Tool } from './types'