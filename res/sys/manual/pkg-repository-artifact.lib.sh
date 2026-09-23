NAME
    pkg-repository-artifact.lib.sh - typed package artifact override handlers

DESCRIPTION
    Provides reusable, trusted handlers for optional artifact-resolution overrides
    used by package repository adapters.

    Repository type adapters remain complete implementations. An override is
    optional and replaces only the artifact responsibility represented by its
    subdescriptor. Catalog metadata is declarative and cannot provide executable
    handler logic.

    A download override lives under:

        <repository>/download/

    The current download type is:

        template-url

    Its closed schema contains type, name-template and url-template. A
    name-template may contain {version}. A url-template may contain {version} and
    {name}. Unknown template placeholders are rejected.

    A metadata override lives under:

        <repository>/metadata/

    Current metadata types are:

        checksum-sidecar
        checksum-manifest

    Both obtain artifact size from the resolved HTTPS download URL and obtain the
    integrity digest from the configured checksum URL template. The checksum
    algorithm remains selected by the package range digest_type value; the
    metadata type does not redefine the algorithm.

    checksum-sidecar requires record-format = digest-name and exactly one
    non-empty checksum record naming the resolved artifact. checksum-manifest
    accepts a checksum list and requires exactly one record for the resolved
    artifact name.

FUNCTIONS
    pkg_repository_artifact_overrides_validate <repository-dir>
        Validate any present download and metadata override subdescriptors.
        Absence of either override is valid.

    pkg_repository_artifact_download_override <repository-dir> <version>
        Resolve the configured download override and print one tab-separated
        artifact name and HTTPS URL.

    pkg_repository_artifact_metadata_override <repository-dir> <range-dir> <version> <name> <download-url>
        Resolve the configured metadata override and print one tab-separated
        positive byte size and digest descriptor in <algorithm>:<hex> form.
        The range must contain a supported digest_type and must not contain
        digest_regex.

STATUS
    Public functions return 0 on success, 1 when supplied metadata or upstream
    data does not satisfy the handler contract, and 2 for invalid function
    invocation.

DEPENDENCIES
    http-fetch
    awk
    tr
    wc

SEE ALSO
    pkg-repository-github.lib.sh
    pkg-install.lib.sh
