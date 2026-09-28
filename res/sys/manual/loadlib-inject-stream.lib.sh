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

    base must be included explicitly in the supplied library-reference list.
    The generated program installs one wrapper for every selected library and an
    in-memory loadlib implementation whose case dispatches directly to exactly
    those generated wrappers.

    The generated program then loads the embedded base library through that
    in-memory loadlib. base establishes the common runtime, including loadsyslib,
    without replacing the injected loadlib implementation. core.lib.sh is the
    normal filesystem-loader bootstrap adapter and is not the injected runtime
    foundation.

    A library reference that is not embedded returns status 2 from the generated
    loadlib implementation rather than falling back to a remote m library tree.

    After base has established the common runtime, the generated program sets
    the command positional parameters from command-arg... and appends
    command-source unchanged.

FUNCTIONS
    loadlib_inject_stream command-source library-reference... -- [command-arg...]
        Write the generated shell program to standard output.

        command-source must name one readable regular file containing the
        command body to append to the generated program.

        Every library-reference is relative to lib/sys/sh and omits the final
        .lib.sh suffix. The complete set is caller-owned; base is mandatory.

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
    1   Invalid invocation, missing -- separator, no library references, or base
        was not explicitly selected.
    2   command-source or a selected library is not a readable regular file.
    3   Quoting or output generation failed.

CALLER OBLIGATIONS
    The caller must name every library that the command may load, including
    transitive dependencies and every runtime-selected candidate.

    This generator does not execute or transport the generated program. A
    transport such as rsudo --interactive may consume it through standard input.

    The generator runs inside the normal m runtime and relies on m_LIB_DIR and
    the common base runtime's quote function.

SEE ALSO
    rsudo
