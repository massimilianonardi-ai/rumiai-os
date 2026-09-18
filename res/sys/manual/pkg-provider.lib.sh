NAME
    pkg-provider.lib.sh - configure and resolve package facility providers

DESCRIPTION
    pkg-provider.lib.sh implements the provider-selector grammar and the public
    pkg provider subcommand. Facility defaults and per-consumer bindings are
    authoritative system-scoped configuration. Selector resolution is late-bound
    against installed package defaults and concrete package identities.

FUNCTIONS
    pkg_provider <operation> [args...]
        Dispatch provider configuration operations. Supported operations are
        default and bind. Query forms print the configured selector; set forms
        replace it; -u removes it. Returns 0 on success, 1 when the requested
        operation cannot be completed or queried configuration is absent, and 2
        for invalid invocation.

DEPENDENCIES
    Runs inside the m bootstrap environment, uses state-path for authoritative
    configuration paths and pkg-facility.lib.sh for facility-name validation.

SEE ALSO
    pkg
    state-path
