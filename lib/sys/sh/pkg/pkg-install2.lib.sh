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

  _pkg_install_list_validated="$(pkg_install_validate "$@")" || fatal 2 ...
  _pkg_install_list_resolved=$(pkg_install_resolve $_pkg_install_list_validated) || fatal 3 ---
  _pkg_install_list_dependency_resolved=$(pkg_install_dependency_resolve $_pkg_install_list_resolved) || fatal 4 ...
  for _pkg_install_validated in $_pkg_install_list_dependency_resolved
  do
    pkg_install_one
  done
)
