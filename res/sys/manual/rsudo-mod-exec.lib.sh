NAME
    rsudo-mod-exec.lib.sh - rsudo source-injection execution module

SYNOPSIS
    rsudo [rsudo-options...] exec inject
          [library-reference | --command command-name local-source]...
          [-- command-source [command-arg...]]

DESCRIPTION
    rsudo-mod-exec.lib.sh provides source-injection execution operations for the
    rsudo dispatcher.

    exec inject composes loadlib_inject_stream with a recursive rsudo call. The
    generator owns in-memory library embedding, reusable named command-source
    definitions, optional isolated one-shot command execution and optional
    non-TTY stdin source. The module owns only composition with rsudo transport.

FUNCTIONS
    rsudo_mod_exec_inject
        [library-reference | --command command-name local-source]...
        [-- command-source [command-arg...]]

        Generate the requested injection stream and pipe it into a recursive
        rsudo invocation.

        Zero or more library references and repeatable --command registrations
        may be selected. Their semantics, naming rules, subshell isolation and
        optional one-shot command contract are defined by
        loadlib-inject-stream.lib.sh.

        Non-TTY standard input remaining after any outer rsudo password
        acquisition is consumed by loadlib_inject_stream and appended as shell
        source after named-command definitions and the optional isolated one-shot
        command invocation.

        exit, exec, trap, positional-parameter and other process-local effects of
        an injected command remain inside that command's subshell. A subsequent
        input source can therefore continue after one-shot command termination
        and may invoke registered named commands repeatedly.

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
