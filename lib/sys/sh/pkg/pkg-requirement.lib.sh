loadsyslib "pkg/facility/pkg-facility"
loadsyslib "pkg/facility/pkg-dependency"

pkg_requirement()
(
  [ "$#" -ge 1 ] || return 2
  pkg_requirement_action=$1
  shift

  case "$pkg_requirement_action" in
    resolve)
      [ "$#" -ge 2 ] || return 2
      pkg_dependency_default_resolve "$@"
      ;;
    *)
      return 2
      ;;
  esac
)
