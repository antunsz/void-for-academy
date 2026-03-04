"""
Workflow: Write and review a chapter.

Pipeline: WriterAgent -> ReviewerAgent -> ABNTAgent -> ReferencesAgent
Each step refines the output of the previous one.
"""

from agno.workflow import Step, Workflow

from acad.agents.abnt import abnt_agent
from acad.agents.references import references_agent
from acad.agents.reviewer import reviewer_agent
from acad.agents.writer import writer_agent

write_chapter_workflow = Workflow(
    name="WriteChapterWorkflow",
    id="write-chapter",
    description=(
        "Pipeline completo para escrita de um capítulo acadêmico: "
        "redação, revisão textual, verificação ABNT e referências."
    ),
    steps=[
        Step(
            name="Redação",
            description="Redigir o rascunho do capítulo com estrutura acadêmica.",
            executor=writer_agent,
        ),
        Step(
            name="Revisão Textual",
            description="Revisar gramática, coesão, coerência e qualidade textual.",
            executor=reviewer_agent,
        ),
        Step(
            name="Verificação ABNT",
            description="Verificar conformidade com normas ABNT.",
            executor=abnt_agent,
        ),
        Step(
            name="Referências",
            description="Verificar e formatar referências bibliográficas.",
            executor=references_agent,
        ),
    ],
)
