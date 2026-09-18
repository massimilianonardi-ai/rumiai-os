. "$m_LIB_DIR/sys/sh/pkg-facility.lib.sh"

_pkg_provider_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
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

_pkg_provider_selector_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_provider_selector=$1
  pkg_provider_selector_pkg=
  pkg_provider_selector_version=
  pkg_provider_selector_osarch=
  pkg_provider_selector_left=$pkg_provider_selector

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

_pkg_provider_concrete_parse()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_provider_selector_parse "$1" || return 1
  [ -n "$pkg_provider_selector_version" ] || return 1
}

_pkg_provider_scalar_read()
{
  [ "$#" -eq 1 ] || return 2
  pkg_provider_selector_value=

  if [ ! -e "$1" ] && [ ! -L "$1" ]
  then
    return 1
  fi

  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1
  pkg_provider_selector_extra=
  {
    IFS= read -r pkg_provider_selector_value || return 1
    IFS= read -r pkg_provider_selector_extra
    pkg_provider_selector_second_status=$?
  } < "$1"

  [ "$pkg_provider_selector_second_status" -ne 0 ] || return 1
  [ -z "$pkg_provider_selector_extra" ] || return 1
  [ -n "$pkg_provider_selector_value" ] || return 1
  _pkg_provider_selector_parse "$pkg_provider_selector_value" || return 1
}

_pkg_provider_default_root()
{
  [ "$#" -eq 0 ] || return 2
  pkg_provider_system_conf="$(command -- state-path system sys pkg conf)" || return 1
  pkg_provider_default_root="$pkg_provider_system_conf/facility-default"
}

_pkg_provider_default_path()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_facility_name_valid "$1" || return 2
  _pkg_provider_default_root || return 1
  pkg_provider_selector_path="$pkg_provider_default_root/$1"
}

_pkg_provider_binding_path()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_provider_name_valid "$1" || return 2
  _pkg_facility_name_valid "$2" || return 2
  pkg_provider_consumer_conf="$(command -- state-path system pkg "$1" conf)" || return 1
  pkg_provider_selector_path="$pkg_provider_consumer_conf/.m/binding/$2"
}

_pkg_provider_default_read()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_provider_default_path "$1" || return $?
  _pkg_provider_scalar_read "$pkg_provider_selector_path"
}

_pkg_provider_binding_read()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_provider_binding_path "$1" "$2" || return $?
  _pkg_provider_scalar_read "$pkg_provider_selector_path"
}

