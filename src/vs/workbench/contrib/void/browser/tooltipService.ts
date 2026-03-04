/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { mountVoidTooltip } from './react/out/void-tooltip/index.js';
import { h, getActiveWindow } from '../../../../base/browser/dom.js';

export const voidTooltipMountRef = { current: mountVoidTooltip };

// Tooltip contribution that mounts the component at startup
export class TooltipContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.voidTooltip';

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		this.initializeTooltip();
	}

	private initializeTooltip(): void {
		const targetWindow = getActiveWindow();
		let retryHandle: number | undefined;
		let attempts = 0;
		const maxAttempts = 200;

		const tryMount = () => {
			const workbench = targetWindow.document.querySelector('.monaco-workbench');
			if (!workbench) {
				if (attempts < maxAttempts) {
					attempts += 1;
					retryHandle = targetWindow.setTimeout(tryMount, 50);
				}
				return;
			}

			retryHandle = undefined;
			const tooltipContainer = h('div.void-tooltip-container').root;
			workbench.appendChild(tooltipContainer);

			try {
				this.instantiationService.invokeFunction((accessor: ServicesAccessor) => {
					const result = voidTooltipMountRef.current(tooltipContainer, accessor);
					if (result && typeof result.dispose === 'function') {
						this._register(toDisposable(result.dispose));
					}
				});
			} catch (error) {
				console.error('Void tooltip mount failed', error);
				tooltipContainer.textContent = 'Acad: falha ao renderizar.';
			}

			this._register(toDisposable(() => {
				if (tooltipContainer.parentElement) {
					tooltipContainer.parentElement.removeChild(tooltipContainer);
				}
			}));
		};

		tryMount();
		this._register(toDisposable(() => {
			if (retryHandle !== undefined) {
				targetWindow.clearTimeout(retryHandle);
			}
		}));
	}
}

// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(TooltipContribution.ID, TooltipContribution, WorkbenchPhase.AfterRestored);
