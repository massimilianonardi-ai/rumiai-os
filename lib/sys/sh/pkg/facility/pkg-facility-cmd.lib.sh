_pkg_facility_cmd_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_facility_cmd_contract_validate()
{
  [ "$#" -eq 1 ] || return 2
  pkg_facility_cmd_contract=$1

  [ -d "$pkg_facility_cmd_contract" ] && [ ! -L "$pkg_facility_cmd_contract" ] || return 1
  _pkg_facility_dir_entries_empty "$pkg_facility_cmd_contract" && return 1

  for pkg_facility_cmd_marker in "$pkg_facility_cmd_contract"/*
  do
    [ -e "$pkg_facility_cmd_marker" ] || [ -L "$pkg_facility_cmd_marker" ] || continue
    pkg_facility_cmd_name=${pkg_facility_cmd_marker##*/}
    _pkg_facility_cmd_name_valid "$pkg_facility_cmd_name" || return 1
    [ -f "$pkg_facility_cmd_marker" ] && [ ! -L "$pkg_facility_cmd_marker" ] && [ -r "$pkg_facility_cmd_marker" ] && [ ! -x "$pkg_facility_cmd_marker" ] && [ ! -s "$pkg_facility_cmd_marker" ] || return 1
  done

  for pkg_facility_cmd_hidden in "$pkg_facility_cmd_contract"/.[!.]* "$pkg_facility_cmd_contract"/..?*
  do
    [ -e "$pkg_facility_cmd_hidden" ] || [ -L "$pkg_facility_cmd_hidden" ] || continue
    return 1
  done
}

_pkg_facility_cmd_target_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_facility_cmd_target="$(command -p -- cat -- "$1")" || return 1
  case "$pkg_facility_cmd_target" in
    "" | /* | */ | *//* | *'
'*) return 1 ;;
  esac
  case "/$pkg_facility_cmd_target/" in
    */./* | */../*) return 1 ;;
  esac
}

_pkg_facility_cmd_realization_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_facility_cmd_realization=$1
  pkg_facility_cmd_root=$2

  [ -d "$pkg_facility_cmd_realization" ] && [ ! -L "$pkg_facility_cmd_realization" ] || return 1
  [ -d "$pkg_facility_cmd_root" ] && [ ! -L "$pkg_facility_cmd_root" ] || return 1
  readpathce pkg_facility_cmd_root_resolved "$pkg_facility_cmd_root" || return 1
  _pkg_facility_dir_entries_empty "$pkg_facility_cmd_realization" && return 1

  for pkg_facility_cmd_descriptor in "$pkg_facility_cmd_realization"/*
  do
    [ -e "$pkg_facility_cmd_descriptor" ] || [ -L "$pkg_facility_cmd_descriptor" ] || continue
    pkg_facility_cmd_name=${pkg_facility_cmd_descriptor##*/}
    _pkg_facility_cmd_name_valid "$pkg_facility_cmd_name" || return 1
    _pkg_facility_cmd_target_read "$pkg_facility_cmd_descriptor" || return 1

    [ -e "$pkg_facility_cmd_root/$pkg_facility_cmd_target" ] || [ -L "$pkg_facility_cmd_root/$pkg_facility_cmd_target" ] || return 1
    readpathce pkg_facility_cmd_target_resolved "$pkg_facility_cmd_root/$pkg_facility_cmd_target" || return 1
    case "$pkg_facility_cmd_target_resolved" in
      "$pkg_facility_cmd_root_resolved"/*) : ;;
      *) return 1 ;;
    esac
    [ -f "$pkg_facility_cmd_target_resolved" ] && [ -x "$pkg_facility_cmd_target_resolved" ] || return 1
  done

  for pkg_facility_cmd_hidden in "$pkg_facility_cmd_realization"/.[!.]* "$pkg_facility_cmd_realization"/..?*
  do
    [ -e "$pkg_facility_cmd_hidden" ] || [ -L "$pkg_facility_cmd_hidden" ] || continue
    return 1
  done
}

_pkg_facility_cmd_provider_validate()
{
  [ "$#" -eq 3 ] || return 2
  pkg_facility_cmd_contract=$1
  pkg_facility_cmd_realization=$2
  pkg_facility_cmd_root=$3

  _pkg_facility_cmd_contract_validate "$pkg_facility_cmd_contract" || return 1
  _pkg_facility_cmd_realization_validate "$pkg_facility_cmd_realization" "$pkg_facility_cmd_root" || return 1

  pkg_facility_cmd_contract_count=0
  for pkg_facility_cmd_marker in "$pkg_facility_cmd_contract"/*
  do
    [ -e "$pkg_facility_cmd_marker" ] || [ -L "$pkg_facility_cmd_marker" ] || continue
    pkg_facility_cmd_name=${pkg_facility_cmd_marker##*/}
    [ -f "$pkg_facility_cmd_realization/$pkg_facility_cmd_name" ] && [ ! -L "$pkg_facility_cmd_realization/$pkg_facility_cmd_name" ] || return 1
    pkg_facility_cmd_contract_count=$((pkg_facility_cmd_contract_count + 1))
  done

  pkg_facility_cmd_realization_count=0
  for pkg_facility_cmd_descriptor in "$pkg_facility_cmd_realization"/*
  do
    [ -e "$pkg_facility_cmd_descriptor" ] || [ -L "$pkg_facility_cmd_descriptor" ] || continue
    pkg_facility_cmd_name=${pkg_facility_cmd_descriptor##*/}
    [ -f "$pkg_facility_cmd_contract/$pkg_facility_cmd_name" ] && [ ! -L "$pkg_facility_cmd_contract/$pkg_facility_cmd_name" ] || return 1
    pkg_facility_cmd_realization_count=$((pkg_facility_cmd_realization_count + 1))
  done

  [ "$pkg_facility_cmd_realization_count" -eq "$pkg_facility_cmd_contract_count" ]
}
