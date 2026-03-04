"""
Utility to load/reload knowledge bases into vector storage.

Run this module directly to re-index all knowledge:
    python -m acad.knowledge.loader
"""

from acad.knowledge.abnt import abnt_knowledge
from acad.knowledge.templates import templates_knowledge


def load_all(recreate: bool = False) -> None:
    """Load all knowledge bases into vector storage."""
    print("Loading ABNT norms knowledge base...")
    abnt_knowledge.load(recreate=recreate)
    print("Loading LaTeX templates knowledge base...")
    templates_knowledge.load(recreate=recreate)
    print("All knowledge bases loaded.")


if __name__ == "__main__":
    load_all(recreate=True)
