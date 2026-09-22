NAME
    pkg-repository-gpgtools.lib.sh - GPGTools package repository adapter

DESCRIPTION
    Implements repository resolution for catalog-pinned GPGTools GPG Suite
    disk-image releases used to materialize MacGPG.

    Repository metadata contains exactly:
        type
        version
        url
        digest

    version uses <year>.<release>+<build>n syntax. url must identify the matching
    official releases.gpgtools.com nightly disk image and digest is the 64-digit
    SHA-256 value verified from the official release publication. The catalog
    revision therefore fixes the release identity and integrity value rather than
    scraping mutable HTML during installation.

FUNCTIONS
    pkg_repository_list_versions <repository-dir>
        Print the single release pinned by this catalog stream.

    pkg_repository_compare_versions <repository-dir> <left> <right>
        Print -1, 0 or 1 using local numeric release/build ordering. Comparison
        does not require upstream availability.

    pkg_repository_resolve_version <repository-dir> [version]
        Print the pinned release. An explicitly requested version succeeds only
        when it is the pinned release.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Validate the pinned release against the selected range, obtain the exact
        HTTP Content-Length from the official artifact URL and print the generic
        artifact descriptor with URL, size and SHA-256 digest.

DEPENDENCIES
    http-fetch

SEE ALSO
    pkg-install.lib.sh
    pkg-extract.lib.sh
