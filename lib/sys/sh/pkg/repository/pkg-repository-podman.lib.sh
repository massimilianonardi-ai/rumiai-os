_pkg_repository_podman_scalar()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_podman_scalar_file=$1

  [ -f "$pkg_repository_podman_scalar_file" ] &&
  [ ! -L "$pkg_repository_podman_scalar_file" ] &&
  [ -r "$pkg_repository_podman_scalar_file" ] &&
  [ ! -x "$pkg_repository_podman_scalar_file" ] || return 1

  pkg_repository_podman_scalar_value=
  pkg_repository_podman_scalar_extra=
  {
    IFS= read -r pkg_repository_podman_scalar_value || return 1
    IFS= read -r pkg_repository_podman_scalar_extra
    pkg_repository_podman_scalar_second_status=$?
  } < "$pkg_repository_podman_scalar_file"

  [ "$pkg_repository_podman_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_repository_podman_scalar_extra" ] || return 1
  [ -n "$pkg_repository_podman_scalar_value" ] || return 1

  pkg_repository_podman_scalar_cr="$(printf '\r')"
  case "$pkg_repository_podman_scalar_value" in
    *"$pkg_repository_podman_scalar_cr"*) return 1 ;;
  esac

  pkg_repository_podman_scalar_actual="$(command -p -- wc -c < "$pkg_repository_podman_scalar_file")" || return 1
  pkg_repository_podman_scalar_expected="$(printf '%s\n' "$pkg_repository_podman_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_repository_podman_scalar_actual" = "$pkg_repository_podman_scalar_expected" ] || return 1

  printf -- '%s\n' "$pkg_repository_podman_scalar_value"
}

_pkg_repository_podman_validate_version()
{
  [ "$#" -eq 1 ] || return 2
  LC_ALL=C command -p -- awk -v value="$1" '
BEGIN {
  if (value !~ /^v[0-9]+\.[0-9]+\.[0-9]+$/) exit 1
  sub(/^v/, "", value)
  n=split(value, p, /[.]/)
  if (n != 3) exit 1
  for (i=1; i<=3; i++) {
    if (length(p[i]) > 1 && substr(p[i], 1, 1) == "0") exit 1
  }
  exit 0
}'
}

_pkg_repository_podman_validate_repository()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_podman_repository_dir=$1

  [ -d "$pkg_repository_podman_repository_dir" ] &&
  [ ! -L "$pkg_repository_podman_repository_dir" ] || return 1

  for pkg_repository_podman_repository_item in \
    "$pkg_repository_podman_repository_dir"/* \
    "$pkg_repository_podman_repository_dir"/.[!.]* \
    "$pkg_repository_podman_repository_dir"/..?*
  do
    [ -e "$pkg_repository_podman_repository_item" ] || [ -L "$pkg_repository_podman_repository_item" ] || continue
    case "${pkg_repository_podman_repository_item##*/}" in
      type|version|url|digest) : ;;
      *) return 1 ;;
    esac
  done

  pkg_repository_podman_type="$(_pkg_repository_podman_scalar "$pkg_repository_podman_repository_dir/type")" || return 1
  pkg_repository_podman_version="$(_pkg_repository_podman_scalar "$pkg_repository_podman_repository_dir/version")" || return 1
  pkg_repository_podman_url="$(_pkg_repository_podman_scalar "$pkg_repository_podman_repository_dir/url")" || return 1
  pkg_repository_podman_digest="$(_pkg_repository_podman_scalar "$pkg_repository_podman_repository_dir/digest")" || return 1

  [ "$pkg_repository_podman_type" = podman ] || return 1
  _pkg_repository_podman_validate_version "$pkg_repository_podman_version" || return 1

  pkg_repository_podman_expected_url="https://github.com/podman-container-tools/podman/releases/download/$pkg_repository_podman_version/podman-installer-macos-arm64.pkg"
  [ "$pkg_repository_podman_url" = "$pkg_repository_podman_expected_url" ] || return 1

  [ "${#pkg_repository_podman_digest}" -eq 64 ] || return 1
  case "$pkg_repository_podman_digest" in
    *[!0123456789abcdefABCDEF]*) return 1 ;;
  esac
  pkg_repository_podman_digest="$(printf '%s\n' "$pkg_repository_podman_digest" | command -p -- tr 'A-F' 'a-f')" || return 1
}

