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
    pkg_extract_swap_name=".rumiai-pkg-extract-$$-$pkg_extract_swap_counter"
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

pkg_extract()
(
  [ "$#" -eq 3 ] || return 2
  pkg_extract_input=$1
  pkg_extract_format=$2
  pkg_extract_staging_input=$3

  [ -f "$pkg_extract_input" ] && [ ! -L "$pkg_extract_input" ] && [ -r "$pkg_extract_input" ] || return 1
  _pkg_extract_require_empty_dir "$pkg_extract_staging_input" || return 1

  readpathce pkg_extract_artifact "$pkg_extract_input" || return 1
  readpathce pkg_extract_staging "$pkg_extract_staging_input" || return 1
  [ -f "$pkg_extract_artifact" ] && [ -d "$pkg_extract_staging" ] || return 1

  case "$pkg_extract_format" in
    appimage)
      _pkg_extract_appimage "$pkg_extract_artifact" "$pkg_extract_staging"
      pkg_extract_status=$?
      ;;
    tar|tar.gz|tgz|tar.bz2|tar.bzip2|tbz|tbz2|tar.xz|txz|tar.zst|tzst|gzip|gz|bzip|bzip2|bz2|xz|zstd|zst|zip|jar|war|7z|7zip|dmg|deb)
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
