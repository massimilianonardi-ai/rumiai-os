NAME
    pkg-extract.lib.sh - materialize package artifacts into a useful root

DESCRIPTION
    pkg-extract.lib.sh materializes one verified package artifact into an empty
    caller-supplied staging directory and normalizes single-directory wrappers
    while preserving macOS application-bundle boundaries.

    Ordinary archive formats delegate to the technical extract command. AppImage
    and executable artifacts are copied opaquely. The compound dmg-pkg format
    expands one top-level flat installer package from a DMG, extracts the Payload
    of the named component package and then applies the same useful-root
    normalization. Provider-specific component names are caller/catalog data and
    are not hardcoded by this library.

FUNCTIONS
    pkg_extract <artifact> <format> <staging-dir> [<component>]
        Materialize <artifact> into the empty <staging-dir>.

        For ordinary supported formats the invocation has exactly three
        arguments. For format dmg-pkg it has exactly four arguments and
        <component> must be a basename ending in .pkg. The DMG must contain
        exactly one top-level flat installer package; that installer must contain
        the named component directory with a readable Payload archive. Raw cpio
        and gzip-compressed cpio Payloads are accepted. Payload entries are
        rejected when they are absolute or contain a parent traversal component.

        Returns 0 on success, 1 when materialization or normalization fails, and
        2 for invalid invocation or an unsupported format.

DEPENDENCIES
    readpathce
    extract
    xar and cpio for dmg-pkg
    gzip when a dmg-pkg component Payload is gzip-compressed

SEE ALSO
    pkg-install.lib.sh
    extract
