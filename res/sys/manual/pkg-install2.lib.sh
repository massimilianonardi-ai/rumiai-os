NAME
    pkg-install2.lib.sh - experimental package installation orchestration

DESCRIPTION
    pkg-install2.lib.sh contains the experimental install2 pipeline used while
    package dependency closure and installation orchestration are being
    reconstructed. It is not currently wired as the canonical pkg install
    command path.

    The pipeline validates explicit request syntax, materializes one catalog
    snapshot, delegates complete request/dependency planning to
    pkg_depend_resolve, then installs each returned concrete in dependency-first
    order. The planner emits a shell-safe quoted argument list.

FUNCTIONS
    pkg_install_validate <package-spec>...
        Validate explicit install request syntax without catalog or package-store
        resolution.

    pkg_install_one <concrete>
        Install one already-resolved concrete identity. An already-installed
        valid concrete is accepted without reinstallation.

    pkg_install2 <package-spec>...
        Run the experimental validation, shared pkg-depend planning and
        installation pipeline against one catalog snapshot.

RETURN STATUS
    0   Requested operation succeeded.
    non-zero
        Validation, resolution, dependency closure or installation failed.

NOTES
    This library is an active experimental implementation surface. The canonical
    pkg install behavior remains owned by pkg-install.lib.sh until install2 is
    deliberately promoted.
