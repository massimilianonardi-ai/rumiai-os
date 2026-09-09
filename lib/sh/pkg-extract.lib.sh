_pkg_extract_error()
{
  log error execution execution-failed operation pkg-extract reason "$1" format "$2"
}

_pkg_extract_missing()
{
  log error execution command-not-found operation pkg-extract command "$1" format "$2"
}

_pkg_extract_have()
{
  [ "$#" -eq 1 ] || return 2
  command -v -- "$1" >/dev/null 2>&1
}

_pkg_extract_require()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_extract_have "$1" && return 0
  _pkg_extract_missing "$1" "$2"
  return 1
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

_pkg_extract_tar_stream()
{
  [ "$#" -eq 3 ] || return 2
  pkg_extract_tar_artifact=$1
  pkg_extract_tar_staging=$2
  pkg_extract_tar_format=$3

  _pkg_extract_require tar "$pkg_extract_tar_format" || return 1
  (
    cd -- "$pkg_extract_tar_staging" || exit 1
    TAR_OPTIONS= command -- tar -xf -
  ) < "$pkg_extract_tar_artifact"
}

_pkg_extract_compressed_tar()
{
  [ "$#" -eq 4 ] || return 2
  pkg_extract_compressed_artifact=$1
  pkg_extract_compressed_staging=$2
  pkg_extract_compressed_format=$3
  pkg_extract_compressed_command=$4

  _pkg_extract_require "$pkg_extract_compressed_command" "$pkg_extract_compressed_format" || return 1
  _pkg_extract_require tar "$pkg_extract_compressed_format" || return 1

  pkg_extract_compressed_tmp="$pkg_extract_compressed_staging/.pkg-extract-$$.tar"
  [ ! -e "$pkg_extract_compressed_tmp" ] && [ ! -L "$pkg_extract_compressed_tmp" ] || return 1

  case "$pkg_extract_compressed_command" in
    gzip)
      GZIP= command -- gzip -dc < "$pkg_extract_compressed_artifact" > "$pkg_extract_compressed_tmp"
      ;;
    bzip2)
      BZIP2= BZIP= command -- bzip2 -dc < "$pkg_extract_compressed_artifact" > "$pkg_extract_compressed_tmp"
      ;;
    xz)
      XZ_OPT= XZ_DEFAULTS= command -- xz -dc < "$pkg_extract_compressed_artifact" > "$pkg_extract_compressed_tmp"
      ;;
    zstd)
      command -- zstd -dcq < "$pkg_extract_compressed_artifact" > "$pkg_extract_compressed_tmp"
      ;;
    *)
      return 2
      ;;
  esac
  pkg_extract_compressed_status=$?
  if [ "$pkg_extract_compressed_status" -ne 0 ]
  then
    command -p -- rm -f -- "$pkg_extract_compressed_tmp" 2>/dev/null
    return 1
  fi

  exec 3< "$pkg_extract_compressed_tmp" || {
    command -p -- rm -f -- "$pkg_extract_compressed_tmp" 2>/dev/null
    return 1
  }
  command -p -- rm -f -- "$pkg_extract_compressed_tmp" || {
    exec 3<&-
    return 1
  }

  (
    cd -- "$pkg_extract_compressed_staging" || exit 1
    TAR_OPTIONS= command -- tar -xf - <&3
  )
  pkg_extract_compressed_status=$?
  exec 3<&-
  return "$pkg_extract_compressed_status"
}

_pkg_extract_stream_target()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_stream_name=$1
  pkg_extract_stream_format=$2

  case "$pkg_extract_stream_format:$pkg_extract_stream_name" in
    gzip:*.gz|gz:*.gz) pkg_extract_stream_name=${pkg_extract_stream_name%.gz};;
    gzip:*.gzip|gz:*.gzip) pkg_extract_stream_name=${pkg_extract_stream_name%.gzip};;
    bzip:*.bz2|bzip2:*.bz2|bz2:*.bz2) pkg_extract_stream_name=${pkg_extract_stream_name%.bz2};;
    bzip:*.bz|bzip2:*.bz|bz2:*.bz) pkg_extract_stream_name=${pkg_extract_stream_name%.bz};;
    bzip:*.bzip2|bzip2:*.bzip2|bz2:*.bzip2) pkg_extract_stream_name=${pkg_extract_stream_name%.bzip2};;
    xz:*.xz) pkg_extract_stream_name=${pkg_extract_stream_name%.xz};;
    zstd:*.zst|zst:*.zst) pkg_extract_stream_name=${pkg_extract_stream_name%.zst};;
    zstd:*.zstd|zst:*.zstd) pkg_extract_stream_name=${pkg_extract_stream_name%.zstd};;
    *) return 1;;
  esac

  [ -n "$pkg_extract_stream_name" ] && [ "$pkg_extract_stream_name" != . ] && [ "$pkg_extract_stream_name" != .. ] || return 1
  printf -- '%s\n' "$pkg_extract_stream_name"
}

