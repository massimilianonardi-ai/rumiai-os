. "$m_LIB_DIR/sys/sh/json.lib.sh"

_pkg_repository_nodejs_scalar()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_nodejs_scalar_file="$1"

  [ -f "$pkg_repository_nodejs_scalar_file" ] && \
  [ ! -L "$pkg_repository_nodejs_scalar_file" ] && \
  [ ! -x "$pkg_repository_nodejs_scalar_file" ] || return 1

  pkg_repository_nodejs_scalar_value=
  pkg_repository_nodejs_scalar_extra=
  {
    IFS= read -r pkg_repository_nodejs_scalar_value || return 1
    IFS= read -r pkg_repository_nodejs_scalar_extra
    pkg_repository_nodejs_scalar_second_status=$?
  } < "$pkg_repository_nodejs_scalar_file"

  [ "$pkg_repository_nodejs_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_repository_nodejs_scalar_extra" ] || return 1
  [ -n "$pkg_repository_nodejs_scalar_value" ] || return 1

  pkg_repository_nodejs_scalar_cr="$(printf '\r')"
  case "$pkg_repository_nodejs_scalar_value" in
    *"$pkg_repository_nodejs_scalar_cr"*) return 1;;
  esac

  pkg_repository_nodejs_scalar_actual="$(command -p -- wc -c < "$pkg_repository_nodejs_scalar_file")" || return 1
  pkg_repository_nodejs_scalar_expected="$(printf '%s\n' "$pkg_repository_nodejs_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_repository_nodejs_scalar_actual" = "$pkg_repository_nodejs_scalar_expected" ] || return 1

  printf -- '%s\n' "$pkg_repository_nodejs_scalar_value"
}

_pkg_repository_nodejs_validate_version()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    ''|[!A-Za-z0-9]*|*[!A-Za-z0-9._+~-]*) return 1;;
  esac
}

_pkg_repository_nodejs_validate_repository()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_nodejs_repository_dir="$1"

  [ -d "$pkg_repository_nodejs_repository_dir" ] && [ ! -L "$pkg_repository_nodejs_repository_dir" ] || return 1

  for pkg_repository_nodejs_repository_item in \
    "$pkg_repository_nodejs_repository_dir"/* \
    "$pkg_repository_nodejs_repository_dir"/.[!.]* \
    "$pkg_repository_nodejs_repository_dir"/..?*
  do
    [ -e "$pkg_repository_nodejs_repository_item" ] || [ -L "$pkg_repository_nodejs_repository_item" ] || continue
    pkg_repository_nodejs_repository_name="${pkg_repository_nodejs_repository_item##*/}"
    case "$pkg_repository_nodejs_repository_name" in
      type|owner|repository) :;;
      *) return 1;;
    esac
  done

  pkg_repository_nodejs_type="$(_pkg_repository_nodejs_scalar "$pkg_repository_nodejs_repository_dir/type")" || return 1
  pkg_repository_nodejs_owner="$(_pkg_repository_nodejs_scalar "$pkg_repository_nodejs_repository_dir/owner")" || return 1
  pkg_repository_nodejs_repository="$(_pkg_repository_nodejs_scalar "$pkg_repository_nodejs_repository_dir/repository")" || return 1

  [ "$pkg_repository_nodejs_type" = nodejs ] || return 1
  [ "$pkg_repository_nodejs_owner" = nodejs ] || return 1
  [ "$pkg_repository_nodejs_repository" = node ] || return 1
}

