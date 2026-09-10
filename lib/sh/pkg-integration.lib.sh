_pkg_integration_error()
{
  log error execution execution-failed operation "$1" reason "$2"
}

_pkg_integration_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_integration_version_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._+~-]*) return 1 ;;
  esac
}

_pkg_integration_osarch_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    linux-arm64 | linux-x86_64 | macos-arm64 | macos-x86_64 | windows-arm64 | windows-x86_64) return 0 ;;
    *) return 1 ;;
  esac
}

_pkg_integration_set_class()
{
  [ "$#" -eq 2 ] || return 2
  pkg_integration_pkg=$1
  pkg_integration_osarch=$2

  if [ -n "$pkg_integration_osarch" ]
  then
    pkg_integration_selector_name="$pkg_integration_pkg!$pkg_integration_osarch"
    pkg_integration_public_dir="$m_BIN_DIR/ext-$pkg_integration_osarch"
  else
    pkg_integration_selector_name=$pkg_integration_pkg
    pkg_integration_public_dir=$m_BIN_EXT_DIR
  fi

  pkg_integration_selector="$m_PKG_DIR/$pkg_integration_selector_name"
}

_pkg_integration_set_concrete()
{
  [ "$#" -eq 3 ] || return 2
  _pkg_integration_set_class "$1" "$3" || return 1
  pkg_integration_version=$2

  if [ -n "$pkg_integration_osarch" ]
  then
    pkg_integration_concrete_name="$pkg_integration_pkg@$pkg_integration_version!$pkg_integration_osarch"
  else
    pkg_integration_concrete_name="$pkg_integration_pkg@$pkg_integration_version"
  fi

  pkg_integration_concrete="$m_PKG_DIR/$pkg_integration_concrete_name"
}

