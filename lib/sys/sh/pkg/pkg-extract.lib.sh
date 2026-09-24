_pkg_extract_error()
{
  log error execution execution-failed operation pkg-extract reason "$1" format "$2"
}

_pkg_extract_require_empty_dir()
{
  [ "$#" -eq 1 ] || return 2
  [ -d "$1" ] && [ ! -L "$1" ] || return 1

  for pkg_extract_item in \
    "$1"/* \
    "$1"/.[!.]* \
    "$1"/..?*
  do
    [ -e "$pkg_extract_item" ] || [ -L "$pkg_extract_item" ] || continue
    return 1
  done
}

_pkg_extract_single_real_dir()
{
  [ "$#" -eq 1 ] || return 2
  pkg_extract_count=0
  pkg_extract_single_dir=

  for pkg_extract_item in \
    "$1"/* \
    "$1"/.[!.]* \
    "$1"/..?*
  do
    [ -e "$pkg_extract_item" ] || [ -L "$pkg_extract_item" ] || continue
    pkg_extract_count=$((pkg_extract_count + 1))
    pkg_extract_single_dir=$pkg_extract_item
    [ "$pkg_extract_count" -le 1 ] || return 1
  done

  [ "$pkg_extract_count" -eq 1 ] && [ -d "$pkg_extract_single_dir" ] && [ ! -L "$pkg_extract_single_dir" ]
}

_pkg_extract_macos_application_bundle()
{
  [ "$#" -eq 1 ] || return 2

  case "${1##*/}" in
    *.app) : ;;
    *) return 1 ;;
  esac

  [ -d "$1" ] && [ ! -L "$1" ] || return 1
  [ -d "$1/Contents" ] && [ ! -L "$1/Contents" ] || return 1
  [ -f "$1/Contents/Info.plist" ] && [ ! -L "$1/Contents/Info.plist" ] || return 1
  [ -d "$1/Contents/MacOS" ] && [ ! -L "$1/Contents/MacOS" ] || return 1
}

_pkg_extract_normalize_root()
{
  [ "$#" -eq 1 ] || return 2
  pkg_extract_output=$1
  pkg_extract_useful_root=$pkg_extract_output
  pkg_extract_top_wrapper=

  while _pkg_extract_single_real_dir "$pkg_extract_useful_root"
  do
    _pkg_extract_macos_application_bundle "$pkg_extract_single_dir" && break
    [ -n "$pkg_extract_top_wrapper" ] || pkg_extract_top_wrapper=$pkg_extract_single_dir
    pkg_extract_useful_root=$pkg_extract_single_dir
  done

  [ "$pkg_extract_useful_root" != "$pkg_extract_output" ] || return 0

  pkg_extract_swap_counter=0
  while :
  do
    pkg_extract_swap_name="m-pkg-extract-$$-$pkg_extract_swap_counter"
    pkg_extract_swap="$pkg_extract_output/$pkg_extract_swap_name"
    if [ ! -e "$pkg_extract_swap" ] && [ ! -L "$pkg_extract_swap" ] && \
       [ ! -e "$pkg_extract_useful_root/$pkg_extract_swap_name" ] && [ ! -L "$pkg_extract_useful_root/$pkg_extract_swap_name" ]
    then
      break
    fi
    pkg_extract_swap_counter=$((pkg_extract_swap_counter + 1))
  done

  command -p -- mv -- "$pkg_extract_top_wrapper" "$pkg_extract_swap" || return 1

  if [ "$pkg_extract_useful_root" = "$pkg_extract_top_wrapper" ]
  then
    pkg_extract_useful_root=$pkg_extract_swap
  else
    pkg_extract_useful_suffix=${pkg_extract_useful_root#"$pkg_extract_top_wrapper"}
    pkg_extract_useful_root="$pkg_extract_swap$pkg_extract_useful_suffix"
  fi

  for pkg_extract_item in \
    "$pkg_extract_useful_root"/* \
    "$pkg_extract_useful_root"/.[!.]* \
    "$pkg_extract_useful_root"/..?*
  do
    [ -e "$pkg_extract_item" ] || [ -L "$pkg_extract_item" ] || continue
    pkg_extract_target="$pkg_extract_output/${pkg_extract_item##*/}"
    [ ! -e "$pkg_extract_target" ] && [ ! -L "$pkg_extract_target" ] || return 1
    command -p -- mv -- "$pkg_extract_item" "$pkg_extract_output/" || return 1
  done

  command -p -- rm -rf -- "$pkg_extract_swap" || return 1
}

