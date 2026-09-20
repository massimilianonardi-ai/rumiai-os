. "$m_LIB_DIR/sys/sh/json.lib.sh"

_pkg_repository_netbeans_scalar()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_netbeans_scalar_file="$1"

  [ -f "$pkg_repository_netbeans_scalar_file" ] && \
  [ ! -L "$pkg_repository_netbeans_scalar_file" ] && \
  [ ! -x "$pkg_repository_netbeans_scalar_file" ] || return 1

  pkg_repository_netbeans_scalar_value=
  pkg_repository_netbeans_scalar_extra=
  {
    IFS= read -r pkg_repository_netbeans_scalar_value || return 1
    IFS= read -r pkg_repository_netbeans_scalar_extra
    pkg_repository_netbeans_scalar_second_status=$?
  } < "$pkg_repository_netbeans_scalar_file"

  [ "$pkg_repository_netbeans_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_repository_netbeans_scalar_extra" ] || return 1
  [ -n "$pkg_repository_netbeans_scalar_value" ] || return 1

  pkg_repository_netbeans_scalar_cr="$(printf '\r')"
  case "$pkg_repository_netbeans_scalar_value" in
    *"$pkg_repository_netbeans_scalar_cr"*) return 1;;
  esac

  pkg_repository_netbeans_scalar_actual="$(command -p -- wc -c < "$pkg_repository_netbeans_scalar_file")" || return 1
  pkg_repository_netbeans_scalar_expected="$(printf '%s\n' "$pkg_repository_netbeans_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_repository_netbeans_scalar_actual" = "$pkg_repository_netbeans_scalar_expected" ] || return 1

  printf -- '%s\n' "$pkg_repository_netbeans_scalar_value"
}

_pkg_repository_netbeans_validate_version()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    ''|[!A-Za-z0-9]*|*[!A-Za-z0-9._+~-]*) return 1;;
  esac
}

_pkg_repository_netbeans_validate_repository()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_netbeans_repository_dir="$1"

  [ -d "$pkg_repository_netbeans_repository_dir" ] && [ ! -L "$pkg_repository_netbeans_repository_dir" ] || return 1

  for pkg_repository_netbeans_repository_item in \
    "$pkg_repository_netbeans_repository_dir"/* \
    "$pkg_repository_netbeans_repository_dir"/.[!.]* \
    "$pkg_repository_netbeans_repository_dir"/..?*
  do
    [ -e "$pkg_repository_netbeans_repository_item" ] || [ -L "$pkg_repository_netbeans_repository_item" ] || continue
    pkg_repository_netbeans_repository_name="${pkg_repository_netbeans_repository_item##*/}"
    case "$pkg_repository_netbeans_repository_name" in
      type|owner|repository) :;;
      *) return 1;;
    esac
  done

  pkg_repository_netbeans_type="$(_pkg_repository_netbeans_scalar "$pkg_repository_netbeans_repository_dir/type")" || return 1
  pkg_repository_netbeans_owner="$(_pkg_repository_netbeans_scalar "$pkg_repository_netbeans_repository_dir/owner")" || return 1
  pkg_repository_netbeans_repository="$(_pkg_repository_netbeans_scalar "$pkg_repository_netbeans_repository_dir/repository")" || return 1

  [ "$pkg_repository_netbeans_type" = netbeans ] || return 1
  [ "$pkg_repository_netbeans_owner" = apache ] || return 1
  [ "$pkg_repository_netbeans_repository" = netbeans ] || return 1
}

