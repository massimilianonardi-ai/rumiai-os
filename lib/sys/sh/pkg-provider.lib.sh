_pkg_provider_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_provider_facility_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz]* | *[!abcdefghijklmnopqrstuvwxyz0123456789-]*) return 1 ;;
  esac
}

_pkg_provider_version_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._+~-]*) return 1 ;;
  esac
}

_pkg_provider_osarch_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    linux-arm64 | linux-x86_64 | macos-arm64 | macos-x86_64 | windows-arm64 | windows-x86_64) return 0 ;;
    *) return 1 ;;
  esac
}

_pkg_provider_selector_validate()
{
  [ "$#" -eq 1 ] || return 2
  pkg_provider_selector=$1
  pkg_provider_selector_left=$pkg_provider_selector
  pkg_provider_selector_osarch=
  pkg_provider_selector_version=

  case "$pkg_provider_selector_left" in
    *!*)
      pkg_provider_selector_osarch=${pkg_provider_selector_left##*!}
      pkg_provider_selector_left=${pkg_provider_selector_left%!"$pkg_provider_selector_osarch"}
      case "$pkg_provider_selector_left" in *!*) return 1 ;; esac
      _pkg_provider_osarch_valid "$pkg_provider_selector_osarch" || return 1
      ;;
  esac

  case "$pkg_provider_selector_left" in
    *@*)
      pkg_provider_selector_version=${pkg_provider_selector_left##*@}
      pkg_provider_selector_pkg=${pkg_provider_selector_left%@"$pkg_provider_selector_version"}
      case "$pkg_provider_selector_pkg" in *@*) return 1 ;; esac
      _pkg_provider_version_valid "$pkg_provider_selector_version" || return 1
      ;;
    *)
      pkg_provider_selector_pkg=$pkg_provider_selector_left
      ;;
  esac

  _pkg_provider_name_valid "$pkg_provider_selector_pkg"
}

_pkg_provider_scalar_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_provider_scalar=
  pkg_provider_scalar_extra=
  {
    IFS= read -r pkg_provider_scalar || return 1
    IFS= read -r pkg_provider_scalar_extra
    pkg_provider_scalar_second_status=$?
  } < "$1"

  [ "$pkg_provider_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_provider_scalar_extra" ] || return 1
  [ -n "$pkg_provider_scalar" ] || return 1

  pkg_provider_scalar_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_provider_scalar_expected="$(printf -- '%s\n' "$pkg_provider_scalar" | command -p -- wc -c)" || return 1
  [ "$pkg_provider_scalar_actual" = "$pkg_provider_scalar_expected" ] || return 1
}

_pkg_provider_system_conf()
{
  [ "$#" -eq 0 ] || return 2
  pkg_provider_system_conf="$(command -- state-path system sys pkg conf)" || return 1
  [ -n "$pkg_provider_system_conf" ]
}

_pkg_provider_default_file()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_provider_facility_valid "$1" || return 2
  _pkg_provider_system_conf || return 1
  pkg_provider_config_file="$pkg_provider_system_conf/provider/default/$1"
}

_pkg_provider_binding_file()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_provider_name_valid "$1" || return 2
  _pkg_provider_facility_valid "$2" || return 2
  pkg_provider_consumer_conf="$(command -- state-path system pkg "$1" conf)" || return 1
  [ -n "$pkg_provider_consumer_conf" ] || return 1
  pkg_provider_config_file="$pkg_provider_consumer_conf/binding/$2"
}

_pkg_provider_config_query()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_provider_scalar_read "$1" || return 1
  _pkg_provider_selector_validate "$pkg_provider_scalar" || return 1
  printf -- '%s\n' "$pkg_provider_scalar"
}

