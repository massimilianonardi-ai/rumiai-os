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

  body="$(_pkg_repository_geoserver_github_get "/releases/tags/$2")" || return 1
  json_object_read \
    tag_name tag_token \
    draft draft_token \
    prerelease prerelease_token <<EOF_JSON
$body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  case "$tag_token" in s:*) tag=${tag_token#s:};; *) return 1;; esac
  [ "$tag" = "$2" ] || return 1
  [ "$draft_token" = b:false ] || return 1
  [ "$prerelease_token" = b:false ] || return 1
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

_pkg_repository_geoserver_rss_get()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_geoserver_validate_version "$1" || return 2
  http-fetch -- "https://sourceforge.net/projects/geoserver/rss?path=/GeoServer/$1/"
}

_pkg_repository_geoserver_artifact_metadata()
(
  [ "$#" -eq 2 ] || return 2
  version=$1
  name=$2
  _pkg_repository_geoserver_validate_version "$version" || return 2
  [ -n "$name" ] || return 2

  url="https://sourceforge.net/projects/geoserver/files/GeoServer/$version/$name/download"
  body="$(_pkg_repository_geoserver_rss_get "$version")" || return 1

  printf '%s\n' "$body" | LC_ALL=C command -p -- awk -v expected_url="$url" '
{
  source=source $0 "\n"
}
END {
  count=split(source, part, /<media:content/)
  found=0
  for (i=2; i<=count; i++) {
    block=part[i]
    close_pos=index(block, "</media:content>")
    if (!close_pos) {
      if (index(block, "url=\"" expected_url "\"") != 0) exit 1
      continue
    }
    block=substr(block, 1, close_pos-1)
    if (index(block, "url=\"" expected_url "\"") == 0) continue

    found++
    if (found != 1) exit 1

    marker="filesize=\""
    start=index(block, marker)
    if (!start) exit 1
    rest=substr(block, start+length(marker))
    finish=index(rest, "\"")
    if (!finish) exit 1
    size=substr(rest, 1, finish-1)
    if (size !~ /^[1-9][0-9]*$/) exit 1
    if (index(substr(rest, finish+1), marker) != 0) exit 1

    marker="<media:hash algo=\"md5\">"
    start=index(block, marker)
    if (!start) exit 1
    rest=substr(block, start+length(marker))
    finish=index(rest, "</media:hash>")
    if (!finish) exit 1
    digest=substr(rest, 1, finish-1)
    if (length(digest) != 32 || digest !~ /^[0-9A-Fa-f]+$/) exit 1
    if (index(substr(rest, finish+length("</media:hash>")), marker) != 0) exit 1
  }
  if (found != 1) exit 1
  printf "%s\t%s\n", size, tolower(digest)
}'
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
  [ "$(_pkg_repository_geoserver_scalar "$range/digest_type")" = md5 ] || return 1

  name="geoserver-$version-bin.zip"
  LC_ALL=C command -p -- awk -v value="$name" -v expression="$archive_regex" 'BEGIN{exit(value~expression?0:1)}' || return 1
  metadata="$(_pkg_repository_geoserver_artifact_metadata "$version" "$name")" || return 1
  tab="$(printf '\t')"
  IFS="$tab" read -r size md5 extra <<EOF_METADATA
$metadata
EOF_METADATA
  [ -z "$extra" ] || return 1
  case "$size" in ''|*[!0-9]*|0[0-9]*) return 1;; esac
  [ "$size" -gt 0 ] || return 1
  [ "${#md5}" -eq 32 ] || return 1
  case "$md5" in *[!0-9a-f]*) return 1;; esac

  printf -- 'name=%s\n' "$name"
  printf -- 'url=https://sourceforge.net/projects/geoserver/files/GeoServer/%s/%s/download\n' "$version" "$name"
  printf -- 'size=%s\n' "$size"
  printf -- 'digest=md5:%s\n' "$md5"
)
