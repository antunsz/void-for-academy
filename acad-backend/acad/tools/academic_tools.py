"""
Academic tools that run directly in the Python backend (no IDE access needed).
"""

import re

from agno.tools import tool


@tool
def format_abnt_reference(
    author: str,
    title: str,
    year: str,
    publisher: str = "",
    city: str = "",
    edition: str = "",
    pages: str = "",
    ref_type: str = "book",
) -> str:
    """Format a bibliographic reference according to ABNT NBR 6023 standards.

    Args:
        author: Author name(s) in 'LAST, First' format. Multiple authors separated by semicolons.
        title: Title of the work.
        year: Publication year.
        publisher: Publisher name (for books).
        city: City of publication (for books).
        edition: Edition number (e.g., '2' for 2nd edition).
        pages: Page range (e.g., '10-25').
        ref_type: Type of reference: 'book', 'article', 'thesis', 'website'.

    Returns:
        The formatted ABNT reference string.
    """
    author_upper = author.strip()

    if ref_type == "book":
        parts = [f"{author_upper}."]
        parts.append(f"**{title}**.")
        if edition:
            parts.append(f"{edition}. ed.")
        if city and publisher:
            parts.append(f"{city}: {publisher},")
        parts.append(f"{year}.")
        if pages:
            parts.append(f"{pages} p.")
        return " ".join(parts)

    elif ref_type == "article":
        parts = [f"{author_upper}."]
        parts.append(f"{title}.")
        if publisher:
            parts.append(f"**{publisher}**,")
        if city:
            parts.append(f"{city},")
        parts.append(f"{year}.")
        if pages:
            parts.append(f"p. {pages}.")
        return " ".join(parts)

    elif ref_type == "thesis":
        parts = [f"{author_upper}."]
        parts.append(f"**{title}**.")
        parts.append(f"{year}.")
        if pages:
            parts.append(f"{pages} f.")
        if publisher:
            parts.append(f"Dissertação (Mestrado) - {publisher},")
        if city:
            parts.append(f"{city},")
        parts.append(f"{year}.")
        return " ".join(parts)

    elif ref_type == "website":
        parts = [f"{author_upper}."]
        parts.append(f"**{title}**.")
        if publisher:
            parts.append(f"{publisher},")
        parts.append(f"{year}.")
        return " ".join(parts)

    return f"{author_upper}. {title}. {year}."


@tool
def validate_abnt_citation(citation: str) -> str:
    """Validate whether a citation follows ABNT NBR 10520 standards.

    Args:
        citation: The citation text to validate (e.g., '(SILVA, 2020, p. 45)').

    Returns:
        Validation result with suggestions for corrections if needed.
    """
    issues: list[str] = []

    direct_pattern = r"\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+),\s*(\d{4})(?:,\s*p\.\s*\d+(?:-\d+)?)?\)"
    indirect_pattern = r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+)\s*\((\d{4})\)"

    is_direct = bool(re.search(direct_pattern, citation))
    is_indirect = bool(re.search(indirect_pattern, citation))

    if not is_direct and not is_indirect:
        issues.append(
            "Formato não reconhecido como citação ABNT. "
            "Use '(SOBRENOME, ano)' para citação direta ou 'Sobrenome (ano)' para indireta."
        )

    if is_direct:
        if not re.search(r"[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,}", citation):
            issues.append("Em citações diretas entre parênteses, o sobrenome deve estar em MAIÚSCULAS.")

    if '"' in citation or "'" in citation:
        quoted = re.findall(r'["\'](.+?)["\']', citation)
        for q in quoted:
            if len(q.split()) > 3 and ", p." not in citation:
                issues.append("Citações diretas com mais de 3 palavras devem incluir a página (p. XX).")
                break

    if not issues:
        return "Citação está conforme ABNT NBR 10520."

    return "Problemas encontrados:\n" + "\n".join(f"- {i}" for i in issues)


@tool
def generate_bibtex_entry(
    key: str,
    author: str,
    title: str,
    year: str,
    entry_type: str = "book",
    publisher: str = "",
    journal: str = "",
    volume: str = "",
    pages: str = "",
    address: str = "",
    school: str = "",
) -> str:
    """Generate a BibTeX entry for use in LaTeX documents.

    Args:
        key: The citation key (e.g., 'silva2020').
        author: Author name(s).
        title: Title of the work.
        year: Publication year.
        entry_type: BibTeX entry type: 'book', 'article', 'mastersthesis', 'phdthesis', 'inproceedings'.
        publisher: Publisher name.
        journal: Journal name (for articles).
        volume: Volume number.
        pages: Page range.
        address: City/address of publication.
        school: University name (for theses).

    Returns:
        A formatted BibTeX entry string.
    """
    fields: list[str] = []
    fields.append(f"  author = {{{author}}}")
    fields.append(f"  title = {{{title}}}")
    fields.append(f"  year = {{{year}}}")

    if publisher:
        fields.append(f"  publisher = {{{publisher}}}")
    if journal:
        fields.append(f"  journal = {{{journal}}}")
    if volume:
        fields.append(f"  volume = {{{volume}}}")
    if pages:
        fields.append(f"  pages = {{{pages}}}")
    if address:
        fields.append(f"  address = {{{address}}}")
    if school:
        fields.append(f"  school = {{{school}}}")

    fields_str = ",\n".join(fields)
    return f"@{entry_type}{{{key},\n{fields_str}\n}}"


ACADEMIC_TOOLS = [
    format_abnt_reference,
    validate_abnt_citation,
    generate_bibtex_entry,
]
