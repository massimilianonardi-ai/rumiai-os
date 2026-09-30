loadsyslib "pkg/pkg-common"
loadsyslib "pkg/pkg-catalog"
loadsyslib "pkg/pkg-depend"
loadsyslib "pkg/pkg-download"
loadsyslib "pkg/pkg-extract2"
loadsyslib "pkg/pkg-integration"

_pkg_install_validate()
(
  [ "$#" -ge 1 ] || return 2

  for pkg_install_request
  do
    pkg_request_read pkg_install_validate_pkg pkg_install_validate_version pkg_install_validate_osarch "$pkg_install_request" || return 2
  done
)

pkg_install_one()
(
  [ "$#" -eq 1 ] || exit 1

  pkg_install_request=$1

  if pkg_concrete_read pkg_install_pkg pkg_install_version pkg_install_osarch "$pkg_install_request"
  then
    if [ -e "$m_PKG_DIR/$pkg_install_request" ] || [ -L "$m_PKG_DIR/$pkg_install_request" ]
    then
      [ -d "$m_PKG_DIR/$pkg_install_request" ] && [ ! -L "$m_PKG_DIR/$pkg_install_request" ] || exit 3
      exit 0
    fi
  fi

  pkg_catalog_request_resolve pkg_install_concrete pkg_install_target "$pkg_install_catalog_work" "$pkg_install_request" "$m_OSARCH" || exit 2
  pkg_concrete_read pkg_install_pkg pkg_install_version pkg_install_osarch "$pkg_install_concrete" || exit 2

  if [ -e "$m_PKG_DIR/$pkg_install_concrete" ] || [ -L "$m_PKG_DIR/$pkg_install_concrete" ]
  then
    [ -d "$m_PKG_DIR/$pkg_install_concrete" ] && [ ! -L "$m_PKG_DIR/$pkg_install_concrete" ] || exit 3
    exit 0
  fi

  pkg_catalog_range_resolve pkg_install_range "$pkg_install_catalog_work" "$pkg_install_concrete" || exit 7

  pkg_install_repository="${pkg_install_range%/*}/repository"
  pkg_install_repository_type="$(cat "$pkg_install_repository/type")" || exit 9
  pkg_install_repository_adapter="$m_LIB_DIR/sys/sh/pkg/repository/pkg-repository-$pkg_install_repository_type.lib.sh"

  pkg_install_item="$pkg_install_work/$pkg_install_concrete"
  mkdir -- "$pkg_install_item" || exit 10

  pkg_install_download_dir="$pkg_install_item/download"
  pkg_install_extract_dir="$pkg_install_item/extract"
  mkdir -- "$pkg_install_download_dir" "$pkg_install_extract_dir" || exit 11

  pkg_install_artifact="$( ( . "$pkg_install_repository_adapter" || exit 1; pkg_repository_resolve_artifact "$pkg_install_repository" "$pkg_install_range" "$pkg_install_version" ) | pkg_download "$pkg_install_download_dir" )" || exit 12

  pkg_extract "$pkg_install_artifact" "$pkg_install_range" "$pkg_install_extract_dir" || exit 13

  pkg_facility_provider_validate "$pkg_install_catalog_work" "$pkg_install_range" "$pkg_install_extract_dir" || exit 17
  pkg_integrate "$pkg_install_pkg" "$pkg_install_version" "$pkg_install_range" "$pkg_install_extract_dir" "$pkg_install_osarch" || exit 18

  if [ -n "$pkg_install_osarch" ]
  then
    pkg_default_apply "$pkg_install_pkg" "$pkg_install_version" "$pkg_install_osarch" || exit 19
  else
    pkg_default_apply "$pkg_install_pkg" "$pkg_install_version" || exit 19
  fi
)

_pkg_install_init()
{
  [ "$#" -eq 0 ] || return 1

  mkdir -p $m_PKG_DIR

  trap '_pkg_install_end' 0
  trap 'exit 130' HUP INT TERM

  umask 077

  pkg_install_tmp_root="$(state-path system sys pkg tmp)" || return 2
  mkdir -p -- "$pkg_install_tmp_root" || return 3

  pkg_install_cache_root="$(state-path system sys pkg cache)" || return 4
  mkdir -p -- "$pkg_install_cache_root" || return 5

  pkg_install_work="$pkg_install_tmp_root/install2-$$"
  mkdir -p -- "$pkg_install_work" || return 6

  pkg_catalog_init pkg_install_catalog_work pkg_install_catalog_head "$pkg_install_work" "$pkg_install_cache_root" || return 7
}

_pkg_install_end()
{
  rm -rf -- "$pkg_install_work"
}

pkg_install()
(
  [ "$#" -ge 1 ] || exit 1

  _pkg_install_validate "$@" || fatal 2 execution invalid-arguments operation pkg-install
  _pkg_install_request_list="$(quote "$@")" || fatal 2 execution invalid-arguments operation pkg-install
  _pkg_install_dependency_list="$(pkg_depend "$@")" || fatal 4 execution invalid-arguments operation pkg-install reason dependency-unresolvable
  eval "set -- $_pkg_install_dependency_list $_pkg_install_request_list"

  _pkg_install_init || fatal 3 execution execution-failed operation pkg-install reason pkg-init-failed

  for _pkg_install_pkg
  do
    pkg_install_one "$_pkg_install_pkg" || fatal 6 execution execution-failed operation pkg-install reason install-failed package "$_pkg_install_pkg"
  done
)
