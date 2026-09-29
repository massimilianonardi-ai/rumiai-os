NAME
    pkg-requirement.lib.sh - expose package requirement queries

DESCRIPTION
    pkg-requirement.lib.sh implements the public pkg requirement subcommand
    boundary. It exposes read-only package-declaration inspection and global
    facility requirement resolution without creating another provider model.

FUNCTIONS
    pkg_requirement list <package-spec>
        Resolve the package/version/platform definition from the current catalog and
        print its declared dependency lines. The query uses normal catalog stream
        and repository version resolution but does not resolve/download/extract a
        package artifact and does not install the package.

        An empty successful result means that the selected package definition has
        no facility dependency declarations.

    pkg_requirement resolve <facility> <constraint>...
        Resolve the configured system facility default and require the selected
        installed provider concrete to satisfy every compatibility constraint.

        On success, print the selected concrete provider identity.

        This is a global/non-package query and deliberately does not use
        package-consumer implicit fallback. It never installs a package, changes a
        facility default or creates a package-consumer binding.

        Returns 0 when satisfied, 1 when the requirement is not currently
        satisfiable, and 2 for invalid invocation or syntax.

DEPENDENCIES
    Static package requirement listing reuses pkg-install catalog selection without
    artifact transfer. Facility resolution delegates to pkg-dependency.lib.sh.

SEE ALSO
    pkg
    pkg-install.lib.sh
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
