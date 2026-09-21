NAME
    pkg-repository-geoserver.lib.sh - GeoServer package repository adapter

DESCRIPTION
    Implements package-repository discovery and artifact resolution for GeoServer
    platform-independent binary releases published on SourceForge.

    Repository metadata contains exactly:
        type = geoserver

    Versions use strict numeric X.Y.Z syntax and are ordered locally. Artifact
    resolution selects exactly geoserver-<version>-bin.zip and returns its
    SourceForge size and MD5 digest for enforcement by pkg-download.

FUNCTIONS
    pkg_repository_list_versions <repository-dir>
        Print valid available GeoServer versions in ascending order.

    pkg_repository_compare_versions <repository-dir> <left> <right>
        Print -1, 0 or 1 using local numeric X.Y.Z ordering.

    pkg_repository_resolve_version <repository-dir> [version]
        Validate/print an exact available version, or print the latest available
        valid version when no version is supplied.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Print the generic artifact descriptor for the exact platform-independent
        binary ZIP. The range must declare digest_type md5.

DEPENDENCIES
    json.lib.sh
    http-fetch

SEE ALSO
    pkg-install.lib.sh
