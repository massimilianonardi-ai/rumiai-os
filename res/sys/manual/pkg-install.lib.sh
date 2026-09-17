NAME
    pkg-install.lib.sh - orchestrate package installation

DESCRIPTION
    pkg-install.lib.sh implements the installation orchestration used by the
    public pkg install command. It validates every package operand before
    installation side effects, materializes the managed package store on demand,
    snapshots the package catalog, resolves package repository metadata and
    artifacts, downloads and verifies artifacts, extracts/materializes them, and
    delegates final package integration to the package integration facilities.

FUNCTIONS
    pkg_install <package-spec>...
        Install one or more package specifications through the real package
        pipeline. Every operand is validated before the package store or temporary
        installation state is materialized. If $m_PKG_DIR does not exist after
        validation, it is created before package integration begins. An existing
        $m_PKG_DIR must be a real directory rather than a symbolic link.

        Returns 0 when all requested packages are installed, 1 when installation
        cannot be completed, and 2 when the invocation or a package operand is
        invalid.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses the package
    download, extraction and integration libraries together with state-path,
    repository adapters and the external pkg-catalog source.

SEE ALSO
    pkg
    state-path
