. "$m_LIB_DIR/sys/sh/json.lib.sh"

_pkg_repository_geoserver_scalar()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1
  value=
  extra=
  {
    IFS= read -r value || return 1
    IFS= read -r extra
    second_status=$?
  } < "$1"
  [ "$second_status" -ne 0 ] || return 1
  [ -z "$extra" ] && [ -n "$value" ] || return 1
  cr="$(printf '\r')"
  case "$value" in *"$cr"*) return 1;; esac
  actual="$(command -p -- wc -c < "$1")" || return 1
  expected="$(printf '%s\n' "$value" | command -p -- wc -c)" || return 1
  [ "$actual" = "$expected" ] || return 1
  printf -- '%s\n' "$value"
}

_pkg_repository_geoserver_validate_repository()
{
  [ "$#" -eq 1 ] || return 2
  dir=$1
  [ -d "$dir" ] && [ ! -L "$dir" ] || return 1
  for item in "$dir"/* "$dir"/.[!.]* "$dir"/..?*
  do
    [ -e "$item" ] || [ -L "$item" ] || continue
    [ "${item##*/}" = type ] || return 1
  done
  [ "$(_pkg_repository_geoserver_scalar "$dir/type")" = geoserver ]
}

_pkg_repository_geoserver_version_key()
{
  [ "$#" -eq 1 ] || return 2
  LC_ALL=C command -p -- awk -v version="$1" '
function decimal(v) { return v ~ /^(0|[1-9][0-9]*)$/ }
BEGIN {
  n=split(version,p,/[.]/)
  if (n != 3) exit 1
  for (i=1;i<=3;i++) if (!decimal(p[i])) exit 1
  printf "%d\t%s\t%d\t%s\t%d\t%s\t%s\n", length(p[1]),p[1],length(p[2]),p[2],length(p[3]),p[3],version
}'
}

_pkg_repository_geoserver_validate_version()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_version_key "$1" >/dev/null
}

_pkg_repository_geoserver_compare_values()
{
  [ "$#" -eq 2 ] || return 2
  LC_ALL=C command -p -- awk -v left="$1" -v right="$2" '
function decimal(v) { return v ~ /^(0|[1-9][0-9]*)$/ }
function parse(v,a, n,i) {
  n=split(v,a,/[.]/); if (n != 3) return 0
  for (i=1;i<=3;i++) if (!decimal(a[i])) return 0
  return 1
}
function cmp(a,b) {
  if (length(a)<length(b)) return -1
  if (length(a)>length(b)) return 1
  if (a==b) return 0
  return (("x" a)<("x" b)) ? -1 : 1
}
BEGIN {
  if (!parse(left,l) || !parse(right,r)) exit 1
  for (i=1;i<=3;i++) { c=cmp(l[i],r[i]); if (c) { print c; exit } }
  print 0
}'
}

_pkg_repository_geoserver_root_get()
{
  [ "$#" -eq 0 ] || return 2
  http-fetch -- 'https://sourceforge.net/projects/geoserver/files/GeoServer/?format=json'
}

_pkg_repository_geoserver_folder_get()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_validate_version "$1" || return 2
  http-fetch -- "https://sourceforge.net/projects/geoserver/files/GeoServer/$1/?format=json"
}

_pkg_repository_geoserver_versions()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_validate_repository "$1" || return 1
  body="$(_pkg_repository_geoserver_root_get)" || return 1
  records="$(printf '%s\n' "$body" | json_object_array_object_fields files name type)" || return 1
  tab="$(printf '\t')"
  keys=
  while IFS="$tab" read -r name_token type_token extra
  do
    [ -z "$extra" ] || return 1
    case "$name_token" in s:*) name=${name_token#s:};; *) return 1;; esac
    [ "$type_token" = s:d ] || continue
    _pkg_repository_geoserver_validate_version "$name" || continue
    key="$(_pkg_repository_geoserver_version_key "$name")" || return 1
    if [ -n "$keys" ]; then keys="$keys
$key"; else keys=$key; fi
  done <<EOF
$records
EOF
  [ -n "$keys" ] || return 0
  printf '%s\n' "$keys" | LC_ALL=C command -p -- sort -t "$tab" -k1,1n -k2,2 -k3,3n -k4,4 -k5,5n -k6,6 -k7,7 | \
    LC_ALL=C command -p -- awk -F "$tab" 'NF!=7{exit 1} seen[$7]++{exit 1} {print $7}'
}

