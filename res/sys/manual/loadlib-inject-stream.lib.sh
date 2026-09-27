NAME
    loadlib-inject-stream.lib.sh - generate explicit in-memory library streams

SYNOPSIS
    loadsyslib "loadlib-inject-stream"

    loadlib_inject_stream command-source library-reference... -- [command-arg...]

DESCRIPTION
    loadlib-inject-stream.lib.sh generates one POSIX-sh source program suitable
    for source injection through transports such as rsudo --interactive.

    The caller supplies the complete embedded system-shell-library set
    explicitly. The generator does not parse the command or libraries, discover
    dependencies, or compute transitive closure.

    core must be included explicitly in the supplied library-reference list.
    The generated program installs the ordinary loadsyslib specialization, the
    in-memory loadlib backend from loadlib-inject.lib.sh, one wrapper for every
    selected library, and a dispatcher containing exactly those references.

    The generated program then loads core, sets the command positional
    parameters from command-arg..., and appends command-source unchanged.

FUNCTIONS
    loadlib_inject_stream command-source library-reference... -- [command-arg...]
        Write the generated shell program to standard output.

        command-source must name one readable regular file containing the
        command body to append to the generated program.

        Every library-reference is relative to lib/sys/sh and omits the final
        .lib.sh suffix. The complete set is caller-owned; core is mandatory.

        -- terminates the library-reference list. Remaining operands are the
        positional parameters that the generated command body receives. Their
        shell-string identity, including whitespace and empty operands, is
        preserved through the existing quote primitive.

        All command/library inputs are validated before source emission begins.
        A requested library that is omitted from the explicit set remains
        unavailable at runtime and loadlib returns status 2 for that reference.

OUTPUT
    Successful execution writes exactly one generated POSIX-sh program to
    standard output.

    The output contains no dependency-discovery metadata and requires no remote
    m library tree for the embedded libraries.

RETURN STATUS
    0   Stream generated successfully.
    1   Invalid invocation, missing -- separator, no library references, or core
        was not explicitly selected.
    2   command-source, loadlib-inject.lib.sh, or a selected library is not a
        readable regular file.
    3   Quoting or output generation failed.

CALLER OBLIGATIONS
    The caller must name every library that the command may load, including
    transitive dependencies and every runtime-selected candidate.

    This generator does not execute or transport the generated program. A
    transport such as rsudo --interactive may consume it through standard input.

    The generator runs inside the normal m runtime and relies on m_LIB_DIR and
    the core quote function.

SEE ALSO
    loadlib-inject.lib.sh
    rsudo
