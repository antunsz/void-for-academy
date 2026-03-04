/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from '../../../services/statusbar/browser/statusbar.js';
import { IAgnoClientBridge } from './agnoClientBridge.js';
import { AgnoBackendStatus } from '../common/agnoTypes.js';

const STATUS_ENTRY_ID = 'acad.agnoBackend.status';

const statusLabels: Record<AgnoBackendStatus, { text: string; tooltip: string }> = {
	stopped: { text: '$(circle-slash) Acad AI', tooltip: 'Acad AI Backend: Stopped' },
	starting: { text: '$(loading~spin) Acad AI', tooltip: 'Acad AI Backend: Starting...' },
	running: { text: '$(check) Acad AI', tooltip: 'Acad AI Backend: Running' },
	error: { text: '$(warning) Acad AI', tooltip: 'Acad AI Backend: Error - click to retry' },
};

export class AgnoBackendStatusContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.agnoBackendStatus';

	private _entry: IStatusbarEntryAccessor | undefined;

	constructor(
		@IAgnoClientBridge private readonly _bridge: IAgnoClientBridge,
		@IStatusbarService private readonly _statusbarService: IStatusbarService,
	) {
		super();
		this._updateStatusBar(this._bridge.backendStatus);
		this._register(this._bridge.onDidChangeBackendStatus(status => this._updateStatusBar(status)));
	}

	private _updateStatusBar(status: AgnoBackendStatus): void {
		const label = statusLabels[status];
		const entry = {
			name: 'Acad AI Backend',
			text: label.text,
			tooltip: label.tooltip,
			ariaLabel: label.tooltip,
		};

		if (this._entry) {
			this._entry.update(entry);
		} else {
			this._entry = this._statusbarService.addEntry(
				entry,
				STATUS_ENTRY_ID,
				StatusbarAlignment.LEFT,
				-Infinity,
			);
			this._register(this._entry);
		}
	}
}

registerWorkbenchContribution2(
	AgnoBackendStatusContribution.ID,
	AgnoBackendStatusContribution,
	WorkbenchPhase.AfterRestored,
);
