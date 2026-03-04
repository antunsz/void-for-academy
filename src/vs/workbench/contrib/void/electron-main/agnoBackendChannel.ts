/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * IPC Channel that exposes AgnoBackendLifecycleService to the renderer process.
 * Allows the browser-side AgnoClientBridge to query backend status and URL.
 */

import { IServerChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Event } from '../../../../base/common/event.js';
import { IAgnoBackendLifecycleService } from './agnoBackendLifecycleService.js';
import { AgnoBackendStatus } from '../common/agnoTypes.js';

export class AgnoBackendChannel implements IServerChannel {

	constructor(
		private readonly _service: IAgnoBackendLifecycleService,
	) { }

	listen(_: unknown, event: string): Event<any> {
		switch (event) {
			case 'onDidChangeStatus':
				return this._service.onDidChangeStatus;
			default:
				throw new Error(`Unknown event: ${event}`);
		}
	}

	async call(_: unknown, command: string, _args?: any): Promise<any> {
		switch (command) {
			case 'getStatus':
				return this._service.status;
			case 'getBaseUrl':
				return this._service.baseUrl;
			case 'getPort':
				return this._service.port;
			case 'healthCheck':
				return this._service.healthCheck();
			case 'start':
				return this._service.start();
			case 'stop':
				return this._service.stop();
			default:
				throw new Error(`Unknown command: ${command}`);
		}
	}
}

/**
 * Browser-side service interface that mirrors the main process service,
 * accessible via IPC from the renderer.
 */
export interface IAgnoBackendInfo {
	readonly status: AgnoBackendStatus;
	readonly baseUrl: string;
	readonly port: number;
	healthCheck(): Promise<boolean>;
	onDidChangeStatus: Event<AgnoBackendStatus>;
}