_pkg_integration_dir_entries_empty()
{
  [ "$#" -eq 1 ] || return 2
  for pkg_integration_entry in \
    "$1"/* \
    "$1"/.[!.]* \
    "$1"/..?*
  do
    [ -e "$pkg_integration_entry" ] || [ -L "$pkg_integration_entry" ] || continue
    return 1
  done
  return 0
}

_pkg_integration_command_name_valid()
{
  _pkg_integration_name_valid "$1"
}

_pkg_integration_link_target_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_integration_link_target="$(command -p -- cat -- "$1")" || return 1
  case "$pkg_integration_link_target" in
    "" | /* | */ | *//*) return 1 ;;
  esac
  case "$pkg_integration_link_target" in
    *'
'*) return 1 ;;
  esac
  case "/$pkg_integration_link_target/" in
    */./* | */../*) return 1 ;;
  esac

  return 0
}

_pkg_integration_validate_definition()
{
  [ "$#" -eq 2 ] || return 2
  pkg_integration_range=$1
  pkg_integration_root=$2
  pkg_integration_have_cmd=0
  pkg_integration_have_link=0

  for pkg_integration_entry in \
    "$pkg_integration_range"/* \
    "$pkg_integration_range"/.[!.]* \
    "$pkg_integration_range"/..?*
  do
    [ -e "$pkg_integration_entry" ] || [ -L "$pkg_integration_entry" ] || continue
    pkg_integration_entry_name=${pkg_integration_entry##*/}
    case "$pkg_integration_entry_name" in
      archive_regex | digest_regex | digest_type | format)
        [ -f "$pkg_integration_entry" ] && [ ! -L "$pkg_integration_entry" ] || return 1
        ;;
      cmd)
        [ -d "$pkg_integration_entry" ] && [ ! -L "$pkg_integration_entry" ] || return 1
        pkg_integration_have_cmd=1
        ;;
      link)
        [ -d "$pkg_integration_entry" ] && [ ! -L "$pkg_integration_entry" ] || return 1
        pkg_integration_have_link=1
        ;;
      *)
        return 2
        ;;
    esac
  done

  [ "$pkg_integration_have_cmd" -eq "$pkg_integration_have_link" ] || return 1
  [ "$pkg_integration_have_cmd" -eq 1 ] || return 0
  _pkg_integration_dir_entries_empty "$pkg_integration_range/cmd" && return 1
  _pkg_integration_dir_entries_empty "$pkg_integration_range/link" && return 1

  for pkg_integration_cmd_source in "$pkg_integration_range/cmd"/*
  do
    [ -e "$pkg_integration_cmd_source" ] || [ -L "$pkg_integration_cmd_source" ] || continue
    pkg_integration_command=${pkg_integration_cmd_source##*/}
    _pkg_integration_command_name_valid "$pkg_integration_command" || return 1
    [ -f "$pkg_integration_cmd_source" ] && [ ! -L "$pkg_integration_cmd_source" ] && [ -r "$pkg_integration_cmd_source" ] && [ ! -x "$pkg_integration_cmd_source" ] || return 1
    [ -f "$pkg_integration_range/link/$pkg_integration_command" ] && [ ! -L "$pkg_integration_range/link/$pkg_integration_command" ] || return 1

    _pkg_integration_link_target_read "$pkg_integration_range/link/$pkg_integration_command" || return 1
    [ -e "$pkg_integration_root/$pkg_integration_link_target" ] || [ -L "$pkg_integration_root/$pkg_integration_link_target" ] || return 1
    readpathce pkg_integration_link_resolved "$pkg_integration_root/$pkg_integration_link_target" || return 1
    case "$pkg_integration_link_resolved" in
      "$pkg_integration_root"/*) : ;;
      *) return 1 ;;
    esac
    [ -f "$pkg_integration_link_resolved" ] || return 1
  done

  for pkg_integration_link_source in "$pkg_integration_range/link"/*
  do
    [ -e "$pkg_integration_link_source" ] || [ -L "$pkg_integration_link_source" ] || continue
    pkg_integration_command=${pkg_integration_link_source##*/}
    _pkg_integration_command_name_valid "$pkg_integration_command" || return 1
    [ -f "$pkg_integration_range/cmd/$pkg_integration_command" ] && [ ! -L "$pkg_integration_range/cmd/$pkg_integration_command" ] || return 1
  done

  for pkg_integration_entry in \
    "$pkg_integration_range/cmd"/.[!.]* \
    "$pkg_integration_range/cmd"/..?* \
    "$pkg_integration_range/link"/.[!.]* \
    "$pkg_integration_range/link"/..?*
  do
    [ -e "$pkg_integration_entry" ] || [ -L "$pkg_integration_entry" ] || continue
    return 1
  done

  return 0
}

_pkg_integration_materialize_commands()
{
  [ "$#" -eq 2 ] || return 2
  pkg_integration_range=$1
  pkg_integration_concrete=$2
  [ -d "$pkg_integration_range/cmd" ] || return 0

  command -p -- mkdir "$pkg_integration_concrete/cmd" "$pkg_integration_concrete/link" || return 1

  for pkg_integration_cmd_source in "$pkg_integration_range/cmd"/*
  do
    [ -e "$pkg_integration_cmd_source" ] || continue
    pkg_integration_command=${pkg_integration_cmd_source##*/}
    command -p -- cp -- "$pkg_integration_cmd_source" "$pkg_integration_concrete/cmd/$pkg_integration_command" || return 1
    command -p -- chmod +x "$pkg_integration_concrete/cmd/$pkg_integration_command" || return 1

    _pkg_integration_link_target_read "$pkg_integration_range/link/$pkg_integration_command" || return 1
    command -p -- ln -s "../root/$pkg_integration_link_target" "$pkg_integration_concrete/link/$pkg_integration_command" || return 1
  done
}