_pkg_extract_appimage()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_appimage_target="$2/${1##*/}"
  command -p -- cp -p -- "$1" "$pkg_extract_appimage_target"
}

_pkg_extract_executable()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_executable_target="$2/${1##*/}"
  command -p -- cp -p -- "$1" "$pkg_extract_executable_target" || return 1
  command -p -- chmod +x "$pkg_extract_executable_target"
}

_pkg_extract_component_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    ""|.|..|*/*|*'
'*) return 1 ;;
    *.pkg) return 0 ;;
    *) return 1 ;;
  esac
}

_pkg_extract_relative_path_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    ""|/*|*/|*//*|*'
'*) return 1 ;;
  esac
  case "/$1/" in
    */./*|*/../*) return 1 ;;
  esac
  return 0
}

_pkg_extract_controlled_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    ""|[!abcdefghijklmnopqrstuvwxyz0123456789]*|*[!abcdefghijklmnopqrstuvwxyz0123456789._-]*|*[._-]) return 1 ;;
  esac
}

_pkg_extract_scalar_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_extract_scalar_value=
  pkg_extract_scalar_extra=
  {
    IFS= read -r pkg_extract_scalar_value || return 1
    IFS= read -r pkg_extract_scalar_extra
    pkg_extract_scalar_second_status=$?
  } < "$1"

  [ "$pkg_extract_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_extract_scalar_extra" ] || return 1
  [ -n "$pkg_extract_scalar_value" ] || return 1

  pkg_extract_scalar_cr="$(printf '\r')"
  case "$pkg_extract_scalar_value" in
    *"$pkg_extract_scalar_cr"*) return 1 ;;
  esac

  pkg_extract_scalar_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_extract_scalar_expected="$(printf '%s\n' "$pkg_extract_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_extract_scalar_actual" = "$pkg_extract_scalar_expected" ] || return 1
}

_pkg_extract_relative_dir_ensure()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_relative_dir_base=$1
  pkg_extract_relative_dir_rest=$2

  [ -d "$pkg_extract_relative_dir_base" ] && [ ! -L "$pkg_extract_relative_dir_base" ] || return 1
  _pkg_extract_relative_path_valid "$pkg_extract_relative_dir_rest" || return 1

  pkg_extract_relative_dir=$pkg_extract_relative_dir_base
  while [ -n "$pkg_extract_relative_dir_rest" ]
  do
    case "$pkg_extract_relative_dir_rest" in
      */*)
        pkg_extract_relative_dir_part=${pkg_extract_relative_dir_rest%%/*}
        pkg_extract_relative_dir_rest=${pkg_extract_relative_dir_rest#*/}
        ;;
      *)
        pkg_extract_relative_dir_part=$pkg_extract_relative_dir_rest
        pkg_extract_relative_dir_rest=
        ;;
    esac

    pkg_extract_relative_dir_next="$pkg_extract_relative_dir/$pkg_extract_relative_dir_part"
    if [ -e "$pkg_extract_relative_dir_next" ] || [ -L "$pkg_extract_relative_dir_next" ]
    then
      [ -d "$pkg_extract_relative_dir_next" ] && [ ! -L "$pkg_extract_relative_dir_next" ] || return 1
    else
      command -p -- mkdir "$pkg_extract_relative_dir_next" || return 1
    fi
    pkg_extract_relative_dir=$pkg_extract_relative_dir_next
  done
}

_pkg_extract_move_contents()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_move_source=$1
  pkg_extract_move_destination=$2
  [ -d "$pkg_extract_move_source" ] && [ ! -L "$pkg_extract_move_source" ] || return 1
  [ -d "$pkg_extract_move_destination" ] && [ ! -L "$pkg_extract_move_destination" ] || return 1

  for pkg_extract_move_item in     "$pkg_extract_move_source"/*     "$pkg_extract_move_source"/.[!.]*     "$pkg_extract_move_source"/..?*
  do
    [ -e "$pkg_extract_move_item" ] || [ -L "$pkg_extract_move_item" ] || continue
    pkg_extract_move_target="$pkg_extract_move_destination/${pkg_extract_move_item##*/}"
    [ ! -e "$pkg_extract_move_target" ] && [ ! -L "$pkg_extract_move_target" ] || return 1
    command -p -- mv -- "$pkg_extract_move_item" "$pkg_extract_move_destination/" || return 1
  done
}

