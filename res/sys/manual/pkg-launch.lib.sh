NAME
    pkg-launch.lib.sh - launch integrated package commands with managed runtime state

DESCRIPTION
    pkg-launch.lib.sh validates an integrated package command, resolves package HOME
    and configuration, applies runtime environment layers and executes the real
    upstream target.

    Normal package commands use user-scoped package HOME/configuration. The trusted
    srv system-host execution path reuses the same launcher with system-scoped
    package state and State Instance equal to the service identity; this does not
    create a second package launcher or infer state scope from POSIX account identity.

    Facility dependencies are re-resolved at every launch. Resolution uses the
    consumer's configured binding when present, otherwise the configured system
    facility default, and otherwise an unambiguous compatible installed provider.
    Multiple compatible provider packages without explicit selection are rejected
    as ambiguous. A platform-independent consumer concrete uses the active m_OSARCH as
    its applicable dependency platform class; its concrete identity remains
    platform-independent. Selected provider projections are interpreted generically from
    facility-cmd and facility-env metadata; package-specific provider logic is not
    part of the launcher contract.

FUNCTIONS
    launcher <package> [<argument>...]
        Launch the integrated command identified by m_COMMAND_BIN for the named
        package. The function validates the managed concrete/root/link target,
        creates the selected package HOME when needed and preserves caller arguments.
        Normal invocation selects user state. An internal srv system-host context
        selects system package state with the service identity as State Instance.

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

        When m_ENV_DO_NOT_OVERRIDE is set, it must contain a nonempty list
        of valid POSIX variable names separated by single ASCII spaces.
        Every listed variable must be present in the incoming environment
        (an empty value is permitted); duplicate names and malformed lists
        fail. The launcher applies package, provider and user configuration
        normally, then gives the final target the original values of the
        listed variables. Only the delivered environment is overridden:
        HOME/state-path resolution, package identity and service context
        remain unchanged. The request is consumed and is not forwarded to
        further package launches.

        m_ENV_DO_NOT_OVERRIDE, m_PKG_LAUNCH_CONTEXT and
        m_PKG_LAUNCH_STATE_INSTANCE are control-plane variables and
        cannot be listed. Requests naming these variables fail rather
        than reintroducing a privileged service-launch context.
        An unset m_ENV_DO_NOT_OVERRIDE leaves existing launch semantics
        unchanged, including HOME selection and direct exec of the target.

        The launcher replaces the current process with the upstream command and
        therefore returns only when validation/runtime preparation fails.

RETURN STATUS
    2   Invalid invocation.
    1   Managed command, package state, dependency/provider resolution or runtime
        projection could not be validated/applied.
    3   Environment-preservation list malformed or contains duplicates.
    4   Listed inherited environment variable missing.
    5   Environment-preservation list includes a launcher control variable.
    6   Trusted POSIX env executor unavailable for the requested preservation.
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
