"""
ABNT norms knowledge base for RAG.

Searches text files in the knowledge/abnt/ directory.
Uses FileSystemKnowledge for grep/list/get_file tools.
"""

from pathlib import Path

from agno.knowledge.filesystem import FileSystemKnowledge


class _FileSystemKnowledgeCompat(FileSystemKnowledge):
    """Add contents_db=None for AgentOS compatibility."""

    contents_db = None


KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge" / "abnt"

abnt_knowledge = _FileSystemKnowledgeCompat(
    base_dir=str(KNOWLEDGE_DIR),
    max_results=10,
)
