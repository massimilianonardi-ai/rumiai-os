loadsyslib "pkg/pkg-download"
loadsyslib "pkg/pkg-extract"
loadsyslib "pkg/pkg-integration"

pkg_install_validate()
(
  for pkg
  do
    # todo
  done
)

pkg_install2()
(
  [ "$#" -ge 1 ] || return 2

  pkg_install_validate "$@"
)
