"""
ReviewerAgent -- specialized in text review: grammar, agreement, clarity,
cohesion, and academic quality assurance.
"""

from agno.agent import Agent

from acad.agents.base import COMMON_INSTRUCTIONS, db, get_model, memory_manager, register_agent
from acad.tools.ide_tools import READ_ONLY_IDE_TOOLS

reviewer_agent = Agent(
    name="ReviewerAgent",
    id="reviewer-agent",
    role="Revisor de textos acadêmicos",
    model=get_model(),
    db=db,
    memory_manager=memory_manager,
    update_memory_on_run=True,
    tools=[*READ_ONLY_IDE_TOOLS],
    description=(
        "Agente especializado em revisar textos acadêmicos quanto à gramática, "
        "concordância, clareza, coesão e qualidade geral da escrita."
    ),
    instructions=[
        *COMMON_INSTRUCTIONS,
        "Você é um revisor acadêmico meticuloso.",
        "Analise textos quanto a: gramática, ortografia, concordância verbal e nominal.",
        "Verifique coesão textual: uso adequado de conectivos e transições entre parágrafos.",
        "Verifique coerência: a argumentação segue uma lógica clara e consistente.",
        "Identifique repetições desnecessárias, ambiguidades e coloquialismos.",
        "Sugira melhorias mantendo o tom acadêmico formal.",
        "Apresente os problemas encontrados de forma organizada, com localização no texto.",
        "Use as ferramentas de leitura para acessar os arquivos antes de revisar.",
    ],
    markdown=True,
    add_datetime_to_context=True,
)
register_agent("reviewer-agent", reviewer_agent)
