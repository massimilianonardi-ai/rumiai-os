NAME
    pkg-repository-podman.lib.sh - Podman macOS package repository adapter

DESCRIPTION
    Implements repository resolution for the catalog-pinned official Podman
    macOS arm64 installer release used by the RumiAI Podman package.

    Repository metadata contains exactly:
        type
        version
        url
        digest

    type is podman. version uses the stable Podman v<major>.<minor>.<patch>
    release-tag syntax. url must be the matching official
    podman-container-tools/podman macOS arm64 installer asset on GitHub Releases.
    digest is the 64-digit SHA-256 value verified from the official release
    publication.

    The catalog revision fixes release identity, URL and integrity value. Package
    installation therefore does not depend on the GitHub Releases API and does
    not require GitHub credentials or API rate-limit budget.

FUNCTIONS
    pkg_repository_list_versions <repository-dir>
        Print the single Podman release pinned by this catalog stream.

    pkg_repository_compare_versions <repository-dir> <left> <right>
        Print -1, 0 or 1 using numeric major/minor/patch ordering.

    pkg_repository_resolve_version <repository-dir> [version]
        Print the pinned release. An explicitly requested version succeeds only
        when it is the pinned release.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Validate the pinned release against the selected package range, obtain
        the exact HTTP Content-Length from the official asset URL and print the
        generic artifact descriptor with URL, size and SHA-256 digest.

STATUS
    Public functions return 0 on success, 1 when repository/upstream/range data
    does not satisfy the adapter contract, and 2 for invalid invocation.

DEPENDENCIES
    http-fetch

SEE ALSO
    pkg-install.lib.sh
    pkg-extract.lib.sh