_pkg_extract_payload_paths_valid()
{
  [ "$#" -eq 1 ] || return 2
  command -- cpio -it < "$1" 2>/dev/null | LC_ALL=C command -p -- awk '
{
  name=$0
  if (name == "" || substr(name, 1, 1) == "/") exit 1
  count=split(name, part, "/")
  for (i=1; i<=count; i++) {
    if (part[i] == "..") exit 1
  }
}
END { if (NR == 0) exit 1 }
'
}

_pkg_extract_payload_prepare()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_payload_input=$1
  pkg_extract_payload_output=$2

  [ -f "$pkg_extract_payload_input" ] && [ ! -L "$pkg_extract_payload_input" ] && [ -r "$pkg_extract_payload_input" ] || return 1
  [ ! -e "$pkg_extract_payload_output" ] && [ ! -L "$pkg_extract_payload_output" ] || return 1

  if _pkg_extract_payload_paths_valid "$pkg_extract_payload_input"
  then
    command -p -- cp -p -- "$pkg_extract_payload_input" "$pkg_extract_payload_output" || return 1
    return 0
  fi

  command -v gzip >/dev/null 2>&1 || return 1
  GZIP= command -- gzip -dc < "$pkg_extract_payload_input" > "$pkg_extract_payload_output" || return 1
  _pkg_extract_payload_paths_valid "$pkg_extract_payload_output"
}

