NAME
    pkg-provider.lib.sh - manage package facility provider configuration

DESCRIPTION
    pkg-provider.lib.sh implements the provider-selection configuration surface used
    by the public pkg provider command.

    Facility defaults are system-scoped package-subsystem configuration. A facility
    default owns global command publication for that facility through bin/ext and
    bin/ext-<osarch> and contributes the selected provider's facility environment
    to each new m bootstrap. Facility-default selectors are non-secret runtime
    selection metadata: their storage is read-only/traversable for runtime accounts
    that must resolve global/system-host intent, while mutation remains protected by
    normal filesystem ownership. Consumer bindings are system-scoped package
    configuration stored as binding/<facility> beneath the consumer package conf
    area. A binding file contains exactly one provider selector followed by newline.
    Provider selectors are non-secret runtime-selection metadata; both defaults and
    bindings may be made read-only/traversable for a service account while their
    enclosing state remains non-writable to that account.

    Global environment is recomputed from authoritative selector intent rather than
    stored as generated configuration. A valid ext-osarch selector chooses the
    active platform class; otherwise only generic provider classes can contribute.
    Facility defaults are applied in LC_ALL=C facility-name order and later
    assignments win duplicate ordinary variables. PATH is reserved to facility
    command publication and is invalid facility-env metadata.

FUNCTIONS
    pkg_provider_default_resolve <facility>
        Resolve the configured system facility default to one installed concrete
        provider using the same active global package-class semantics as global
        facility publication/environment. Consumer bindings are not consulted.

        Returns 0 and prints the concrete identity on success, 1 when no system
        facility default is configured, 2 for invalid invocation/facility syntax,
        and 3 when configured/default state exists but cannot be validated or
        resolved.

    pkg_provider_default_runtime_access_prepare <facility>
        Prepare the configured facility-default selector for read-only resolution
        by a non-owner runtime account. The function changes only traversal/read
        permissions on the facility-default configuration path; it does not change
        selector intent, provider installation or consumer bindings.

    pkg_provider_global_runtime_access_prepare
        Prepare every configured system facility-default selector for read-only
        enumeration/resolution by a non-owner runtime account. This preserves
        bootstrap global facility-environment semantics after a host supervisor
        drops privilege. Selector intent is not changed.

    pkg_provider_effective_selector_runtime_access_prepare <consumer> <facility>
        Prepare the effective provider selector used by one consumer/facility pair
        for read-only resolution by a non-owner runtime account. An explicit binding
        is prepared when present; otherwise the system facility default is prepared.
        Selector intent is not changed.

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

    pkg_provider_environment_apply <facility> <concrete-provider>
        Validate and apply one installed concrete provider's facility-env projection
        to the current process. The projection is interpreted without shell
        evaluation and is validated as a whole before export.

    pkg_provider_global_environment_apply
        Recompute and apply the environment of all currently resolvable system
        facility defaults for this bootstrap. Unresolved valid selectors contribute
        no environment. Returns non-zero for invalid/corrupt default or projection
        data without selecting another provider.

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
    Environment exposure is late-bound again by each new m bootstrap, so later
    facility-default or provider-package-default changes require no generated
    environment rewrite.

RETURN STATUS
    Unless a function documents a more specific status contract:
    0   Requested query or mutation succeeded.
    1   Required configured state is absent or configuration storage could not be
        read or changed safely.
    2   Invocation, consumer/facility name or provider-selector syntax is invalid.

    pkg_provider_default_resolve additionally uses status 3 for an existing
    configured/default state that is invalid or cannot resolve to an installed
    concrete.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses state-path for
    authoritative system configuration paths.

SEE ALSO
    pkg
    state-path
