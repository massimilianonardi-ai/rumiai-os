NAME
    pkg-extract.lib.sh - materialize package artifacts into a useful root

DESCRIPTION
    pkg-extract.lib.sh materializes one verified package artifact into an empty
    caller-supplied staging directory and normalizes single-directory wrappers
    while preserving macOS application-bundle boundaries.

    Ordinary archive formats delegate to the technical extract command. AppImage
    and executable artifacts are copied opaquely. The compound dmg-pkg format
    expands one top-level flat installer package from a DMG, extracts the Payload
    of the named primary component package and then applies the same useful-root
    normalization. When supplied, a payload-root relative pathname selects one
    real directory inside that extracted Payload as the primary package tree.
    An optional overlay directory may describe additional named component Payloads,
    optional source payload roots and optional target roots below staging. Overlay
    entries are materialized independently and reject destination collisions.
    Provider-specific component names and payload paths are caller/catalog data and
    are not hardcoded by this library.

FUNCTIONS
    pkg_extract <artifact> <format> <staging-dir> [<component> [<payload-root> [<overlay-dir>]]]
        Materialize <artifact> into the empty <staging-dir>.

        For ordinary supported formats the invocation has exactly three
        arguments. For format dmg-pkg it has four, five or six arguments and
        <component> must be a basename ending in .pkg. The optional
        <payload-root> is a non-empty relative pathname with no empty, . or ..
        path component; it must resolve to a real directory inside the extracted
        primary component Payload. When present, only that directory's contents
        become primary staging.

        Optional <overlay-dir> must be a real directory. Each direct child is one
        controlled-name overlay directory containing exactly a required component
        scalar and optional payload-root and target-root scalars. payload-root
        selects a safe relative subtree inside that overlay component Payload.
        target-root selects a safe relative directory below staging; when omitted
        the overlay targets staging itself. Existing destination entries are never
        overwritten.

        The DMG must contain exactly one top-level flat installer package; that
        installer must contain every selected component directory with a readable
        Payload archive. Raw cpio and gzip-compressed cpio Payloads are accepted.
        Payload entries are rejected when they are absolute or contain a parent
        traversal component.

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
