/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import {
	AgnoAgentId,
	AgnoBackendStatus,
	AgnoRunContentData,
	AgnoRunPausedData,
	AgnoSSEEventType,
	AgnoToolRequirement,
	AgnoToolResult,
	agnoAgentRunUrl,
	agnoCancelRunUrl,
	agnoContinueRunUrl,
	agnoEntityRunUrl,
} from '../common/agnoTypes.js';

// ---------------------------------------------------------------------------
// Event types emitted by the bridge
// ---------------------------------------------------------------------------

export type AgnoStreamEvent =
	| { type: 'text'; content: string; runId: string }
	| { type: 'paused'; runId: string; requirements: AgnoToolRequirement[] }
	| { type: 'completed'; runId: string; fullText: string }
	| { type: 'error'; message: string; runId?: string }
	| { type: 'cancelled'; runId?: string };

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export const IAgnoClientBridge = createDecorator<IAgnoClientBridge>('AgnoClientBridge');

export interface IAgnoClientBridge {
	readonly _serviceBrand: undefined;

	/** Current backend process status (from main process lifecycle service). */
	readonly backendStatus: AgnoBackendStatus;

	/** Whether the backend is running and healthy. */
	readonly isBackendAvailable: boolean;

	/** Fires when backend status changes. */
	readonly onDidChangeBackendStatus: Event<AgnoBackendStatus>;