_pkg_provider_config_set()
{
  [ "$#" -eq 2 ] || return 2
  pkg_provider_config_path=$1
  pkg_provider_config_selector=$2
  _pkg_provider_selector_validate "$pkg_provider_config_selector" || return 2

  pkg_provider_config_dir=${pkg_provider_config_path%/*}
  [ "$pkg_provider_config_dir" != "$pkg_provider_config_path" ] || return 1

  umask 077
  command -p -- mkdir -p -- "$pkg_provider_config_dir" || return 1
  [ -d "$pkg_provider_config_dir" ] && [ ! -L "$pkg_provider_config_dir" ] || return 1

  if [ -e "$pkg_provider_config_path" ] || [ -L "$pkg_provider_config_path" ]
  then
    [ -f "$pkg_provider_config_path" ] && [ ! -L "$pkg_provider_config_path" ] || return 1
  fi

  pkg_provider_config_tmp="$pkg_provider_config_dir/.selector-$$"
  [ ! -e "$pkg_provider_config_tmp" ] && [ ! -L "$pkg_provider_config_tmp" ] || return 1
  if ! printf -- '%s\n' "$pkg_provider_config_selector" > "$pkg_provider_config_tmp"
  then
    command -p -- rm -f -- "$pkg_provider_config_tmp" 2>/dev/null
    return 1
  fi
  if ! command -p -- mv -f -- "$pkg_provider_config_tmp" "$pkg_provider_config_path"
  then
    command -p -- rm -f -- "$pkg_provider_config_tmp" 2>/dev/null
    return 1
  fi
  _pkg_provider_scalar_read "$pkg_provider_config_path" || return 1
  [ "$pkg_provider_scalar" = "$pkg_provider_config_selector" ]
}

_pkg_provider_config_unset()
{
  [ "$#" -eq 1 ] || return 2

  if [ ! -e "$1" ] && [ ! -L "$1" ]
  then
    return 0
  fi

  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  command -p -- rm -f -- "$1"
}

_pkg_provider_default()
{
  pkg_provider_unset=0

  case "${1-}" in
    -u)
      pkg_provider_unset=1
      shift
      ;;
    --)
      shift
      ;;
    -*)
      return 2
      ;;
  esac

  if [ "$pkg_provider_unset" -eq 1 ] && [ "${1-}" = -- ]
  then
    shift
  fi

  if [ "$pkg_provider_unset" -eq 1 ]
  then
    [ "$#" -eq 1 ] || return 2
    _pkg_provider_default_file "$1" || return $?
    _pkg_provider_config_unset "$pkg_provider_config_file"
    return $?
  fi

  [ "$#" -eq 1 ] || [ "$#" -eq 2 ] || return 2
  _pkg_provider_default_file "$1" || return $?

  if [ "$#" -eq 1 ]
  then
    _pkg_provider_config_query "$pkg_provider_config_file"
  else
    _pkg_provider_config_set "$pkg_provider_config_file" "$2"
  fi
}

_pkg_provider_bind()
{
  pkg_provider_unset=0

  case "${1-}" in
    -u)
      pkg_provider_unset=1
      shift
      ;;
    --)
      shift
      ;;
    -*)
      return 2
      ;;
  esac

  if [ "$pkg_provider_unset" -eq 1 ] && [ "${1-}" = -- ]
  then
    shift
  fi

  if [ "$pkg_provider_unset" -eq 1 ]
  then
    [ "$#" -eq 2 ] || return 2
    _pkg_provider_binding_file "$1" "$2" || return $?
    _pkg_provider_config_unset "$pkg_provider_config_file"
    return $?
  fi

  [ "$#" -eq 2 ] || [ "$#" -eq 3 ] || return 2
  _pkg_provider_binding_file "$1" "$2" || return $?

  if [ "$#" -eq 2 ]
  then
    _pkg_provider_config_query "$pkg_provider_config_file"
  else
    _pkg_provider_config_set "$pkg_provider_config_file" "$3"
  fi
}


_pkg_provider_concrete_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_provider_concrete=$1
  pkg_provider_concrete_left=$pkg_provider_concrete
  pkg_provider_concrete_osarch=

  case "$pkg_provider_concrete_left" in
    *!*)
      pkg_provider_concrete_osarch=${pkg_provider_concrete_left##*!}
      pkg_provider_concrete_left=${pkg_provider_concrete_left%!"$pkg_provider_concrete_osarch"}
      case "$pkg_provider_concrete_left" in *!*) return 1 ;; esac
      _pkg_provider_osarch_valid "$pkg_provider_concrete_osarch" || return 1
      ;;
  esac

  case "$pkg_provider_concrete_left" in
    *@*)
      pkg_provider_concrete_version=${pkg_provider_concrete_left##*@}
      pkg_provider_concrete_pkg=${pkg_provider_concrete_left%@"$pkg_provider_concrete_version"}
      case "$pkg_provider_concrete_pkg" in *@*) return 1 ;; esac
      ;;
    *)
      return 1
      ;;
  esac

  _pkg_provider_name_valid "$pkg_provider_concrete_pkg" || return 1
  _pkg_provider_version_valid "$pkg_provider_concrete_version"
}

_pkg_provider_resolved_validate()
{
  [ "$#" -eq 4 ] || return 2
  pkg_provider_resolved_name=$1
  pkg_provider_expected_pkg=$2
  pkg_provider_expected_version=$3
  pkg_provider_consumer_osarch=$4

  _pkg_provider_concrete_parse "$pkg_provider_resolved_name" || return 1
  [ "$pkg_provider_concrete_pkg" = "$pkg_provider_expected_pkg" ] || return 1
  if [ -n "$pkg_provider_expected_version" ]
  then
    [ "$pkg_provider_concrete_version" = "$pkg_provider_expected_version" ] || return 1
  fi

  if [ -n "$pkg_provider_consumer_osarch" ]
  then
    [ -z "$pkg_provider_concrete_osarch" ] || [ "$pkg_provider_concrete_osarch" = "$pkg_provider_consumer_osarch" ] || return 1
  else
    [ -z "$pkg_provider_concrete_osarch" ] || return 1
  fi

  [ -d "$m_PKG_DIR/$pkg_provider_resolved_name" ] && [ ! -L "$m_PKG_DIR/$pkg_provider_resolved_name" ]
}

_pkg_provider_selector_current()
{
  [ "$#" -eq 3 ] || return 2
  pkg_provider_current_pkg=$1
  pkg_provider_current_osarch=$2
  pkg_provider_allow_generic=$3
  pkg_provider_current_name=

  if [ -n "$pkg_provider_current_osarch" ]
  then
    pkg_provider_current_path="$m_PKG_DIR/$pkg_provider_current_pkg!$pkg_provider_current_osarch"
    if [ -L "$pkg_provider_current_path" ]
    then
      pkg_provider_current_name="$(command -p -- readlink "$pkg_provider_current_path")" || return 1
    elif [ -e "$pkg_provider_current_path" ]
    then
      return 1
    elif [ "$pkg_provider_allow_generic" -eq 1 ]
    then
      pkg_provider_current_path="$m_PKG_DIR/$pkg_provider_current_pkg"
      [ -L "$pkg_provider_current_path" ] || {
        [ ! -e "$pkg_provider_current_path" ] || return 1
        return 1
      }
      pkg_provider_current_name="$(command -p -- readlink "$pkg_provider_current_path")" || return 1
    else
      return 1
    fi
  else
    pkg_provider_current_path="$m_PKG_DIR/$pkg_provider_current_pkg"
    [ -L "$pkg_provider_current_path" ] || {
      [ ! -e "$pkg_provider_current_path" ] || return 1
      return 1
    }
    pkg_provider_current_name="$(command -p -- readlink "$pkg_provider_current_path")" || return 1
  fi

  case "$pkg_provider_current_name" in "" | */*) return 1 ;; esac
}

