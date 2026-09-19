NAME
    pkg-provider.lib.sh - manage package facility provider configuration

DESCRIPTION
    pkg-provider.lib.sh implements the provider-selection configuration surface used
    by the public pkg provider command.

    Facility defaults are system-scoped package-subsystem configuration. A facility
    default owns global command publication for that facility through bin/ext and
    bin/ext-<osarch>. Consumer bindings are system-scoped package configuration
    stored as binding/<facility> beneath the consumer package conf area. A binding
    file contains exactly one provider selector followed by newline.

    Global publication contains commands only. facility-env remains a consumer-launch
    projection and is not injected into ambient m or shell state.

FUNCTIONS
    pkg_provider_effective_selector <consumer> <facility>
        Print the effective configured selector for the consumer/facility pair:
        the explicit consumer binding when present, otherwise the system facility
        default. Returns 1 when neither selector is configured or configured state
        is invalid.

    pkg_provider_selector_resolve <provider-selector> [<consumer-osarch>]
        Resolve selector intent to one installed concrete package identity. A
        selector without version follows the provider package default. A selector
        with version is pinned. When consumer-osarch is supplied, a matching
        platform-specific provider is preferred and a generic provider may satisfy
        a selector that did not explicitly pin another osarch.

    pkg_provider_concrete_referenced <concrete-provider>
        Return 0 when the concrete provider is currently selected by a system
        facility default or a system consumer binding, 1 when it is not referenced,
        and 2 when the request or authoritative configuration cannot be validated.

    pkg_provider_package_default_reconcile <package> <osarch> <old-concrete> <new-concrete>
        Reconcile global commands affected by one package-default transition. For
        unversioned facility selectors this updates the selected command set while
        preserving selector-based targets. A pinned selector without osarch remains
        pinned but is published or removed as the corresponding package class
        appears or disappears. osarch is empty for the generic package class.
        Unrelated external-command collisions are rejected.

    pkg_provider default <facility>
        Print the configured system default provider selector for the facility.

    pkg_provider default <facility> <provider-selector>
        Set the configured system default provider selector and reconcile the
        facility's owned global command projection.

    pkg_provider default -u [--] <facility>
        Remove the configured system default provider selector and its owned global
        command projection.

    pkg_provider bind <consumer> <facility>
        Print the configured provider selector for that consumer/facility pair.

    pkg_provider bind <consumer> <facility> <provider-selector>
        Set the consumer/facility provider selector.

    pkg_provider bind -u [--] <consumer> <facility>
        Remove the consumer binding. Dependency resolution then inherits the
        facility default when one is configured.

PROVIDER SELECTORS
    Provider selectors use package-spec syntax:

        <package>
        <package>@<version>
        <package>!<osarch>
        <package>@<version>!<osarch>

    This library stores selector intent; it does not install providers or choose a
    missing provider automatically. Unversioned global command links target provider
    package-default selectors; pinned selectors target pinned provider concretes.

RETURN STATUS
    0   Requested query or mutation succeeded.
    1   Required configured state is absent or configuration storage could not be
        read or changed safely.
    2   Invocation, consumer/facility name or provider-selector syntax is invalid.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses state-path for
    authoritative system configuration paths.

SEE ALSO
    pkg
    state-path
