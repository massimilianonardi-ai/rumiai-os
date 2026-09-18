NAME
    pkg-integration.lib.sh - integrate and deintegrate managed package concretes

DESCRIPTION
    pkg-integration.lib.sh implements package integration, deintegration and package
    default application inside the managed package store.

FUNCTIONS
    pkg_integrate <package> <version> <range-dir> <root-dir> [<osarch>]
        Validate a resolved package definition and extracted useful root, validate
        configured facility dependencies, materialize the managed concrete and its
        command/environment/facility/state metadata, validate and materialize declarative facility command/environment projections, and index declared facilities.

        Dependency validation uses the consumer's configured binding or inherited
        system facility default. Integration stores dependency declarations but does
        not materialize an install-time concrete provider binding.

    pkg_deintegrate <package> <version> [<osarch>]
        Remove an installed concrete only when it is not the package default and is
        not referenced by provider-selection configuration. Facility indexes are
        removed with the concrete. Persistent package state is not removed.

    pkg_default_apply <package> <version> [<osarch>]
        Select an installed concrete as the package/platform default and publish its
        package commands. An empty version clears that package default.

RETURN STATUS
    Public functions return 0 on success, 1 when the requested integration state
    cannot be validated or changed, and 2 for invalid invocation.

DEPENDENCIES
    The library composes package facility, dependency, state and setuid facilities.

SEE ALSO
    pkg
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
