loadsyslib "json"

_pkg_repository_graalvm_scalar()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_graalvm_scalar_file="$1"

  [ -f "$pkg_repository_graalvm_scalar_file" ] && \
  [ ! -L "$pkg_repository_graalvm_scalar_file" ] && \
  [ ! -x "$pkg_repository_graalvm_scalar_file" ] || return 1

  pkg_repository_graalvm_scalar_value=
  pkg_repository_graalvm_scalar_extra=
  {
    IFS= read -r pkg_repository_graalvm_scalar_value || return 1
    IFS= read -r pkg_repository_graalvm_scalar_extra
    pkg_repository_graalvm_scalar_second_status=$?
  } < "$pkg_repository_graalvm_scalar_file"

  [ "$pkg_repository_graalvm_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_repository_graalvm_scalar_extra" ] || return 1
  [ -n "$pkg_repository_graalvm_scalar_value" ] || return 1

  pkg_repository_graalvm_scalar_cr="$(printf '\r')"
  case "$pkg_repository_graalvm_scalar_value" in
    *"$pkg_repository_graalvm_scalar_cr"*) return 1;;
  esac

  pkg_repository_graalvm_scalar_actual="$(command -p -- wc -c < "$pkg_repository_graalvm_scalar_file")" || return 1
  pkg_repository_graalvm_scalar_expected="$(printf '%s\n' "$pkg_repository_graalvm_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_repository_graalvm_scalar_actual" = "$pkg_repository_graalvm_scalar_expected" ] || return 1

  printf -- '%s\n' "$pkg_repository_graalvm_scalar_value"
}

_pkg_repository_graalvm_validate_version()
{
  [ "$#" -eq 1 ] || return 2
  LC_ALL=C command -p -- awk -v value="$1" 'BEGIN {
    if (value ~ /^25[.][0-9]+([.][0-9]+)*$/) exit 0
    exit 1
  }'
}

_pkg_repository_graalvm_validate_repository()
{
  [ "$#" -eq 1 ] || return 2
  pkg_repository_graalvm_repository_dir="$1"

  [ -d "$pkg_repository_graalvm_repository_dir" ] && [ ! -L "$pkg_repository_graalvm_repository_dir" ] || return 1

  for pkg_repository_graalvm_repository_item in \
    "$pkg_repository_graalvm_repository_dir"/* \
    "$pkg_repository_graalvm_repository_dir"/.[!.]* \
    "$pkg_repository_graalvm_repository_dir"/..?*
  do
    [ -e "$pkg_repository_graalvm_repository_item" ] || [ -L "$pkg_repository_graalvm_repository_item" ] || continue
    pkg_repository_graalvm_repository_name="${pkg_repository_graalvm_repository_item##*/}"
    case "$pkg_repository_graalvm_repository_name" in
      type|owner|repository) :;;
      *) return 1;;
    esac
  done

  pkg_repository_graalvm_type="$(_pkg_repository_graalvm_scalar "$pkg_repository_graalvm_repository_dir/type")" || return 1
  pkg_repository_graalvm_owner="$(_pkg_repository_graalvm_scalar "$pkg_repository_graalvm_repository_dir/owner")" || return 1
  pkg_repository_graalvm_repository="$(_pkg_repository_graalvm_scalar "$pkg_repository_graalvm_repository_dir/repository")" || return 1

  [ "$pkg_repository_graalvm_type" = "graalvm" ] || return 1
  [ "$pkg_repository_graalvm_owner" = "graalvm" ] || return 1
  [ "$pkg_repository_graalvm_repository" = "graalvm-ce-builds" ] || return 1
}

