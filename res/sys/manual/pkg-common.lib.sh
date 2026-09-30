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

    pkg_request_read <name-variable> <version-variable> <osarch-variable> <request>
        Validate and split one package request of the form:

            <package>[@<version>][!<osarch>]

        The version and osarch outputs are empty when omitted.

    pkg_concrete_read <name-variable> <version-variable> <osarch-variable> <concrete>
        Validate and split one concrete identity of the form:

            <package>@<version>[!<osarch>]

        Unlike pkg_request_read, a concrete identity requires a version.

        For both read functions the first three operands are distinct valid shell
        identifiers. On success the function assigns the package name, version
        and osarch to those variables. Destination variables are assigned only
        after the complete input has been validated. The functions write no
        result to standard output.

RETURN STATUS
    0   The value is valid and the requested outputs were assigned.
    1   The package name, version, osarch, request or concrete identity is invalid.
    2   The invocation is invalid, including invalid or duplicate destination
        variable names for pkg_request_read or pkg_concrete_read.
