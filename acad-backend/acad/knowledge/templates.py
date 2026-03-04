"""
LaTeX templates knowledge base.

Searches LaTeX template files (TCC, dissertação, tese) in the knowledge/templates
directory so agents can retrieve relevant template structures.
"""

from pathlib import Path

from agno.knowledge.filesystem import FileSystemKnowledge


class _FileSystemKnowledgeCompat(FileSystemKnowledge):
    """Add contents_db=None for AgentOS compatibility."""

    contents_db = None


TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge" / "templates"

templates_knowledge = _FileSystemKnowledgeCompat(
    base_dir=str(TEMPLATES_DIR),
    max_results=5,
)
