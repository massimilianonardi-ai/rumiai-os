loadsyslib "pkg/pkg-download"
loadsyslib "pkg/pkg-extract"
loadsyslib "pkg/pkg-integration"

pkg_install_one()
(
  for pkg
  do
    # todo
  done
)

pkg_install_dependency_resolve()
(
  for pkg
  do
    # todo
  done
)

pkg_install_resolve()
(
  for pkg
  do
    # todo
  done
)

pkg_install_validate()
(
  for pkg
  do
    # todo
  done
)

pkg_install2()
(
  [ "$#" -ge 1 ] || exit 1

  _pkg_install_list_validated="$(pkg_install_validate "$@")" || fatal 2 execution invalid-arguments operation pkg-install
  eval "set -- $_pkg_install_list_validated"

  _pkg_install_list_resolved=$(pkg_install_resolve "$@") || fatal 3 execution invalid-arguments operation pkg-install reason request-unresolvable
  eval "set -- $_pkg_install_list_resolved"

  _pkg_install_list_dependency_resolved=$(pkg_install_dependency_resolve "$@") || fatal 4 execution invalid-arguments operation pkg-install reason dependency-unresolvable
  eval "set -- $_pkg_install_list_dependency_resolved"

  for _pkg_install_pkg
  do
    pkg_install_one "$_pkg_install_pkg" || fatal 5 execution execution-failed operation pkg-install reason install-failed package "$_pkg_install_pkg"
  done
)
