NAME
    loadlib-inject-stream.lib.sh - generate explicit in-memory library streams

SYNOPSIS
    loadsyslib "loadlib-inject-stream"

    loadlib_inject_stream [library-reference...] [-- command-source [command-arg...]]

DESCRIPTION
    loadlib-inject-stream.lib.sh generates one POSIX-sh source program suitable
    for source injection through transports such as rsudo --interactive.

    The caller supplies zero or more embedded system-shell-library references
    explicitly. No library identity is intrinsically mandatory or special. The
    generator does not parse the command or libraries, discover dependencies, or
    compute transitive closure.

    The generated program installs one wrapper for every selected library and an
    in-memory loadlib implementation whose case dispatches directly to exactly
    those generated wrappers. It then loads every selected library through that
    in-memory loadlib in the same order in which the references were supplied.

    A library reference that is not embedded returns status 2 from the generated
    loadlib implementation rather than falling back to a remote m library tree.

    When -- is absent, generation stops after the selected libraries have been
    loaded. No command body is appended and the generated program does not alter
    the receiving shell's positional parameters.

    When -- is present, it must be followed by one readable command-source.
    After loading the selected libraries, the generated program reconstructs the
    supplied command positional parameters and appends command-source unchanged.

FUNCTIONS
    loadlib_inject_stream [library-reference...] [-- command-source [command-arg...]]
        Write the generated shell program to standard output.

        Every library-reference is relative to lib/sys/sh and omits the final
        .lib.sh suffix. Zero library references are valid. Each selected library
        is embedded and then loaded through the generated in-memory loadlib in
        caller-supplied order.

        If a selected library itself loads another library, that dependency must
        also be embedded explicitly. Because every selected reference is also
        loaded explicitly, callers are responsible for any repeated sourcing
        that results when selected libraries load one another.

        -- terminates the library-reference list and enables command mode.
        command-source is mandatory when -- is present and must name one readable
        regular file containing the command body to append to the generated
        program.

        Remaining command-arg operands become the positional parameters received
        by command-source. Their shell-string identity, including whitespace and
        empty operands, is preserved through the existing quote primitive.

        All supplied library and command-source inputs are validated before
        source emission begins.

OUTPUT
    Successful execution writes exactly one generated POSIX-sh program to
    standard output.

    With no selected libraries, the program still contains an in-memory loadlib
    whose unknown-reference result is status 2.

    With no -- separator, the output contains only the in-memory library loading
    environment and the requested library loads. With --, the command setup and
    command-source follow that environment.

    The output contains no dependency-discovery metadata and requires no remote
    m library tree for the embedded libraries.

RETURN STATUS
    0   Stream generated successfully.
    1   Invalid invocation, empty library reference, or -- without command-source.
    2   command-source or a selected library is not a readable regular file.
    3   Quoting or output generation failed.

CALLER OBLIGATIONS
    The caller must explicitly embed every library that may be loaded while the
    generated program is running, including transitive dependencies and
    runtime-selected candidates.

    Selected libraries are loaded in caller-supplied order. The caller owns any
    ordering and repeated-sourcing consequences.

    This generator does not execute or transport the generated program. A
    transport such as rsudo --interactive may consume it through standard input.

    The generator itself runs inside the normal m runtime and relies on
    m_LIB_DIR and quote.

SEE ALSO
    rsudo
