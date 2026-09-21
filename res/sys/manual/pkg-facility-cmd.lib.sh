NAME
    pkg-facility-cmd.lib.sh - internal cmd facility-part conformance handler

DESCRIPTION
    pkg-facility-cmd.lib.sh implements the trusted internal validation semantics for
    the cmd typed facility part. It validates realization structure and executable
    targets contained by the provider useful root, and composes that validation with
    exact contract membership for provider conformance. Package integration reuses
    the same internal realization validation without acquiring catalog context.

    The library performs no command publication or provider selection.

FUNCTIONS
    This library exposes no public callable functions.

SEE ALSO
    pkg-facility.lib.sh