_pkg_default_read_current()
{
  [ "$#" -eq 1 ] || return 2
  pkg_default_current=

  if [ -L "$1" ]
  then
    pkg_default_current="$(command -p -- readlink "$1")" || return 1
    [ -n "$pkg_default_current" ] || return 1
    case "$pkg_default_current" in
      */*) return 1 ;;
    esac
    return 0
  fi

  [ ! -e "$1" ] || return 1
  return 0
}

_pkg_default_current_valid()
{
  [ "$#" -eq 1 ] || return 2
  [ -n "$1" ] || return 0

  pkg_default_prefix="$pkg_integration_pkg@"
  if [ -n "$pkg_integration_osarch" ]
  then
    pkg_default_suffix="!$pkg_integration_osarch"
    case "$1" in
      "$pkg_default_prefix"*"$pkg_default_suffix") : ;;
      *) return 1 ;;
    esac
    pkg_default_current_version=${1#"$pkg_default_prefix"}
    pkg_default_current_version=${pkg_default_current_version%"$pkg_default_suffix"}
  else
    case "$1" in
      "$pkg_default_prefix"*) : ;;
      *) return 1 ;;
    esac
    pkg_default_current_version=${1#"$pkg_default_prefix"}
  fi

  _pkg_integration_version_valid "$pkg_default_current_version"
}

_pkg_default_public_target()
{
  [ "$#" -eq 1 ] || return 2
  pkg_default_public_target="../../pkg/$pkg_integration_selector_name/cmd/$1"
}

_pkg_default_validate_current_bindings()
{
  [ "$#" -eq 1 ] || return 2
  pkg_default_old_concrete=$1
  pkg_default_old_cmd_dir="$m_PKG_DIR/$pkg_default_old_concrete/cmd"

  [ -d "$m_PKG_DIR/$pkg_default_old_concrete" ] && [ ! -L "$m_PKG_DIR/$pkg_default_old_concrete" ] || return 1
  if [ ! -e "$pkg_default_old_cmd_dir" ] && [ ! -L "$pkg_default_old_cmd_dir" ]
  then
    return 0
  fi
  [ -d "$pkg_default_old_cmd_dir" ] && [ ! -L "$pkg_default_old_cmd_dir" ] || return 1
  [ -d "$pkg_integration_public_dir" ] && [ ! -L "$pkg_integration_public_dir" ] || return 1

  for pkg_default_cmd_path in "$pkg_default_old_cmd_dir"/*
  do
    [ -e "$pkg_default_cmd_path" ] || [ -L "$pkg_default_cmd_path" ] || continue
    pkg_default_command=${pkg_default_cmd_path##*/}
    _pkg_default_public_target "$pkg_default_command" || return 1
    pkg_default_expected=$pkg_default_public_target
    pkg_default_public="$pkg_integration_public_dir/$pkg_default_command"
    [ -L "$pkg_default_public" ] || return 1
    pkg_default_actual="$(command -p -- readlink "$pkg_default_public")" || return 1
    [ "$pkg_default_actual" = "$pkg_default_expected" ] || return 1
  done
}

_pkg_default_validate_new_collisions()
{
  [ "$#" -eq 2 ] || return 2
  pkg_default_new_concrete=$1
  pkg_default_old_concrete=$2
  pkg_default_new_cmd_dir="$m_PKG_DIR/$pkg_default_new_concrete/cmd"

  if [ ! -e "$pkg_default_new_cmd_dir" ] && [ ! -L "$pkg_default_new_cmd_dir" ]
  then
    return 0
  fi
  [ -d "$pkg_default_new_cmd_dir" ] && [ ! -L "$pkg_default_new_cmd_dir" ] || return 1

  for pkg_default_cmd_path in "$pkg_default_new_cmd_dir"/*
  do
    [ -e "$pkg_default_cmd_path" ] || [ -L "$pkg_default_cmd_path" ] || continue
    pkg_default_command=${pkg_default_cmd_path##*/}
    pkg_default_public="$pkg_integration_public_dir/$pkg_default_command"
    [ ! -e "$pkg_default_public" ] && [ ! -L "$pkg_default_public" ] && continue

    [ -n "$pkg_default_old_concrete" ] || return 1
    [ -f "$m_PKG_DIR/$pkg_default_old_concrete/cmd/$pkg_default_command" ] && [ ! -L "$m_PKG_DIR/$pkg_default_old_concrete/cmd/$pkg_default_command" ] || return 1
    _pkg_default_public_target "$pkg_default_command" || return 1
    pkg_default_expected=$pkg_default_public_target
    [ -L "$pkg_default_public" ] || return 1
    pkg_default_actual="$(command -p -- readlink "$pkg_default_public")" || return 1
    [ "$pkg_default_actual" = "$pkg_default_expected" ] || return 1
  done
}

