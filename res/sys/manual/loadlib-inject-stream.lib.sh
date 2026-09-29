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

    When -- is absent, no command body is appended and the generated program
    does not alter positional parameters merely as a consequence of command
    setup.

    When -- is present, it must be followed by one readable command-source.
    After loading the selected libraries, the generated program reconstructs the
    supplied command positional parameters and appends command-source unchanged.

    Independently of command mode, when standard input is not a TTY the
    generator appends that input as POSIX shell source after the selected
    libraries and any command-source. A separating newline is emitted before
    the input source so it cannot merge with a command-source that lacks a final
    newline. The input is source to be generated, not runtime stdin for the
    generated command.

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

        All supplied library and command-source path inputs are validated before
        source emission begins.

        When standard input is not a TTY, it is copied after all generated
        library and optional command source. The copied text executes later in
        the same shell environment and therefore can use injected functions and
        observe shell state left by the preceding command source.

        When command-source and standard-input source are both present, ordinary
        POSIX shell control flow applies across the combined program. The
        standard-input source is reached only if execution of command-source
        returns or falls through to it. A command-source that executes exit,
        exec, or otherwise terminates or replaces the shell prevents subsequent
        input source from running. The generator does not alter, isolate, or
        compensate for those shell semantics; callers composing both components
        are responsible for their compatibility.

OUTPUT
    Successful execution writes exactly one generated POSIX-sh program to
    standard output.

    With no selected libraries, the program still contains an in-memory loadlib
    whose unknown-reference result is status 2.

    With no -- separator, the output contains the in-memory library loading
    environment and requested library loads, followed by non-TTY stdin source
    when supplied. With --, command setup and command-source are inserted before
    that optional stdin source.

    The output contains no dependency-discovery metadata and requires no remote
    m library tree for the embedded libraries.

RETURN STATUS
    0   Stream generated successfully.
    1   Invalid invocation, empty library reference, or -- without command-source.
    2   command-source or a selected library is not a readable regular file.
    3   Quoting, input copying or output generation failed.

CALLER OBLIGATIONS
    The caller must explicitly embed every library that may be loaded while the
    generated program is running, including transitive dependencies and
    runtime-selected candidates.

    Selected libraries are loaded in caller-supplied order. The caller owns any
    ordering and repeated-sourcing consequences.

    Standard input accepted by this generator is shell source to append to the
    generated program. It is not preserved as runtime stdin for command-source.

    This generator does not execute or transport the generated program. A
    transport such as rsudo may consume its generated output through standard
    input.

    The generator itself runs inside the normal m runtime and relies on
    m_LIB_DIR and quote.

SEE ALSO
    rsudo