	startRun(params: {
		agentId: AgnoAgentId;
		message: string;
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle;

	startEntityRun(params: {
		entityId: string;
		message: string;
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle;

	continueRun(params: {
		agentId: AgnoAgentId;
		runId: string;
		toolResults: AgnoToolResult[];
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle;

	cancelRun(agentId: AgnoAgentId, runId: string): Promise<void>;

	healthCheck(): Promise<boolean>;
}

export interface AgnoRunHandle {
	readonly abort: () => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class AgnoClientBridge extends Disposable implements IAgnoClientBridge {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeBackendStatus = this._register(new Emitter<AgnoBackendStatus>());
	readonly onDidChangeBackendStatus: Event<AgnoBackendStatus> = this._onDidChangeBackendStatus.event;

	private _backendStatus: AgnoBackendStatus = 'stopped';
	private _backendBaseUrl: string = 'http://127.0.0.1:7777';
	private readonly _channel: IChannel;

	get backendStatus(): AgnoBackendStatus { return this._backendStatus; }
	get isBackendAvailable(): boolean { return this._backendStatus === 'running'; }

	private _getBaseUrl(): string {
		return this._backendBaseUrl || this._settingsService.state.globalSettings.agnoBackendUrl || 'http://127.0.0.1:7777';
	}

	constructor(
		@IVoidSettingsService private readonly _settingsService: IVoidSettingsService,
		@IMainProcessService private readonly _mainProcessService: IMainProcessService,
	) {
		super();

		this._channel = this._mainProcessService.getChannel('void-channel-agno-backend');

		this._register(
			(this._channel.listen('onDidChangeStatus') as Event<AgnoBackendStatus>)(status => {
				this._backendStatus = status;
				this._onDidChangeBackendStatus.fire(status);

				if (status === 'running') {
					this._channel.call<string>('getBaseUrl').then(url => {
						this._backendBaseUrl = url;
					});
				}
			})
		);

		this._initFromMainProcess();
	}

	private async _initFromMainProcess(): Promise<void> {
		try {
			const [status, baseUrl] = await Promise.all([
				this._channel.call<AgnoBackendStatus>('getStatus'),
				this._channel.call<string>('getBaseUrl'),
			]);
			this._backendStatus = status;
			this._backendBaseUrl = baseUrl;
			this._onDidChangeBackendStatus.fire(status);
		} catch {
			// main process channel not available yet, will update via events
		}
	}

	startRun(params: {
		agentId: AgnoAgentId;
		message: string;
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle {
		const baseUrl = this._getBaseUrl();
		const url = agnoAgentRunUrl(baseUrl, params.agentId);

		const body = new URLSearchParams();
		body.set('message', params.message);
		body.set('stream', 'true');
		if (params.sessionId) body.set('session_id', params.sessionId);
		if (params.userId) body.set('user_id', params.userId);

		return this._streamSSE(url, body, params.onEvent);
	}

	startEntityRun(params: {
		entityId: string;
		message: string;
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle {
		const baseUrl = this._getBaseUrl();
		const url = agnoEntityRunUrl(baseUrl, params.entityId);

		const body = new URLSearchParams();
		body.set('message', params.message);
		body.set('stream', 'true');
		if (params.sessionId) body.set('session_id', params.sessionId);
		if (params.userId) body.set('user_id', params.userId);

		return this._streamSSE(url, body, params.onEvent);
	}

	continueRun(params: {
		agentId: AgnoAgentId;
		runId: string;
		toolResults: AgnoToolResult[];
		sessionId?: string;
		userId?: string;
		onEvent: (event: AgnoStreamEvent) => void;
	}): AgnoRunHandle {
		const baseUrl = this._getBaseUrl();
		const url = agnoContinueRunUrl(baseUrl, params.agentId, params.runId);

		const body = new URLSearchParams();
		body.set('tools', JSON.stringify(params.toolResults));
		body.set('stream', 'true');
		if (params.sessionId) body.set('session_id', params.sessionId);
		if (params.userId) body.set('user_id', params.userId);

		return this._streamSSE(url, body, params.onEvent);
	}

	async cancelRun(agentId: AgnoAgentId, runId: string): Promise<void> {
		const baseUrl = this._getBaseUrl();
		const url = agnoCancelRunUrl(baseUrl, agentId, runId);
		try {
			await fetch(url, { method: 'POST' });
		} catch {
			// best-effort cancel
		}
	}

	async healthCheck(): Promise<boolean> {
		const baseUrl = this._getBaseUrl();
		try {
			const res = await fetch(`${baseUrl}/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
			return res.ok;
		} catch {
			return false;
		}
	}

	// -----------------------------------------------------------------------
	// SSE streaming
	// -----------------------------------------------------------------------

	private _streamSSE(
		url: string,
		body: URLSearchParams,
		onEvent: (event: AgnoStreamEvent) => void,
	): AgnoRunHandle {
		const abortController = new AbortController();
		let currentRunId = '';
		let fullText = '';

		const run = async () => {
			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: body.toString(),
					signal: abortController.signal,
				});

				if (!response.ok) {
					const errText = await response.text();
					onEvent({ type: 'error', message: `AgentOS error ${response.status}: ${errText}` });
					return;
				}

				const reader = response.body?.getReader();
				if (!reader) {
					onEvent({ type: 'error', message: 'No response body from AgentOS' });
					return;
				}

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					let eventType: AgnoSSEEventType | '' = '';

					for (const line of lines) {
						if (line.startsWith('event:')) {
							eventType = line.slice(6).trim() as AgnoSSEEventType;
						} else if (line.startsWith('data:')) {
							const dataStr = line.slice(5).trim();
							if (!dataStr) continue;

							try {
								this._handleSSEData(eventType, dataStr, onEvent, (id) => { currentRunId = id; }, (text) => { fullText += text; });
							} catch (e) {
								// skip malformed events
							}
						}
					}
				}

				if (fullText && currentRunId) {
					onEvent({ type: 'completed', runId: currentRunId, fullText });
				}
			} catch (err: unknown) {
				if (abortController.signal.aborted) {
					onEvent({ type: 'cancelled', runId: currentRunId || undefined });
				} else {
					const msg = err instanceof Error ? err.message : String(err);
					onEvent({ type: 'error', message: `AgentOS connection error: ${msg}`, runId: currentRunId || undefined });
				}
			}
		};

		run();

		return {
			abort: () => abortController.abort(),
		};
	}

	private _handleSSEData(
		eventType: AgnoSSEEventType | '',
		dataStr: string,
		onEvent: (event: AgnoStreamEvent) => void,
		setRunId: (id: string) => void,
		appendText: (text: string) => void,
	): void {
		const parsed = JSON.parse(dataStr);

		switch (eventType) {
			case 'RunStarted': {
				if (parsed.run_id) setRunId(parsed.run_id);
				break;
			}

			case 'RunContent': {
				const data = parsed as AgnoRunContentData;
				if (data.run_id) setRunId(data.run_id);
				if (data.content) {
					appendText(data.content);
					onEvent({ type: 'text', content: data.content, runId: data.run_id });
				}
				break;
			}

			case 'RunPaused': {
				const data = parsed as AgnoRunPausedData;
				if (data.run_id) setRunId(data.run_id);
				const requirements = data.requirements?.filter(r => r.is_external_tool_execution) ?? [];
				if (requirements.length > 0) {
					onEvent({ type: 'paused', runId: data.run_id, requirements });
				}
				break;
			}

			case 'RunCompleted': {
				// handled by stream end
				break;
			}

			case 'RunError': {
				const msg = parsed.detail || parsed.message || 'Unknown AgentOS error';
				onEvent({ type: 'error', message: msg, runId: parsed.run_id });
				break;
			}

			case 'RunCancelled': {
				onEvent({ type: 'cancelled', runId: parsed.run_id });
				break;
			}

			default: {
				// For events without a named type, try to extract content
				if (parsed.content) {
					appendText(parsed.content);
					onEvent({ type: 'text', content: parsed.content, runId: parsed.run_id || '' });
				}
				break;
			}
		}
	}
}

registerSingleton(IAgnoClientBridge, AgnoClientBridge, InstantiationType.Delayed);
