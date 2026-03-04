/*--------------------------------------------------------------------------------------
 *  Academic Templates for Acad Editor
 *  LaTeX templates following ABNT standards (NBR 14724)
 *--------------------------------------------------------------------------------------*/

import { AcademicWorkType } from '../voidSettingsTypes.js';

export interface AcademicTemplate {
	workType: AcademicWorkType;
	label: string;
	description: string;
	files: { path: string; description: string }[];
}

export const academicTemplates: Record<AcademicWorkType, AcademicTemplate> = {
	tcc: {
		workType: 'tcc',
		label: 'TCC de Graduação',
		description: 'Trabalho de Conclusão de Curso seguindo normas ABNT com abnTeX2',
		files: [
			{ path: 'main.tex', description: 'Documento principal' },
			{ path: 'referencias.bib', description: 'Referências bibliográficas' },
			{ path: 'capitulos/01-introducao.tex', description: 'Capítulo 1 - Introdução' },
			{ path: 'capitulos/02-fundamentacao.tex', description: 'Capítulo 2 - Fundamentação Teórica' },
			{ path: 'capitulos/03-metodologia.tex', description: 'Capítulo 3 - Metodologia' },
			{ path: 'capitulos/04-resultados.tex', description: 'Capítulo 4 - Resultados e Discussão' },
			{ path: 'capitulos/05-conclusao.tex', description: 'Capítulo 5 - Considerações Finais' },
		],
	},
	dissertacao: {
		workType: 'dissertacao',
		label: 'Dissertação de Mestrado',
		description: 'Dissertação de Mestrado seguindo normas ABNT com abnTeX2',
		files: [
			{ path: 'main.tex', description: 'Documento principal' },
			{ path: 'referencias.bib', description: 'Referências bibliográficas' },
			{ path: 'capitulos/01-introducao.tex', description: 'Capítulo 1 - Introdução' },
		],
	},
	tese: {
		workType: 'tese',
		label: 'Tese de Doutorado',
		description: 'Tese de Doutorado seguindo normas ABNT com abnTeX2',
		files: [
			{ path: 'main.tex', description: 'Documento principal' },
			{ path: 'referencias.bib', description: 'Referências bibliográficas' },
		],
	},
};

export const templateDirName: Record<AcademicWorkType, string> = {
	tcc: 'tcc-abnt',
	dissertacao: 'dissertacao-abnt',
	tese: 'tese-abnt',
};
