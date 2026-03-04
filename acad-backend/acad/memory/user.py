"""
User preferences memory.

Agno's MemoryManager with add_memories=True and update_memories=True
automatically extracts and stores user preferences across sessions.
This module documents the types of information persisted.

Memories automatically captured include:
- Academic work type (TCC, dissertação, tese)
- Institution name and program
- Formatting preferences (compiler, citation style)
- Topic/research area
- Advisor name
- Writing style preferences
"""

from agno.memory import MemoryManager

from acad.agents.base import db


def get_user_memory() -> MemoryManager:
    """Build a user memory manager instance with academic context tracking."""
    return MemoryManager(
        db=db,
        add_memories=True,
        update_memories=True,
    )
