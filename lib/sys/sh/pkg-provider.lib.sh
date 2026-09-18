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
