/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * AgnoBackendLifecycleService
 *
 * Manages the lifecycle of the Agno AgentOS Python backend process.
 * Spawns the backend on app startup and kills it on shutdown, completely
 * transparent to the user.
 *
 * The backend runs via a bootstrap script that:
 *   1. Creates a Python venv (if not exists)
 *   2. Installs dependencies (if pyproject.toml changed)
 *   3. Starts uvicorn serving the AgentOS
 */

import { ChildProcess, spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { Emitter, Event } from '../../../../base/common/event.js';

import { AgnoBackendStatus } from '../common/agnoTypes.js';

const BACKEND_PORT = 7777;
const BACKEND_HOST = '127.0.0.1';
const HEALTH_CHECK_INTERVAL_MS = 5_000;
const HEALTH_CHECK_TIMEOUT_MS = 3_000;
const MAX_STARTUP_WAIT_MS = 120_000;
const STARTUP_POLL_MS = 1_000;

export const IAgnoBackendLifecycleService = createDecorator<IAgnoBackendLifecycleService>('agnoBackendLifecycleService');

export interface IAgnoBackendLifecycleService {
	readonly _serviceBrand: undefined;

	readonly status: AgnoBackendStatus;
	readonly port: number;
	readonly baseUrl: string;

	readonly onDidChangeStatus: Event<AgnoBackendStatus>;

	start(): Promise<void>;
	stop(): Promise<void>;
	healthCheck(): Promise<boolean>;
}


export class AgnoBackendLifecycleService extends Disposable implements IAgnoBackendLifecycleService {
	readonly _serviceBrand: undefined;

	private _status: AgnoBackendStatus = 'stopped';
	private _process: ChildProcess | null = null;
	private _healthCheckTimer: ReturnType<typeof setInterval> | null = null;

	private readonly _onDidChangeStatus = this._register(new Emitter<AgnoBackendStatus>());
	readonly onDidChangeStatus: Event<AgnoBackendStatus> = this._onDidChangeStatus.event;

	get status(): AgnoBackendStatus { return this._status; }
	get port(): number { return BACKEND_PORT; }
	get baseUrl(): string { return `http://${BACKEND_HOST}:${BACKEND_PORT}`; }

	constructor(
		@ILogService private readonly _logService: ILogService,
		@IEnvironmentMainService private readonly _environmentService: IEnvironmentMainService,
		@ILifecycleMainService private readonly _lifecycleService: ILifecycleMainService,
	) {
		super();

		this._register(Event.once(this._lifecycleService.onWillShutdown)(e => {
			e.join('agno-backend-shutdown', this.stop());
		}));
	}

	async start(): Promise<void> {
		if (this._status === 'running' || this._status === 'starting') {
			return;
		}

		const alreadyRunning = await this.healthCheck();
		if (alreadyRunning) {
			this._setStatus('running');
			this._startHealthCheckTimer();
			this._logService.info('[AgnoBackend] Backend already running on port', BACKEND_PORT);
			return;
		}

		this._setStatus('starting');

		const backendDir = this._resolveBackendDir();
		if (!backendDir) {
			this._logService.warn('[AgnoBackend] Backend directory not found, skipping auto-start');
			this._setStatus('error');
			return;
		}

		const bootstrapScript = join(backendDir, 'scripts', 'bootstrap.sh');
		if (!existsSync(bootstrapScript)) {
			this._logService.warn('[AgnoBackend] Bootstrap script not found:', bootstrapScript);
			this._setStatus('error');
			return;
		}

		this._logService.info('[AgnoBackend] Starting backend from', backendDir);

		try {
			this._process = spawn('bash', [bootstrapScript, '--port', String(BACKEND_PORT), '--host', BACKEND_HOST], {
				cwd: backendDir,
				stdio: ['ignore', 'pipe', 'pipe'],
				detached: false,
				env: {
					...process.env,
					ACAD_PORT: String(BACKEND_PORT),
					ACAD_HOST: BACKEND_HOST,
				},
			});

			this._process.stdout?.on('data', (data: Buffer) => {
				const lines = data.toString().trim();
				if (lines) {
					this._logService.info('[AgnoBackend]', lines);
				}
			});

			this._process.stderr?.on('data', (data: Buffer) => {
				const lines = data.toString().trim();
				if (lines) {
					this._logService.warn('[AgnoBackend]', lines);
				}
			});

			this._process.on('exit', (code, signal) => {
				this._logService.info('[AgnoBackend] Process exited', { code, signal });
				this._process = null;
				if (this._status !== 'stopped') {
					this._setStatus('error');
				}
			});

			this._process.on('error', (err) => {
				this._logService.error('[AgnoBackend] Process error:', err);
				this._process = null;
				this._setStatus('error');
			});

			await this._waitForReady();
			this._startHealthCheckTimer();

		} catch (err) {
			this._logService.error('[AgnoBackend] Failed to start:', err);
			this._setStatus('error');
		}
	}

	async stop(): Promise<void> {
		this._stopHealthCheckTimer();

		if (this._process) {
			this._logService.info('[AgnoBackend] Stopping backend process...');
			this._setStatus('stopped');

			const proc = this._process;
			this._process = null;

			try {
				proc.kill('SIGTERM');

				await Promise.race([
					new Promise<void>((resolve) => {
						proc.on('exit', () => resolve());
					}),
					new Promise<void>((resolve) => setTimeout(() => {
						proc.kill('SIGKILL');
						resolve();
					}, 5_000)),
				]);
			} catch {
				try { proc.kill('SIGKILL'); } catch { /* best effort */ }
			}

			this._logService.info('[AgnoBackend] Backend stopped');
		} else {
			this._setStatus('stopped');
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

			const res = await fetch(`${this.baseUrl}/`, {
				method: 'GET',
				signal: controller.signal,
			});

			clearTimeout(timeout);
			return res.ok;
		} catch {
			return false;
		}
	}

	private _resolveBackendDir(): string | null {
		const appRoot = this._environmentService.appRoot;

		const candidates = [
			join(appRoot, 'acad-backend'),
			join(appRoot, '..', 'acad-backend'),
			join(appRoot, '..', '..', 'acad-backend'),
		];

		for (const candidate of candidates) {
			if (existsSync(join(candidate, 'pyproject.toml'))) {
				return candidate;
			}
		}

		return null;
	}

	private async _waitForReady(): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < MAX_STARTUP_WAIT_MS) {
			const ready = await this.healthCheck();
			if (ready) {
				this._logService.info('[AgnoBackend] Backend is ready');
				this._setStatus('running');
				return;
			}

			if (!this._process || this._process.exitCode !== null) {
				throw new Error('Backend process exited before becoming ready');
			}

			await new Promise(resolve => setTimeout(resolve, STARTUP_POLL_MS));
		}

		throw new Error(`Backend did not become ready within ${MAX_STARTUP_WAIT_MS / 1000}s`);
	}

	private _setStatus(status: AgnoBackendStatus): void {
		if (this._status !== status) {
			this._status = status;
			this._onDidChangeStatus.fire(status);
		}
	}

	private _startHealthCheckTimer(): void {
		this._stopHealthCheckTimer();
		this._healthCheckTimer = setInterval(async () => {
			const healthy = await this.healthCheck();
			if (!healthy && this._status === 'running') {
				this._logService.warn('[AgnoBackend] Health check failed, attempting restart...');
				this._setStatus('error');
				await this.stop();
				await this.start();
			}
		}, HEALTH_CHECK_INTERVAL_MS);
	}

	private _stopHealthCheckTimer(): void {
		if (this._healthCheckTimer) {
			clearInterval(this._healthCheckTimer);
			this._healthCheckTimer = null;
		}
	}

	override dispose(): void {
		this._stopHealthCheckTimer();
		if (this._process) {
			try { this._process.kill('SIGKILL'); } catch { /* best effort */ }
			this._process = null;
		}
		super.dispose();
	}
}
