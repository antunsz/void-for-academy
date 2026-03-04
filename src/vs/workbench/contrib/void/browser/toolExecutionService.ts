/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * ToolExecutionService - Adapter between Agno tool requests and the existing
 * ToolsService/MCPService in the Electron app.
 *
 * When Agno pauses a run for external tool execution, this service:
 * 1. Maps Agno tool_args to the existing BuiltinToolCallParams format
 * 2. Validates parameters using ToolsService.validateParams
 * 3. Executes the tool using ToolsService.callTool
 * 4. Formats the result using ToolsService.stringOfResult
 * 5. Returns the string result to be sent back to AgentOS
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AgnoToolRequirement, AgnoToolResult } from '../common/agnoTypes.js';
import { RawToolParamsObj } from '../common/sendLLMMessageTypes.js';
import { isABuiltinToolName } from '../common/prompt/prompts.js';
import { BuiltinToolName, ToolName } from '../common/toolsServiceTypes.js';
import { IToolsService } from './toolsService.js';
import { IMCPService } from '../common/mcpService.js';
import { getErrorMessage } from '../common/sendLLMMessageTypes.js';

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export const IToolExecutionService = createDecorator<IToolExecutionService>('ToolExecutionService');

export interface IToolExecutionService {
	readonly _serviceBrand: undefined;

	/**
	 * Execute a tool from an Agno external_execution requirement.
	 * Returns a result suitable for sending back to AgentOS via continue_run.
	 */
	executeToolRequirement(requirement: AgnoToolRequirement): Promise<AgnoToolResult>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ToolExecutionService extends Disposable implements IToolExecutionService {
	readonly _serviceBrand: undefined;

	constructor(
		@IToolsService private readonly _toolsService: IToolsService,
		@IMCPService private readonly _mcpService: IMCPService,
	) {
		super();
	}

	async executeToolRequirement(requirement: AgnoToolRequirement): Promise<AgnoToolResult> {
		const { tool_name, tool_args, tool_call_id } = requirement.tool_execution;
		const toolName = tool_name as ToolName;
		const callId = tool_call_id || tool_name;

		try {
			const rawParams = this._mapAgnoArgsToRawParams(tool_name, tool_args);
			const resultStr = await this._executeTool(toolName, rawParams);

			return {
				tool_call_id: callId,
				tool_name: tool_name,
				content: resultStr,
			};
		} catch (error) {
			return {
				tool_call_id: callId,
				tool_name: tool_name,
				content: `Error executing ${tool_name}: ${getErrorMessage(error)}`,
			};
		}
	}

	private async _executeTool(toolName: ToolName, rawParams: RawToolParamsObj): Promise<string> {
		if (isABuiltinToolName(toolName)) {
			return this._executeBuiltinTool(toolName, rawParams);
		}
		return this._executeMCPTool(toolName, rawParams);
	}

	private async _executeBuiltinTool(toolName: BuiltinToolName, rawParams: RawToolParamsObj): Promise<string> {
		const validatedParams = this._toolsService.validateParams[toolName](rawParams);
		const { result: resultOrPromise } = await this._toolsService.callTool[toolName](validatedParams as any);
		const result = await resultOrPromise;
		return this._toolsService.stringOfResult[toolName](validatedParams as any, result as any);
	}

	private async _executeMCPTool(toolName: string, rawParams: RawToolParamsObj): Promise<string> {
		const mcpTools = this._mcpService.getMCPTools();
		const mcpTool = mcpTools?.find(t => t.name === toolName);
		if (!mcpTool) {
			throw new Error(`Unknown tool: ${toolName}. Not a builtin or MCP tool.`);
		}

		const mcpResult = await this._mcpService.callMCPTool({
			serverName: mcpTool.mcpServerName ?? 'unknown_mcp_server',
			toolName: toolName,
			params: rawParams,
		});

		return this._mcpService.stringifyResult(mcpResult.result);
	}

	/**
	 * Map Agno tool_args (Python snake_case from LLM) to RawToolParamsObj.
	 *
	 * Agno tools use the same parameter names as the LLM sees them, which
	 * match our existing tool param names (both use snake_case).
	 */
	private _mapAgnoArgsToRawParams(
		_toolName: string,
		toolArgs: Record<string, unknown>,
	): RawToolParamsObj {
		const rawParams: RawToolParamsObj = {};
		for (const [key, value] of Object.entries(toolArgs)) {
			if (value !== undefined && value !== null) {
				rawParams[key] = String(value);
			}
		}
		return rawParams;
	}
}

registerSingleton(IToolExecutionService, ToolExecutionService, InstantiationType.Delayed);
