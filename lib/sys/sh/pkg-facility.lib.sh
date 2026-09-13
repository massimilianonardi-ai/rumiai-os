_pkg_facility_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz]* | *[!abcdefghijklmnopqrstuvwxyz0123456789-]*) return 1 ;;
  esac
}

_pkg_facility_compatibility_valid()
{
  [ "$#" -eq 1 ] || return 2
  pkg_facility_compatibility=$1

  case "$pkg_facility_compatibility" in
    "" | *[!0123456789.]* | .* | *. | *..*) return 1 ;;
  esac

  if [ "${pkg_facility_compatibility#*.}" != "$pkg_facility_compatibility" ] && [ "${pkg_facility_compatibility##*.}" = 0 ]
  then
    return 1
  fi

  pkg_facility_compatibility_rest=$pkg_facility_compatibility
  while :
  do
    pkg_facility_compatibility_component=${pkg_facility_compatibility_rest%%.*}
    case "$pkg_facility_compatibility_component" in
      0) : ;;
      "" | 0* | *[!0123456789]*) return 1 ;;
    esac

    case "$pkg_facility_compatibility_rest" in
      *.*) pkg_facility_compatibility_rest=${pkg_facility_compatibility_rest#*.} ;;
      *) break ;;
    esac
  done
}

_pkg_facility_line_parse()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    *" "*)
      pkg_facility_name=${1%% *}
      pkg_facility_compatibility=${1#* }
      ;;
    *)
      return 1
      ;;
  esac

  [ -n "$pkg_facility_name" ] && [ -n "$pkg_facility_compatibility" ] || return 1
  case "$pkg_facility_compatibility" in *" "*) return 1 ;; esac
  _pkg_facility_name_valid "$pkg_facility_name" || return 1
  _pkg_facility_compatibility_valid "$pkg_facility_compatibility" || return 1
}

_pkg_facility_file_validate()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_facility_original="$(
    command -p -- cat -- "$1" || exit 1
    printf -- '%s' x
  )" || return 1
  pkg_facility_sorted="$(
    LC_ALL=C command -p -- sort < "$1" || exit 1
    printf -- '%s' x
  )" || return 1
  [ "$pkg_facility_original" = "$pkg_facility_sorted" ] || return 1

  pkg_facility_count=0
  pkg_facility_previous=
  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    [ "$pkg_facility_name" != "$pkg_facility_previous" ] || return 1
    pkg_facility_previous=$pkg_facility_name
    pkg_facility_count=$((pkg_facility_count + 1))
  done < "$1"

  [ "$pkg_facility_count" -gt 0 ]
}

_pkg_facility_dir_ensure()
{
  [ "$#" -eq 1 ] || return 2
  if [ -e "$1" ] || [ -L "$1" ]
  then
    [ -d "$1" ] && [ ! -L "$1" ]
    return $?
  fi
  command -p -- mkdir -- "$1" || return 1
  [ -d "$1" ] && [ ! -L "$1" ]
}

_pkg_facility_provider_root_ensure()
{
  [ "$#" -eq 0 ] || return 2
  [ -d "$m_DATA_DIR" ] && [ ! -L "$m_DATA_DIR" ] || return 1
  _pkg_facility_dir_ensure "$m_DATA_DIR/sys" || return 1
  _pkg_facility_dir_ensure "$m_DATA_DIR/sys/pkg" || return 1
  _pkg_facility_dir_ensure "$m_DATA_DIR/sys/pkg/providers" || return 1
}

