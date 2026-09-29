loadsyslib "pkg/facility/pkg-facility"
loadsyslib "pkg/facility/pkg-dependency"

pkg_requirement()
(
  [ "$#" -ge 1 ] || return 2
  pkg_requirement_action=$1
  shift

  case "$pkg_requirement_action" in
    list)
      [ "$#" -eq 1 ] || return 2
      loadsyslib "pkg/pkg-install" || return 1
      pkg_install_requirement_list "$1"
      ;;
    resolve)
      [ "$#" -ge 2 ] || return 2
      pkg_dependency_default_resolve "$@"
      ;;
    *)
      return 2
      ;;
  esac
)
