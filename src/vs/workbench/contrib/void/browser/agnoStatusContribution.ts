/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	Extensions as ViewContainerExtensions, IViewContainersRegistry,
	ViewContainerLocation, IViewsRegistry, Extensions as ViewExtensions,
} from '../../../common/views.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { localize, localize2 } from '../../../../nls.js';
import { AgnoStatusViewPane, AGNO_STATUS_VIEW_ID } from './agnoStatusViewPane.js';

export const AGNO_STATUS_VIEW_CONTAINER_ID = 'workbench.view.agnoStatus';

const agnoStatusIcon = registerIcon('agno-status-view-icon', Codicon.pulse, localize('agnoStatusViewIcon', 'Acad AI status icon.'));

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const agnoContainer = viewContainerRegistry.registerViewContainer({
	id: AGNO_STATUS_VIEW_CONTAINER_ID,
	title: localize2('agnoStatusContainer', 'Acad AI'),
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AGNO_STATUS_VIEW_CONTAINER_ID, {
		mergeViewWithContainerWhenSingleView: true,
		orientation: Orientation.VERTICAL,
	}]),
	storageId: 'workbench.agnoStatus.views.state',
	icon: agnoStatusIcon,
	order: 3,
	hideIfEmpty: false,
}, ViewContainerLocation.Sidebar, { doNotRegisterOpenCommand: false });

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
	id: AGNO_STATUS_VIEW_ID,
	containerTitle: localize('agnoStatusContainer', 'Acad AI'),
	name: localize2('agnoStatus', 'Status'),
	singleViewPaneContainerTitle: localize('agnoStatus', 'Status'),
	ctorDescriptor: new SyncDescriptor(AgnoStatusViewPane),
	canToggleVisibility: false,
	canMoveView: false,
	weight: 80,
	order: 1,
	containerIcon: agnoStatusIcon,
}], agnoContainer);
