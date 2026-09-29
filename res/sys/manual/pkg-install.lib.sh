NAME
    pkg-install.lib.sh - orchestrate package installation

DESCRIPTION
    pkg-install.lib.sh implements the installation orchestration used by the
    public pkg install command. It processes package operands independently where
    possible, materializes the managed package store on demand, snapshots the
    package catalog, selects an exact target stream when present and otherwise the
    platform-independent `all` stream, resolves repository metadata and artifacts, downloads
    and verifies artifacts, extracts/materializes them, validates any provider
    realization against facility contracts from that exact catalog snapshot, and
    delegates final package integration to the package integration facilities.
    Dependency declaration syntax is validated from catalog metadata before artifact
    download. Current provider availability/selection is not an installation gate.
    After a successful install, currently unsatisfied dependencies are reported as
    warnings with facility, constraints and resolution reason. A package resolved
    from `all` keeps a platform-independent concrete identity.

FUNCTIONS
    pkg_install <package-spec>...
        Install one or more package specifications through the real package
        pipeline. Processing is best-effort per operand: invalid, unavailable,
        already-installed or otherwise failed operands emit an error while later
        independently installable operands continue to be attempted.

        If the resolved concrete already exists, pkg_install does not reinstall
        it. The error reports the already-installed concrete identity and the
        current/default concrete identity for that class when present.

        Missing or ambiguous runtime providers do not fail artifact installation and
        are never auto-installed. They remain runtime resolution state and are
        reported as warnings after the package has been integrated.

        $m_PKG_DIR and temporary installation state are materialized only when the
        first syntactically valid operand is processed. An invocation containing
        only invalid operands therefore creates neither.

        Returns 0 when every requested operand succeeds, 1 when at least one
        operand fails (including a partially successful batch), and 2 when the
        invocation itself is invalid.

    pkg_install_requirement_list <package-spec>
        Resolve the same current catalog stream/version/range used by installation
        and print the selected definition's dependency declarations. This query
        validates dependency metadata but does not resolve an artifact descriptor,
        download/extract an artifact or create an installed package concrete.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses the package
    download, extraction and integration libraries together with state-path,
    repository adapters and the external pkg-catalog source.

SEE ALSO
    pkg
    state-path
