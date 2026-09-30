loadsyslib "pkg/pkg-common"
loadsyslib "pkg/pkg-download"
loadsyslib "pkg/pkg-extract"
loadsyslib "pkg/pkg-integration"

pkg_install_one()
(
  for pkg
  do
    true
  done
)

pkg_install_dependency_resolve()
(
  for pkg
  do
    true
  done
)

pkg_install_resolve_one()
(
  true
)

pkg_install_resolve()
(
  [ "$#" -ge 1 ] || exit 1

  _pkg_install_resolve_separator=""

  for pkg_install_request
  do
    pkg_install_concrete="$(pkg_install_resolve_one "$pkg_install_request")" || exit 2
    pkg_install_quoted="$(quote "$pkg_install_concrete")" || exit 3

    printf -- '%s' "${_pkg_install_resolve_separator}${pkg_install_quoted}"
    _pkg_install_resolve_separator=" "
  done
)

pkg_install_validate()
(
  [ "$#" -ge 1 ] || exit 1

  for pkg_install_operand
  do
    pkg_install_left=$pkg_install_operand

    # [!<osarch>]
    case "$pkg_install_left" in
      *!*)
        pkg_install_osarch=${pkg_install_left##*!}
        pkg_install_left=${pkg_install_left%!"$pkg_install_osarch"}

        case "$pkg_install_left" in
          *!*) exit 1 ;;
        esac

        pkg_osarch_valid "$pkg_install_osarch" ||
          exit 2
        ;;
    esac

    # <package>[@<version>]
    case "$pkg_install_left" in
      *@*)
        pkg_install_version=${pkg_install_left##*@}
        pkg_install_pkg=${pkg_install_left%@"$pkg_install_version"}

        case "$pkg_install_pkg" in
          *@*) exit 3 ;;
        esac

        pkg_version_valid "$pkg_install_version" || exit 4
      ;;

      *)
        pkg_install_pkg=$pkg_install_left
      ;;
    esac

    pkg_name_valid "$pkg_install_pkg" || exit 5
  done
)

pkg_install_catalog_snapshot()
{
  umask 077

  pkg_install_work_parent="$(command -- state-path system sys pkg tmp)" || fatal 1 execution execution-failed operation pkg-install reason work-path-failed
  _pkg_install_mkdir "$pkg_install_work_parent" || fatal 2 execution execution-failed operation pkg-install reason work-path-failed
  pkg_install_work="$pkg_install_work_parent/install2-$$"
  [ ! -e "$pkg_install_work" ] && [ ! -L "$pkg_install_work" ] || fatal 3 execution execution-failed operation pkg-install reason work-path-collision
  command -p -- mkdir -- "$pkg_install_work" || fatal 4 execution execution-failed operation pkg-install reason work-path-failed

  trap '_pkg_install_cleanup' 0
  trap 'exit 130' HUP INT TERM

  pkg_install_catalog="$pkg_install_work/catalog"
  command -p -- mkdir -- "$pkg_install_catalog" || fatal 1 execution execution-failed operation pkg-install reason catalog-snapshot-failed
  pkg_install_catalog_head="$(_pkg_install_catalog_snapshot "$pkg_install_catalog")" || fatal 1 execution execution-failed operation pkg-install reason catalog-snapshot-failed
  _pkg_install_git_head_valid "$pkg_install_catalog_head" || fatal 1 execution execution-failed operation pkg-install reason catalog-snapshot-invalid
}

pkg_install2()
(
  [ "$#" -ge 1 ] || exit 1

  pkg_install_validate "$@" || fatal 2 execution invalid-arguments operation pkg-install

  pkg_install_catalog_snapshot || fatal 3 execution execution-failed operation pkg-install reason catalog-snapshot-invalid

  _pkg_install_list_resolved=$(pkg_install_resolve "$@") || fatal 4 execution invalid-arguments operation pkg-install reason request-unresolvable
  eval "set -- $_pkg_install_list_resolved"

  _pkg_install_list_dependency_resolved=$(pkg_install_dependency_resolve "$@") || fatal 5 execution invalid-arguments operation pkg-install reason dependency-unresolvable
  eval "set -- $_pkg_install_list_dependency_resolved"

  for _pkg_install_pkg
  do
    pkg_install_one "$_pkg_install_pkg" || fatal 6 execution execution-failed operation pkg-install reason install-failed package "$_pkg_install_pkg"
  done
)
