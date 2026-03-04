"""
Workflow: Reference management.

Dedicated workflow for managing bibliographic references:
verify existing, format to ABNT, generate BibTeX entries.
"""

from agno.workflow import Step, Workflow

from acad.agents.references import references_agent

references_workflow = Workflow(
    name="ReferencesWorkflow",
    id="references-management",
    description=(
        "Gestão de referências bibliográficas: verificação de citações, "
        "formatação ABNT e geração de entradas BibTeX."
    ),
    steps=[
        Step(
            name="Gestão de Referências",
            description=(
                "Verificar e formatar todas as referências do documento. "
                "Gerar entradas BibTeX, verificar correspondência citações/referências."
            ),
            executor=references_agent,
        ),
    ],
)