pkg_repository_list_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_versions "$1"
)

pkg_repository_compare_versions()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_geoserver_validate_repository "$1" || return 1
  _pkg_repository_geoserver_compare_values "$2" "$3"
)

pkg_repository_resolve_version()
(
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || return 2
  _pkg_repository_geoserver_validate_repository "$1" || return 1
  versions="$(_pkg_repository_geoserver_versions "$1")" || return 1
  [ -n "$versions" ] || return 1
  if [ "$#" -eq 2 ]
  then
    _pkg_repository_geoserver_validate_version "$2" || return 1
    printf '%s\n' "$versions" | LC_ALL=C command -p -- awk -v expected="$2" '$0==expected{n++} END{exit(n==1?0:1)}' || return 1
    printf -- '%s\n' "$2"
  else
    printf '%s\n' "$versions" | LC_ALL=C command -p -- awk 'NF{v=$0} END{if(v=="")exit 1; print v}'
  fi
)

pkg_repository_resolve_artifact()
(
  [ "$#" -eq 3 ] || return 2
  repository=$1
  range=$2
  version=$3
  _pkg_repository_geoserver_validate_repository "$repository" || return 1
  _pkg_repository_geoserver_validate_version "$version" || return 1
  [ -d "$range" ] && [ ! -L "$range" ] || return 1

  archive_regex="$(_pkg_repository_geoserver_scalar "$range/archive_regex")" || return 1
  LC_ALL=C command -p -- awk -v expression="$archive_regex" 'BEGIN{value=""; value~expression; exit 0}' || return 1
  [ ! -e "$range/digest_regex" ] && [ ! -L "$range/digest_regex" ] || return 1
  [ "$(_pkg_repository_geoserver_scalar "$range/digest_type")" = md5 ] || return 1

  name="geoserver-$version-bin.zip"
  LC_ALL=C command -p -- awk -v value="$name" -v expression="$archive_regex" 'BEGIN{exit(value~expression?0:1)}' || return 1
  body="$(_pkg_repository_geoserver_folder_get "$version")" || return 1
  records="$(printf '%s\n' "$body" | json_object_array_object_fields files name type size md5)" || return 1
  tab="$(printf '\t')"
  found=0
  size=
  md5=
  while IFS="$tab" read -r name_token type_token size_token md5_token extra
  do
    [ -z "$extra" ] || return 1
    case "$name_token" in s:*) entry=${name_token#s:};; *) return 1;; esac
    [ "$entry" = "$name" ] || continue
    [ "$type_token" = s:f ] || return 1
    case "$size_token" in n:*) size=${size_token#n:};; *) return 1;; esac
    case "$size" in ""|*[!0-9]*|0[0-9]*) return 1;; esac
    [ "$size" -gt 0 ] || return 1
    case "$md5_token" in s:*) md5=${md5_token#s:};; *) return 1;; esac
    [ "${#md5}" -eq 32 ] || return 1
    case "$md5" in *[!0-9A-Fa-f]*) return 1;; esac
    md5="$(printf '%s\n' "$md5" | command -p -- tr 'A-F' 'a-f')" || return 1
    found=$((found+1))
  done <<EOF
$records
EOF
  [ "$found" -eq 1 ] || return 1

  printf -- 'name=%s\n' "$name"
  printf -- 'url=https://sourceforge.net/projects/geoserver/files/GeoServer/%s/%s/download\n' "$version" "$name"
  printf -- 'size=%s\n' "$size"
  printf -- 'digest=md5:%s\n' "$md5"
)
