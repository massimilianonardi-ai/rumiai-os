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

_pkg_install_catalog_init()
{
  [ "$#" -eq 0 ] || return 1

  pkg_install_catalog_conf="$(state-path system sys pkg conf)/catalog" || return 2
  pkg_install_catalog_url="$(cat "$pkg_install_catalog_conf")" || return 3

  pkg_install_catalog_work="$pkg_install_work/catalog"
  rm -rf -- "$pkg_install_catalog_work" && mkdir -p -- "$pkg_install_catalog_work" || return 4

  pkg_install_catalog_cache="$pkg_install_cache_root/catalog"

  if [ ! -d "$pkg_install_catalog_cache/.git" ]
  then
    git clone -- "$pkg_install_catalog_url" "$pkg_install_catalog_cache" || return 5
  else
    git pull -C "$pkg_install_catalog_cache" || return 6
  fi
}

_pkg_install_init()
{
  [ "$#" -eq 0 ] || return 1

  trap '_pkg_install_end' 0
  trap 'exit 130' HUP INT TERM

  umask 077

  pkg_install_tmp_root="$(state-path system sys pkg tmp)/install2-$$" || return 2
  mkdir -p -- "$pkg_install_work" || return 3

  pkg_install_cache_root="$(state-path system sys pkg cache)" || return 4
  mkdir -p -- "$pkg_install_cache_root" || return 5

  pkg_install_work="$pkg_install_tmp_root/install2-$$"
  mkdir -p -- "$pkg_install_work" || return 6

  _pkg_install_catalog_init || return 7
}

_pkg_install_end()
{
  rm -rf -- "$pkg_install_work"
}

pkg_install2()
(
  [ "$#" -ge 1 ] || exit 1

  pkg_install_validate "$@" || fatal 2 execution invalid-arguments operation pkg-install

  _pkg_install_init || fatal 3 execution execution-failed operation pkg-install reason pkg-init-failed

  _pkg_install_list_resolved=$(pkg_install_resolve "$@") || fatal 4 execution invalid-arguments operation pkg-install reason request-unresolvable
  eval "set -- $_pkg_install_list_resolved"

  _pkg_install_list_dependency_resolved=$(pkg_install_dependency_resolve "$@") || fatal 5 execution invalid-arguments operation pkg-install reason dependency-unresolvable
  eval "set -- $_pkg_install_list_dependency_resolved"

  for _pkg_install_pkg
  do
    pkg_install_one "$_pkg_install_pkg" || fatal 6 execution execution-failed operation pkg-install reason install-failed package "$_pkg_install_pkg"
  done
)