pkg_provider_selector_resolve()
(
  [ "$#" -eq 1 ] || [ "$#" -eq 2 ] || return 2
  pkg_provider_resolve_selector=$1
  pkg_provider_resolve_consumer_osarch=${2-}

  if [ -n "$pkg_provider_resolve_consumer_osarch" ]
  then
    _pkg_provider_osarch_valid "$pkg_provider_resolve_consumer_osarch" || return 2
  fi

  _pkg_provider_selector_validate "$pkg_provider_resolve_selector" || return 2
  pkg_provider_resolve_pkg=$pkg_provider_selector_pkg
  pkg_provider_resolve_version=$pkg_provider_selector_version
  pkg_provider_resolve_selector_osarch=$pkg_provider_selector_osarch

  if [ -n "$pkg_provider_resolve_selector_osarch" ]
  then
    [ -n "$pkg_provider_resolve_consumer_osarch" ] || return 1
    [ "$pkg_provider_resolve_selector_osarch" = "$pkg_provider_resolve_consumer_osarch" ] || return 1
    pkg_provider_resolve_osarch=$pkg_provider_resolve_selector_osarch
    pkg_provider_resolve_allow_generic=0
  else
    pkg_provider_resolve_osarch=$pkg_provider_resolve_consumer_osarch
    pkg_provider_resolve_allow_generic=1
  fi

  if [ -n "$pkg_provider_resolve_version" ]
  then
    if [ -n "$pkg_provider_resolve_osarch" ]
    then
      pkg_provider_resolved="$pkg_provider_resolve_pkg@$pkg_provider_resolve_version!$pkg_provider_resolve_osarch"
      if [ ! -d "$m_PKG_DIR/$pkg_provider_resolved" ] || [ -L "$m_PKG_DIR/$pkg_provider_resolved" ]
      then
        [ "$pkg_provider_resolve_allow_generic" -eq 1 ] || return 1
        pkg_provider_resolved="$pkg_provider_resolve_pkg@$pkg_provider_resolve_version"
      fi
    else
      pkg_provider_resolved="$pkg_provider_resolve_pkg@$pkg_provider_resolve_version"
    fi
  else
    _pkg_provider_selector_current "$pkg_provider_resolve_pkg" "$pkg_provider_resolve_osarch" "$pkg_provider_resolve_allow_generic" || return 1
    pkg_provider_resolved=$pkg_provider_current_name
  fi

  _pkg_provider_resolved_validate "$pkg_provider_resolved" "$pkg_provider_resolve_pkg" "$pkg_provider_resolve_version" "$pkg_provider_resolve_consumer_osarch" || return 1
  printf -- '%s\n' "$pkg_provider_resolved"
)

