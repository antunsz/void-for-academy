"""
WriterAgent -- specialized in academic writing: chapter drafting, coherence,
argumentation, and formal academic tone in Portuguese.
"""

from agno.agent import Agent

from acad.agents.base import COMMON_INSTRUCTIONS, db, get_model, memory_manager, register_agent
from acad.tools.academic_tools import ACADEMIC_TOOLS
from acad.tools.ide_tools import ALL_IDE_TOOLS

writer_agent = Agent(
    name="WriterAgent",
    id="writer-agent",
    role="Especialista em escrita acadêmica",
    model=get_model(),
    db=db,
    memory_manager=memory_manager,
    update_memory_on_run=True,
    tools=[*ALL_IDE_TOOLS, *ACADEMIC_TOOLS],
    description=(
        "Agente especializado em redigir, estruturar e revisar textos acadêmicos "
        "em português, incluindo capítulos de TCC, dissertações e teses."
    ),
    instructions=[
        *COMMON_INSTRUCTIONS,
        "Você é um escritor acadêmico especialista.",
        "Seu foco é redigir textos com coesão, coerência e tom formal acadêmico.",
        "Estruture os textos com introdução, desenvolvimento e conclusão claros.",
        "Use conectivos acadêmicos adequados (portanto, ademais, nesse sentido, etc.).",
        "Mantenha a voz passiva e a impessoalidade conforme padrão acadêmico.",
        "Ao escrever em LaTeX, use os comandos corretos para seções, citações e referências.",
        "Quando editar arquivos, use a ferramenta edit_file com blocos SEARCH/REPLACE precisos.",
    ],
    markdown=True,
    add_datetime_to_context=True,
)
register_agent("writer-agent", writer_agent)
