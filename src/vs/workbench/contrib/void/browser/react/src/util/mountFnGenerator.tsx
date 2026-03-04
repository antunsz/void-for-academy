/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom/client'
import { _registerServices } from './services.js';


import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';

export const mountFnGenerator = (Component: (params: any) => React.ReactNode) => (rootElement: HTMLElement, accessor: ServicesAccessor, props?: any) => {
	if (typeof document === 'undefined') {
		console.error('index.tsx error: document was undefined')
		return
	}

	let disposables: { dispose: () => void }[] = []
	try {
		disposables = _registerServices(accessor)
	} catch (error) {
		console.error('Void services initialization failed', error)
		rootElement.textContent = 'Acad: falha ao inicializar serviços.'
		return
	}

	let root: ReactDOM.Root
	try {
		root = ReactDOM.createRoot(rootElement)
	} catch (error) {
		console.error('Void createRoot failed', error)
		rootElement.textContent = 'Acad: falha ao inicializar UI.'
		disposables.forEach(d => d.dispose())
		return
	}

	const rerender = (props?: any) => {
		try {
			root.render(<Component {...props} />)
		} catch (error) {
			console.error('Void render failed', error)
			rootElement.textContent = 'Acad: falha ao renderizar.'
		}
	}
	const dispose = () => {
		root.unmount();
		disposables.forEach(d => d.dispose());
	}

	rerender(props)

	const returnVal = {
		rerender,
		dispose,
	}
	return returnVal
}
