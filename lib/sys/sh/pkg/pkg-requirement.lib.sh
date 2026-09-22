. "$m_LIB_DIR/sys/sh/pkg/facility/pkg-facility.lib.sh"
. "$m_LIB_DIR/sys/sh/pkg/facility/pkg-dependency.lib.sh"

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
