NAME
    pkg-install2.lib.sh - experimental package installation orchestration

DESCRIPTION
    pkg-install2.lib.sh contains the experimental install2 pipeline used while
    package dependency closure and installation orchestration are being
    reconstructed. It is not currently wired as the canonical pkg install
    command path.

    The pipeline delegates request/dependency planning to the same public
    pkg_depend entry function used by pkg depend, then installs each concrete
    identity returned by that command in dependency-first order. Installation may
    acquire a later catalog snapshot; the plan boundary is the exact concrete
    identities emitted by pkg depend, not shared snapshot state.

FUNCTIONS
    pkg_install_one <concrete>
        Install one already-resolved concrete identity. An already-installed
        valid concrete is accepted without reinstallation.

    pkg_install2 <package-spec>...
        Run pkg_depend <package-spec>... and install the concrete identities it
        returns. Planning completes before package-store installation begins.

RETURN STATUS
    0   Requested operation succeeded.
    non-zero
        Validation, resolution, dependency closure or installation failed.

NOTES
    This library is an active experimental implementation surface. The canonical
    pkg install behavior remains owned by pkg-install.lib.sh until install2 is
    deliberately promoted.