pkg_provider_effective_selector()
(
  [ "$#" -eq 2 ] || return 2
  pkg_provider_effective_consumer=$1
  pkg_provider_effective_facility=$2

  _pkg_provider_binding_file "$pkg_provider_effective_consumer" "$pkg_provider_effective_facility" || return $?
  pkg_provider_effective_binding=$pkg_provider_config_file

  if [ -e "$pkg_provider_effective_binding" ] || [ -L "$pkg_provider_effective_binding" ]
  then
    _pkg_provider_config_query "$pkg_provider_effective_binding"
    return $?
  fi

  _pkg_provider_default_file "$pkg_provider_effective_facility" || return $?
  _pkg_provider_config_query "$pkg_provider_config_file"
)


_pkg_provider_selector_matches_concrete()
{
  [ "$#" -eq 2 ] || return 2
  pkg_provider_match_selector=$1
  pkg_provider_match_concrete=$2

  _pkg_provider_concrete_parse "$pkg_provider_match_concrete" || return 2
  pkg_provider_match_osarch=$pkg_provider_concrete_osarch

  pkg_provider_match_resolved="$(pkg_provider_selector_resolve "$pkg_provider_match_selector" "$pkg_provider_match_osarch")"
  pkg_provider_match_status=$?
  case "$pkg_provider_match_status" in
    0) [ "$pkg_provider_match_resolved" = "$pkg_provider_match_concrete" ] ;;
    1) return 1 ;;
    *) return 2 ;;
  esac
}

