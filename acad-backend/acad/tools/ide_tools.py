"""
IDE tools that execute in the Electron app via external_execution.

These tools are never called directly by the Agno backend -- the agent pauses,
the Electron client receives the tool request, executes it locally using VS Code
APIs, and sends the result back via the continue_run endpoint.
"""

from agno.tools import tool


@tool(external_execution=True)
def read_file(uri: str, start_line: int = -1, end_line: int = -1, page_number: int = 1) -> str:
    """Read the contents of a file in the user's workspace.

    Args:
        uri: Absolute path to the file.
        start_line: Optional start line (1-indexed). Use -1 to read from the beginning.
        end_line: Optional end line (1-indexed). Use -1 to read until the end.
        page_number: Page number for paginated reading of large files (default 1).

    Returns:
        The file contents as a string.
    """
    ...


@tool(external_execution=True)
def ls_dir(uri: str, page_number: int = 1) -> str:
    """List the contents of a directory in the user's workspace.

    Args:
        uri: Absolute path to the directory.
        page_number: Page number for paginated listing (default 1).

    Returns:
        A listing of the directory contents.
    """
    ...


@tool(external_execution=True)
def get_dir_tree(uri: str) -> str:
    """Get a tree-structured view of the directory hierarchy.

    Args:
        uri: Absolute path to the root directory.

    Returns:
        A tree representation of the directory.
    """
    ...


@tool(external_execution=True)
def search_pathnames_only(query: str, include_pattern: str = "", page_number: int = 1) -> str:
    """Search for files by name/path pattern in the workspace.

    Args:
        query: The search query string for file names.
        include_pattern: Optional glob pattern to filter results.
        page_number: Page number for paginated results (default 1).

    Returns:
        A list of matching file paths.
    """
    ...


@tool(external_execution=True)
def search_for_files(query: str, is_regex: bool = False, search_in_folder: str = "", page_number: int = 1) -> str:
    """Search for text content across files in the workspace.

    Args:
        query: The text or regex to search for within file contents.
        is_regex: Whether the query is a regular expression (default False).
        search_in_folder: Optional folder path to restrict the search scope.
        page_number: Page number for paginated results (default 1).

    Returns:
        A list of files containing the search query.
    """
    ...


@tool(external_execution=True)
def search_in_file(uri: str, query: str, is_regex: bool = False) -> str:
    """Search for text within a specific file.

    Args:
        uri: Absolute path to the file.
        query: The text or regex to search for.
        is_regex: Whether the query is a regular expression (default False).

    Returns:
        Line numbers where matches were found.
    """
    ...


@tool(external_execution=True)
def read_lint_errors(uri: str) -> str:
    """Read linter/diagnostic errors for a file.

    Args:
        uri: Absolute path to the file.

    Returns:
        A list of lint errors with codes, messages, and line numbers.
    """
    ...


@tool(external_execution=True)
def edit_file(uri: str, search_replace_blocks: str) -> str:
    """Edit a file using SEARCH/REPLACE blocks. Each block specifies original
    text to find and the replacement text.

    Args:
        uri: Absolute path to the file.
        search_replace_blocks: The search/replace blocks in the standard format.

    Returns:
        The result of the edit operation, including any lint errors.
    """
    ...


@tool(external_execution=True)
def rewrite_file(uri: str, new_content: str) -> str:
    """Rewrite an entire file, replacing all contents. Use this for files you
    just created or when a full rewrite is more appropriate than editing.

    Args:
        uri: Absolute path to the file.
        new_content: The new complete contents of the file.

    Returns:
        The result of the rewrite operation, including any lint errors.
    """
    ...


@tool(external_execution=True)
def create_file_or_folder(uri: str, is_folder: bool = False) -> str:
    """Create a new file or folder in the workspace.

    Args:
        uri: Absolute path for the new file or folder.
        is_folder: Whether to create a folder instead of a file (default False).

    Returns:
        Confirmation of creation.
    """
    ...


@tool(external_execution=True)
def delete_file_or_folder(uri: str, is_recursive: bool = False, is_folder: bool = False) -> str:
    """Delete a file or folder from the workspace.

    Args:
        uri: Absolute path to the file or folder.
        is_recursive: Whether to delete recursively for folders (default False).
        is_folder: Whether the target is a folder (default False).

    Returns:
        Confirmation of deletion.
    """
    ...


@tool(external_execution=True)
def run_command(command: str, cwd: str = "") -> str:
    """Run a terminal command and wait for the result.

    Args:
        command: The terminal command to execute.
        cwd: Working directory for the command. Defaults to workspace root.

    Returns:
        The command output and exit status.
    """
    ...


@tool(external_execution=True)
def open_persistent_terminal(cwd: str = "") -> str:
    """Open a persistent terminal for long-running processes like dev servers.

    Args:
        cwd: Working directory for the terminal. Defaults to workspace root.

    Returns:
        The persistent terminal ID.
    """
    ...


@tool(external_execution=True)
def run_persistent_command(command: str, persistent_terminal_id: str) -> str:
    """Run a command in an existing persistent terminal.

    Args:
        command: The terminal command to run.
        persistent_terminal_id: The ID of the persistent terminal.

    Returns:
        The command output.
    """
    ...


@tool(external_execution=True)
def kill_persistent_terminal(persistent_terminal_id: str) -> str:
    """Kill a persistent terminal.

    Args:
        persistent_terminal_id: The ID of the persistent terminal to close.

    Returns:
        Confirmation of termination.
    """
    ...


@tool(external_execution=True)
def compile_latex(uri: str, compiler: str = "latexmk", cwd: str = "") -> str:
    """Compile a LaTeX document and return the compilation output.

    Args:
        uri: Absolute path to the main .tex file.
        compiler: The LaTeX compiler to use: 'latexmk' (default), 'pdflatex', 'xelatex', or 'lualatex'.
        cwd: Working directory for compilation. Defaults to the file's directory.

    Returns:
        The compilation output including errors and warnings.
    """
    ...


ALL_IDE_TOOLS = [
    read_file,
    ls_dir,
    get_dir_tree,
    search_pathnames_only,
    search_for_files,
    search_in_file,
    read_lint_errors,
    edit_file,
    rewrite_file,
    create_file_or_folder,
    delete_file_or_folder,
    run_command,
    open_persistent_terminal,
    run_persistent_command,
    kill_persistent_terminal,
    compile_latex,
]

READ_ONLY_IDE_TOOLS = [
    read_file,
    ls_dir,
    get_dir_tree,
    search_pathnames_only,
    search_for_files,
    search_in_file,
    read_lint_errors,
]