_pkg_default_remove_bindings()
{
  [ "$#" -eq 1 ] || return 2
  pkg_default_cmd_dir="$m_PKG_DIR/$1/cmd"
  [ -d "$pkg_default_cmd_dir" ] || return 0

  for pkg_default_cmd_path in "$pkg_default_cmd_dir"/*
  do
    [ -e "$pkg_default_cmd_path" ] || [ -L "$pkg_default_cmd_path" ] || continue
    pkg_default_command=${pkg_default_cmd_path##*/}
    command -p -- rm -f -- "$pkg_integration_public_dir/$pkg_default_command" || return 1
  done
}

_pkg_default_create_bindings()
{
  [ "$#" -eq 1 ] || return 2
  pkg_default_cmd_dir="$m_PKG_DIR/$1/cmd"
  [ -d "$pkg_default_cmd_dir" ] || return 0

  for pkg_default_cmd_path in "$pkg_default_cmd_dir"/*
  do
    [ -e "$pkg_default_cmd_path" ] || [ -L "$pkg_default_cmd_path" ] || continue
    pkg_default_command=${pkg_default_cmd_path##*/}
    _pkg_default_public_target "$pkg_default_command" || return 1
    pkg_default_target=$pkg_default_public_target
    command -p -- ln -s "$pkg_default_target" "$pkg_integration_public_dir/$pkg_default_command" || return 1
  done
}

pkg_integrate()
(
  [ "$#" -eq 4 ] || [ "$#" -eq 5 ] || return 2
  pkg_integrate_pkg=$1
  pkg_integrate_version=$2
  pkg_integrate_range_input=$3
  pkg_integrate_root_input=$4
  pkg_integrate_osarch=${5-}

  _pkg_integration_name_valid "$pkg_integrate_pkg" || return 2
  _pkg_integration_version_valid "$pkg_integrate_version" || return 2
  if [ -n "$pkg_integrate_osarch" ]
  then
    _pkg_integration_osarch_valid "$pkg_integrate_osarch" || return 2
  fi

  [ -d "$m_PKG_DIR" ] && [ ! -L "$m_PKG_DIR" ] || return 1
  [ -d "$pkg_integrate_range_input" ] && [ ! -L "$pkg_integrate_range_input" ] || return 1
  [ -d "$pkg_integrate_root_input" ] && [ ! -L "$pkg_integrate_root_input" ] || return 1
  readpathce pkg_integrate_range "$pkg_integrate_range_input" || return 1
  readpathce pkg_integrate_root "$pkg_integrate_root_input" || return 1

  _pkg_integration_set_concrete "$pkg_integrate_pkg" "$pkg_integrate_version" "$pkg_integrate_osarch" || return 1
  [ ! -e "$pkg_integration_concrete" ] && [ ! -L "$pkg_integration_concrete" ] || return 1

  _pkg_integration_validate_definition "$pkg_integrate_range" "$pkg_integrate_root"
  pkg_integrate_status=$?
  [ "$pkg_integrate_status" -eq 0 ] || return "$pkg_integrate_status"

  command -p -- mkdir "$pkg_integration_concrete" || return 1
  if ! command -p -- mv -- "$pkg_integrate_root" "$pkg_integration_concrete/root"
  then
    command -p -- rmdir "$pkg_integration_concrete" 2>/dev/null
    return 1
  fi

  if ! _pkg_integration_materialize_commands "$pkg_integrate_range" "$pkg_integration_concrete"
  then
    command -p -- rm -rf -- "$pkg_integration_concrete/cmd" "$pkg_integration_concrete/link" 2>/dev/null
    if command -p -- mv -- "$pkg_integration_concrete/root" "$pkg_integrate_root_input" 2>/dev/null
    then
      command -p -- rmdir "$pkg_integration_concrete" 2>/dev/null
    fi
    _pkg_integration_error pkg-integrate materialization-failed
    return 1
  fi

  return 0
)