_pkg_extract_dmg_pkg_component_materialize()
{
  [ "$#" -eq 5 ] || return 2
  pkg_extract_dmg_component_xar=$1
  pkg_extract_dmg_component_name=$2
  pkg_extract_dmg_component_work=$3
  pkg_extract_dmg_component_destination=$4
  pkg_extract_dmg_component_payload_root=$5

  _pkg_extract_component_valid "$pkg_extract_dmg_component_name" || return 1
  [ -d "$pkg_extract_dmg_component_xar" ] && [ ! -L "$pkg_extract_dmg_component_xar" ] || return 1
  [ -d "$pkg_extract_dmg_component_destination" ] && [ ! -L "$pkg_extract_dmg_component_destination" ] || return 1
  [ ! -e "$pkg_extract_dmg_component_work" ] && [ ! -L "$pkg_extract_dmg_component_work" ] || return 1
  command -p -- mkdir "$pkg_extract_dmg_component_work" "$pkg_extract_dmg_component_work/payload" || return 1

  pkg_extract_dmg_component_dir="$pkg_extract_dmg_component_xar/$pkg_extract_dmg_component_name"
  [ -d "$pkg_extract_dmg_component_dir" ] && [ ! -L "$pkg_extract_dmg_component_dir" ] || return 1
  pkg_extract_dmg_component_payload="$pkg_extract_dmg_component_dir/Payload"
  [ -f "$pkg_extract_dmg_component_payload" ] && [ ! -L "$pkg_extract_dmg_component_payload" ] && [ -r "$pkg_extract_dmg_component_payload" ] || return 1

  pkg_extract_dmg_component_cpio="$pkg_extract_dmg_component_work/payload.cpio"
  _pkg_extract_payload_prepare "$pkg_extract_dmg_component_payload" "$pkg_extract_dmg_component_cpio" || return 1
  (
    CDPATH= cd -- "$pkg_extract_dmg_component_work/payload" || exit 1
    command -- cpio -idm < "$pkg_extract_dmg_component_cpio" >/dev/null
  ) || return 1

  pkg_extract_dmg_component_selected="$pkg_extract_dmg_component_work/payload"
  if [ -n "$pkg_extract_dmg_component_payload_root" ]
  then
    _pkg_extract_relative_path_valid "$pkg_extract_dmg_component_payload_root" || return 1
    readpathce pkg_extract_dmg_component_base "$pkg_extract_dmg_component_selected" || return 1
    pkg_extract_dmg_component_candidate="$pkg_extract_dmg_component_selected/$pkg_extract_dmg_component_payload_root"
    [ -d "$pkg_extract_dmg_component_candidate" ] && [ ! -L "$pkg_extract_dmg_component_candidate" ] || return 1
    readpathce pkg_extract_dmg_component_selected "$pkg_extract_dmg_component_candidate" || return 1
    case "$pkg_extract_dmg_component_selected" in
      "$pkg_extract_dmg_component_base"/*) : ;;
      *) return 1 ;;
    esac
  fi

  _pkg_extract_move_contents "$pkg_extract_dmg_component_selected" "$pkg_extract_dmg_component_destination" || return 1
  command -p -- rm -rf -- "$pkg_extract_dmg_component_work"
}

_pkg_extract_dmg_pkg_overlay_materialize()
{
  [ "$#" -eq 4 ] || return 2
  pkg_extract_dmg_overlay_xar=$1
  pkg_extract_dmg_overlay_dir=$2
  pkg_extract_dmg_overlay_work=$3
  pkg_extract_dmg_overlay_staging=$4

  [ -d "$pkg_extract_dmg_overlay_dir" ] && [ ! -L "$pkg_extract_dmg_overlay_dir" ] || return 1
  pkg_extract_dmg_overlay_count=0

  for pkg_extract_dmg_overlay_entry in \
    "$pkg_extract_dmg_overlay_dir"/* \
    "$pkg_extract_dmg_overlay_dir"/.[!.]* \
    "$pkg_extract_dmg_overlay_dir"/..?*
  do
    [ -e "$pkg_extract_dmg_overlay_entry" ] || [ -L "$pkg_extract_dmg_overlay_entry" ] || continue
    pkg_extract_dmg_overlay_name=${pkg_extract_dmg_overlay_entry##*/}
    _pkg_extract_controlled_name_valid "$pkg_extract_dmg_overlay_name" || return 1
    [ -d "$pkg_extract_dmg_overlay_entry" ] && [ ! -L "$pkg_extract_dmg_overlay_entry" ] || return 1
    pkg_extract_dmg_overlay_count=$((pkg_extract_dmg_overlay_count + 1))

    pkg_extract_dmg_overlay_component_file=
    pkg_extract_dmg_overlay_payload_root_file=
    pkg_extract_dmg_overlay_target_root_file=
    for pkg_extract_dmg_overlay_field in \
      "$pkg_extract_dmg_overlay_entry"/* \
      "$pkg_extract_dmg_overlay_entry"/.[!.]* \
      "$pkg_extract_dmg_overlay_entry"/..?*
    do
      [ -e "$pkg_extract_dmg_overlay_field" ] || [ -L "$pkg_extract_dmg_overlay_field" ] || continue
      case "${pkg_extract_dmg_overlay_field##*/}" in
        component)
          [ -z "$pkg_extract_dmg_overlay_component_file" ] || return 1
          pkg_extract_dmg_overlay_component_file=$pkg_extract_dmg_overlay_field
          ;;
        payload-root)
          [ -z "$pkg_extract_dmg_overlay_payload_root_file" ] || return 1
          pkg_extract_dmg_overlay_payload_root_file=$pkg_extract_dmg_overlay_field
          ;;
        target-root)
          [ -z "$pkg_extract_dmg_overlay_target_root_file" ] || return 1
          pkg_extract_dmg_overlay_target_root_file=$pkg_extract_dmg_overlay_field
          ;;
        *)
          return 1
          ;;
      esac
    done

    [ -n "$pkg_extract_dmg_overlay_component_file" ] || return 1
    _pkg_extract_scalar_read "$pkg_extract_dmg_overlay_component_file" || return 1
    pkg_extract_dmg_overlay_component=$pkg_extract_scalar_value
    _pkg_extract_component_valid "$pkg_extract_dmg_overlay_component" || return 1

    pkg_extract_dmg_overlay_payload_root=
    if [ -n "$pkg_extract_dmg_overlay_payload_root_file" ]
    then
      _pkg_extract_scalar_read "$pkg_extract_dmg_overlay_payload_root_file" || return 1
      pkg_extract_dmg_overlay_payload_root=$pkg_extract_scalar_value
      _pkg_extract_relative_path_valid "$pkg_extract_dmg_overlay_payload_root" || return 1
    fi

    pkg_extract_dmg_overlay_destination=$pkg_extract_dmg_overlay_staging
    if [ -n "$pkg_extract_dmg_overlay_target_root_file" ]
    then
      _pkg_extract_scalar_read "$pkg_extract_dmg_overlay_target_root_file" || return 1
      pkg_extract_dmg_overlay_target_root=$pkg_extract_scalar_value
      _pkg_extract_relative_dir_ensure "$pkg_extract_dmg_overlay_staging" "$pkg_extract_dmg_overlay_target_root" || return 1
      pkg_extract_dmg_overlay_destination=$pkg_extract_relative_dir
    fi

    _pkg_extract_dmg_pkg_component_materialize \
      "$pkg_extract_dmg_overlay_xar" \
      "$pkg_extract_dmg_overlay_component" \
      "$pkg_extract_dmg_overlay_work/overlay-$pkg_extract_dmg_overlay_name" \
      "$pkg_extract_dmg_overlay_destination" \
      "$pkg_extract_dmg_overlay_payload_root" || return 1
  done

  [ "$pkg_extract_dmg_overlay_count" -gt 0 ]
}

