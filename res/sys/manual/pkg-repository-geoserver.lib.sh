NAME
    pkg-repository-geoserver.lib.sh - GeoServer package repository adapter

DESCRIPTION
    Implements package-repository discovery and artifact resolution for GeoServer
    platform-independent binary releases.

    Repository metadata contains exactly:
        type = geoserver

    Stable release discovery uses the official geoserver/geoserver GitHub
    releases API. Only non-draft, non-prerelease versions with strict numeric
    X.Y.Z syntax are exposed, and those versions are ordered locally.

    Artifact resolution selects exactly geoserver-<version>-bin.zip from the
    official SourceForge GeoServer release tree. The SourceForge release RSS
    entry for that exact download supplies the artifact size and MD5 digest,
    which are returned for enforcement by pkg-download.

FUNCTIONS
    pkg_repository_list_versions <repository-dir>
        Print valid available stable GeoServer versions in ascending order.

    pkg_repository_compare_versions <repository-dir> <left> <right>
        Print -1, 0 or 1 using local numeric X.Y.Z ordering.

    pkg_repository_resolve_version <repository-dir> [version]
        Validate/print an exact stable release, or print the latest available
        valid stable release when no version is supplied.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Print the generic artifact descriptor for the exact platform-independent
        binary ZIP. The range must declare digest_type md5.

DEPENDENCIES
    json.lib.sh
    http-fetch

SEE ALSO
    pkg-install.lib.sh