_pkg_repository_nodejs_github_get()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    /*) :;;
    *) return 2;;
  esac

  http-fetch \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2026-03-10' \
    -- "https://api.github.com/repos/$pkg_repository_nodejs_owner/$pkg_repository_nodejs_repository$1"
}

_pkg_repository_nodejs_dist_get()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    /*) :;;
    *) return 2;;
  esac

  http-fetch -- "https://nodejs.org/dist$1"
}

_pkg_repository_nodejs_validate_release_tokens()
{
  [ "$#" -ge 4 ] && [ "$#" -le 5 ] || return 2

  case "$1" in
    s:*) pkg_repository_nodejs_release_tag=${1#s:};;
    *) return 1;;
  esac
  [ "$2" = b:false ] || return 1
  [ "$3" = b:false ] || return 1
  case "$4" in
    s:*) pkg_repository_nodejs_release_created=${4#s:};;
    *) return 1;;
  esac

  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_release_tag" || return 1
  LC_ALL=C command -p -- awk -v value="$pkg_repository_nodejs_release_created" '
BEGIN {
  if (value ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z$/) exit 0
  exit 1
}
' || return 1

  if [ "$#" -eq 5 ]
  then
    case "$5" in
      s:*) pkg_repository_nodejs_release_published=${5#s:};;
      *) return 1;;
    esac
    LC_ALL=C command -p -- awk -v value="$pkg_repository_nodejs_release_published" '
BEGIN {
  if (value ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z$/) exit 0
  exit 1
}
' || return 1
  fi
}

_pkg_repository_nodejs_release_order_key()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_nodejs_validate_repository "$1" || return 1
  pkg_repository_nodejs_requested="$2"
  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_requested" || return 1

  pkg_repository_nodejs_body="$(_pkg_repository_nodejs_github_get "/releases/tags/$pkg_repository_nodejs_requested")" || return 1
  json_object_read \
    tag_name pkg_repository_nodejs_tag_token \
    draft pkg_repository_nodejs_draft_token \
    prerelease pkg_repository_nodejs_prerelease_token \
    created_at pkg_repository_nodejs_created_token \
    published_at pkg_repository_nodejs_published_token <<EOF_JSON
$pkg_repository_nodejs_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_nodejs_validate_release_tokens \
    "$pkg_repository_nodejs_tag_token" \
    "$pkg_repository_nodejs_draft_token" \
    "$pkg_repository_nodejs_prerelease_token" \
    "$pkg_repository_nodejs_created_token" \
    "$pkg_repository_nodejs_published_token" || return 1
  [ "$pkg_repository_nodejs_release_tag" = "$pkg_repository_nodejs_requested" ] || return 1

  printf -- '%s\t%s\n' "$pkg_repository_nodejs_release_created" "$pkg_repository_nodejs_release_published"
)

_pkg_repository_nodejs_validate_exact_release()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_nodejs_validate_repository "$1" || return 1
  pkg_repository_nodejs_requested="$2"
  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_requested" || return 1

  pkg_repository_nodejs_body="$(_pkg_repository_nodejs_github_get "/releases/tags/$pkg_repository_nodejs_requested")" || return 1
  json_object_read \
    tag_name pkg_repository_nodejs_tag_token \
    draft pkg_repository_nodejs_draft_token \
    prerelease pkg_repository_nodejs_prerelease_token \
    created_at pkg_repository_nodejs_created_token <<EOF_JSON
$pkg_repository_nodejs_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_nodejs_validate_release_tokens \
    "$pkg_repository_nodejs_tag_token" \
    "$pkg_repository_nodejs_draft_token" \
    "$pkg_repository_nodejs_prerelease_token" \
    "$pkg_repository_nodejs_created_token" || return 1
  [ "$pkg_repository_nodejs_release_tag" = "$pkg_repository_nodejs_requested" ] || return 1
)

pkg_repository_list_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_nodejs_validate_repository "$1" || return 1

  pkg_repository_nodejs_page=1
  pkg_repository_nodejs_versions=
  pkg_repository_nodejs_lf='
'
  pkg_repository_nodejs_tab="$(printf '\t')"

  while :
  do
    pkg_repository_nodejs_body="$(_pkg_repository_nodejs_github_get "/releases?per_page=100&page=$pkg_repository_nodejs_page")" || return 1
    pkg_repository_nodejs_records="$(printf '%s\n' "$pkg_repository_nodejs_body" | json_array_object_fields tag_name draft prerelease created_at published_at)" || return 1

    pkg_repository_nodejs_count=0
    if [ -n "$pkg_repository_nodejs_records" ]
    then
      while IFS="$pkg_repository_nodejs_tab" read -r \
        pkg_repository_nodejs_tag_token \
        pkg_repository_nodejs_draft_token \
        pkg_repository_nodejs_prerelease_token \
        pkg_repository_nodejs_created_token \
        pkg_repository_nodejs_published_token \
        pkg_repository_nodejs_extra
      do
        [ -z "$pkg_repository_nodejs_extra" ] || return 1
        pkg_repository_nodejs_count=$((pkg_repository_nodejs_count + 1))

        case "$pkg_repository_nodejs_draft_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac
        case "$pkg_repository_nodejs_prerelease_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac

        _pkg_repository_nodejs_validate_release_tokens \
          "$pkg_repository_nodejs_tag_token" \
          "$pkg_repository_nodejs_draft_token" \
          "$pkg_repository_nodejs_prerelease_token" \
          "$pkg_repository_nodejs_created_token" \
          "$pkg_repository_nodejs_published_token" || return 1

        pkg_repository_nodejs_record="$pkg_repository_nodejs_release_created$pkg_repository_nodejs_tab$pkg_repository_nodejs_release_published$pkg_repository_nodejs_tab$pkg_repository_nodejs_release_tag"
        if [ -n "$pkg_repository_nodejs_versions" ]
        then
          pkg_repository_nodejs_versions="$pkg_repository_nodejs_versions$pkg_repository_nodejs_lf$pkg_repository_nodejs_record"
        else
          pkg_repository_nodejs_versions="$pkg_repository_nodejs_record"
        fi
      done <<EOF_RECORDS
$pkg_repository_nodejs_records
EOF_RECORDS
    fi

    [ "$pkg_repository_nodejs_count" -ge 100 ] || break
    pkg_repository_nodejs_page=$((pkg_repository_nodejs_page + 1))
  done

  [ -n "$pkg_repository_nodejs_versions" ] || return 0

  printf '%s\n' "$pkg_repository_nodejs_versions" | \
    LC_ALL=C command -p -- sort | \
    LC_ALL=C command -p -- awk -F "$pkg_repository_nodejs_tab" '
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
  pkg_repository_nodejs_repository_dir="$1"
  pkg_repository_nodejs_left="$2"
  pkg_repository_nodejs_right="$3"

  _pkg_repository_nodejs_validate_repository "$pkg_repository_nodejs_repository_dir" || return 1
  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_left" || return 1
  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_right" || return 1

  pkg_repository_nodejs_left_key="$(_pkg_repository_nodejs_release_order_key "$pkg_repository_nodejs_repository_dir" "$pkg_repository_nodejs_left")" || return 1
  if [ "$pkg_repository_nodejs_left" = "$pkg_repository_nodejs_right" ]
  then
    printf -- '0\n'
    return 0
  fi

  pkg_repository_nodejs_right_key="$(_pkg_repository_nodejs_release_order_key "$pkg_repository_nodejs_repository_dir" "$pkg_repository_nodejs_right")" || return 1
  pkg_repository_nodejs_order="$(LC_ALL=C command -p -- awk -v left="$pkg_repository_nodejs_left_key" -v right="$pkg_repository_nodejs_right_key" 'BEGIN {
  if (left < right) print "-1"
  else if (left > right) print "1"
  else exit 1
}')" || return 1

  case "$pkg_repository_nodejs_order" in
    -1|1) printf -- '%s\n' "$pkg_repository_nodejs_order";;
    *) return 1;;
  esac
)

pkg_repository_resolve_version()
(
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || return 2
  _pkg_repository_nodejs_validate_repository "$1" || return 1

  if [ "$#" -eq 1 ]
  then
    pkg_repository_nodejs_path=/releases/latest
    pkg_repository_nodejs_requested=
  else
    pkg_repository_nodejs_requested="$2"
    _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_requested" || return 1
    pkg_repository_nodejs_path="/releases/tags/$pkg_repository_nodejs_requested"
  fi

  pkg_repository_nodejs_body="$(_pkg_repository_nodejs_github_get "$pkg_repository_nodejs_path")" || return 1
  json_object_read \
    tag_name pkg_repository_nodejs_tag_token \
    draft pkg_repository_nodejs_draft_token \
    prerelease pkg_repository_nodejs_prerelease_token \
    created_at pkg_repository_nodejs_created_token <<EOF_JSON
$pkg_repository_nodejs_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  _pkg_repository_nodejs_validate_release_tokens \
    "$pkg_repository_nodejs_tag_token" \
    "$pkg_repository_nodejs_draft_token" \
    "$pkg_repository_nodejs_prerelease_token" \
    "$pkg_repository_nodejs_created_token" || return 1

  if [ -n "$pkg_repository_nodejs_requested" ]
  then
    [ "$pkg_repository_nodejs_release_tag" = "$pkg_repository_nodejs_requested" ] || return 1
  fi

  printf -- '%s\n' "$pkg_repository_nodejs_release_tag"
)

pkg_repository_resolve_artifact()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_nodejs_validate_repository "$1" || return 1
  pkg_repository_nodejs_range_dir="$2"
  pkg_repository_nodejs_requested="$3"

  _pkg_repository_nodejs_validate_version "$pkg_repository_nodejs_requested" || return 1
  [ -d "$pkg_repository_nodejs_range_dir" ] && [ ! -L "$pkg_repository_nodejs_range_dir" ] || return 1
  _pkg_repository_nodejs_validate_exact_release "$1" "$pkg_repository_nodejs_requested" || return 1

  pkg_repository_nodejs_archive_regex="$(_pkg_repository_nodejs_scalar "$pkg_repository_nodejs_range_dir/archive_regex")" || return 1
  LC_ALL=C command -p -- awk -v expression="$pkg_repository_nodejs_archive_regex" 'BEGIN { value=""; value ~ expression; exit 0 }' || return 1

  if [ -e "$pkg_repository_nodejs_range_dir/digest_regex" ] || [ -L "$pkg_repository_nodejs_range_dir/digest_regex" ]
  then
    return 1
  fi

  pkg_repository_nodejs_digest_type="$(_pkg_repository_nodejs_scalar "$pkg_repository_nodejs_range_dir/digest_type")" || return 1
  [ "$pkg_repository_nodejs_digest_type" = sha256 ] || return 1

  pkg_repository_nodejs_shasums="$(_pkg_repository_nodejs_dist_get "/$pkg_repository_nodejs_requested/SHASUMS256.txt")" || return 1
  pkg_repository_nodejs_selected="$(printf '%s\n' "$pkg_repository_nodejs_shasums" | \
    LC_ALL=C command -p -- awk -v expression="$pkg_repository_nodejs_archive_regex" '
function fail() { exit 1 }
{
  if (NF != 2) fail()
  digest=$1
  name=$2
  if (name ~ expression) {
    count++
    selected_digest=digest
    selected_name=name
  }
}
END {
  if (count != 1) exit 1
  print selected_digest "\t" selected_name
}
')" || return 1

  pkg_repository_nodejs_tab="$(printf '\t')"
  IFS="$pkg_repository_nodejs_tab" read -r \
    pkg_repository_nodejs_digest \
    pkg_repository_nodejs_name \
    pkg_repository_nodejs_extra <<EOF_SELECTED
$pkg_repository_nodejs_selected
EOF_SELECTED
  [ -z "$pkg_repository_nodejs_extra" ] || return 1
  [ -n "$pkg_repository_nodejs_name" ] || return 1
  case "$pkg_repository_nodejs_name" in
    */*|.|..) return 1;;
  esac
  [ "${#pkg_repository_nodejs_digest}" -eq 64 ] || return 1
  case "$pkg_repository_nodejs_digest" in
    *[!0-9A-Fa-f]*) return 1;;
  esac
  pkg_repository_nodejs_digest="$(printf '%s\n' "$pkg_repository_nodejs_digest" | command -p -- tr 'A-F' 'a-f')" || return 1

  pkg_repository_nodejs_listing="$(_pkg_repository_nodejs_dist_get "/$pkg_repository_nodejs_requested/")" || return 1
  pkg_repository_nodejs_size="$(printf '%s\n' "$pkg_repository_nodejs_listing" | \
    LC_ALL=C command -p -- awk -v name="$pkg_repository_nodejs_name" '
index($0, "href=\"" name "\"") {
  count++
  for (i=NF; i>=1; i--) {
    if ($i ~ /^[0-9]+$/) {
      size=$i
      break
    }
  }
}
END {
  if (count != 1 || size !~ /^[0-9]+$/) exit 1
  print size
}
')" || return 1
  case "$pkg_repository_nodejs_size" in
    ''|*[!0-9]*) return 1;;
  esac

  pkg_repository_nodejs_url="https://nodejs.org/dist/$pkg_repository_nodejs_requested/$pkg_repository_nodejs_name"
  printf -- 'name=%s\n' "$pkg_repository_nodejs_name"
  printf -- 'url=%s\n' "$pkg_repository_nodejs_url"
  printf -- 'size=%s\n' "$pkg_repository_nodejs_size"
  printf -- 'digest=sha256:%s\n' "$pkg_repository_nodejs_digest"
)
