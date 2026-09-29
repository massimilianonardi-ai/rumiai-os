NAME
    pkg-integration.lib.sh - integrate and deintegrate managed package concretes

DESCRIPTION
    pkg-integration.lib.sh implements package integration, deintegration and package
    default application inside the managed package store.

FUNCTIONS
    pkg_integrate <package> <version> <range-dir> <root-dir> [<osarch>]
        Validate a resolved package definition and extracted useful root, including
        flat-pkg primary component/payload-root metadata and dmg-pkg primary
        component/payload-root/overlay metadata, validate dependency declaration
        syntax, materialize the managed concrete and its command/environment/
        facility/state metadata, and validate/materialize declarative facility
        command/environment projections plus service realization metadata. A
        facility command may project either a useful-root executable or a validated
        ordinary package command of the same concrete provider. PATH is rejected as
        facility-env metadata because command-path exposure is owned by facility-cmd
        publication.

        pkg_integrate does not acquire or derive pkg-catalog context. The normal
        pkg-install path performs exact-snapshot provider conformance before calling
        integration. Integration validates the local realization structure it
        materializes through the same trusted cmd/env/service typed-part handlers,
        while retaining package-definition envelope and declared-facility checks.

        osarch controls the concrete package identity/class. Dependency declarations
        are stored as immutable package metadata but mutable runtime provider
        availability/selection is deliberately not resolved during integration.
        No separate provider-index state is created; installed concrete facility
        declarations are the provider-discovery source of truth.

    pkg_deintegrate <package> <version> [<osarch>]
        Remove an installed concrete only when it is not the package default and is
        not referenced by explicit provider-selection configuration. No separate
        provider index must be maintained. Persistent package state is not removed.

    pkg_default_apply <package> <version> [<osarch>]
        Select an installed concrete as the package/platform default and publish its
        package commands. An empty version clears that package default. A transition
        also reconciles global facility commands whose configured provider selector
        depends on the presence or current concrete of this package/class.

RETURN STATUS
    Public functions return 0 on success, 1 when the requested integration state
    cannot be validated or changed, and 2 for invalid invocation.

DEPENDENCIES
    The library composes package facility, dependency, state and setuid facilities.

SEE ALSO
    pkg
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