_pkg_repository_podman_compare_raw()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_podman_validate_version "$1" || return 1
  _pkg_repository_podman_validate_version "$2" || return 1

  LC_ALL=C command -p -- awk -v left="$1" -v right="$2" '
function parse(value, out, n, p, i) {
  sub(/^v/, "", value)
  n=split(value, p, /[.]/)
  if (n != 3) return 0
  for (i=1; i<=3; i++) {
    if (p[i] !~ /^(0|[1-9][0-9]*)$/) return 0
    out[i]=p[i] + 0
  }
  return 1
}
BEGIN {
  if (!parse(left, l) || !parse(right, r)) exit 1
  for (i=1; i<=3; i++) {
    if (l[i] < r[i]) { print -1; exit 0 }
    if (l[i] > r[i]) { print 1; exit 0 }
  }
  print 0
}'
}

pkg_repository_list_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_podman_validate_repository "$1" || return 1
  printf -- '%s\n' "$pkg_repository_podman_version"
)

pkg_repository_compare_versions()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_podman_validate_repository "$1" || return 1
  _pkg_repository_podman_compare_raw "$2" "$3"
)

pkg_repository_resolve_version()
(
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || return 2
  _pkg_repository_podman_validate_repository "$1" || return 1

  if [ "$#" -eq 2 ]
  then
    _pkg_repository_podman_validate_version "$2" || return 1
    [ "$2" = "$pkg_repository_podman_version" ] || return 1
  fi

  printf -- '%s\n' "$pkg_repository_podman_version"
)

pkg_repository_resolve_artifact()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_podman_validate_repository "$1" || return 1
  pkg_repository_podman_range=$2
  pkg_repository_podman_requested=$3

  [ -d "$pkg_repository_podman_range" ] && [ ! -L "$pkg_repository_podman_range" ] || return 1
  _pkg_repository_podman_validate_version "$pkg_repository_podman_requested" || return 1
  [ "$pkg_repository_podman_requested" = "$pkg_repository_podman_version" ] || return 1

  pkg_repository_podman_archive_regex="$(_pkg_repository_podman_scalar "$pkg_repository_podman_range/archive_regex")" || return 1
  pkg_repository_podman_digest_type="$(_pkg_repository_podman_scalar "$pkg_repository_podman_range/digest_type")" || return 1
  [ "$pkg_repository_podman_digest_type" = sha256 ] || return 1
  if [ -e "$pkg_repository_podman_range/digest_regex" ] || [ -L "$pkg_repository_podman_range/digest_regex" ]
  then
    return 1
  fi

  pkg_repository_podman_name=${pkg_repository_podman_url##*/}
  printf '%s\n' "$pkg_repository_podman_name" | LC_ALL=C command -p -- awk -v expression="$pkg_repository_podman_archive_regex" '
BEGIN {
  if ((getline value) != 1) exit 1
  exit(value ~ expression ? 0 : 1)
}' || return 1

  pkg_repository_podman_size="$(http-fetch -l -- "$pkg_repository_podman_url")" || return 1
  case "$pkg_repository_podman_size" in
    ""|0|*[!0-9]*) return 1 ;;
  esac

  printf -- 'name=%s\n' "$pkg_repository_podman_name"
  printf -- 'url=%s\n' "$pkg_repository_podman_url"
  printf -- 'size=%s\n' "$pkg_repository_podman_size"
  printf -- 'digest=sha256:%s\n' "$pkg_repository_podman_digest"
)
