NAME
    pkg-dependency.lib.sh - validate and resolve package facility dependencies

DESCRIPTION
    pkg-dependency.lib.sh owns package dependency declaration parsing, compatibility
    checks and resolution of each required facility through the configured provider
    selection model.

    Resolution never chooses among installed providers implicitly. For each facility
    it uses the consumer binding when present, otherwise the system facility default.
    The selected provider must already resolve to an installed concrete that declares
    a compatible facility.

FUNCTIONS
    pkg_dependency_default_resolve <facility> <constraint>...
        Resolve the configured system facility default through the normal global
        package-class/osarch semantics and require the selected installed concrete
        to declare <facility> at a compatibility satisfying every supplied
        constraint.

        On success, print the selected concrete provider identity. The function is
        read-only: it does not install packages, choose a provider implicitly,
        create/change a facility default or create a consumer binding.

        Returns 0 on success, 1 when the requirement is not currently satisfiable,
        and 2 for invalid invocation, facility or constraint syntax.

    pkg_dependency_runtime_access_prepare <provider-concrete>
        Starting from one installed concrete provider, recursively resolve its
        facility dependencies using the normal binding/default rules and prepare
        only the selected provider-selector configuration paths for read-only
        access by a non-owner runtime account. It does not change selector intent,
        install packages or alter executable package roots.

    pkg_dependency_resolve <dependency-file> <consumer> <consumer-osarch>
        Resolve every dependency declaration through the effective provider selector.
        consumer-osarch is the consumer's applicable execution/install target class.
        When it is empty, the active m_OSARCH class is used, detecting the current
        host platform through the normal osarch library when the caller has not
        already initialized it. This allows a platform-independent consumer concrete to depend on a platform-specific
        provider without adding an osarch suffix to the consumer identity.
        On success, print zero or more tab-separated lines:

            <facility><TAB><provider-concrete>

        A missing dependency file is valid and produces no output. The function does
        not install providers and does not modify provider configuration.

        Returns 0 on success, 1 when declarations/configuration/providers cannot
        satisfy the dependency set, and 2 for invalid invocation.

MATERIALIZATION
    Integration stores the validated dependency declaration in the installed
    consumer concrete. Provider bindings are not materialized in the package store;
    authoritative bindings live in system package configuration.

DEPENDENCIES
    The library uses the package facility compatibility contract and
    pkg-provider.lib.sh provider-selection API.

SEE ALSO
    pkg
    pkg-provider.lib.sh
