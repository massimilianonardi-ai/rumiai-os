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
  pkg_facility_data_root="$(command -- state-path system sys pkg data)" || return 1
  pkg_facility_provider_root="$pkg_facility_data_root/providers"
  if [ ! -e "$pkg_facility_data_root" ] && [ ! -L "$pkg_facility_data_root" ]
  then
    command -p -- mkdir -p -- "$pkg_facility_data_root" || return 1
  fi
  [ -d "$pkg_facility_data_root" ] && [ ! -L "$pkg_facility_data_root" ] || return 1
  _pkg_facility_dir_ensure "$pkg_facility_provider_root" || return 1
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
    pkg_facility_compatibility_dir="$pkg_facility_provider_root/$pkg_facility_name/$pkg_facility_compatibility"
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
    pkg_facility_facility_dir="$pkg_facility_provider_root/$pkg_facility_name"
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
  pkg_facility_data_root="$(command -- state-path system sys pkg data)" || return 1
  pkg_facility_provider_root="$pkg_facility_data_root/providers"
  [ -d "$pkg_facility_provider_root" ] && [ ! -L "$pkg_facility_provider_root" ] || return 1

  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    pkg_facility_facility_dir="$pkg_facility_provider_root/$pkg_facility_name"
    pkg_facility_compatibility_dir="$pkg_facility_facility_dir/$pkg_facility_compatibility"
    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    [ -d "$pkg_facility_facility_dir" ] && [ ! -L "$pkg_facility_facility_dir" ] || return 1
    [ -d "$pkg_facility_compatibility_dir" ] && [ ! -L "$pkg_facility_compatibility_dir" ] || return 1
    [ -f "$pkg_facility_marker" ] && [ ! -L "$pkg_facility_marker" ] && [ ! -s "$pkg_facility_marker" ] || return 1
  done < "$pkg_facility_file"

  while IFS= read -r pkg_facility_line
  do
    _pkg_facility_line_parse "$pkg_facility_line" || return 1
    pkg_facility_compatibility_dir="$pkg_facility_provider_root/$pkg_facility_name/$pkg_facility_compatibility"
    pkg_facility_marker="$pkg_facility_compatibility_dir/$pkg_facility_concrete_name"
    command -p -- rm -f -- "$pkg_facility_marker" || return 1
    _pkg_facility_compatibility_dir_remove_if_empty "$pkg_facility_compatibility_dir" || return 1
  done < "$pkg_facility_file"
}

_pkg_facility_command_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_facility_env_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_]*) return 1 ;;
  esac
}

_pkg_facility_scalar_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_facility_scalar=
  pkg_facility_scalar_extra=
  {
    IFS= read -r pkg_facility_scalar || return 1
    IFS= read -r pkg_facility_scalar_extra
    pkg_facility_scalar_second_status=$?
  } < "$1"

  [ "$pkg_facility_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_facility_scalar_extra" ] || return 1

  pkg_facility_scalar_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_facility_scalar_expected="$(printf -- '%s\n' "$pkg_facility_scalar" | command -p -- wc -c)" || return 1
  [ "$pkg_facility_scalar_actual" = "$pkg_facility_scalar_expected" ]
}

_pkg_facility_declares()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_facility_file_validate "$1" || return 1
  _pkg_facility_name_valid "$2" || return 1

  while IFS= read -r pkg_facility_declaration
  do
    _pkg_facility_line_parse "$pkg_facility_declaration" || return 1
    [ "$pkg_facility_name" = "$2" ] && return 0
  done < "$1"

  return 1
}

