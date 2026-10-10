NAME
    pkg-repository-chrome-for-testing.lib.sh - Chrome for Testing package repository adapter

DESCRIPTION
    Implements version discovery, local version ordering, exact artifact
    validation and artifact resolution for the Chrome for Testing repository
    used by the Linux ARM64 Chromium package stream.

    Repository metadata contains exactly:

        type = chrome-for-testing
        channel = Stable
        platform = linux-arm64

    The current adapter resolves the Stable channel. Latest-version discovery
    uses the official Chrome for Testing LATEST_RELEASE_STABLE publication.
    Exact versions use four dot-separated non-negative decimal components.

    Artifact identity is deterministic for Linux ARM64:

        chrome-linux-arm64.zip

    Artifact existence, positive byte size and MD5 integrity metadata are
    validated against the official Google Cloud Storage object metadata for the
    exact version and object name. The canonical package artifact descriptor
    then points to the corresponding chrome-for-testing-public object.

    Version comparison is entirely local and compares the four decimal
    components numerically without requiring current upstream availability.
    This permits catalog range anchors to remain ordering metadata even when an
    historical artifact later becomes unavailable upstream.

    Failed upstream transfers emit contextual internal diagnostics identifying
    the adapter operation and requested URL. These diagnostics do not change the
    public adapter function signatures or status classes.

FUNCTIONS
    pkg_repository_compare_versions <repository-dir> <left> <right>
        Validate both four-component version identities and print -1, 0 or 1
        according to component-wise numeric ordering. No upstream request is
        performed.

    pkg_repository_resolve_version <repository-dir> [version]
        With no version, resolve the current Stable Chrome for Testing version
        and verify that its Linux ARM64 artifact metadata exists. With an exact
        version, validate the requested identity and verify that exact artifact
        metadata exists before printing the version.

    pkg_repository_resolve_artifact <repository-dir> <range-dir> <version>
        Validate the exact Linux ARM64 Chrome for Testing object and print the
        canonical package artifact descriptor containing name, HTTPS URL,
        positive byte size and MD5 digest. The selected range must require
        digest_type = md5 and its archive_regex must match
        chrome-linux-arm64.zip.

STATUS
    Public functions return 0 on success, 1 when repository, range or upstream
    data does not satisfy the adapter contract, and 2 for invalid function
    invocation.

DEPENDENCIES
    json.lib.sh
    http-fetch
    awk
    wc

SEE ALSO
    pkg-repository-chromium.lib.sh
    pkg-install.lib.sh
