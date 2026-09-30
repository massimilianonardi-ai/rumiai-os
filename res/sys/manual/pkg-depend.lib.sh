NAME
    pkg-depend.lib.sh - resolve package dependency installation plans

DESCRIPTION
    pkg-depend.lib.sh implements the read-only pkg depend planner; experimental install2 reuses this same public entry function before installing the returned concrete identities.

    Planning resolves explicit package requests and recursively discovers facility
    dependencies until provider selection and the concrete graph stabilize. No
    package is downloaded, extracted, integrated or installed.

    Provider selection preserves explicit intent: consumer binding precedes system
    facility default. Without a selector, already planned compatible providers are
    preferred, then compatible installed providers, then catalog providers. Multiple
    compatible provider packages are ambiguous and are not silently ranked.
    Multiple compatible installed versions of one provider package use that
    package's normal provider/default selection when it identifies one candidate.

    Catalog fallback may add a missing provider only when the compatible provider
    package is unambiguous. A provider package's repository-selected current/latest
    version is preferred when compatible; otherwise the newest compatible catalog
    range anchor is used as the concrete version.

FUNCTIONS
    pkg_depend <package-spec>...
        Public pkg depend command implementation. Validate all request syntax before
        catalog initialization, create one invocation-private catalog snapshot,
        resolve the complete plan and print one concrete identity per line in
        dependency-first order. Every emitted identity is directly valid as a
        package operand, so the output may be fed to pkg install.

        Returns 0 on success, 1 when the dependency plan cannot be resolved, and 2
        for invalid invocation or package-spec syntax.

DEPENDENCIES
    pkg-common.lib.sh
    pkg-catalog.lib.sh
    pkg-default.lib.sh
    pkg-provider.lib.sh
    pkg-facility.lib.sh
    pkg-dependency.lib.sh

SEE ALSO
    pkg
    pkg-catalog.lib.sh
    pkg-install2.lib.sh
