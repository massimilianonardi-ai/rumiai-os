NAME
    pkg-extract2.lib.sh - normalize package artifacts using catalog metadata

DESCRIPTION
    pkg-extract2.lib.sh is the experimental package-materialization layer used by
    install2. Physical extraction is delegated exclusively to extract2. This
    library owns package-specific interpretation of range metadata and useful-root
    normalization.

    Ordinary package formats call extract2 once using the range format. flat-pkg
    calls extract2 with physical format pkg and then selects the catalog component
    Payload. dmg-pkg calls extract2 with physical format dmg, selects the single
    top-level installer package, calls extract2 again with physical format pkg,
    then applies component, payload-root and optional overlay metadata.

FUNCTIONS
    pkg_extract2 <artifact> <range-dir> <staging-dir>
        Materialize one verified package artifact into an existing empty staging
        directory using metadata from <range-dir>.

        The range must contain format. component is required for flat-pkg and
        dmg-pkg. payload-root is optional for those two package formats. overlay
        is forbidden for flat-pkg and optional for dmg-pkg.

        For ordinary formats component, payload-root and overlay are invalid.
        After package-specific selection, the useful root is normalized by
        removing chains of single real wrapper directories while preserving a
        valid macOS .app bundle boundary.

        Returns 0 on success, 1 for extraction, metadata or normalization failure,
        and 2 for invalid invocation, unsupported format or invalid
        format-specific metadata syntax.

DEPENDENCIES
    readpathce
    extract2

SEE ALSO
    extract2
    pkg-install2.lib.sh