_pkg_extract_stream()
{
  [ "$#" -eq 4 ] || return 2
  pkg_extract_stream_artifact=$1
  pkg_extract_stream_staging=$2
  pkg_extract_stream_format=$3
  pkg_extract_stream_command=$4

  _pkg_extract_require "$pkg_extract_stream_command" "$pkg_extract_stream_format" || return 1
  pkg_extract_stream_base=${pkg_extract_stream_artifact##*/}
  pkg_extract_stream_output="$(_pkg_extract_stream_target "$pkg_extract_stream_base" "$pkg_extract_stream_format")" || return 1
  pkg_extract_stream_output="$pkg_extract_stream_staging/$pkg_extract_stream_output"

  case "$pkg_extract_stream_command" in
    gzip)
      GZIP= command -- gzip -dc < "$pkg_extract_stream_artifact" > "$pkg_extract_stream_output"
      ;;
    bzip2)
      BZIP2= BZIP= command -- bzip2 -dc < "$pkg_extract_stream_artifact" > "$pkg_extract_stream_output"
      ;;
    xz)
      XZ_OPT= XZ_DEFAULTS= command -- xz -dc < "$pkg_extract_stream_artifact" > "$pkg_extract_stream_output"
      ;;
    zstd)
      command -- zstd -dcq < "$pkg_extract_stream_artifact" > "$pkg_extract_stream_output"
      ;;
    *)
      return 2
      ;;
  esac
  pkg_extract_stream_status=$?
  if [ "$pkg_extract_stream_status" -ne 0 ]
  then
    command -p -- rm -f -- "$pkg_extract_stream_output" 2>/dev/null
    return 1
  fi
}

_pkg_extract_zip()
{
  [ "$#" -eq 3 ] || return 2
  _pkg_extract_require unzip "$3" || return 1
  UNZIP= UNZIPOPT= command -- unzip -qq -d "$2" "$1"
}

_pkg_extract_7z_command()
{
  for pkg_extract_7z_candidate in 7zz 7z 7za
  do
    if _pkg_extract_have "$pkg_extract_7z_candidate"
    then
      printf -- '%s\n' "$pkg_extract_7z_candidate"
      return 0
    fi
  done
  return 1
}

_pkg_extract_7z()
{
  [ "$#" -eq 3 ] || return 2
  pkg_extract_7z_command="$(_pkg_extract_7z_command)" || {
    _pkg_extract_missing 7z "$3"
    return 1
  }
  command -- "$pkg_extract_7z_command" x -y "-o$2" -- "$1" >/dev/null
}

_pkg_extract_appimage()
{
  [ "$#" -eq 2 ] || return 2
  pkg_extract_appimage_target="$2/${1##*/}"
  command -p -- cp -p -- "$1" "$pkg_extract_appimage_target"
}

_pkg_extract_deb()
{
  [ "$#" -eq 3 ] || return 2
  _pkg_extract_require dpkg-deb "$3" || return 1
  command -- dpkg-deb -x "$1" "$2"
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
    tar)
      _pkg_extract_tar_stream "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format"
      ;;
    tar.gz|tgz)
      _pkg_extract_compressed_tar "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" gzip
      ;;
    tar.bz2|tar.bzip2|tbz|tbz2)
      _pkg_extract_compressed_tar "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" bzip2
      ;;
    tar.xz|txz)
      _pkg_extract_compressed_tar "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" xz
      ;;
    tar.zst|tzst)
      _pkg_extract_compressed_tar "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" zstd
      ;;
    gzip|gz)
      _pkg_extract_stream "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" gzip
      ;;
    bzip|bzip2|bz2)
      _pkg_extract_stream "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" bzip2
      ;;
    xz)
      _pkg_extract_stream "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" xz
      ;;
    zstd|zst)
      _pkg_extract_stream "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format" zstd
      ;;
    zip|jar|war)
      _pkg_extract_zip "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format"
      ;;
    7z|7zip|dmg)
      _pkg_extract_7z "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format"
      ;;
    appimage)
      _pkg_extract_appimage "$pkg_extract_artifact" "$pkg_extract_staging"
      ;;
    deb)
      _pkg_extract_deb "$pkg_extract_artifact" "$pkg_extract_staging" "$pkg_extract_format"
      ;;
    *)
      _pkg_extract_error format-unsupported "$pkg_extract_format"
      return 2
      ;;
  esac
  pkg_extract_status=$?

  if [ "$pkg_extract_status" -ne 0 ]
  then
    _pkg_extract_error extraction-failed "$pkg_extract_format"
    return 1
  fi

  return 0
)