pkg_provider_concrete_referenced()
(
  [ "$#" -eq 1 ] || return 2
  pkg_provider_reference_target=$1
  _pkg_provider_concrete_parse "$pkg_provider_reference_target" || return 2

  _pkg_provider_system_conf || return 2
  pkg_provider_reference_default_root="$pkg_provider_system_conf/provider/default"

  if [ -e "$pkg_provider_reference_default_root" ] || [ -L "$pkg_provider_reference_default_root" ]
  then
    [ -d "$pkg_provider_reference_default_root" ] && [ ! -L "$pkg_provider_reference_default_root" ] || return 2
    for pkg_provider_reference_file in       "$pkg_provider_reference_default_root"/*       "$pkg_provider_reference_default_root"/.[!.]*       "$pkg_provider_reference_default_root"/..?*
    do
      [ -e "$pkg_provider_reference_file" ] || [ -L "$pkg_provider_reference_file" ] || continue
      _pkg_provider_scalar_read "$pkg_provider_reference_file" || return 2
      _pkg_provider_selector_validate "$pkg_provider_scalar" || return 2
      if _pkg_provider_selector_matches_concrete "$pkg_provider_scalar" "$pkg_provider_reference_target"
      then
        return 0
      else
        pkg_provider_reference_status=$?
        [ "$pkg_provider_reference_status" -eq 1 ] || return 2
      fi
    done
  fi

  pkg_provider_reference_pkg_root="$m_STATE_SYS_DIR/pkg"
  if [ ! -e "$pkg_provider_reference_pkg_root" ] && [ ! -L "$pkg_provider_reference_pkg_root" ]
  then
    return 1
  fi
  [ -d "$pkg_provider_reference_pkg_root" ] && [ ! -L "$pkg_provider_reference_pkg_root" ] || return 2

  for pkg_provider_reference_consumer in     "$pkg_provider_reference_pkg_root"/*     "$pkg_provider_reference_pkg_root"/.[!.]*     "$pkg_provider_reference_pkg_root"/..?*
  do
    [ -e "$pkg_provider_reference_consumer" ] || [ -L "$pkg_provider_reference_consumer" ] || continue
    [ -d "$pkg_provider_reference_consumer" ] && [ ! -L "$pkg_provider_reference_consumer" ] || continue
    pkg_provider_reference_binding_root="$pkg_provider_reference_consumer/conf/binding"

    if [ ! -e "$pkg_provider_reference_binding_root" ] && [ ! -L "$pkg_provider_reference_binding_root" ]
    then
      continue
    fi
    [ -d "$pkg_provider_reference_binding_root" ] && [ ! -L "$pkg_provider_reference_binding_root" ] || return 2

    for pkg_provider_reference_file in       "$pkg_provider_reference_binding_root"/*       "$pkg_provider_reference_binding_root"/.[!.]*       "$pkg_provider_reference_binding_root"/..?*
    do
      [ -e "$pkg_provider_reference_file" ] || [ -L "$pkg_provider_reference_file" ] || continue
      _pkg_provider_scalar_read "$pkg_provider_reference_file" || return 2
      _pkg_provider_selector_validate "$pkg_provider_scalar" || return 2
      if _pkg_provider_selector_matches_concrete "$pkg_provider_scalar" "$pkg_provider_reference_target"
      then
        return 0
      else
        pkg_provider_reference_status=$?
        [ "$pkg_provider_reference_status" -eq 1 ] || return 2
      fi
    done
  done

  return 1
)

pkg_provider()
(
  [ "$#" -ge 1 ] || return 2
  pkg_provider_action=$1
  shift

  case "$pkg_provider_action" in
    default) _pkg_provider_default "$@" ;;
    bind) _pkg_provider_bind "$@" ;;
    *) return 2 ;;
  esac
)
