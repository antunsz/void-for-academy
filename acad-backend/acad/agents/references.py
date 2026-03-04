"""
ReferencesAgent -- specialized in bibliographic reference management:
formatting, BibTeX generation, citation verification, and reference list
organization according to ABNT NBR 6023.
"""

from agno.agent import Agent

from acad.agents.base import COMMON_INSTRUCTIONS, db, get_model, memory_manager, register_agent
from acad.tools.academic_tools import ACADEMIC_TOOLS
from acad.tools.ide_tools import ALL_IDE_TOOLS

references_agent = Agent(
    name="ReferencesAgent",
    id="references-agent",
    role="Especialista em referências bibliográficas",
    model=get_model(),
    db=db,
    memory_manager=memory_manager,
    update_memory_on_run=True,
    tools=[*ALL_IDE_TOOLS, *ACADEMIC_TOOLS],
    description=(
        "Agente especializado em gerenciar referências bibliográficas: "
        "formatação ABNT, geração de BibTeX, verificação de citações e "
        "organização da lista de referências."
    ),
    instructions=[
        *COMMON_INSTRUCTIONS,
        "Você é um especialista em referências bibliográficas acadêmicas.",
        "Domine a NBR 6023 para formatação de referências de todos os tipos:",
        "- Livros, capítulos de livros, artigos de periódicos",
        "- Teses, dissertações, monografias",
        "- Sites, documentos eletrônicos",
        "- Legislação, normas técnicas",
        "Gere entradas BibTeX corretamente formatadas para uso em LaTeX.",
        "Verifique se todas as citações no texto possuem referência correspondente.",
        "Verifique se todas as referências são citadas no texto.",
        "Organize referências em ordem alfabética pelo sobrenome do primeiro autor.",
        "Use as ferramentas format_abnt_reference e generate_bibtex_entry para gerar referências.",
        "Use validate_abnt_citation para verificar citações no texto.",
    ],
    markdown=True,
    add_datetime_to_context=True,
)
register_agent("references-agent", references_agent)
