NAME
    rsudo-mod-exec.lib.sh - rsudo source-injection execution module

SYNOPSIS
    rsudo [rsudo-options...] exec inject
          [library-reference...] [-- command-source [command-arg...]]

DESCRIPTION
    rsudo-mod-exec.lib.sh provides source-injection execution operations for the
    rsudo dispatcher.

    exec inject composes loadlib_inject_stream with a recursive rsudo call. The
    generator owns in-memory library embedding, optional command-source setup and
    optional non-TTY stdin source. The module owns only composition with rsudo
    transport.

FUNCTIONS
    rsudo_mod_exec_inject [library-reference...]
                          [-- command-source [command-arg...]]

        Generate the requested injection stream and pipe it into a recursive
        rsudo invocation.

        Zero or more library references may be selected. Their semantics and the
        optional command-source contract are defined by
        loadlib-inject-stream.lib.sh.

        Non-TTY standard input remaining after any outer rsudo password
        acquisition is consumed by loadlib_inject_stream and appended as shell
        source after the generated libraries and optional command-source.

        Combining an optional command-source with subsequent input source follows
        ordinary POSIX shell semantics. If the command-source executes exit,
        exec, or otherwise terminates or replaces the shell, the later input
        source is not executed. exec inject does not impose a compatibility
        convention on arbitrary command sources; the caller is responsible for
        composing sources whose control flow permits the intended continuation.

        The recursive rsudo invocation reuses current connection and credential
        state and inherits current RSUDO_AS_USER and RSUDO_INTERACTIVE state.
        Invocation-local askpass and no-preserve-quotes modes are handled by
        rsudo according to its own contract.

        The operation enables POSIX pipefail for its generator-to-rsudo pipeline
        so a generator or rsudo failure yields a non-zero result.

RETURN STATUS
    The pipeline result under POSIX pipefail. Successful generation and remote
    execution return the recursive rsudo status; generator or transport failure
    is non-zero.

DEPENDENCIES
    loadlib-inject-stream.lib.sh
    rsudo.lib.sh through the active rsudo dispatcher/runtime

SEE ALSO
    rsudo
    rsudo.lib.sh
    loadlib-inject-stream.lib.sh
