NAME
    pkg-requirement.lib.sh - expose package-owned facility requirement queries

DESCRIPTION
    pkg-requirement.lib.sh implements the public pkg requirement subcommand
    boundary.

    It exposes read-only resolution of provider-independent facility requirements
    through the package subsystem's existing facility/default/compatibility model.
    It does not create another provider-selection policy.

FUNCTIONS
    pkg_requirement resolve <facility> <constraint>...
        Resolve the configured system facility default and require the selected
        installed provider concrete to satisfy every compatibility constraint.

        On success, print the selected concrete provider identity.

        Returns 0 when satisfied, 1 when the requirement is not currently
        satisfiable, and 2 for invalid invocation or syntax.

        The query never installs a package, chooses among installed providers
        implicitly, changes a facility default or creates a package-consumer
        binding.

DEPENDENCIES
    The library loads pkg-facility.lib.sh and pkg-dependency.lib.sh so the public
    subcommand has the complete facility/compatibility contract independent of
    historical caller load order. Resolution itself is delegated to
    pkg-dependency.lib.sh.

SEE ALSO
    pkg
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
