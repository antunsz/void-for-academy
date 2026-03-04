/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { append, $ } from '../../../../base/browser/dom.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IAgnoClientBridge } from './agnoClientBridge.js';
import { AgnoBackendStatus } from '../common/agnoTypes.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';

const AGNO_BASE = 'http://127.0.0.1:7777';

const statusLabels: Record<AgnoBackendStatus, { icon: ThemeIcon; text: string; detail: string }> = {
	stopped: { icon: Codicon.debugStop, text: localize('agno.stopped', 'Stopped'), detail: localize('agno.stopped.detail', 'Backend is not running') },
	starting: { icon: Codicon.loading, text: localize('agno.starting', 'Starting...'), detail: localize('agno.starting.detail', 'Backend is initializing') },
	running: { icon: Codicon.check, text: localize('agno.running', 'Running'), detail: localize('agno.running.detail', 'Backend is ready') },
	error: { icon: Codicon.warning, text: localize('agno.error', 'Error'), detail: localize('agno.error.detail', 'Backend failed to start') },
};

interface AgentSummary { id?: string; name?: string; description?: string; model?: { model?: string; provider?: string } }
interface TeamSummary { id?: string; name?: string; description?: string; members?: unknown[] }
interface WorkflowSummary { id?: string; name?: string; description?: string }
interface TraceSummary {
	trace_id?: string; name?: string; status?: string; duration?: string; input?: string; output?: string;
	agent_id?: string; team_id?: string; workflow_id?: string; start_time?: string;
	metadata?: { input_tokens?: number; output_tokens?: number; model?: string };
}

export const AGNO_STATUS_VIEW_ID = 'workbench.view.agnoStatus';

export class AgnoStatusViewPane extends ViewPane {

	private _contentEl: HTMLElement | null = null;
	private _refreshTimer: ReturnType<typeof setInterval> | null = null;