_pkg_repository_graalvm_github_get()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    /*) :;;
    *) return 2;;
  esac

  http-fetch \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2026-03-10' \
    -- "https://api.github.com/repos/$pkg_repository_graalvm_owner/$pkg_repository_graalvm_repository$1"
}

_pkg_repository_graalvm_validate_timestamp()
{
  [ "$#" -eq 1 ] || return 2
  LC_ALL=C command -p -- awk -v value="$1" 'BEGIN {
    if (value ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z$/) exit 0
    exit 1
  }'
}

_pkg_repository_graalvm_tag_to_version()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    graal-*) pkg_repository_graalvm_mapped="${1#graal-}";;
    *) return 1;;
  esac
  _pkg_repository_graalvm_validate_version "$pkg_repository_graalvm_mapped" || return 1
  printf -- '%s\n' "$pkg_repository_graalvm_mapped"
}

_pkg_repository_graalvm_release_order_key()
(
  [ "$#" -eq 2 ] || return 2
  _pkg_repository_graalvm_validate_repository "$1" || return 1
  pkg_repository_graalvm_requested="$2"
  _pkg_repository_graalvm_validate_version "$pkg_repository_graalvm_requested" || return 1
  pkg_repository_graalvm_upstream="graal-$pkg_repository_graalvm_requested"

  pkg_repository_graalvm_body="$(_pkg_repository_graalvm_github_get "/releases/tags/$pkg_repository_graalvm_upstream")" || return 1
  json_object_read \
    tag_name pkg_repository_graalvm_tag_token \
    draft pkg_repository_graalvm_draft_token \
    prerelease pkg_repository_graalvm_prerelease_token \
    created_at pkg_repository_graalvm_created_token \
    published_at pkg_repository_graalvm_published_token <<EOF_JSON
$pkg_repository_graalvm_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  case "$pkg_repository_graalvm_tag_token" in
    s:*) pkg_repository_graalvm_release_tag="${pkg_repository_graalvm_tag_token#s:}";;
    *) return 1;;
  esac
  [ "$pkg_repository_graalvm_draft_token" = "b:false" ] || return 1
  [ "$pkg_repository_graalvm_prerelease_token" = "b:false" ] || return 1
  case "$pkg_repository_graalvm_created_token" in
    s:*) pkg_repository_graalvm_created="${pkg_repository_graalvm_created_token#s:}";;
    *) return 1;;
  esac
  case "$pkg_repository_graalvm_published_token" in
    s:*) pkg_repository_graalvm_published="${pkg_repository_graalvm_published_token#s:}";;
    *) return 1;;
  esac
  _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_created" || return 1
  _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_published" || return 1
  pkg_repository_graalvm_mapped="$(_pkg_repository_graalvm_tag_to_version "$pkg_repository_graalvm_release_tag")" || return 1
  [ "$pkg_repository_graalvm_mapped" = "$pkg_repository_graalvm_requested" ] || return 1

  printf -- '%s\t%s\n' "$pkg_repository_graalvm_created" "$pkg_repository_graalvm_published"
)

pkg_repository_list_versions()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_repository_graalvm_validate_repository "$1" || return 1

  pkg_repository_graalvm_page=1
  pkg_repository_graalvm_versions=
  pkg_repository_graalvm_lf='
'
  pkg_repository_graalvm_tab="$(printf '\t')"

  while :
  do
    pkg_repository_graalvm_body="$(_pkg_repository_graalvm_github_get "/releases?per_page=100&page=$pkg_repository_graalvm_page")" || return 1
    pkg_repository_graalvm_records="$(printf '%s\n' "$pkg_repository_graalvm_body" | json_array_object_fields tag_name draft prerelease created_at published_at)" || return 1

    pkg_repository_graalvm_count=0
    if [ -n "$pkg_repository_graalvm_records" ]
    then
      while IFS="$pkg_repository_graalvm_tab" read -r \
        pkg_repository_graalvm_tag_token \
        pkg_repository_graalvm_draft_token \
        pkg_repository_graalvm_prerelease_token \
        pkg_repository_graalvm_created_token \
        pkg_repository_graalvm_published_token \
        pkg_repository_graalvm_extra
      do
        [ -z "$pkg_repository_graalvm_extra" ] || return 1
        pkg_repository_graalvm_count=$((pkg_repository_graalvm_count + 1))

        case "$pkg_repository_graalvm_tag_token" in
          s:*) pkg_repository_graalvm_release_tag="${pkg_repository_graalvm_tag_token#s:}";;
          *) return 1;;
        esac
        case "$pkg_repository_graalvm_draft_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac
        case "$pkg_repository_graalvm_prerelease_token" in
          b:true) continue;;
          b:false) :;;
          *) return 1;;
        esac
        case "$pkg_repository_graalvm_release_tag" in
          graal-25.*) :;;
          *) continue;;
        esac

        pkg_repository_graalvm_version="$(_pkg_repository_graalvm_tag_to_version "$pkg_repository_graalvm_release_tag")" || return 1
        case "$pkg_repository_graalvm_created_token" in
          s:*) pkg_repository_graalvm_created="${pkg_repository_graalvm_created_token#s:}";;
          *) return 1;;
        esac
        case "$pkg_repository_graalvm_published_token" in
          s:*) pkg_repository_graalvm_published="${pkg_repository_graalvm_published_token#s:}";;
          *) return 1;;
        esac
        _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_created" || return 1
        _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_published" || return 1

        pkg_repository_graalvm_record="$pkg_repository_graalvm_created$pkg_repository_graalvm_tab$pkg_repository_graalvm_published$pkg_repository_graalvm_tab$pkg_repository_graalvm_version"
        if [ -n "$pkg_repository_graalvm_versions" ]
        then
          pkg_repository_graalvm_versions="$pkg_repository_graalvm_versions$pkg_repository_graalvm_lf$pkg_repository_graalvm_record"
        else
          pkg_repository_graalvm_versions="$pkg_repository_graalvm_record"
        fi
      done <<EOF_RECORDS
$pkg_repository_graalvm_records
EOF_RECORDS
    fi

    [ "$pkg_repository_graalvm_count" -ge 100 ] || break
    pkg_repository_graalvm_page=$((pkg_repository_graalvm_page + 1))
  done

  [ -n "$pkg_repository_graalvm_versions" ] || return 0

  printf '%s\n' "$pkg_repository_graalvm_versions" | \
    LC_ALL=C command -p -- sort | \
    LC_ALL=C command -p -- awk -F "$pkg_repository_graalvm_tab" '
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

pkg_repository_resolve_version()
(
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || return 2
  _pkg_repository_graalvm_validate_repository "$1" || return 1

  if [ "$#" -eq 1 ]
  then
    pkg_repository_graalvm_body="$(_pkg_repository_graalvm_github_get "/releases/latest")" || return 1
    json_object_read \
      tag_name pkg_repository_graalvm_tag_token \
      draft pkg_repository_graalvm_draft_token \
      prerelease pkg_repository_graalvm_prerelease_token \
      created_at pkg_repository_graalvm_created_token \
      published_at pkg_repository_graalvm_published_token <<EOF_JSON
$pkg_repository_graalvm_body
EOF_JSON
    [ "$?" -eq 0 ] || return 1

    case "$pkg_repository_graalvm_tag_token" in
      s:*) pkg_repository_graalvm_release_tag="${pkg_repository_graalvm_tag_token#s:}";;
      *) return 1;;
    esac
    [ "$pkg_repository_graalvm_draft_token" = "b:false" ] || return 1
    [ "$pkg_repository_graalvm_prerelease_token" = "b:false" ] || return 1
    case "$pkg_repository_graalvm_created_token" in
      s:*) pkg_repository_graalvm_created="${pkg_repository_graalvm_created_token#s:}";;
      *) return 1;;
    esac
    case "$pkg_repository_graalvm_published_token" in
      s:*) pkg_repository_graalvm_published="${pkg_repository_graalvm_published_token#s:}";;
      *) return 1;;
    esac
    _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_created" || return 1
    _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_published" || return 1

    case "$pkg_repository_graalvm_release_tag" in
      graal-25.*)
        _pkg_repository_graalvm_tag_to_version "$pkg_repository_graalvm_release_tag"
        return "$?"
        ;;
    esac

    pkg_repository_graalvm_versions="$(pkg_repository_list_versions "$1")" || return 1
    [ -n "$pkg_repository_graalvm_versions" ] || return 1
    printf '%s\n' "$pkg_repository_graalvm_versions" | LC_ALL=C command -p -- awk 'NF { latest=$0 } END { if (latest == "") exit 1; print latest }'
    return "$?"
  fi

  pkg_repository_graalvm_requested="$2"
  _pkg_repository_graalvm_validate_version "$pkg_repository_graalvm_requested" || return 1
  _pkg_repository_graalvm_release_order_key "$1" "$pkg_repository_graalvm_requested" >/dev/null || return 1
  printf -- '%s\n' "$pkg_repository_graalvm_requested"
)

pkg_repository_compare_versions()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_graalvm_validate_repository "$1" || return 1
  _pkg_repository_graalvm_validate_version "$2" || return 1
  _pkg_repository_graalvm_validate_version "$3" || return 1

  if [ "$2" = "$3" ]
  then
    printf -- '0\n'
    return 0
  fi

  pkg_repository_graalvm_left_key="$(_pkg_repository_graalvm_release_order_key "$1" "$2")" || return 1
  pkg_repository_graalvm_right_key="$(_pkg_repository_graalvm_release_order_key "$1" "$3")" || return 1

  pkg_repository_graalvm_order="$(LC_ALL=C command -p -- awk -v left="$pkg_repository_graalvm_left_key" -v right="$pkg_repository_graalvm_right_key" 'BEGIN {
  if (left < right) print "-1"
  else if (left > right) print "1"
  else exit 1
}')" || return 1
  case "$pkg_repository_graalvm_order" in
    -1|1) printf -- '%s\n' "$pkg_repository_graalvm_order";;
    *) return 1;;
  esac
)

pkg_repository_resolve_artifact()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_repository_graalvm_validate_repository "$1" || return 1
  pkg_repository_graalvm_range_dir="$2"
  pkg_repository_graalvm_requested="$3"

  _pkg_repository_graalvm_validate_version "$pkg_repository_graalvm_requested" || return 1
  [ -d "$pkg_repository_graalvm_range_dir" ] && [ ! -L "$pkg_repository_graalvm_range_dir" ] || return 1

  pkg_repository_graalvm_archive_regex="$(_pkg_repository_graalvm_scalar "$pkg_repository_graalvm_range_dir/archive_regex")" || return 1
  LC_ALL=C command -p -- awk -v expression="$pkg_repository_graalvm_archive_regex" 'BEGIN { value=""; value ~ expression; exit 0 }' || return 1

  if [ -e "$pkg_repository_graalvm_range_dir/digest_regex" ] || [ -L "$pkg_repository_graalvm_range_dir/digest_regex" ]
  then
    return 1
  fi
  pkg_repository_graalvm_digest_type="$(_pkg_repository_graalvm_scalar "$pkg_repository_graalvm_range_dir/digest_type")" || return 1
  [ "$pkg_repository_graalvm_digest_type" = "sha256" ] || return 1

  pkg_repository_graalvm_upstream="graal-$pkg_repository_graalvm_requested"
  pkg_repository_graalvm_body="$(_pkg_repository_graalvm_github_get "/releases/tags/$pkg_repository_graalvm_upstream")" || return 1
  json_object_read \
    tag_name pkg_repository_graalvm_tag_token \
    draft pkg_repository_graalvm_draft_token \
    prerelease pkg_repository_graalvm_prerelease_token \
    created_at pkg_repository_graalvm_created_token <<EOF_JSON
$pkg_repository_graalvm_body
EOF_JSON
  [ "$?" -eq 0 ] || return 1

  case "$pkg_repository_graalvm_tag_token" in
    s:*) pkg_repository_graalvm_release_tag="${pkg_repository_graalvm_tag_token#s:}";;
    *) return 1;;
  esac
  [ "$pkg_repository_graalvm_draft_token" = "b:false" ] || return 1
  [ "$pkg_repository_graalvm_prerelease_token" = "b:false" ] || return 1
  case "$pkg_repository_graalvm_created_token" in
    s:*) pkg_repository_graalvm_created="${pkg_repository_graalvm_created_token#s:}";;
    *) return 1;;
  esac
  _pkg_repository_graalvm_validate_timestamp "$pkg_repository_graalvm_created" || return 1
  pkg_repository_graalvm_mapped="$(_pkg_repository_graalvm_tag_to_version "$pkg_repository_graalvm_release_tag")" || return 1
  [ "$pkg_repository_graalvm_mapped" = "$pkg_repository_graalvm_requested" ] || return 1

  pkg_repository_graalvm_assets="$(printf '%s\n' "$pkg_repository_graalvm_body" | json_object_array_object_fields assets name state size digest browser_download_url)" || return 1
  [ -n "$pkg_repository_graalvm_assets" ] || return 1

  pkg_repository_graalvm_tab="$(printf '\t')"
  pkg_repository_graalvm_selected="$(printf '%s\n' "$pkg_repository_graalvm_assets" | \
    LC_ALL=C command -p -- awk -F "$pkg_repository_graalvm_tab" -v expression="$pkg_repository_graalvm_archive_regex" '
function fail() { exit 1 }
{
  if (NF != 5) fail()
  if ($1 !~ /^s:/) fail()
  name=$1
  sub(/^s:/, "", name)
  if (name ~ expression) {
    count++
    selected=$0
  }
}
END {
  if (count != 1) exit 1
  print selected
}
')" || return 1

  IFS="$pkg_repository_graalvm_tab" read -r \
    pkg_repository_graalvm_name_token \
    pkg_repository_graalvm_state_token \
    pkg_repository_graalvm_size_token \
    pkg_repository_graalvm_digest_token \
    pkg_repository_graalvm_url_token \
    pkg_repository_graalvm_extra <<EOF_ASSET
$pkg_repository_graalvm_selected
EOF_ASSET
  [ -z "$pkg_repository_graalvm_extra" ] || return 1

  case "$pkg_repository_graalvm_name_token" in
    s:*) pkg_repository_graalvm_name="${pkg_repository_graalvm_name_token#s:}";;
    *) return 1;;
  esac
  [ -n "$pkg_repository_graalvm_name" ] || return 1
  [ "$pkg_repository_graalvm_state_token" = "s:uploaded" ] || return 1

  case "$pkg_repository_graalvm_size_token" in
    n:*) pkg_repository_graalvm_size="${pkg_repository_graalvm_size_token#n:}";;
    *) return 1;;
  esac
  case "$pkg_repository_graalvm_size" in
    ''|*[!0-9]*) return 1;;
  esac

  case "$pkg_repository_graalvm_digest_token" in
    s:sha256:*) pkg_repository_graalvm_digest="${pkg_repository_graalvm_digest_token#s:sha256:}";;
    *) return 1;;
  esac
  [ "${#pkg_repository_graalvm_digest}" -eq 64 ] || return 1
  case "$pkg_repository_graalvm_digest" in
    *[!0-9A-Fa-f]*) return 1;;
  esac
  pkg_repository_graalvm_digest="$(printf '%s\n' "$pkg_repository_graalvm_digest" | command -p -- tr 'A-F' 'a-f')" || return 1

  case "$pkg_repository_graalvm_url_token" in
    s:https://*) pkg_repository_graalvm_url="${pkg_repository_graalvm_url_token#s:}";;
    *) return 1;;
  esac

  printf -- 'name=%s\n' "$pkg_repository_graalvm_name"
  printf -- 'url=%s\n' "$pkg_repository_graalvm_url"
  printf -- 'size=%s\n' "$pkg_repository_graalvm_size"
  printf -- 'digest=sha256:%s\n' "$pkg_repository_graalvm_digest"
)
