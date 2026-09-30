NAME
    pkg-install.lib.sh - orchestrate recursive package installation

DESCRIPTION
    pkg-install.lib.sh implements the public pkg install command. It validates the
    complete original request list before dependency planning, catalog
    initialization or package installation. Only after every request is
    syntactically valid does it call pkg depend for the original request list.
    Dependency concrete identities returned by pkg depend are prepended to the
    original requests, so dependencies are installed before the requested roots.

    pkg install owns request installation, not dependency discovery. Each operand
    is resolved against the installation catalog snapshot to one exact concrete,
    then the artifact is resolved, downloaded, extracted, provider conformance is
    validated and the package is integrated.

FUNCTIONS
    pkg_install <package-spec>...
        Validate every original package specification first. If any request is
        syntactically invalid, fail before dependency planning and install nothing.
        Otherwise resolve recursive dependencies through pkg depend, prepend those
        dependency concretes to the original package specifications, and install
        the resulting sequence.

        Dependencies are exact concrete identities. Original requested operands
        retain their package-spec form and are resolved by the installer when they
        are reached. An already installed concrete is not reinstalled.

    pkg_install_one <package-spec>
        Resolve one package specification against the current installation catalog
        snapshot and install its concrete identity unless it is already installed.

DEPENDENCIES
    pkg-common.lib.sh
    pkg-catalog.lib.sh
    pkg-depend.lib.sh
    pkg-download.lib.sh
    pkg-extract2.lib.sh
    pkg-integration.lib.sh

SEE ALSO
    pkg
    pkg-depend.lib.sh
    pkg-catalog.lib.sh
