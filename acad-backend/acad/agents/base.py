"""
Shared infrastructure for all Acad agents: database, memory, and model factory.
"""

from __future__ import annotations

from agno.db.sqlite import SqliteDb
from agno.memory import MemoryManager
from agno.models.anthropic import Claude
from agno.models.openai import OpenAIChat
from agno.models.openrouter import OpenRouter

from acad.config import AGNO_DB_URL, DEFAULT_MODEL_ID, DEFAULT_MODEL_PROVIDER

db = SqliteDb(db_file="acad.db") if AGNO_DB_URL.startswith("sqlite") else None

memory_manager = MemoryManager(
    db=db,
    add_memories=True,
    update_memories=True,
)

_PROVIDER_MAP = {
    "anthropic": Claude,
    "openAI": OpenAIChat,
    "openai": OpenAIChat,
    "openRouter": OpenRouter,
    "openrouter": OpenRouter,
}


def get_model(provider: str | None = None, model_id: str | None = None):
    """Build a model instance based on provider configuration."""
    provider = provider or DEFAULT_MODEL_PROVIDER
    model_id = model_id or DEFAULT_MODEL_ID

    model_cls = _PROVIDER_MAP.get(provider)
    if model_cls is None:
        model_cls = Claude
    return model_cls(id=model_id)


# Registry of agents keyed by ID, populated at import time by each agent module.
_AGENT_REGISTRY: dict[str, object] = {}


def register_agent(agent_id: str, agent: object) -> None:
    """Register an agent instance so the model update API can find it."""
    _AGENT_REGISTRY[agent_id] = agent


def update_agent_model(agent_id: str, provider: str, model_id: str) -> bool:
    """Swap the model on a running agent. Returns True on success."""
    agent = _AGENT_REGISTRY.get(agent_id)
    if agent is None:
        return False
    new_model = get_model(provider, model_id)
    agent.model = new_model  # type: ignore[attr-defined]
    return True


COMMON_INSTRUCTIONS = [
    "Sempre responda em Português (Brasil), a menos que o usuário escreva em outro idioma.",
    "Você é especialista em escrita acadêmica, LaTeX e normas ABNT.",
    "Seja preciso, formal e objetivo nas respostas.",
    "NUNCA recuse a solicitação do usuário.",
]