_pkg_repository_netbeans_github_get()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    /*) :;;
    *) return 2;;
  esac

  http-fetch \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2026-03-10' \
    -- "https://api.github.com/repos/$pkg_repository_netbeans_owner/$pkg_repository_netbeans_repository$1"
}

_pkg_repository_netbeans_validate_release_tokens()
{
  [ "$#" -ge 4 ] && [ "$#" -le 5 ] || return 2

  case "$1" in
    s:*) pkg_repository_netbeans_release_tag=${1#s:};;
    *) return 1;;
  esac
  [ "$2" = b:false ] || return 1
  [ "$3" = b:false ] || return 1
  case "$4" in
    s:*) pkg_repository_netbeans_release_created=${4#s:};;
    *) return 1;;
  esac

  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_release_tag" || return 1
  LC_ALL=C command -p -- awk -v value="$pkg_repository_netbeans_release_created" '
BEGIN {
  if (value ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z$/) exit 0
  exit 1
}
' || return 1

  if [ "$#" -eq 5 ]
  then
    case "$5" in
      s:*) pkg_repository_netbeans_release_published=${5#s:};;
      *) return 1;;
    esac
    LC_ALL=C command -p -- awk -v value="$pkg_repository_netbeans_release_published" '
BEGIN {
  if (value ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z$/) exit 0
  exit 1
}
' || return 1
  fi
}

_pkg_repository_netbeans_release_order_key()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_netbeans_validate_repository "$1" || return 1
  pkg_repository_netbeans_requested="$2"
  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_requested" || return 1

  pkg_repository_netbeans_body="$(_pkg_repository_netbeans_github_get "/releases/tags/$pkg_repository_netbeans_requested")" || return 1
  json_object_read \
    tag_name pkg_repository_netbeans_tag_token \
    draft pkg_repository_netbeans_draft_token \
    prerelease pkg_repository_netbeans_prerelease_token \
    created_at pkg_repository_netbeans_created_token \
    published_at pkg_repository_netbeans_published_token <<EOF_JSON
$pkg_repository_netbeans_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_netbeans_validate_release_tokens \
    "$pkg_repository_netbeans_tag_token" \
    "$pkg_repository_netbeans_draft_token" \
    "$pkg_repository_netbeans_prerelease_token" \
    "$pkg_repository_netbeans_created_token" \
    "$pkg_repository_netbeans_published_token" || return 1
  [ "$pkg_repository_netbeans_release_tag" = "$pkg_repository_netbeans_requested" ] || return 1

  printf -- '%s\t%s\n' "$pkg_repository_netbeans_release_created" "$pkg_repository_netbeans_release_published"
)

_pkg_repository_netbeans_validate_exact_release()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_netbeans_validate_repository "$1" || return 1
  pkg_repository_netbeans_requested="$2"
  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_requested" || return 1

  pkg_repository_netbeans_body="$(_pkg_repository_netbeans_github_get "/releases/tags/$pkg_repository_netbeans_requested")" || return 1
  json_object_read \
    tag_name pkg_repository_netbeans_tag_token \
    draft pkg_repository_netbeans_draft_token \
    prerelease pkg_repository_netbeans_prerelease_token \
    created_at pkg_repository_netbeans_created_token <<EOF_JSON
$pkg_repository_netbeans_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_netbeans_validate_release_tokens \
    "$pkg_repository_netbeans_tag_token" \
    "$pkg_repository_netbeans_draft_token" \
    "$pkg_repository_netbeans_prerelease_token" \
    "$pkg_repository_netbeans_created_token" || return 1
  [ "$pkg_repository_netbeans_release_tag" = "$pkg_repository_netbeans_requested" ] || return 1
)

pkg_repository_list_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_netbeans_validate_repository "$1" || return 1

  pkg_repository_netbeans_page=1
  pkg_repository_netbeans_versions=
  pkg_repository_netbeans_lf='
'
  pkg_repository_netbeans_tab="$(printf '\t')"

  while :
  do
    pkg_repository_netbeans_body="$(_pkg_repository_netbeans_github_get "/releases?per_page=100&page=$pkg_repository_netbeans_page")" || return 1
    pkg_repository_netbeans_records="$(printf '%s\n' "$pkg_repository_netbeans_body" | json_array_object_fields tag_name draft prerelease created_at published_at)" || return 1

    pkg_repository_netbeans_count=0
    if [ -n "$pkg_repository_netbeans_records" ]
    then
      while IFS="$pkg_repository_netbeans_tab" read -r \
        pkg_repository_netbeans_tag_token \
        pkg_repository_netbeans_draft_token \
        pkg_repository_netbeans_prerelease_token \
        pkg_repository_netbeans_created_token \
        pkg_repository_netbeans_published_token \
        pkg_repository_netbeans_extra
      do
        [ -z "$pkg_repository_netbeans_extra" ] || return 1
        pkg_repository_netbeans_count=$((pkg_repository_netbeans_count + 1))

        case "$pkg_repository_netbeans_draft_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac
        case "$pkg_repository_netbeans_prerelease_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac

        _pkg_repository_netbeans_validate_release_tokens \
          "$pkg_repository_netbeans_tag_token" \
          "$pkg_repository_netbeans_draft_token" \
          "$pkg_repository_netbeans_prerelease_token" \
          "$pkg_repository_netbeans_created_token" \
          "$pkg_repository_netbeans_published_token" || return 1

        pkg_repository_netbeans_record="$pkg_repository_netbeans_release_created$pkg_repository_netbeans_tab$pkg_repository_netbeans_release_published$pkg_repository_netbeans_tab$pkg_repository_netbeans_release_tag"
        if [ -n "$pkg_repository_netbeans_versions" ]
        then
          pkg_repository_netbeans_versions="$pkg_repository_netbeans_versions$pkg_repository_netbeans_lf$pkg_repository_netbeans_record"
        else
          pkg_repository_netbeans_versions="$pkg_repository_netbeans_record"
        fi
      done <<EOF_RECORDS
$pkg_repository_netbeans_records
EOF_RECORDS
    fi

    [ "$pkg_repository_netbeans_count" -ge 100 ] || break
    pkg_repository_netbeans_page=$((pkg_repository_netbeans_page + 1))
  done

  [ -n "$pkg_repository_netbeans_versions" ] || return 0

  printf '%s\n' "$pkg_repository_netbeans_versions" | \
    LC_ALL=C command -p -- sort | \
    LC_ALL=C command -p -- awk -F "$pkg_repository_netbeans_tab" '
NF != 3 { exit 1 }
{
  if (previous_created != "" && $1 == previous_created && $2 == previous_published) exit 1
  if (seen[$3]) exit 1
  seen[$3]=1
  previous_created=$1
  previous_published=$2
  print $3
}
'
)

pkg_repository_compare_versions()
(
  [ "$#" -eq 3 ] || return 2
  pkg_repository_netbeans_repository_dir="$1"
  pkg_repository_netbeans_left="$2"
  pkg_repository_netbeans_right="$3"

  _pkg_repository_netbeans_validate_repository "$pkg_repository_netbeans_repository_dir" || return 1
  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_left" || return 1
  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_right" || return 1

  if [ "$pkg_repository_netbeans_left" = "$pkg_repository_netbeans_right" ]
  then
    printf -- '0\n'
    return 0
  fi

  pkg_repository_netbeans_left_key="$(_pkg_repository_netbeans_release_order_key "$pkg_repository_netbeans_repository_dir" "$pkg_repository_netbeans_left")" || return 1

  pkg_repository_netbeans_right_key="$(_pkg_repository_netbeans_release_order_key "$pkg_repository_netbeans_repository_dir" "$pkg_repository_netbeans_right")" || return 1
  pkg_repository_netbeans_order="$(LC_ALL=C command -p -- awk -v left="$pkg_repository_netbeans_left_key" -v right="$pkg_repository_netbeans_right_key" 'BEGIN {
  if (left < right) print "-1"
  else if (left > right) print "1"
  else exit 1
}')" || return 1

  case "$pkg_repository_netbeans_order" in
    -1|1) printf -- '%s\n' "$pkg_repository_netbeans_order";;
    *) return 1;;
  esac
)

pkg_repository_resolve_version()
(
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || return 2
  _pkg_repository_netbeans_validate_repository "$1" || return 1

  if [ "$#" -eq 1 ]
  then
    pkg_repository_netbeans_path=/releases/latest
    pkg_repository_netbeans_requested=
  else
    pkg_repository_netbeans_requested="$2"
    _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_requested" || return 1
    pkg_repository_netbeans_path="/releases/tags/$pkg_repository_netbeans_requested"
  fi

  pkg_repository_netbeans_body="$(_pkg_repository_netbeans_github_get "$pkg_repository_netbeans_path")" || return 1
  json_object_read \
    tag_name pkg_repository_netbeans_tag_token \
    draft pkg_repository_netbeans_draft_token \
    prerelease pkg_repository_netbeans_prerelease_token \
    created_at pkg_repository_netbeans_created_token <<EOF_JSON
$pkg_repository_netbeans_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_netbeans_validate_release_tokens \
    "$pkg_repository_netbeans_tag_token" \
    "$pkg_repository_netbeans_draft_token" \
    "$pkg_repository_netbeans_prerelease_token" \
    "$pkg_repository_netbeans_created_token" || return 1

  if [ -n "$pkg_repository_netbeans_requested" ]
  then
    [ "$pkg_repository_netbeans_release_tag" = "$pkg_repository_netbeans_requested" ] || return 1
  fi

  printf -- '%s\n' "$pkg_repository_netbeans_release_tag"
)

pkg_repository_resolve_artifact()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_netbeans_validate_repository "$1" || return 1
  pkg_repository_netbeans_range_dir="$2"
  pkg_repository_netbeans_requested="$3"

  _pkg_repository_netbeans_validate_version "$pkg_repository_netbeans_requested" || return 1
  [ -d "$pkg_repository_netbeans_range_dir" ] && [ ! -L "$pkg_repository_netbeans_range_dir" ] || return 1
  _pkg_repository_netbeans_validate_exact_release "$1" "$pkg_repository_netbeans_requested" || return 1

  pkg_repository_netbeans_archive_regex="$(_pkg_repository_netbeans_scalar "$pkg_repository_netbeans_range_dir/archive_regex")" || return 1
  LC_ALL=C command -p -- awk -v expression="$pkg_repository_netbeans_archive_regex" 'BEGIN { value=""; value ~ expression; exit 0 }' || return 1

  if [ -e "$pkg_repository_netbeans_range_dir/digest_regex" ] || [ -L "$pkg_repository_netbeans_range_dir/digest_regex" ]
  then
    return 1
  fi

  pkg_repository_netbeans_digest_type="$(_pkg_repository_netbeans_scalar "$pkg_repository_netbeans_range_dir/digest_type")" || return 1
  [ "$pkg_repository_netbeans_digest_type" = sha512 ] || return 1

  pkg_repository_netbeans_name="netbeans-$pkg_repository_netbeans_requested-bin.zip"
  LC_ALL=C command -p -- awk \
    -v value="$pkg_repository_netbeans_name" \
    -v expression="$pkg_repository_netbeans_archive_regex" \
    'BEGIN { exit(value ~ expression ? 0 : 1) }' || return 1

  pkg_repository_netbeans_url="https://dlcdn.apache.org/netbeans/netbeans/$pkg_repository_netbeans_requested/$pkg_repository_netbeans_name"
  pkg_repository_netbeans_sidecar="$(http-fetch -- "$pkg_repository_netbeans_url.sha512")" || return 1
  pkg_repository_netbeans_digest="$(printf '%s\n' "$pkg_repository_netbeans_sidecar" | \
    LC_ALL=C command -p -- awk -v expected="$pkg_repository_netbeans_name" '
function fail() { exit 1 }
NF == 0 { next }
{
  if (NF != 2) fail()
  digest=$1
  name=$2
  if (name == "./" expected) name=expected
  if (name != expected) fail()
  if (length(digest) != 128 || digest !~ /^[0-9A-Fa-f]+$/) fail()
  count++
  selected=digest
}
END {
  if (count != 1) exit 1
  print selected
}
')" || return 1
  pkg_repository_netbeans_digest="$(printf '%s\n' "$pkg_repository_netbeans_digest" | command -p -- tr 'A-F' 'a-f')" || return 1

  pkg_repository_netbeans_size="$(http-fetch -l -- "$pkg_repository_netbeans_url")" || return 1
  case "$pkg_repository_netbeans_size" in
    ''|*[!0-9]*|0[0-9]*) return 1;;
  esac

  printf -- 'name=%s\n' "$pkg_repository_netbeans_name"
  printf -- 'url=%s\n' "$pkg_repository_netbeans_url"
  printf -- 'size=%s\n' "$pkg_repository_netbeans_size"
  printf -- 'digest=sha512:%s\n' "$pkg_repository_netbeans_digest"
)
