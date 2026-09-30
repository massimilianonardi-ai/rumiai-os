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

pkg_install2()
(
  [ "$#" -ge 1 ] || exit 1

  pkg_install_validate "$@" || fatal 2 execution invalid-arguments operation pkg-install

  _pkg_install_list_resolved=$(pkg_install_resolve "$@") || fatal 3 execution invalid-arguments operation pkg-install reason request-unresolvable
  eval "set -- $_pkg_install_list_resolved"

  _pkg_install_list_dependency_resolved=$(pkg_install_dependency_resolve "$@") || fatal 4 execution invalid-arguments operation pkg-install reason dependency-unresolvable
  eval "set -- $_pkg_install_list_dependency_resolved"

  for _pkg_install_pkg
  do
    pkg_install_one "$_pkg_install_pkg" || fatal 5 execution execution-failed operation pkg-install reason install-failed package "$_pkg_install_pkg"
  done
)