_pkg_extract_dmg_pkg()
(
  [ "$#" -eq 5 ] || return 2
  pkg_extract_dmg_pkg_artifact=$1
  pkg_extract_dmg_pkg_staging=$2
  pkg_extract_dmg_pkg_component=$3
  pkg_extract_dmg_pkg_payload_root=$4
  pkg_extract_dmg_pkg_overlay_dir=$5

  _pkg_extract_component_valid "$pkg_extract_dmg_pkg_component" || return 1
  command -v xar >/dev/null 2>&1 || return 1
  command -v cpio >/dev/null 2>&1 || return 1

  pkg_extract_dmg_pkg_parent=${pkg_extract_dmg_pkg_staging%/*}
  [ "$pkg_extract_dmg_pkg_parent" != "$pkg_extract_dmg_pkg_staging" ] || return 1
  pkg_extract_dmg_pkg_counter=0
  while :
  do
    pkg_extract_dmg_pkg_work="$pkg_extract_dmg_pkg_parent/m-pkg-dmg-$pkg_extract_dmg_pkg_counter"
    if command -p -- mkdir "$pkg_extract_dmg_pkg_work" 2>/dev/null
    then
      break
    fi
    pkg_extract_dmg_pkg_counter=$((pkg_extract_dmg_pkg_counter + 1))
    [ "$pkg_extract_dmg_pkg_counter" -lt 1000 ] || return 1
  done
  trap 'command -p -- rm -rf -- "$pkg_extract_dmg_pkg_work" 2>/dev/null || :' 0 HUP INT TERM

  command -p -- mkdir "$pkg_extract_dmg_pkg_work/dmg" "$pkg_extract_dmg_pkg_work/xar" || return 1
  extract dmg "$pkg_extract_dmg_pkg_artifact" "$pkg_extract_dmg_pkg_work/dmg" || return 1

  pkg_extract_dmg_pkg_count=0
  pkg_extract_dmg_pkg_installer=
  for pkg_extract_dmg_pkg_candidate in "$pkg_extract_dmg_pkg_work/dmg"/*.pkg
  do
    [ -e "$pkg_extract_dmg_pkg_candidate" ] || [ -L "$pkg_extract_dmg_pkg_candidate" ] || continue
    [ -f "$pkg_extract_dmg_pkg_candidate" ] && [ ! -L "$pkg_extract_dmg_pkg_candidate" ] || return 1
    pkg_extract_dmg_pkg_count=$((pkg_extract_dmg_pkg_count + 1))
    pkg_extract_dmg_pkg_installer=$pkg_extract_dmg_pkg_candidate
    [ "$pkg_extract_dmg_pkg_count" -le 1 ] || return 1
  done
  [ "$pkg_extract_dmg_pkg_count" -eq 1 ] || return 1

  (
    CDPATH= cd -- "$pkg_extract_dmg_pkg_work/xar" || exit 1
    command -- xar -xf "$pkg_extract_dmg_pkg_installer"
  ) || return 1

  _pkg_extract_dmg_pkg_component_materialize \
    "$pkg_extract_dmg_pkg_work/xar" \
    "$pkg_extract_dmg_pkg_component" \
    "$pkg_extract_dmg_pkg_work/primary" \
    "$pkg_extract_dmg_pkg_staging" \
    "$pkg_extract_dmg_pkg_payload_root" || return 1

  if [ -n "$pkg_extract_dmg_pkg_overlay_dir" ]
  then
    _pkg_extract_dmg_pkg_overlay_materialize \
      "$pkg_extract_dmg_pkg_work/xar" \
      "$pkg_extract_dmg_pkg_overlay_dir" \
      "$pkg_extract_dmg_pkg_work" \
      "$pkg_extract_dmg_pkg_staging" || return 1
  fi

  command -p -- rm -rf -- "$pkg_extract_dmg_pkg_work" || return 1
  trap - 0 HUP INT TERM
)

pkg_extract()
(
  [ "$#" -eq 3 ] || [ "$#" -eq 4 ] || [ "$#" -eq 5 ] || [ "$#" -eq 6 ] || return 2
  pkg_extract_input=$1
  pkg_extract_format=$2
  pkg_extract_staging_input=$3
  pkg_extract_component=${4-}
  pkg_extract_payload_root=${5-}
  pkg_extract_overlay_input=${6-}

  [ -f "$pkg_extract_input" ] && [ ! -L "$pkg_extract_input" ] && [ -r "$pkg_extract_input" ] || return 1
  _pkg_extract_require_empty_dir "$pkg_extract_staging_input" || return 1

  readpathce pkg_extract_artifact "$pkg_extract_input" || return 1
  readpathce pkg_extract_staging "$pkg_extract_staging_input" || return 1
  [ -f "$pkg_extract_artifact" ] && [ -d "$pkg_extract_staging" ] || return 1

  case "$pkg_extract_format" in
    dmg-pkg)
      [ "$#" -eq 4 ] || [ "$#" -eq 5 ] || [ "$#" -eq 6 ] || return 2
      if [ -n "$pkg_extract_payload_root" ]
      then
        _pkg_extract_relative_path_valid "$pkg_extract_payload_root" || return 2
      fi
      pkg_extract_overlay=
      if [ "$#" -eq 6 ]
      then
        [ -d "$pkg_extract_overlay_input" ] && [ ! -L "$pkg_extract_overlay_input" ] || return 2
        readpathce pkg_extract_overlay "$pkg_extract_overlay_input" || return 2
      fi
      _pkg_extract_dmg_pkg "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_component" "$pkg_extract_payload_root" "$pkg_extract_overlay"
      pkg_extract_status=$?
      ;;
    appimage)
      [ "$#" -eq 3 ] || return 2
      _pkg_extract_appimage "$pkg_extract_artifact" "$pkg_extract_staging"
      pkg_extract_status=$?
      ;;
    executable)
      [ "$#" -eq 3 ] || return 2
      _pkg_extract_executable "$pkg_extract_artifact" "$pkg_extract_staging"
      pkg_extract_status=$?
      ;;
    tar|tar.gz|tgz|tar.bz2|tar.bzip2|tbz|tbz2|tar.xz|txz|tar.zst|tzst|gzip|gz|bzip|bzip2|bz2|xz|zstd|zst|zip|jar|war|7z|7zip|dmg|deb)
      [ "$#" -eq 3 ] || return 2
      extract "$pkg_extract_format" "$pkg_extract_artifact" "$pkg_extract_staging"
      pkg_extract_status=$?
      ;;
    *)
      _pkg_extract_error format-unsupported "$pkg_extract_format"
      return 2
      ;;
  esac

  if [ "$pkg_extract_status" -ne 0 ]
  then
    _pkg_extract_error extraction-failed "$pkg_extract_format"
    return 1
  fi

  if ! _pkg_extract_normalize_root "$pkg_extract_staging"
  then
    _pkg_extract_error normalization-failed "$pkg_extract_format"
    return 1
  fi

  return 0
)