_pkg_facility_relative_path_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_projection_root=$1
  pkg_facility_projection_relative=$2

  case "$pkg_facility_projection_relative" in
    "" | /* | *"/" | *//* | *'
'*) return 1 ;;
  esac

  readpathce pkg_facility_projection_resolved "$pkg_facility_projection_root/$pkg_facility_projection_relative" || return 1
  case "$pkg_facility_projection_resolved" in
    "$pkg_facility_projection_root" | "$pkg_facility_projection_root"/*) return 0 ;;
    *) return 1 ;;
  esac
}

_pkg_facility_command_source_validate()
{
  [ "$#" -eq 3 ] || return 2
  pkg_facility_command_root=$1
  pkg_facility_declarations=$2
  pkg_facility_provider_root=$3

  if [ ! -e "$pkg_facility_command_root" ] && [ ! -L "$pkg_facility_command_root" ]
  then
    return 0
  fi

  [ -d "$pkg_facility_command_root" ] && [ ! -L "$pkg_facility_command_root" ] || return 1
  for pkg_facility_command_facility_dir in "$pkg_facility_command_root"/*
  do
    [ -e "$pkg_facility_command_facility_dir" ] || [ -L "$pkg_facility_command_facility_dir" ] || continue
    pkg_facility_command_facility=${pkg_facility_command_facility_dir##*"/"}
    _pkg_facility_name_valid "$pkg_facility_command_facility" || return 1
    _pkg_facility_declares "$pkg_facility_declarations" "$pkg_facility_command_facility" || return 1
    [ -d "$pkg_facility_command_facility_dir" ] && [ ! -L "$pkg_facility_command_facility_dir" ] || return 1

    pkg_facility_command_count=0
    for pkg_facility_command_descriptor in "$pkg_facility_command_facility_dir"/*
    do
      [ -e "$pkg_facility_command_descriptor" ] || [ -L "$pkg_facility_command_descriptor" ] || continue
      pkg_facility_command=${pkg_facility_command_descriptor##*"/"}
      _pkg_facility_command_name_valid "$pkg_facility_command" || return 1
      _pkg_facility_scalar_read "$pkg_facility_command_descriptor" || return 1
      _pkg_facility_relative_path_validate "$pkg_facility_provider_root" "$pkg_facility_scalar" || return 1
      [ -f "$pkg_facility_projection_resolved" ] && [ -x "$pkg_facility_projection_resolved" ] || return 1
      pkg_facility_command_count=$((pkg_facility_command_count + 1))
    done
    [ "$pkg_facility_command_count" -gt 0 ] || return 1

    for pkg_facility_command_descriptor in "$pkg_facility_command_facility_dir"/.[!.]* "$pkg_facility_command_facility_dir"/..?*
    do
      [ -e "$pkg_facility_command_descriptor" ] || [ -L "$pkg_facility_command_descriptor" ] || continue
      return 1
    done
  done

  for pkg_facility_command_facility_dir in "$pkg_facility_command_root"/.[!.]* "$pkg_facility_command_root"/..?*
  do
    [ -e "$pkg_facility_command_facility_dir" ] || [ -L "$pkg_facility_command_facility_dir" ] || continue
    return 1
  done
}

_pkg_facility_env_descriptor_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_env_descriptor=$1
  pkg_facility_provider_root=$2

  case "$pkg_facility_env_descriptor" in
    root)
      return 0
      ;;
    "root-path "*)
      pkg_facility_env_relative=${pkg_facility_env_descriptor#root-path }
      _pkg_facility_relative_path_validate "$pkg_facility_provider_root" "$pkg_facility_env_relative"
      ;;
    literal)
      return 0
      ;;
    "literal "*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

_pkg_facility_env_file_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_env_file=$1
  pkg_facility_provider_root=$2
  [ -f "$pkg_facility_env_file" ] && [ ! -L "$pkg_facility_env_file" ] && [ -r "$pkg_facility_env_file" ] && [ ! -x "$pkg_facility_env_file" ] || return 1

  pkg_facility_env_original="$(
    command -p -- cat -- "$pkg_facility_env_file" || exit 1
    printf -- '%s' x
  )" || return 1
  pkg_facility_env_sorted="$(
    LC_ALL=C command -p -- sort < "$pkg_facility_env_file" || exit 1
    printf -- '%s' x
  )" || return 1
  [ "$pkg_facility_env_original" = "$pkg_facility_env_sorted" ] || return 1

  pkg_facility_env_tab="$(printf '\t')"
  pkg_facility_env_previous=
  pkg_facility_env_count=0
  while IFS="$pkg_facility_env_tab" read -r pkg_facility_env_name pkg_facility_env_descriptor pkg_facility_env_extra
  do
    [ -n "$pkg_facility_env_name" ] && [ -n "$pkg_facility_env_descriptor" ] && [ -z "$pkg_facility_env_extra" ] || return 1
    _pkg_facility_env_name_valid "$pkg_facility_env_name" || return 1
    [ "$pkg_facility_env_name" != "$pkg_facility_env_previous" ] || return 1
    _pkg_facility_env_descriptor_validate "$pkg_facility_env_descriptor" "$pkg_facility_provider_root" || return 1
    pkg_facility_env_previous=$pkg_facility_env_name
    pkg_facility_env_count=$((pkg_facility_env_count + 1))
  done < "$pkg_facility_env_file"

  [ "$pkg_facility_env_count" -gt 0 ]
}

_pkg_facility_env_source_validate()
{
  [ "$#" -eq 3 ] || return 2
  pkg_facility_env_root=$1
  pkg_facility_declarations=$2
  pkg_facility_provider_root=$3

  if [ ! -e "$pkg_facility_env_root" ] && [ ! -L "$pkg_facility_env_root" ]
  then
    return 0
  fi

  [ -d "$pkg_facility_env_root" ] && [ ! -L "$pkg_facility_env_root" ] || return 1
  for pkg_facility_env_file in "$pkg_facility_env_root"/*
  do
    [ -e "$pkg_facility_env_file" ] || [ -L "$pkg_facility_env_file" ] || continue
    pkg_facility_env_facility=${pkg_facility_env_file##*"/"}
    _pkg_facility_name_valid "$pkg_facility_env_facility" || return 1
    _pkg_facility_declares "$pkg_facility_declarations" "$pkg_facility_env_facility" || return 1
    _pkg_facility_env_file_validate "$pkg_facility_env_file" "$pkg_facility_provider_root" || return 1
  done

  for pkg_facility_env_file in "$pkg_facility_env_root"/.[!.]* "$pkg_facility_env_root"/..?*
  do
    [ -e "$pkg_facility_env_file" ] || [ -L "$pkg_facility_env_file" ] || continue
    return 1
  done
}

_pkg_facility_projection_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_projection_range=$1
  pkg_facility_projection_root=$2
  pkg_facility_projection_declarations="$pkg_facility_projection_range/facility"

  if [ ! -e "$pkg_facility_projection_range/facility-cmd" ] && \
     [ ! -L "$pkg_facility_projection_range/facility-cmd" ] && \
     [ ! -e "$pkg_facility_projection_range/facility-env" ] && \
     [ ! -L "$pkg_facility_projection_range/facility-env" ]
  then
    return 0
  fi

  _pkg_facility_file_validate "$pkg_facility_projection_declarations" || return 1
  _pkg_facility_command_source_validate \
    "$pkg_facility_projection_range/facility-cmd" \
    "$pkg_facility_projection_declarations" \
    "$pkg_facility_projection_root" || return 1
  _pkg_facility_env_source_validate \
    "$pkg_facility_projection_range/facility-env" \
    "$pkg_facility_projection_declarations" \
    "$pkg_facility_projection_root"
}

_pkg_facility_projection_materialize()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_projection_range=$1
  pkg_facility_projection_concrete=$2

  if [ -d "$pkg_facility_projection_range/facility-cmd" ] && [ ! -L "$pkg_facility_projection_range/facility-cmd" ]
  then
    command -p -- mkdir -- "$pkg_facility_projection_concrete/facility-cmd" || return 1
    for pkg_facility_command_facility_dir in "$pkg_facility_projection_range/facility-cmd"/*
    do
      [ -d "$pkg_facility_command_facility_dir" ] && [ ! -L "$pkg_facility_command_facility_dir" ] || continue
      pkg_facility_command_facility=${pkg_facility_command_facility_dir##*"/"}
      command -p -- mkdir -- "$pkg_facility_projection_concrete/facility-cmd/$pkg_facility_command_facility" || return 1

      for pkg_facility_command_descriptor in "$pkg_facility_command_facility_dir"/*
      do
        [ -f "$pkg_facility_command_descriptor" ] && [ ! -L "$pkg_facility_command_descriptor" ] || continue
        pkg_facility_command=${pkg_facility_command_descriptor##*"/"}
        _pkg_facility_scalar_read "$pkg_facility_command_descriptor" || return 1
        command -p -- ln -s \
          "../../root/$pkg_facility_scalar" \
          "$pkg_facility_projection_concrete/facility-cmd/$pkg_facility_command_facility/$pkg_facility_command" || return 1
      done
    done
  fi

  if [ -d "$pkg_facility_projection_range/facility-env" ] && [ ! -L "$pkg_facility_projection_range/facility-env" ]
  then
    command -p -- mkdir -- "$pkg_facility_projection_concrete/facility-env" || return 1
    for pkg_facility_env_file in "$pkg_facility_projection_range/facility-env"/*
    do
      [ -f "$pkg_facility_env_file" ] && [ ! -L "$pkg_facility_env_file" ] || continue
      command -p -- cp -- "$pkg_facility_env_file" "$pkg_facility_projection_concrete/facility-env/" || return 1
    done
  fi
}

_pkg_facility_env_apply()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_env_file=$1
  pkg_facility_provider_root=$2
  _pkg_facility_env_file_validate "$pkg_facility_env_file" "$pkg_facility_provider_root" || return 1

  pkg_facility_env_tab="$(printf '\t')"
  while IFS="$pkg_facility_env_tab" read -r pkg_facility_env_name pkg_facility_env_descriptor pkg_facility_env_extra
  do
    [ -n "$pkg_facility_env_name" ] && [ -n "$pkg_facility_env_descriptor" ] && [ -z "$pkg_facility_env_extra" ] || return 1

    case "$pkg_facility_env_descriptor" in
      root)
        pkg_facility_env_value=$pkg_facility_provider_root
        ;;
      "root-path "*)
        pkg_facility_env_relative=${pkg_facility_env_descriptor#root-path }
        _pkg_facility_relative_path_validate "$pkg_facility_provider_root" "$pkg_facility_env_relative" || return 1
        pkg_facility_env_value="$pkg_facility_provider_root/$pkg_facility_env_relative"
        ;;
      literal)
        pkg_facility_env_value=
        ;;
      "literal "*)
        pkg_facility_env_value=${pkg_facility_env_descriptor#literal }
        ;;
      *)
        return 1
        ;;
    esac

    pkg_facility_env_assignment="$pkg_facility_env_name=$pkg_facility_env_value"
    export "$pkg_facility_env_assignment" || return 1
  done < "$pkg_facility_env_file"
}

_pkg_facility_runtime_apply()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_runtime_provider=$1
  pkg_facility_runtime_facility=$2
  _pkg_facility_name_valid "$pkg_facility_runtime_facility" || return 1
  case "$pkg_facility_runtime_provider" in "" | *'/'*) return 1 ;; esac

  pkg_facility_runtime_concrete="$m_PKG_DIR/$pkg_facility_runtime_provider"
  [ -d "$pkg_facility_runtime_concrete" ] && [ ! -L "$pkg_facility_runtime_concrete" ] || return 1
  pkg_facility_runtime_root="$pkg_facility_runtime_concrete/root"
  [ -d "$pkg_facility_runtime_root" ] && [ ! -L "$pkg_facility_runtime_root" ] || return 1

  pkg_facility_runtime_command_dir="$pkg_facility_runtime_concrete/facility-cmd/$pkg_facility_runtime_facility"
  if [ -e "$pkg_facility_runtime_command_dir" ] || [ -L "$pkg_facility_runtime_command_dir" ]
  then
    [ -d "$pkg_facility_runtime_command_dir" ] && [ ! -L "$pkg_facility_runtime_command_dir" ] || return 1
    PATH="$pkg_facility_runtime_command_dir:$PATH"
    export PATH
  fi

  pkg_facility_runtime_env="$pkg_facility_runtime_concrete/facility-env/$pkg_facility_runtime_facility"
  if [ -e "$pkg_facility_runtime_env" ] || [ -L "$pkg_facility_runtime_env" ]
  then
    _pkg_facility_env_apply "$pkg_facility_runtime_env" "$pkg_facility_runtime_root" || return 1
  fi
}

_pkg_facility_materialize()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_range=$1
  pkg_facility_concrete=$2
  pkg_facility_source="$pkg_facility_range/facility"

  if [ ! -e "$pkg_facility_source" ] && [ ! -L "$pkg_facility_source" ]
  then
    [ ! -e "$pkg_facility_range/facility-cmd" ] && \
    [ ! -L "$pkg_facility_range/facility-cmd" ] && \
    [ ! -e "$pkg_facility_range/facility-env" ] && \
    [ ! -L "$pkg_facility_range/facility-env" ]
    return $?
  fi

  _pkg_facility_file_validate "$pkg_facility_source" || return 1
  _pkg_facility_projection_validate "$pkg_facility_range" "$pkg_facility_concrete/root" || return 1

  command -p -- cp -- "$pkg_facility_source" "$pkg_facility_concrete/facility" || return 1
  _pkg_facility_file_validate "$pkg_facility_concrete/facility" || return 1
  _pkg_facility_projection_materialize "$pkg_facility_range" "$pkg_facility_concrete"
}
