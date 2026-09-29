NAME
    loadlib-inject-stream.lib.sh - generate explicit in-memory injection streams

SYNOPSIS
    loadsyslib "loadlib-inject-stream"

    loadlib_inject_stream
        [library-reference | --command command-name local-source]...
        [-- command-source [command-arg...]]

DESCRIPTION
    loadlib-inject-stream.lib.sh generates one POSIX-sh source program suitable
    for source injection through transports such as rsudo --interactive.

    The caller explicitly selects zero or more embedded system-shell libraries
    and zero or more named command-source files. The generator performs no
    dependency discovery or automatic transitive closure.

    A library-reference is relative to lib/sys/sh and omits .lib.sh. Each
    selected library is embedded, exposed through the generated in-memory
    loadlib implementation and loaded in caller-supplied order.

    --command is repeatable. It associates one explicit POSIX shell function
    identifier with one readable local source file. The generated function has
    exactly command-name as its name and executes local-source inside a subshell
    on every invocation. Its arguments therefore become the source file's
    positional parameters for that invocation.

    The command subshell isolates positional parameters, ordinary variable and
    function definitions, traps, current directory, umask, additional file
    descriptors, shell-option changes and exit/exec effects from the containing
    generated program. Injected library functions and inherited environment
    remain available to the command subshell.

    A literal -- is non-repeatable and retains one-shot command mode. It must be
    followed by one readable command-source; remaining operands are its
    positional parameters. The one-shot source is generated inside a private
    subshell function and invoked once, so it receives the same isolation
    properties as a named --command source.

    Non-TTY standard input, when present, is appended verbatim as POSIX shell
    source after library loading, named-command definitions and the optional
    one-shot invocation. It is generated source, not runtime stdin for a named
    or one-shot command.

FUNCTIONS
    loadlib_inject_stream
        [library-reference | --command command-name local-source]...
        [-- command-source [command-arg...]]

        Write the generated shell program to standard output.

        library-reference
            Select one system shell library to embed and load. References and
            --command options may be interleaved before the final -- separator.

        --command command-name local-source
            Define a reusable generated command function.

            command-name must already be a portable POSIX shell function
            identifier: alphabetic or underscore first character, followed only
            by alphabetic characters, digits or underscore, and not a POSIX
            shell word that POSIX requires or permits an implementation to
            recognize as reserved.

            command-name loadlib and names beginning
            _loadlib_inject_stream_ are reserved by the generated runtime.
            Repeated registration of the same command-name is invalid.

            local-source must be one readable regular file. The source is
            embedded unchanged inside a subshell function named command-name.

            The generator does not inspect library or command-source contents
            for dependency or namespace collisions. Apart from reserved
            generator names and duplicate --command registrations, the caller
            owns compatibility between selected libraries and command names.

        -- command-source [command-arg...]
            Select one optional one-shot local command source. The separator may
            appear at most once and terminates parsing of library-reference and
            --command selectors.

            command-source must be a readable regular file. command-arg identity,
            including whitespace and empty operands, is preserved through the
            existing quote primitive.

            The one-shot source executes inside a private generated subshell
            function. If it is the last generated operation, its status is the
            generated program status. If appended stdin source follows, the
            first subsequent shell command may observe its status through the
            ordinary $? value.

        All selected library and command-source path inputs are validated before
        source emission begins.

OUTPUT
    Successful execution writes exactly one generated POSIX-sh program.

    Generated order is:

        library wrapper definitions and in-memory loadlib
        selected library loads
        named --command function definitions
        optional private one-shot command definition and invocation
        optional non-TTY stdin source

    With no selected libraries, the program still installs an in-memory loadlib
    whose unknown-reference result is status 2.

    Named commands remain defined in the containing generated shell after one
    invocation and may be called repeatedly by the one-shot command or by later
    stdin source. Each invocation executes in its own subshell.

    A separating newline precedes appended stdin source so it cannot merge
    lexically with generated command source.

RETURN STATUS
    0   Stream generated successfully.
    1   Invalid invocation, invalid/reserved/duplicate command-name, empty
        library reference, or -- without command-source.
    2   A selected library, named local-source or one-shot command-source is not
        a readable regular file.
    3   Quoting, input copying or output generation failed.

CALLER OBLIGATIONS
    The caller must explicitly embed every library that may be loaded while the
    generated program runs, including transitive dependencies and
    runtime-selected candidates.

    Selected libraries are loaded in caller-supplied order. The caller owns
    ordering, repeated-sourcing and non-reserved namespace-collision
    consequences.

    --command names are explicit shell identifiers chosen by the caller. The
    generator does not derive, sanitize or alias command names from filenames.

    Standard input accepted by this generator is shell source appended after the
    optional one-shot invocation. It is not preserved as runtime stdin for
    injected commands.

    The generator itself executes inside the normal m runtime and relies on
    m_LIB_DIR and quote. It does not execute or transport the generated program.

SEE ALSO
    rsudo
