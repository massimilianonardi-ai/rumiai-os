NAME
    pkg-install2.lib.sh - experimental package installation orchestration

DESCRIPTION
    pkg-install2.lib.sh contains the experimental install2 pipeline used while
    package dependency closure and installation orchestration are being
    reconstructed. It is not currently wired as the canonical pkg install
    command path.

    The pipeline validates explicit requests, resolves them to concrete package
    identities, resolves an ordered dependency closure and installs each
    concrete in dependency-first order. Intermediate list stages emit
    shell-safe quoted argument lists.

FUNCTIONS
    pkg_install_validate <package-spec>...
        Validate explicit install request syntax without catalog or package-store
        resolution.

    pkg_install_resolve_one <package-spec>
        Resolve one validated explicit request to one concrete package identity.

    pkg_install_resolve <package-spec>...
        Resolve each explicit request and emit one shell-safe quoted concrete
        argument list.

    pkg_install_dependency_resolve <concrete>...
        Resolve the dependency closure and emit the ordered full concrete list.
        This stage is still under active reconstruction.

    pkg_install_one <concrete>
        Install one already-resolved concrete identity. An already-installed
        valid concrete is accepted without reinstallation.

    pkg_install2 <package-spec>...
        Run the experimental validation, explicit-resolution,
        dependency-resolution and installation pipeline.

RETURN STATUS
    0   Requested operation succeeded.
    non-zero
        Validation, resolution, dependency closure or installation failed.

NOTES
    This library is an active experimental implementation surface. The canonical
    pkg install behavior remains owned by pkg-install.lib.sh until install2 is
    deliberately promoted.