_pkg_facility_dir_entries_empty()
{
  [ "$#" -eq 1 ] || return 2
  for pkg_facility_entry in \
    "$1"/* \
    "$1"/.[!.]* \
    "$1"/..?*
  do
    [ -e "$pkg_facility_entry" ] || [ -L "$pkg_facility_entry" ] || continue
    return 1
  done
  return 0
}

_pkg_facility_compatibility_dir_remove_if_empty()
{
  [ "$#" -eq 1 ] || return 2
  [ -d "$1" ] && [ ! -L "$1" ] || return 1
  _pkg_facility_dir_entries_empty "$1" || return 0
  command -p -- rmdir -- "$1" || return 1
}

_pkg_facility_provider_add_rollback()
{
  [ "$#" -eq 3 ] || return 2
  pkg_facility_concrete=$1
  pkg_facility_concrete_name=$2
  pkg_facility_limit=$3
  pkg_facility_file="$pkg_facility_concrete/facility"
  pkg_facility_index=0

  while IFS= read -r pkg_facility_line
  do
    [ "$pkg_facility_index" -lt "$pkg_facility_limit" ] || break
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    pkg_facility_compatibility_dir="$m_DATA_DIR/sys/pkg/providers/$pkg_facility_name/$pkg_facility_compatibility"
    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    command -p -- rm -f -- "$pkg_facility_marker" 2>/dev/null || :
    if [ -d "$pkg_facility_compatibility_dir" ] && [ ! -L "$pkg_facility_compatibility_dir" ]
    then
      _pkg_facility_compatibility_dir_remove_if_empty "$pkg_facility_compatibility_dir" 2>/dev/null || :
    fi
    pkg_facility_index=$((pkg_facility_index + 1))
  done < "$pkg_facility_file"
}

_pkg_facility_provider_add()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_concrete=$1
  pkg_facility_concrete_name=$2
  pkg_facility_file="$pkg_facility_concrete/facility"

  if [ ! -e "$pkg_facility_file" ] && [ ! -L "$pkg_facility_file" ]
  then
    return 0
  fi

  _pkg_facility_file_validate "$pkg_facility_file" || return 1
  _pkg_facility_provider_root_ensure || return 1

  pkg_facility_added=0
  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || {
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    }
    pkg_facility_facility_dir="$m_DATA_DIR/sys/pkg/providers/$pkg_facility_name"
    pkg_facility_compatibility_dir="$pkg_facility_facility_dir/$pkg_facility_compatibility"
    _pkg_facility_dir_ensure "$pkg_facility_facility_dir" || {
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    }
    _pkg_facility_dir_ensure "$pkg_facility_compatibility_dir" || {
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    }

    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    [ ! -e "$pkg_facility_marker" ] && [ ! -L "$pkg_facility_marker" ] || {
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    }
    if ! : > "$pkg_facility_marker"
    then
      _pkg_facility_compatibility_dir_remove_if_empty "$pkg_facility_compatibility_dir" 2>/dev/null || :
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    fi
    pkg_facility_added=$((pkg_facility_added + 1))
    [ -f "$pkg_facility_marker" ] && [ ! -L "$pkg_facility_marker" ] && [ ! -s "$pkg_facility_marker" ] || {
      _pkg_facility_provider_add_rollback "$pkg_facility_concrete" "$pkg_facility_concrete_name" "$pkg_facility_added"
      return 1
    }
  done < "$pkg_facility_file"
}

_pkg_facility_provider_remove()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_concrete=$1
  pkg_facility_concrete_name=$2
  pkg_facility_file="$pkg_facility_concrete/facility"

  if [ ! -e "$pkg_facility_file" ] && [ ! -L "$pkg_facility_file" ]
  then
    return 0
  fi

  _pkg_facility_file_validate "$pkg_facility_file" || return 1
  [ -d "$m_DATA_DIR/sys/pkg/providers" ] && [ ! -L "$m_DATA_DIR/sys/pkg/providers" ] || return 1

  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    pkg_facility_facility_dir="$m_DATA_DIR/sys/pkg/providers/$pkg_facility_name"
    pkg_facility_compatibility_dir="$pkg_facility_facility_dir/$pkg_facility_compatibility"
    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    [ -d "$pkg_facility_facility_dir" ] && [ ! -L "$pkg_facility_facility_dir" ] || return 1
    [ -d "$pkg_facility_compatibility_dir" ] && [ ! -L "$pkg_facility_compatibility_dir" ] || return 1
    [ -f "$pkg_facility_marker" ] && [ ! -L "$pkg_facility_marker" ] && [ ! -s "$pkg_facility_marker" ] || return 1
  done < "$pkg_facility_file"

  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    pkg_facility_compatibility_dir="$m_DATA_DIR/sys/pkg/providers/$pkg_facility_name/$pkg_facility_compatibility"
    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    command -p -- rm -f -- "$pkg_facility_marker" || return 1
    _pkg_facility_compatibility_dir_remove_if_empty "$pkg_facility_compatibility_dir" || return 1
  done < "$pkg_facility_file"
}

_pkg_facility_materialize()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_range=$1
  pkg_facility_concrete=$2
  pkg_facility_source="$pkg_facility_range/facility"

  if [ ! -e "$pkg_facility_source" ] && [ ! -L "$pkg_facility_source" ]
  then
    return 0
  fi

  _pkg_facility_file_validate "$pkg_facility_source" || return 1
  command -p -- cp -- "$pkg_facility_source" "$pkg_facility_concrete/facility" || return 1
  _pkg_facility_file_validate "$pkg_facility_concrete/facility"
}