_pkg_provider_selector_write()
{
  [ "$#" -eq 2 ] || return 2
  pkg_provider_write_path=$1
  pkg_provider_write_selector=$2
  _pkg_provider_selector_parse "$pkg_provider_write_selector" || return 2
  pkg_provider_write_parent=${pkg_provider_write_path%/*}
  [ "$pkg_provider_write_parent" != "$pkg_provider_write_path" ] || return 1

  command -p -- mkdir -p -- "$pkg_provider_write_parent" || return 1
  [ -d "$pkg_provider_write_parent" ] && [ ! -L "$pkg_provider_write_parent" ] || return 1
  if [ -e "$pkg_provider_write_path" ] || [ -L "$pkg_provider_write_path" ]
  then
    [ -f "$pkg_provider_write_path" ] && [ ! -L "$pkg_provider_write_path" ] || return 1
  fi

  pkg_provider_write_tmp="$pkg_provider_write_parent/.selector-$$"
  [ ! -e "$pkg_provider_write_tmp" ] && [ ! -L "$pkg_provider_write_tmp" ] || return 1
  if ! printf -- '%s\n' "$pkg_provider_write_selector" > "$pkg_provider_write_tmp"
  then
    command -p -- rm -f -- "$pkg_provider_write_tmp" 2>/dev/null || :
    return 1
  fi
  if ! command -p -- mv -- "$pkg_provider_write_tmp" "$pkg_provider_write_path"
  then
    command -p -- rm -f -- "$pkg_provider_write_tmp" 2>/dev/null || :
    return 1
  fi
}

_pkg_provider_selector_unset()
{
  [ "$#" -eq 1 ] || return 2
  if [ ! -e "$1" ] && [ ! -L "$1" ]
  then
    return 0
  fi
  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  command -p -- rm -f -- "$1"
}

_pkg_provider_selector_resolve()
{
  [ "$#" -eq 2 ] || return 2
  pkg_provider_resolve_selector=$1
  pkg_provider_consumer_osarch=$2
  pkg_provider_resolved=

  _pkg_provider_selector_parse "$pkg_provider_resolve_selector" || return 1
  pkg_provider_requested_pkg=$pkg_provider_selector_pkg
  pkg_provider_requested_version=$pkg_provider_selector_version
  pkg_provider_requested_osarch=$pkg_provider_selector_osarch

  if [ -n "$pkg_provider_consumer_osarch" ]
  then
    _pkg_provider_osarch_valid "$pkg_provider_consumer_osarch" || return 1
  fi

  if [ -n "$pkg_provider_requested_osarch" ]
  then
    pkg_provider_target_osarch=$pkg_provider_requested_osarch
  else
    pkg_provider_target_osarch=$pkg_provider_consumer_osarch
  fi

  if [ -n "$pkg_provider_requested_version" ]
  then
    if [ -n "$pkg_provider_target_osarch" ]
    then
      pkg_provider_candidate="$pkg_provider_requested_pkg@$pkg_provider_requested_version!$pkg_provider_target_osarch"
      if [ ! -d "$m_PKG_DIR/$pkg_provider_candidate" ] || [ -L "$m_PKG_DIR/$pkg_provider_candidate" ]
      then
        [ -z "$pkg_provider_requested_osarch" ] || return 1
        pkg_provider_candidate="$pkg_provider_requested_pkg@$pkg_provider_requested_version"
      fi
    else
      pkg_provider_candidate="$pkg_provider_requested_pkg@$pkg_provider_requested_version"
    fi
  else
    pkg_provider_candidate=
    if [ -n "$pkg_provider_target_osarch" ]
    then
      pkg_provider_class="$m_PKG_DIR/$pkg_provider_requested_pkg!$pkg_provider_target_osarch"
      if [ -L "$pkg_provider_class" ]
      then
        pkg_provider_candidate="$(command -p -- readlink "$pkg_provider_class")" || return 1
      elif [ -e "$pkg_provider_class" ]
      then
        return 1
      elif [ -n "$pkg_provider_requested_osarch" ]
      then
        return 1
      fi
    fi

    if [ -z "$pkg_provider_candidate" ]
    then
      pkg_provider_class="$m_PKG_DIR/$pkg_provider_requested_pkg"
      [ -L "$pkg_provider_class" ] || return 1
      pkg_provider_candidate="$(command -p -- readlink "$pkg_provider_class")" || return 1
    fi
  fi

  case "$pkg_provider_candidate" in "" | *'/'*) return 1 ;; esac
  _pkg_provider_concrete_parse "$pkg_provider_candidate" || return 1
  pkg_provider_resolved_pkg=$pkg_provider_selector_pkg
  pkg_provider_resolved_osarch=$pkg_provider_selector_osarch
  [ "$pkg_provider_resolved_pkg" = "$pkg_provider_requested_pkg" ] || return 1
  [ -d "$m_PKG_DIR/$pkg_provider_candidate" ] && [ ! -L "$m_PKG_DIR/$pkg_provider_candidate" ] || return 1

  if [ -z "$pkg_provider_consumer_osarch" ]
  then
    [ -z "$pkg_provider_resolved_osarch" ] || return 1
  else
    [ -z "$pkg_provider_resolved_osarch" ] || [ "$pkg_provider_resolved_osarch" = "$pkg_provider_consumer_osarch" ] || return 1
  fi

  pkg_provider_resolved=$pkg_provider_candidate
}

_pkg_provider_default_command()
{
  pkg_provider_unset=0
  case "${1-}" in
    -u) pkg_provider_unset=1; shift ;;
    --) shift ;;
    -*) return 2 ;;
  esac
  if [ "$pkg_provider_unset" -eq 1 ] && [ "${1-}" = -- ]
  then
    shift
  fi

  if [ "$pkg_provider_unset" -eq 1 ]
  then
    [ "$#" -eq 1 ] || return 2
    _pkg_provider_default_path "$1" || return $?
    _pkg_provider_selector_unset "$pkg_provider_selector_path"
    return $?
  fi

  case "$#" in
    1)
      _pkg_provider_default_read "$1" || return $?
      printf -- '%s\n' "$pkg_provider_selector_value"
      ;;
    2)
      _pkg_provider_default_path "$1" || return $?
      _pkg_provider_selector_write "$pkg_provider_selector_path" "$2"
      ;;
    *) return 2 ;;
  esac
}

_pkg_provider_bind_command()
{
  pkg_provider_unset=0
  case "${1-}" in
    -u) pkg_provider_unset=1; shift ;;
    --) shift ;;
    -*) return 2 ;;
  esac
  if [ "$pkg_provider_unset" -eq 1 ] && [ "${1-}" = -- ]
  then
    shift
  fi

  if [ "$pkg_provider_unset" -eq 1 ]
  then
    [ "$#" -eq 2 ] || return 2
    _pkg_provider_binding_path "$1" "$2" || return $?
    _pkg_provider_selector_unset "$pkg_provider_selector_path"
    return $?
  fi

  case "$#" in
    2)
      _pkg_provider_binding_read "$1" "$2" || return $?
      printf -- '%s\n' "$pkg_provider_selector_value"
      ;;
    3)
      _pkg_provider_binding_path "$1" "$2" || return $?
      _pkg_provider_selector_write "$pkg_provider_selector_path" "$3"
      ;;
    *) return 2 ;;
  esac
}

pkg_provider()
(
  [ "$#" -ge 1 ] || return 2
  umask 077
  pkg_provider_operation=$1
  shift

  case "$pkg_provider_operation" in
    default) _pkg_provider_default_command "$@" ;;
    bind) _pkg_provider_bind_command "$@" ;;
    *) return 2 ;;
  esac
)
