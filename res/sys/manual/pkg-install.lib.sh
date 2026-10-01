NAME
    pkg-install.lib.sh - orchestrate recursive package installation

DESCRIPTION
    pkg-install.lib.sh implements the public pkg install command. It validates the
    complete original request list before catalog initialization, dependency
    planning or package installation. Only after every request is syntactically
    valid does it initialize the catalog snapshot and resolve every requested root
    to one exact concrete identity. It then calls pkg depend for that concrete root
    list. Dependency concrete identities returned by pkg depend are prepended to
    the concrete requested roots, so dependencies are installed before the roots.

    pkg install owns request installation, not dependency discovery. Root
    resolution and dependency planning therefore operate on the same exact root
    identities from the same installation catalog snapshot. Each resulting
    concrete is then resolved to its package range, artifact is downloaded and
    extracted, provider conformance is validated, and the package is integrated.

FUNCTIONS
    pkg_install <package-spec>...
        Validate every original package specification first. If any request is
        syntactically invalid, fail before dependency planning and install nothing.
        Otherwise initialize the catalog snapshot, resolve every original request
        to one exact concrete root, resolve recursive dependencies through pkg
        depend using those concrete roots, prepend the returned dependency
        concretes, and install the resulting sequence.

        Dependencies and requested roots are exact concrete identities before the
        install loop begins. An already installed concrete is not reinstalled.

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
