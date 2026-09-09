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

  return 0
)
