NAME
    pkg-repository-geoserver.lib.sh - GeoServer package repository adapter

DESCRIPTION
    Implements package-repository discovery and artifact resolution for GeoServer
    platform-independent binary releases.

    Repository metadata contains exactly:
        type = geoserver

    Stable release inventory/latest discovery uses the official
    geoserver/geoserver GitHub releases API. Only non-draft, non-prerelease
    versions with strict numeric X.Y.Z syntax are exposed, and those versions
    are ordered locally.

    Exact-version validation and artifact resolution use the official SourceForge
    GeoServer release RSS for that version. The exact
    geoserver-<version>-bin.zip entry proves the released binary exists and
    supplies the artifact size and MD5 digest, which are returned for enforcement
    by pkg-download. Exact installs therefore do not depend on anonymous GitHub
    API quota.

FUNCTIONS
    pkg_repository_list_versions <repository-dir>
        Print valid available stable GeoServer versions in ascending order.

    pkg_repository_compare_versions <repository-dir> <left> <right>
        Print -1, 0 or 1 using local numeric X.Y.Z ordering.

    pkg_repository_resolve_version <repository-dir> [version]
        Validate/print an exact released GeoServer binary through SourceForge RSS,
        or print the latest available valid stable release from GitHub release
        inventory when no version is supplied.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Print the generic artifact descriptor for the exact platform-independent
        binary ZIP. The range must declare digest_type md5.

DEPENDENCIES
    json.lib.sh
    http-fetch

SEE ALSO
    pkg-install.lib.sh
