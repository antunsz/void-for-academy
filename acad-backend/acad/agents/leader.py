"""
AcadLeader -- coordinator agent and team definition.

The leader delegates tasks to specialized agents (Writer, Reviewer, ABNT,
References) and synthesizes their outputs for the user.

We also expose a standalone AcadAgent that has all capabilities in one agent,
used for the primary chat interface (supports continue_run for external tools).
"""

from agno.agent import Agent
from agno.team import Team
from agno.team.team import TeamMode

from acad.agents.abnt import abnt_agent
from acad.agents.base import COMMON_INSTRUCTIONS, db, get_model, memory_manager, register_agent
from acad.agents.references import references_agent
from acad.agents.reviewer import reviewer_agent
from acad.agents.writer import writer_agent
from acad.tools.academic_tools import ACADEMIC_TOOLS
from acad.tools.ide_tools import ALL_IDE_TOOLS

# ---------------------------------------------------------------------------
# Standalone agent -- primary chat interface
# ---------------------------------------------------------------------------
# This single agent handles ALL academic tasks and has ALL tools.
# It is exposed via /agents/acad-agent/runs and supports continue_run
# for external tool execution from the Electron IDE.

acad_agent = Agent(
    name="AcadAgent",
    id="acad-agent",
    role="Assistente acadêmico completo",
    model=get_model(),
    db=db,
    memory_manager=memory_manager,
    update_memory_on_run=True,
    tools=[*ALL_IDE_TOOLS, *ACADEMIC_TOOLS],
    description=(
        "Assistente acadêmico completo especializado em escrita, revisão, "
        "formatação ABNT, referências bibliográficas e compilação LaTeX."
    ),
    instructions=[
        *COMMON_INSTRUCTIONS,
        "Você é um assistente acadêmico completo para trabalhos em LaTeX com normas ABNT.",
        "Você pode:",
        "- Redigir e estruturar capítulos acadêmicos (introdução, fundamentação, metodologia, etc.)",
        "- Revisar textos quanto à gramática, coesão e coerência",
        "- Verificar e aplicar normas ABNT (NBR 14724, NBR 6023, NBR 10520)",
        "- Gerenciar referências bibliográficas e gerar BibTeX",
        "- Compilar documentos LaTeX",
        "- Criar e editar arquivos no projeto do usuário",
        "",
        "Use as ferramentas de IDE para ler, editar e criar arquivos no workspace do usuário.",
        "Use as ferramentas acadêmicas para formatar referências e validar citações.",
        "Use compile_latex para compilar o documento quando solicitado.",
        "",
        "Quando o usuário pedir para editar um arquivo, SEMPRE use a ferramenta edit_file ou rewrite_file.",
        "Quando precisar entender o contexto, leia os arquivos relevantes primeiro.",
        "Só use ferramentas se elas ajudarem a realizar a tarefa do usuário.",
    ],
    markdown=True,
    add_datetime_to_context=True,
    add_history_to_context=True,
    num_history_runs=5,
)
register_agent("acad-agent", acad_agent)

# ---------------------------------------------------------------------------
# Multi-agent team -- for orchestrated collaborative tasks
# ---------------------------------------------------------------------------

acad_team = Team(
    name="AcadTeam",
    id="acad-team",
    mode=TeamMode.coordinate,
    model=get_model(),
    members=[
        writer_agent,
        reviewer_agent,
        abnt_agent,
        references_agent,
    ],
    db=db,
    description=(
        "Time de agentes especializados em escrita acadêmica que colaboram "
        "para produzir documentos de alta qualidade em LaTeX com normas ABNT."
    ),
    instructions=[
        "Você coordena um time de especialistas em escrita acadêmica.",
        "Delegue cada tarefa ao agente mais adequado:",
        "- WriterAgent: redação de textos, estruturação de capítulos, argumentação",
        "- ReviewerAgent: revisão gramatical, coesão, coerência, qualidade textual",
        "- ABNTAgent: verificação de normas ABNT, formatação, estrutura do documento",
        "- ReferencesAgent: referências bibliográficas, BibTeX, citações",
        "",
        "Combine os resultados dos agentes em uma resposta coerente para o usuário.",
        "Sempre responda em Português (Brasil).",
        "Se a tarefa é simples e não precisa de múltiplos agentes, resolva diretamente.",
    ],
    markdown=True,
    add_datetime_to_context=True,
)
register_agent("acad-team", acad_team)
