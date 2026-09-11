_pkg_setuid_validate()
{
  [ "$#" -eq 4 ] || return 2
  pkg_setuid_range=$1
  pkg_setuid_root=$2
  pkg_setuid_osarch=$3
  pkg_setuid_state_paths=$4
  pkg_setuid_file="$pkg_setuid_range/setuid_root"
  pkg_setuid_paths=

  if [ ! -e "$pkg_setuid_file" ] && [ ! -L "$pkg_setuid_file" ]
  then
    return 0
  fi

  case "$pkg_setuid_osarch" in
    linux-arm64 | linux-x86_64) : ;;
    *) return 1 ;;
  esac

  _pkg_state_file_validate "$pkg_setuid_file" || return 1

  while IFS= read -r pkg_setuid_path
  do
    _pkg_state_source_type_set "$pkg_setuid_root" "$pkg_setuid_path" || return 1
    [ "$pkg_state_source_type" = file ] || return 1

    if [ -n "$pkg_setuid_paths" ]
    then
      while IFS= read -r pkg_setuid_existing_path
      do
        [ "$pkg_setuid_path" != "$pkg_setuid_existing_path" ] || return 1
      done <<EOF_SETUID_PATHS
$pkg_setuid_paths
EOF_SETUID_PATHS
    fi

    if [ -n "$pkg_setuid_state_paths" ]
    then
      while IFS= read -r pkg_setuid_state_path
      do
        [ "$pkg_setuid_path" != "$pkg_setuid_state_path" ] || return 1
        case "$pkg_setuid_path" in
          "$pkg_setuid_state_path"/*) return 1 ;;
        esac
        case "$pkg_setuid_state_path" in
          "$pkg_setuid_path"/*) return 1 ;;
        esac
      done <<EOF_STATE_PATHS
$pkg_setuid_state_paths
EOF_STATE_PATHS
    fi

    if [ -n "$pkg_setuid_paths" ]
    then
      pkg_setuid_paths="$pkg_setuid_paths
$pkg_setuid_path"
    else
      pkg_setuid_paths=$pkg_setuid_path
    fi
  done < "$pkg_setuid_file"

  return 0
}

_pkg_setuid_apply_file()
{
  [ "$#" -eq 1 ] || return 2
  command -p -- chown 0:0 "$1" || return 1
  command -p -- chmod 4755 "$1"
}

_pkg_setuid_rollback()
{
  [ "$#" -eq 2 ] || return 2
  pkg_setuid_range=$1
  pkg_setuid_concrete=$2
  pkg_setuid_file="$pkg_setuid_range/setuid_root"
  pkg_setuid_rollback_dir="$pkg_setuid_concrete/setuid-root-rollback"
  pkg_setuid_rollback_status=0

  if [ ! -e "$pkg_setuid_rollback_dir" ] && [ ! -L "$pkg_setuid_rollback_dir" ]
  then
    return 0
  fi
  [ -d "$pkg_setuid_rollback_dir" ] && [ ! -L "$pkg_setuid_rollback_dir" ] || return 1

  pkg_setuid_index=0
  while IFS= read -r pkg_setuid_path
  do
    pkg_setuid_index=$((pkg_setuid_index + 1))
    pkg_setuid_target="$pkg_setuid_concrete/root/$pkg_setuid_path"
    pkg_setuid_backup="$pkg_setuid_rollback_dir/original-$pkg_setuid_index"
    pkg_setuid_work="$pkg_setuid_rollback_dir/work-$pkg_setuid_index"

    if [ -e "$pkg_setuid_work" ] || [ -L "$pkg_setuid_work" ]
    then
      command -p -- rm -f "$pkg_setuid_work" || pkg_setuid_rollback_status=1
    fi

    if [ -e "$pkg_setuid_backup" ] || [ -L "$pkg_setuid_backup" ]
    then
      [ -f "$pkg_setuid_backup" ] && [ ! -L "$pkg_setuid_backup" ] || {
        pkg_setuid_rollback_status=1
        continue
      }

      if [ -e "$pkg_setuid_target" ] || [ -L "$pkg_setuid_target" ]
      then
        command -p -- rm -f "$pkg_setuid_target" || {
          pkg_setuid_rollback_status=1
          continue
        }
      fi

      command -p -- mv "$pkg_setuid_backup" "$pkg_setuid_target" || pkg_setuid_rollback_status=1
    fi
  done < "$pkg_setuid_file"

  command -p -- rmdir "$pkg_setuid_rollback_dir" 2>/dev/null || pkg_setuid_rollback_status=1
  return "$pkg_setuid_rollback_status"
}

_pkg_setuid_materialize()
{
  [ "$#" -eq 2 ] || return 2
  pkg_setuid_range=$1
  pkg_setuid_concrete=$2
  pkg_setuid_file="$pkg_setuid_range/setuid_root"
  pkg_setuid_rollback_dir="$pkg_setuid_concrete/setuid-root-rollback"

  if [ ! -e "$pkg_setuid_file" ] && [ ! -L "$pkg_setuid_file" ]
  then
    return 0
  fi

  command -p -- mkdir "$pkg_setuid_rollback_dir" || return 1

  pkg_setuid_index=0
  while IFS= read -r pkg_setuid_path
  do
    pkg_setuid_index=$((pkg_setuid_index + 1))
    pkg_setuid_target="$pkg_setuid_concrete/root/$pkg_setuid_path"
    pkg_setuid_backup="$pkg_setuid_rollback_dir/original-$pkg_setuid_index"
    pkg_setuid_work="$pkg_setuid_rollback_dir/work-$pkg_setuid_index"

    command -p -- mv "$pkg_setuid_target" "$pkg_setuid_backup" || return 1
    command -p -- cp "$pkg_setuid_backup" "$pkg_setuid_work" || return 1
    _pkg_setuid_apply_file "$pkg_setuid_work" || return 1
    command -p -- mv "$pkg_setuid_work" "$pkg_setuid_target" || return 1
  done < "$pkg_setuid_file"

  return 0
}

_pkg_setuid_commit()
{
  [ "$#" -eq 2 ] || return 2
  pkg_setuid_range=$1
  pkg_setuid_concrete=$2
  pkg_setuid_file="$pkg_setuid_range/setuid_root"
  pkg_setuid_rollback_dir="$pkg_setuid_concrete/setuid-root-rollback"

  if [ ! -e "$pkg_setuid_file" ] && [ ! -L "$pkg_setuid_file" ]
  then
    return 0
  fi

  [ -d "$pkg_setuid_rollback_dir" ] && [ ! -L "$pkg_setuid_rollback_dir" ] || return 1

  pkg_setuid_index=0
  while IFS= read -r pkg_setuid_path
  do
    pkg_setuid_index=$((pkg_setuid_index + 1))
    pkg_setuid_backup="$pkg_setuid_rollback_dir/original-$pkg_setuid_index"
    pkg_setuid_work="$pkg_setuid_rollback_dir/work-$pkg_setuid_index"
    [ -f "$pkg_setuid_backup" ] && [ ! -L "$pkg_setuid_backup" ] || return 1
    [ ! -e "$pkg_setuid_work" ] && [ ! -L "$pkg_setuid_work" ] || return 1
  done < "$pkg_setuid_file"

  pkg_setuid_index=0
  while IFS= read -r pkg_setuid_path
  do
    pkg_setuid_index=$((pkg_setuid_index + 1))
    pkg_setuid_backup="$pkg_setuid_rollback_dir/original-$pkg_setuid_index"
    command -p -- rm -f "$pkg_setuid_backup" || return 1
  done < "$pkg_setuid_file"

  command -p -- rmdir "$pkg_setuid_rollback_dir"
}
