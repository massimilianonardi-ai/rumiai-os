loadsyslib "json"
loadsyslib "pkg/repository/pkg-repository-artifact"

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

_pkg_repository_geoserver_github_get()
{
  [ "$#" -eq 1 ] || return 2
  http-fetch \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2026-03-10' \
    -- "https://api.github.com/repos/geoserver/geoserver$1"
}

_pkg_repository_geoserver_validate_exact_release()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_geoserver_validate_repository "$1" || return 1
  _pkg_repository_geoserver_validate_version "$2" || return 1

  name="geoserver-$2-bin.zip"
  download_url="https://sourceforge.net/projects/geoserver/files/GeoServer/$2/$name/download"
  pkg_repository_artifact_metadata_sourceforge_rss \
    geoserver \
    '/GeoServer/{version}/' \
    md5 \
    "$2" \
    "$name" \
    "$download_url" >/dev/null
)

_pkg_repository_geoserver_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_validate_repository "$1" || return 1

  page=1
  keys=
  lf='
'
  tab="$(printf '\t')"

  while :
  do
    body="$(_pkg_repository_geoserver_github_get "/releases?per_page=100&page=$page")" || return 1
    records="$(printf '%s\n' "$body" | json_array_object_fields tag_name draft prerelease)" || return 1
    count=0

    if [ -n "$records" ]
    then
      while IFS="$tab" read -r tag_token draft_token prerelease_token extra
      do
        [ -z "$extra" ] || return 1
        count=$((count + 1))

        case "$tag_token" in s:*) version=${tag_token#s:};; *) return 1;; esac
        case "$draft_token" in b:true) continue;; b:false) :;; *) return 1;; esac
        case "$prerelease_token" in b:true) continue;; b:false) :;; *) return 1;; esac
        _pkg_repository_geoserver_validate_version "$version" || continue
        key="$(_pkg_repository_geoserver_version_key "$version")" || return 1
        if [ -n "$keys" ]
        then
          keys="$keys$lf$key"
        else
          keys=$key
        fi
      done <<EOF_RECORDS
$records
EOF_RECORDS
    fi

    [ "$count" -ge 100 ] || break
    page=$((page + 1))
  done

  [ -n "$keys" ] || return 0
  printf '%s\n' "$keys" | \
    LC_ALL=C command -p -- sort -t "$tab" -k1,1n -k2,2 -k3,3n -k4,4 -k5,5n -k6,6 -k7,7 | \
    LC_ALL=C command -p -- awk -F "$tab" 'NF!=7{exit 1} seen[$7]++{exit 1} {print $7}'
)

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

  if [ "$#" -eq 2 ]
  then
    _pkg_repository_geoserver_validate_exact_release "$1" "$2" || return 1
    printf -- '%s\n' "$2"
    return 0
  fi

  versions="$(_pkg_repository_geoserver_versions "$1")" || return 1
  [ -n "$versions" ] || return 1
  printf '%s\n' "$versions" | LC_ALL=C command -p -- awk 'NF{v=$0} END{if(v=="")exit 1; print v}'
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
  digest_type="$(_pkg_repository_geoserver_scalar "$range/digest_type")" || return 1
  [ "$digest_type" = md5 ] || return 1

  name="geoserver-$version-bin.zip"
  LC_ALL=C command -p -- awk -v value="$name" -v expression="$archive_regex" 'BEGIN{exit(value~expression?0:1)}' || return 1
  download_url="https://sourceforge.net/projects/geoserver/files/GeoServer/$version/$name/download"
  metadata="$(pkg_repository_artifact_metadata_sourceforge_rss \
    geoserver \
    '/GeoServer/{version}/' \
    "$digest_type" \
    "$version" \
    "$name" \
    "$download_url")" || return 1

  tab="$(printf '\t')"
  IFS="$tab" read -r size digest extra <<EOF_METADATA
$metadata
EOF_METADATA
  [ -z "$extra" ] || return 1
  case "$digest" in md5:*) md5=${digest#md5:};; *) return 1;; esac

  printf 'name=%s\n' "$name"
  printf 'url=%s\n' "$download_url"
  for mirror in pilotfiber phoenixnap psychz cfhcable
  do
    printf 'url=%s?use_mirror=%s\n' "$download_url" "$mirror"
  done
  printf 'size=%s\n' "$size"
  printf 'digest=md5:%s\n' "$md5"
)

