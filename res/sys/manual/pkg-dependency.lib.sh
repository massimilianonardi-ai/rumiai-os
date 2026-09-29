NAME
    pkg-dependency.lib.sh - validate and resolve package facility dependencies

DESCRIPTION
    pkg-dependency.lib.sh owns package dependency declaration parsing, compatibility
    checks and package-consumer provider resolution.

    For a package consumer, an explicit consumer binding has highest precedence,
    followed by a configured system facility default. When neither exists,
    resolution discovers compatible installed concrete providers directly from
    their materialized facility declarations.

    Implicit resolution selects one compatible concrete when unambiguous. Multiple
    compatible versions of the same provider package may be disambiguated by that
    package's normal default when the default itself is compatible. Multiple
    compatible provider packages are ambiguous and are not silently ranked.

    Explicit binding/default intent never silently falls back: if configured intent
    is unavailable, invalid or incompatible, resolution fails with that reason.

FUNCTIONS
    pkg_dependency_default_resolve <facility> <constraint>...
        Resolve the configured system facility default through normal global
        package-class/osarch semantics and require the selected installed concrete
        to declare <facility> at a compatibility satisfying every supplied
        constraint.

        This is the global/non-package query path and deliberately does not use
        package-consumer implicit fallback. On success it prints the selected
        concrete provider identity. It is read-only and does not install packages
        or mutate provider configuration.

        Returns 0 on success, 1 when the global requirement is not currently
        satisfiable, and 2 for invalid invocation, facility or constraint syntax.

    pkg_dependency_runtime_access_prepare <provider-concrete>
        Starting from one installed concrete provider, recursively resolve its
        facility dependencies and prepare only explicit selector configuration that
        actually exists for read-only access by a non-owner runtime account. An
        implicit dependency requires no selector-state permission change. The
        function does not change selector intent, install packages or alter package
        roots.

    pkg_dependency_resolve <dependency-file> <consumer> <consumer-osarch>
        Resolve every dependency declaration using binding -> facility default ->
        deterministic implicit installed-provider precedence. consumer-osarch is
        the consumer's applicable execution platform class. When empty, active
        m_OSARCH is used.

        On success, print zero or more tab-separated lines:

            <facility><TAB><provider-concrete>

        A missing dependency file is valid and produces no output. Resolution never
        installs providers or creates provider configuration.

        Failure diagnostics identify the consumer, facility and constraints and
        distinguish unavailable, ambiguous, invalid-selection and incompatible
        explicit-provider cases; ambiguous diagnostics include compatible provider
        candidates.

        Returns 0 on success, 1 when the dependency set is not satisfiable, and 2
        for invalid invocation.

MATERIALIZATION
    Integration stores the validated dependency declaration in the installed
    consumer concrete. Provider bindings are not materialized in the package store;
    authoritative explicit bindings live in system package configuration. Installed
    provider discovery reads concrete facility metadata directly and has no
    authoritative mutable provider index.

DEPENDENCIES
    The library uses the package facility compatibility contract and
    pkg-provider.lib.sh provider-selection API.

SEE ALSO
    pkg
    pkg-provider.lib.sh
