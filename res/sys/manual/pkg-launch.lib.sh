NAME
    pkg-launch.lib.sh - launch integrated package commands with managed runtime state

DESCRIPTION
    pkg-launch.lib.sh validates an integrated package command, resolves package HOME
    and configuration, applies runtime environment layers and executes the real
    upstream target.

    Facility dependencies are re-resolved at every launch. The launcher applies the
    consumer's configured binding when present, otherwise the system facility
    default. Selected provider projections are interpreted generically from
    facility-cmd and facility-env metadata; package-specific provider logic is not
    part of the launcher contract.

FUNCTIONS
    launcher <package> [<argument>...]
        Launch the integrated command identified by m_COMMAND_BIN for the named
        package. The function validates the managed concrete/root/link target,
        creates the user package HOME when needed and preserves caller arguments.

        Runtime precedence is:

            consumer package environment
            selected provider facility projections
            user package environment
            exec

        Each selected provider facility command directory is prepended to PATH.
        Facility environment records are applied through pkg-provider.lib.sh
        without shell evaluation, using the same projection interpreter as global
        facility-default bootstrap environment. PATH itself is not valid
        facility-env metadata.

        The launcher replaces the current process with the upstream command and
        therefore returns only when validation/runtime preparation fails.

RETURN STATUS
    2   Invalid invocation.
    1   Managed command, package state, dependency/provider resolution or runtime
        projection could not be validated/applied.
    On successful preparation, the upstream process exit status becomes the process
    exit status because launcher uses exec.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses state-path,
    pkg-dependency.lib.sh and provider projection metadata materialized by package
    integration.

SEE ALSO
    pkg
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
