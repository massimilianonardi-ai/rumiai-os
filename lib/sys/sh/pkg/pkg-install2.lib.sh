loadsyslib "pkg/pkg-common"
loadsyslib "pkg/pkg-local"
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

_pkg_install_dependency_source()
{
  [ "$#" -eq 1 ] || return 2

  pkg_install_dependency_source=

  if [ -d "$m_PKG_DIR/$1" ]
  then
    if [ -f "$m_PKG_DIR/$1/dependency" ]
    then
      pkg_install_dependency_source="$m_PKG_DIR/$1/dependency"
    fi

    return 0
  fi

  _pkg_install_dependency_range_resolve "$1" || return 1

  if [ -f "$pkg_install_dependency_range/dependency" ]
  then
    pkg_install_dependency_source="$pkg_install_dependency_range/dependency"
  fi
}

_pkg_install_dependency_visit()
{
  [ "$#" -eq 1 ] || return 2

  pkg_install_dependency_visit_concrete=$1

  case " $pkg_install_dependency_done " in
    *" $pkg_install_dependency_visit_concrete "*)
      return 0
    ;;
  esac

  case " $pkg_install_dependency_stack " in
    *" $pkg_install_dependency_visit_concrete "*)
      return 1
    ;;
  esac

  pkg_install_dependency_stack_saved=$pkg_install_dependency_stack
  pkg_install_dependency_stack="$pkg_install_dependency_stack $pkg_install_dependency_visit_concrete"

  _pkg_install_dependency_source "$pkg_install_dependency_visit_concrete" || return 1

  if [ -n "$pkg_install_dependency_source" ]
  then
    while IFS= read -r pkg_install_dependency_line
    do
      _pkg_dependency_line_parse "$pkg_install_dependency_line" || return 1
      _pkg_install_dependency_resolve_one "$pkg_install_dependency_visit_concrete" "$pkg_dependency_facility" "$pkg_dependency_constraints" || return 1
      _pkg_install_dependency_visit "$pkg_install_dependency_resolved" || return 1

    done < "$pkg_install_dependency_source"
  fi

  pkg_install_dependency_stack=$pkg_install_dependency_stack_saved
  pkg_install_dependency_done="$pkg_install_dependency_done $pkg_install_dependency_visit_concrete"
  pkg_install_dependency_order="$pkg_install_dependency_order $pkg_install_dependency_visit_concrete"
}

pkg_install_dependency_resolve()
(
  [ "$#" -ge 1 ] || exit 1

  pkg_install_dependency_done=
  pkg_install_dependency_stack=
  pkg_install_dependency_order=

  for pkg_install_dependency_concrete
  do
    _pkg_install_dependency_visit "$pkg_install_dependency_concrete" || exit 2
  done

  pkg_install_dependency_separator=

  for pkg_install_dependency_concrete in $pkg_install_dependency_order
  do
    pkg_install_dependency_quoted="$(quote "$pkg_install_dependency_concrete")" || exit 3

    printf -- '%s' "${pkg_install_dependency_separator}${pkg_install_dependency_quoted}"

    pkg_install_dependency_separator=" "
  done
)

pkg_install_resolve_one()
(
  [ "$#" -eq 1 ] || exit 1

  pkg_install_request=$1
  pkg_install_left=$pkg_install_request
  pkg_install_requested_osarch=
  pkg_install_requested_version=

  case "$pkg_install_left" in
    *!*)
      pkg_install_requested_osarch=${pkg_install_left##*!}
      pkg_install_left=${pkg_install_left%!"$pkg_install_requested_osarch"}
      ;;
  esac

  case "$pkg_install_left" in
    *@*)
      pkg_install_requested_version=${pkg_install_left##*@}
      pkg_install_pkg=${pkg_install_left%@"$pkg_install_requested_version"}
      ;;
    *)
      pkg_install_pkg=$pkg_install_left
      ;;
  esac

  if [ -n "$pkg_install_requested_osarch" ]
  then
    pkg_install_target=$pkg_install_requested_osarch
  else
    pkg_install_target=$m_OSARCH
  fi

  pkg_install_package="$pkg_install_catalog_work/pkg/$pkg_install_pkg"

  if [ -d "$pkg_install_package/$pkg_install_target" ]
  then
    pkg_install_stream="$pkg_install_package/$pkg_install_target"
    pkg_install_identity_osarch=$pkg_install_target

  elif [ -d "$pkg_install_package/all" ]
  then
    pkg_install_stream="$pkg_install_package/all"
    pkg_install_identity_osarch=

  else
    exit 2
  fi

  if [ -n "$pkg_install_requested_version" ]
  then
    _pkg_integration_set_concrete "$pkg_install_pkg" "$pkg_install_requested_version" "$pkg_install_identity_osarch" || exit 3

    if [ -e "$pkg_integration_concrete" ] || [ -L "$pkg_integration_concrete" ]
    then
      [ -d "$pkg_integration_concrete" ] && [ ! -L "$pkg_integration_concrete" ] || exit 4

      printf -- '%s\n' "$pkg_integration_concrete_name"
      exit 0
    fi

  else
    _pkg_local_class_scan "$pkg_install_pkg" "$pkg_install_identity_osarch" || exit 5

    if [ -n "$pkg_local_class_current_name" ]
    then
      printf -- '%s\n' "$pkg_local_class_current_name"
      exit 0
    fi
  fi

  pkg_install_repository="$pkg_install_stream/repository"

  pkg_install_repository_type="$(cat "$pkg_install_repository/type")" || exit 6

  case "$pkg_install_repository_type" in
    "" | [!a-z0-9]* | *[!a-z0-9-]* | *-)
      exit 7
    ;;
  esac

  pkg_install_repository_adapter="$m_LIB_DIR/sys/sh/pkg/repository/pkg-repository-$pkg_install_repository_type.lib.sh"

  if [ -n "$pkg_install_requested_version" ]
  then
    pkg_install_version="$(
      . "$pkg_install_repository_adapter" || exit 1
      pkg_repository_resolve_version "$pkg_install_repository" "$pkg_install_requested_version"
    )" || exit 8

    [ "$pkg_install_version" = "$pkg_install_requested_version" ] || exit 9
  else
    pkg_install_version="$(
      . "$pkg_install_repository_adapter" || exit 1
      pkg_repository_resolve_version "$pkg_install_repository"
    )" || exit 8
  fi

  pkg_version_valid "$pkg_install_version" || exit 10

  _pkg_integration_set_concrete "$pkg_install_pkg" "$pkg_install_version" "$pkg_install_identity_osarch" || exit 11

  printf -- '%s\n' "$pkg_integration_concrete_name"
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
    git -C "$pkg_install_catalog_cache" remote set-url origin "$pkg_install_catalog_url" || return 6
    git -C "$pkg_install_catalog_cache" pull --ff-only || return 7
  fi

  pkg_install_catalog_head="$(git -C "$pkg_install_catalog_cache" rev-parse HEAD)" || return 7
  git -C "$pkg_install_catalog_cache" archive "$pkg_install_catalog_head" | tar -x -C "$pkg_install_catalog_work" || return 8
}

_pkg_install_init()
{
  [ "$#" -eq 0 ] || return 1

  trap '_pkg_install_end' 0
  trap 'exit 130' HUP INT TERM

  umask 077

  pkg_install_tmp_root="$(state-path system sys pkg tmp)" || return 2
  mkdir -p -- "$pkg_install_tmp_root" || return 3

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
