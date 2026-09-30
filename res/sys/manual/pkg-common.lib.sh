NAME
    pkg-common.lib.sh - common package identity validation helpers

DESCRIPTION
    pkg-common.lib.sh provides shared syntax validation for package names,
    versions, supported osarch values and fully resolved package concrete
    identities.

FUNCTIONS
    pkg_name_valid <package>
        Return success when package is a valid package name.

    pkg_version_valid <version>
        Return success when version is a valid package version.

    pkg_osarch_valid <osarch>
        Return success when osarch is one of the supported package target
        identities.

    pkg_concrete_read <name-variable> <version-variable> <osarch-variable> <concrete>
        Validate and split one concrete identity of the form:

            <package>@<version>[!<osarch>]

        The first three operands are distinct shell variable names. On success
        the function assigns the package name, version and osarch to those
        variables. The osarch result is empty for a platform-independent
        concrete identity.

        Destination variables are assigned only after the complete concrete
        identity has been validated. The function writes no result to standard
        output.

RETURN STATUS
    0   The value is valid; pkg_concrete_read assigned all requested outputs.
    1   The package name, version, osarch or concrete identity is invalid.
    2   The invocation is invalid, including invalid or duplicate destination
        variable names for pkg_concrete_read.