pkg_deintegrate()
(
  [ "$#" -eq 2 ] || [ "$#" -eq 3 ] || return 2
  pkg_deintegrate_pkg=$1
  pkg_deintegrate_version=$2
  pkg_deintegrate_osarch=${3-}

  _pkg_integration_name_valid "$pkg_deintegrate_pkg" || return 2
  _pkg_integration_version_valid "$pkg_deintegrate_version" || return 2
  if [ -n "$pkg_deintegrate_osarch" ]
  then
    _pkg_integration_osarch_valid "$pkg_deintegrate_osarch" || return 2
  fi

  _pkg_integration_set_concrete "$pkg_deintegrate_pkg" "$pkg_deintegrate_version" "$pkg_deintegrate_osarch" || return 1
  [ -d "$pkg_integration_concrete" ] && [ ! -L "$pkg_integration_concrete" ] || return 1

  _pkg_default_read_current "$pkg_integration_selector" || return 1
  _pkg_default_current_valid "$pkg_default_current" || return 1
  [ "$pkg_default_current" != "$pkg_integration_concrete_name" ] || return 1

  command -p -- rm -rf -- "$pkg_integration_concrete" || return 1
  return 0
)

pkg_default()
(
  [ "$#" -eq 2 ] || [ "$#" -eq 3 ] || return 2
  pkg_default_pkg=$1
  pkg_default_version=$2
  pkg_default_osarch=${3-}

  _pkg_integration_name_valid "$pkg_default_pkg" || return 2
  if [ -n "$pkg_default_version" ]
  then
    _pkg_integration_version_valid "$pkg_default_version" || return 2
  fi
  if [ -n "$pkg_default_osarch" ]
  then
    _pkg_integration_osarch_valid "$pkg_default_osarch" || return 2
  fi

  [ -d "$m_PKG_DIR" ] && [ ! -L "$m_PKG_DIR" ] || return 1
  [ -d "$m_BIN_DIR" ] && [ ! -L "$m_BIN_DIR" ] || return 1
  _pkg_integration_set_class "$pkg_default_pkg" "$pkg_default_osarch" || return 1
  _pkg_default_read_current "$pkg_integration_selector" || return 1
  _pkg_default_current_valid "$pkg_default_current" || return 1
  pkg_default_old_concrete=$pkg_default_current

  if [ -n "$pkg_default_old_concrete" ]
  then
    _pkg_default_validate_current_bindings "$pkg_default_old_concrete" || return 1
  fi

  if [ -z "$pkg_default_version" ]
  then
    [ -n "$pkg_default_old_concrete" ] || return 0
    _pkg_default_remove_bindings "$pkg_default_old_concrete" || return 1
    command -p -- rm -f -- "$pkg_integration_selector" || return 1
    return 0
  fi

  _pkg_integration_set_concrete "$pkg_default_pkg" "$pkg_default_version" "$pkg_default_osarch" || return 1
  pkg_default_new_concrete=$pkg_integration_concrete_name
  [ -d "$pkg_integration_concrete" ] && [ ! -L "$pkg_integration_concrete" ] || return 1

  if [ "$pkg_default_old_concrete" = "$pkg_default_new_concrete" ]
  then
    return 0
  fi

  if [ ! -e "$pkg_integration_public_dir" ] && [ ! -L "$pkg_integration_public_dir" ]
  then
    command -p -- mkdir "$pkg_integration_public_dir" || return 1
  fi
  [ -d "$pkg_integration_public_dir" ] && [ ! -L "$pkg_integration_public_dir" ] || return 1

  _pkg_default_validate_new_collisions "$pkg_default_new_concrete" "$pkg_default_old_concrete" || return 1

  if [ -n "$pkg_default_old_concrete" ]
  then
    _pkg_default_remove_bindings "$pkg_default_old_concrete" || return 1
    command -p -- rm -f -- "$pkg_integration_selector" || return 1
  fi

  if ! command -p -- ln -s "$pkg_default_new_concrete" "$pkg_integration_selector"
  then
    return 1
  fi

  if ! _pkg_default_create_bindings "$pkg_default_new_concrete"
  then
    _pkg_default_remove_bindings "$pkg_default_new_concrete" 2>/dev/null
    command -p -- rm -f -- "$pkg_integration_selector" 2>/dev/null
    return 1
  fi

  return 0
)
