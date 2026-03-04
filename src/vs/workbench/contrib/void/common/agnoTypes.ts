/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Types for communication between the Electron app and the Agno AgentOS backend.
 *
 * The Electron app communicates with AgentOS via:
 *   POST /agents/{agent_id}/runs           -- start a new run (SSE streaming)
 *   POST /agents/{agent_id}/runs/{run_id}/continue  -- resume after external tool execution
 *   POST /agents/{agent_id}/runs/{run_id}/cancel    -- cancel a running agent
 */

// ---------------------------------------------------------------------------
// AgentOS configuration
// ---------------------------------------------------------------------------

export type AgnoBackendStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface AgnoBackendConfig {
	readonly url: string;          // e.g. "http://localhost:7777"
	readonly enabled: boolean;
}

export const defaultAgnoBackendConfig: AgnoBackendConfig = {
	url: 'http://localhost:7777',
	enabled: false,
};

// ---------------------------------------------------------------------------
// Request types (sent TO AgentOS)
// ---------------------------------------------------------------------------

export interface AgnoRunRequest {
	readonly message: string;
	readonly stream: boolean;
	readonly session_id?: string;
	readonly user_id?: string;
}

export interface AgnoContinueRunRequest {
	readonly tools: string;        // JSON string of tool execution results
	readonly stream: boolean;
	readonly session_id?: string;
	readonly user_id?: string;
}

// ---------------------------------------------------------------------------
// SSE Event types (received FROM AgentOS)
// ---------------------------------------------------------------------------

export type AgnoSSEEventType =
	| 'RunStarted'
	| 'RunContent'
	| 'RunCompleted'
	| 'RunError'
	| 'RunPaused'
	| 'RunCancelled';

export interface AgnoSSEEvent {
	readonly event: AgnoSSEEventType;
	readonly data: string;  // JSON string
}

/**
 * Parsed payload of a RunContent event.
 * Agno streams content chunks with optional tool calls.
 */
export interface AgnoRunContentData {
	readonly run_id: string;
	readonly content?: string;
	readonly content_type?: string;
	readonly created_at?: number;
}

/**
 * Parsed payload of a RunPaused event (external tool execution needed).
 */
export interface AgnoRunPausedData {
	readonly run_id: string;
	readonly is_paused: boolean;
	readonly requirements?: AgnoToolRequirement[];
}

export interface AgnoToolRequirement {
	readonly requirement_id: string;
	readonly is_external_tool_execution: boolean;
	readonly tool_execution: {
		readonly tool_name: string;
		readonly tool_args: Record<string, unknown>;
		readonly tool_call_id?: string;
	};
}

/**
 * Tool result to send back to AgentOS when continuing a paused run.
 */
export interface AgnoToolResult {
	readonly tool_call_id: string;
	readonly tool_name: string;
	readonly content: string;
}

// ---------------------------------------------------------------------------
// Agent identifiers exposed by the Acad AgentOS
// ---------------------------------------------------------------------------

export type AgnoAgentId =
	| 'acad-agent'
	| 'writer-agent'
	| 'reviewer-agent'
	| 'abnt-agent'
	| 'references-agent';

export type AgnoTeamId = 'acad-team';

export type AgnoWorkflowId =
	| 'write-chapter'
	| 'full-review'
	| 'references-management';

export type AgnoEntityKind = 'agent' | 'team' | 'workflow';

const entityKindToPathSegment: Record<AgnoEntityKind, string> = {
	agent: 'agents',
	team: 'teams',
	workflow: 'workflows',
};

const entityIdToKind: Record<string, AgnoEntityKind> = {
	'acad-agent': 'agent',
	'writer-agent': 'agent',
	'reviewer-agent': 'agent',
	'abnt-agent': 'agent',
	'references-agent': 'agent',
	'acad-team': 'team',
	'write-chapter': 'workflow',
	'full-review': 'workflow',
	'references-management': 'workflow',
};

export function getEntityKind(entityId: string): AgnoEntityKind {
	return entityIdToKind[entityId] ?? 'agent';
}

// ---------------------------------------------------------------------------
// Endpoint helpers
// ---------------------------------------------------------------------------

export function agnoEntityRunUrl(baseUrl: string, entityId: string): string {
	const kind = getEntityKind(entityId);
	return `${baseUrl}/${entityKindToPathSegment[kind]}/${entityId}/runs`;
}

export function agnoAgentRunUrl(baseUrl: string, agentId: AgnoAgentId): string {
	return `${baseUrl}/agents/${agentId}/runs`;
}

export function agnoContinueRunUrl(baseUrl: string, agentId: AgnoAgentId, runId: string): string {
	return `${baseUrl}/agents/${agentId}/runs/${runId}/continue`;
}

export function agnoCancelRunUrl(baseUrl: string, agentId: AgnoAgentId, runId: string): string {
	return `${baseUrl}/agents/${agentId}/runs/${runId}/cancel`;
}

export function agnoTeamRunUrl(baseUrl: string, teamId: AgnoTeamId): string {
	return `${baseUrl}/teams/${teamId}/runs`;
}

export function agnoWorkflowRunUrl(baseUrl: string, workflowId: AgnoWorkflowId): string {
	return `${baseUrl}/workflows/${workflowId}/runs`;
}
