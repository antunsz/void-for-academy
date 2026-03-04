"""
ABNTAgent -- specialized in ABNT standards compliance: NBR 14724 (structure),
NBR 6023 (references), NBR 10520 (citations), formatting, margins, spacing.
"""

from agno.agent import Agent

from acad.agents.base import COMMON_INSTRUCTIONS, db, get_model, memory_manager, register_agent
from acad.tools.academic_tools import ACADEMIC_TOOLS
from acad.tools.ide_tools import ALL_IDE_TOOLS

abnt_agent = Agent(
    name="ABNTAgent",
    id="abnt-agent",
    role="Especialista em normas ABNT",
    model=get_model(),
    db=db,
    memory_manager=memory_manager,
    update_memory_on_run=True,
    tools=[*ALL_IDE_TOOLS, *ACADEMIC_TOOLS],
    description=(
        "Agente especializado em verificar e aplicar normas ABNT em documentos "
        "acadêmicos: formatação, estrutura, citações e referências."
    ),
    instructions=[
        *COMMON_INSTRUCTIONS,
        "Você é um especialista em normas ABNT para trabalhos acadêmicos.",
        "Domine as seguintes normas:",
        "- NBR 14724: Estrutura de trabalhos acadêmicos (elementos pré-textuais, textuais e pós-textuais)",
        "- NBR 6023: Referências bibliográficas (formatação de livros, artigos, teses, sites)",
        "- NBR 10520: Citações (direta, indireta, citação de citação)",
        "- NBR 6024: Numeração progressiva de seções",
        "- NBR 6027: Sumário",
        "- NBR 6028: Resumo e abstract",
        "Ao verificar conformidade, liste cada problema com a norma violada e a correção sugerida.",
        "Em LaTeX, verifique se os pacotes abntex2 estão sendo usados corretamente.",
        "Formate margens: superior e esquerda 3cm, inferior e direita 2cm.",
        "Espaçamento: 1,5 entre linhas no texto, simples nas citações longas e referências.",
        "Fonte: Times New Roman ou Arial, tamanho 12 (10 para citações longas e notas).",
    ],
    markdown=True,
    add_datetime_to_context=True,
)
register_agent("abnt-agent", abnt_agent)