	constructor(
		options: IViewPaneOptions,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IHoverService hoverService: IHoverService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IAgnoClientBridge private readonly _agnoBridge: IAgnoClientBridge,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	override dispose(): void {
		if (this._refreshTimer) {
			clearInterval(this._refreshTimer);
			this._refreshTimer = null;
		}
		super.dispose();
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.classList.add('agno-status-view');

		this._contentEl = append(container, $('.agno-status-content'));
		this._renderStatus(this._contentEl);

		this._register(this._agnoBridge.onDidChangeBackendStatus(() => this._contentEl && this._renderStatus(this._contentEl)));
	}

	private _renderStatus(container: HTMLElement): void {
		container.textContent = '';
		const status = this._agnoBridge.backendStatus;
		const label = statusLabels[status];

		const row = append(container, $('.agno-status-row'));
		const icon = append(row, $('.agno-status-icon'));
		icon.classList.add(...ThemeIcon.asClassNameArray(label.icon));
		const text = append(row, $('.agno-status-text'));
		text.textContent = label.text;
		const detail = append(container, $('.agno-status-detail'));
		detail.textContent = label.detail;

		if (status === 'running') {
			const url = append(container, $('.agno-status-url'));
			url.textContent = AGNO_BASE;

			const refreshBtn = append(container, $('button.agno-status-refresh'));
			refreshBtn.textContent = localize('agno.refresh', 'Atualizar');
			refreshBtn.onclick = () => this._contentEl && this._loadAndRenderDetails(this._contentEl);

			const details = append(container, $('.agno-status-details'));
			details.classList.add('agno-status-loading');
			details.textContent = localize('agno.loading', 'Carregando...');

			this._loadAndRenderDetails(container);
			if (!this._refreshTimer) {
				this._refreshTimer = setInterval(() => {
					if (this._agnoBridge.backendStatus === 'running' && this._contentEl)
						this._loadAndRenderDetails(this._contentEl);
				}, 15000);
			}
		} else {
			if (this._refreshTimer) {
				clearInterval(this._refreshTimer);
				this._refreshTimer = null;
			}
		}
	}

	private async _loadAndRenderDetails(container: HTMLElement): Promise<void> {
		const detailsEl = container.querySelector('.agno-status-details') as HTMLElement | null;
		if (!detailsEl) return;

		try {
			const [agents, teams, workflows, traces] = await Promise.all([
				this._fetchJson<AgentSummary[]>(`${AGNO_BASE}/agents`),
				this._fetchJson<TeamSummary[]>(`${AGNO_BASE}/teams`),
				this._fetchJson<WorkflowSummary[]>(`${AGNO_BASE}/workflows`),
				this._fetchJson<{ data?: TraceSummary[] }>(`${AGNO_BASE}/traces?limit=5`),
			]);

			detailsEl.textContent = '';
			detailsEl.classList.remove('agno-status-loading', 'agno-status-error');

			this._renderSection(detailsEl, localize('agno.agents', 'Agentes'), agents ?? [], (a) =>
				`${a.name ?? a.id ?? '?'}${a.model?.model ? ` (${a.model.model})` : ''}`
			);
			this._renderSection(detailsEl, localize('agno.teams', 'Teams'), teams ?? [], (t) =>
				`${t.name ?? t.id ?? '?'}${Array.isArray(t.members) ? ` (${t.members.length} membros)` : ''}`
			);
			this._renderSection(detailsEl, localize('agno.workflows', 'Workflows'), workflows ?? [], (w) =>
				`${w.name ?? w.id ?? '?'}`
			);

			const traceList = traces?.data ?? [];
			if (traceList.length > 0) {
				const tracesSection = append(detailsEl, $('.agno-status-section'));
				const h3 = append(tracesSection, $('h3.agno-status-section-title'));
				h3.textContent = localize('agno.recentTraces', 'Traces recentes');
				const list = append(tracesSection, $('.agno-status-list'));
				for (const t of traceList) {
					const item = append(list, $('.agno-status-trace-item'));
					const name = append(item, $('.agno-status-trace-name'));
					name.textContent = t.name ?? t.trace_id ?? '?';
					const meta = append(item, $('.agno-status-trace-meta'));
					const parts: string[] = [];
					if (t.status) parts.push(t.status);
					if (t.duration) parts.push(t.duration);
					if (t.agent_id) parts.push(`agent: ${t.agent_id}`);
					if (t.workflow_id) parts.push(`wf: ${t.workflow_id}`);
					const inTok = (t as TraceSummary & { input_tokens?: number }).input_tokens ?? t.metadata?.input_tokens;
					const outTok = (t as TraceSummary & { output_tokens?: number }).output_tokens ?? t.metadata?.output_tokens;
					if (inTok != null || outTok != null) parts.push(`tokens: ${inTok ?? 0}+${outTok ?? 0}`);
					meta.textContent = parts.join(' · ');
					if (t.input) {
						const input = append(item, $('.agno-status-trace-input'));
						input.textContent = t.input.length > 80 ? t.input.slice(0, 80) + '…' : t.input;
					}
					if (t.output) {
						const output = append(item, $('.agno-status-trace-output'));
						output.textContent = t.output.length > 120 ? t.output.slice(0, 120) + '…' : t.output;
					}
				}
			}
		} catch (e) {
			detailsEl.textContent = localize('agno.fetchError', 'Erro ao carregar: {0}', String(e));
			detailsEl.classList.remove('agno-status-loading');
			detailsEl.classList.add('agno-status-error');
		}
	}

	private _renderSection<T>(parent: HTMLElement, title: string, items: T[], labelFn: (item: T) => string): void {
		if (items.length === 0) return;
		const section = append(parent, $('.agno-status-section'));
		const h3 = append(section, $('h3.agno-status-section-title'));
		h3.textContent = `${title} (${items.length})`;
		const list = append(section, $('.agno-status-list'));
		for (const item of items) {
			const li = append(list, $('.agno-status-list-item'));
			li.textContent = labelFn(item);
		}
	}

	private async _fetchJson<T>(url: string): Promise<T | null> {
		try {
			const r = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
			if (!r.ok) return null;
			return await r.json() as T;
		} catch {
			return null;
		}
	}
}
