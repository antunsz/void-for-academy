"""
Workflow: Full document review.

Pipeline: ReviewerAgent -> ABNTAgent -> ReferencesAgent
Performs a comprehensive review of an existing document.
"""

from agno.workflow import Step, Workflow

from acad.agents.abnt import abnt_agent
from acad.agents.references import references_agent
from acad.agents.reviewer import reviewer_agent

full_review_workflow = Workflow(
    name="FullReviewWorkflow",
    id="full-review",
    description=(
        "Revisão completa de um documento acadêmico: "
        "revisão textual, verificação ABNT e verificação de referências."
    ),
    steps=[
        Step(
            name="Revisão Textual",
            description="Revisar gramática, coesão, coerência e qualidade textual do documento.",
            executor=reviewer_agent,
        ),
        Step(
            name="Verificação ABNT",
            description="Verificar conformidade com normas ABNT (formatação, estrutura, citações).",
            executor=abnt_agent,
        ),
        Step(
            name="Referências",
            description="Verificar referências: completude, formato ABNT, correspondência com citações.",
            executor=references_agent,
        ),
    ],
)
