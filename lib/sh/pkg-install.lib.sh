. "$m_LIB_DIR/sh/pkg-download.lib.sh"
. "$m_LIB_DIR/sh/pkg-extract.lib.sh"
. "$m_LIB_DIR/sh/pkg-integration.lib.sh"

_pkg_install_error()
{
  log error execution execution-failed operation pkg-install reason "$1"
}

_pkg_install_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_install_version_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!A-Za-z0-9]* | *[!A-Za-z0-9._+~-]*) return 1 ;;
  esac
}

_pkg_install_osarch_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    linux-arm64 | linux-x86_64 | macos-arm64 | macos-x86_64 | windows-arm64 | windows-x86_64) return 0 ;;
    *) return 1 ;;
  esac
}

_pkg_install_scalar()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_install_scalar_value=
  pkg_install_scalar_extra=
  {
    IFS= read -r pkg_install_scalar_value || return 1
    IFS= read -r pkg_install_scalar_extra
    pkg_install_scalar_second_status=$?
  } < "$1"

  [ "$pkg_install_scalar_second_status" -ne 0 ] || return 1
  [ -z "$pkg_install_scalar_extra" ] || return 1
  [ -n "$pkg_install_scalar_value" ] || return 1

  pkg_install_scalar_cr="$(printf '\r')"
  case "$pkg_install_scalar_value" in
    *"$pkg_install_scalar_cr"*) return 1 ;;
  esac

  pkg_install_scalar_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_install_scalar_expected="$(printf '%s\n' "$pkg_install_scalar_value" | command -p -- wc -c)" || return 1
  [ "$pkg_install_scalar_actual" = "$pkg_install_scalar_expected" ] || return 1

  printf -- '%s\n' "$pkg_install_scalar_value"
}

_pkg_install_operand_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_install_operand=$1
  pkg_install_pkg=
  pkg_install_requested_version=
  pkg_install_requested_osarch=
  pkg_install_left=$pkg_install_operand

  case "$pkg_install_left" in
    *!*)
      pkg_install_requested_osarch=${pkg_install_left##*!}
      pkg_install_left=${pkg_install_left%!"$pkg_install_requested_osarch"}
      case "$pkg_install_left" in *!*) return 2 ;; esac
      _pkg_install_osarch_valid "$pkg_install_requested_osarch" || return 2
      ;;
  esac

  case "$pkg_install_left" in
    *@*)
      pkg_install_requested_version=${pkg_install_left##*@}
      pkg_install_pkg=${pkg_install_left%@"$pkg_install_requested_version"}
      case "$pkg_install_pkg" in *@*) return 2 ;; esac
      _pkg_install_version_valid "$pkg_install_requested_version" || return 2
      ;;
    *)
      pkg_install_pkg=$pkg_install_left
      ;;
  esac

  _pkg_install_name_valid "$pkg_install_pkg" || return 2
  return 0
}

_pkg_install_lock_acquire()
{
  [ "$#" -eq 1 ] || return 2
  pkg_install_lock=$1
  pkg_install_lock_parent=${pkg_install_lock%/*}

  command -p -- mkdir -p -- "$pkg_install_lock_parent" || return 1
  [ -d "$pkg_install_lock_parent" ] && [ ! -L "$pkg_install_lock_parent" ] || return 1

  if ! command -p -- mkdir -- "$pkg_install_lock" 2>/dev/null
  then
    [ -d "$pkg_install_lock" ] && [ ! -L "$pkg_install_lock" ] || return 1
    [ -f "$pkg_install_lock/pid" ] && [ ! -L "$pkg_install_lock/pid" ] || return 1

    pkg_install_lock_pid="$(_pkg_install_scalar "$pkg_install_lock/pid")" || return 1
    case "$pkg_install_lock_pid" in "" | *[!0-9]*) return 1 ;; esac

    if command -p -- kill -0 "$pkg_install_lock_pid" 2>/dev/null
    then
      return 1
    fi

    for pkg_install_lock_entry in \
      "$pkg_install_lock"/* \
      "$pkg_install_lock"/.[!.]* \
      "$pkg_install_lock"/..?*
    do
      [ -e "$pkg_install_lock_entry" ] || [ -L "$pkg_install_lock_entry" ] || continue
      [ "$pkg_install_lock_entry" = "$pkg_install_lock/pid" ] || return 1
    done

    command -p -- rm -f -- "$pkg_install_lock/pid" || return 1
    command -p -- rmdir -- "$pkg_install_lock" || return 1
    command -p -- mkdir -- "$pkg_install_lock" || return 1
  fi

  printf -- '%s\n' "$$" > "$pkg_install_lock/pid" || {
    command -p -- rmdir -- "$pkg_install_lock" 2>/dev/null || :
    return 1
  }
  return 0
}

_pkg_install_lock_release()
{
  [ "$#" -eq 1 ] || return 2
  pkg_install_lock=$1
  [ -d "$pkg_install_lock" ] && [ ! -L "$pkg_install_lock" ] || return 1
  [ -f "$pkg_install_lock/pid" ] && [ ! -L "$pkg_install_lock/pid" ] || return 1
  pkg_install_lock_pid="$(_pkg_install_scalar "$pkg_install_lock/pid")" || return 1
  [ "$pkg_install_lock_pid" = "$$" ] || return 1
  command -p -- rm -f -- "$pkg_install_lock/pid" || return 1
  command -p -- rmdir -- "$pkg_install_lock" || return 1
}

_pkg_install_git()
{
  command -- git \
    -c http.sslVerify=true \
    -c core.hooksPath=/dev/null \
    -c core.fsmonitor=false \
    "$@"
}

_pkg_install_git_head_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in "" | *[!0-9a-f]*) return 1 ;; esac
  [ "${#1}" -eq 40 ] || [ "${#1}" -eq 64 ]
}

_pkg_install_catalog_validate()
(
  [ "$#" -eq 3 ] || return 2
  pkg_install_catalog_validate_cache=$1
  pkg_install_catalog_validate_remote=$2
  pkg_install_catalog_validate_branch=$3

  [ -d "$pkg_install_catalog_validate_cache" ] && [ ! -L "$pkg_install_catalog_validate_cache" ] || return 1
  [ -d "$pkg_install_catalog_validate_cache/.git" ] && [ ! -L "$pkg_install_catalog_validate_cache/.git" ] || return 1

  pkg_install_catalog_validate_inside="$(_pkg_install_git -C "$pkg_install_catalog_validate_cache" rev-parse --is-inside-work-tree 2>/dev/null)" || return 1
  [ "$pkg_install_catalog_validate_inside" = true ] || return 1

  pkg_install_catalog_validate_origin="$(_pkg_install_git -C "$pkg_install_catalog_validate_cache" remote get-url origin 2>/dev/null)" || return 1
  [ "$pkg_install_catalog_validate_origin" = "$pkg_install_catalog_validate_remote" ] || return 1

  pkg_install_catalog_validate_branch_actual="$(_pkg_install_git -C "$pkg_install_catalog_validate_cache" symbolic-ref --quiet --short HEAD 2>/dev/null)" || return 1
  [ "$pkg_install_catalog_validate_branch_actual" = "$pkg_install_catalog_validate_branch" ] || return 1

  pkg_install_catalog_validate_dirty="$(_pkg_install_git -C "$pkg_install_catalog_validate_cache" status --porcelain=v1 --untracked-files=all 2>/dev/null)" || return 1
  [ -z "$pkg_install_catalog_validate_dirty" ] || return 1

  pkg_install_catalog_validate_head="$(_pkg_install_git -C "$pkg_install_catalog_validate_cache" rev-parse --verify HEAD 2>/dev/null)" || return 1
  _pkg_install_git_head_valid "$pkg_install_catalog_validate_head" || return 1
  printf -- '%s\n' "$pkg_install_catalog_validate_head"
)

_pkg_install_catalog_snapshot_impl()
(
  [ "$#" -eq 5 ] || return 2
  pkg_install_catalog_remote=$1
  pkg_install_catalog_branch=$2
  pkg_install_catalog_cache=$3
  pkg_install_catalog_lock=$4
  pkg_install_catalog_snapshot=$5

  command -v -- git >/dev/null 2>&1 || return 1
  [ -d "$pkg_install_catalog_snapshot" ] && [ ! -L "$pkg_install_catalog_snapshot" ] || return 1

  for pkg_install_catalog_snapshot_entry in \
    "$pkg_install_catalog_snapshot"/* \
    "$pkg_install_catalog_snapshot"/.[!.]* \
    "$pkg_install_catalog_snapshot"/..?*
  do
    [ -e "$pkg_install_catalog_snapshot_entry" ] || [ -L "$pkg_install_catalog_snapshot_entry" ] || continue
    return 1
  done

  _pkg_install_lock_acquire "$pkg_install_catalog_lock" || return 1
  trap '_pkg_install_lock_release "$pkg_install_catalog_lock" >/dev/null 2>&1 || :' 0
  trap 'exit 130' HUP INT TERM

  pkg_install_catalog_parent=${pkg_install_catalog_cache%/*}
  command -p -- mkdir -p -- "$pkg_install_catalog_parent" || return 1
  [ -d "$pkg_install_catalog_parent" ] && [ ! -L "$pkg_install_catalog_parent" ] || return 1

  if [ ! -e "$pkg_install_catalog_cache" ] && [ ! -L "$pkg_install_catalog_cache" ]
  then
    pkg_install_catalog_clone="$pkg_install_catalog_parent/pkg-catalog-clone-$$"
    [ ! -e "$pkg_install_catalog_clone" ] && [ ! -L "$pkg_install_catalog_clone" ] || return 1
    if ! _pkg_install_git clone --origin origin --no-tags --single-branch --branch "$pkg_install_catalog_branch" -- "$pkg_install_catalog_remote" "$pkg_install_catalog_clone" >/dev/null 2>&1
    then
      command -p -- rm -rf -- "$pkg_install_catalog_clone" 2>/dev/null || :
      return 1
    fi
    if ! _pkg_install_catalog_validate "$pkg_install_catalog_clone" "$pkg_install_catalog_remote" "$pkg_install_catalog_branch" >/dev/null
    then
      command -p -- rm -rf -- "$pkg_install_catalog_clone" 2>/dev/null || :
      return 1
    fi
    if ! command -p -- mv -- "$pkg_install_catalog_clone" "$pkg_install_catalog_cache"
    then
      command -p -- rm -rf -- "$pkg_install_catalog_clone" 2>/dev/null || :
      return 1
    fi
  fi

  pkg_install_catalog_before="$(_pkg_install_catalog_validate "$pkg_install_catalog_cache" "$pkg_install_catalog_remote" "$pkg_install_catalog_branch")" || return 1
  pkg_install_catalog_head=$pkg_install_catalog_before

  if _pkg_install_git -C "$pkg_install_catalog_cache" fetch --no-tags origin "refs/heads/$pkg_install_catalog_branch:refs/remotes/origin/$pkg_install_catalog_branch" >/dev/null 2>&1
  then
    _pkg_install_git -C "$pkg_install_catalog_cache" merge-base --is-ancestor "$pkg_install_catalog_before" "refs/remotes/origin/$pkg_install_catalog_branch" >/dev/null 2>&1 || return 1
    _pkg_install_git -C "$pkg_install_catalog_cache" merge --ff-only "refs/remotes/origin/$pkg_install_catalog_branch" >/dev/null 2>&1 || return 1
    pkg_install_catalog_head="$(_pkg_install_catalog_validate "$pkg_install_catalog_cache" "$pkg_install_catalog_remote" "$pkg_install_catalog_branch")" || return 1
    pkg_install_catalog_remote_head="$(_pkg_install_git -C "$pkg_install_catalog_cache" rev-parse --verify "refs/remotes/origin/$pkg_install_catalog_branch" 2>/dev/null)" || return 1
    [ "$pkg_install_catalog_head" = "$pkg_install_catalog_remote_head" ] || return 1
  else
    pkg_install_catalog_head="$(_pkg_install_catalog_validate "$pkg_install_catalog_cache" "$pkg_install_catalog_remote" "$pkg_install_catalog_branch")" || return 1
    log warn execution execution-failed operation pkg-install reason catalog-refresh-failed-using-cache || :
  fi

  pkg_install_catalog_archive="$pkg_install_catalog_snapshot.tar"
  [ ! -e "$pkg_install_catalog_archive" ] && [ ! -L "$pkg_install_catalog_archive" ] || return 1
  _pkg_install_git -C "$pkg_install_catalog_cache" archive --format=tar -o "$pkg_install_catalog_archive" "$pkg_install_catalog_head" || return 1
  (cd -- "$pkg_install_catalog_snapshot" && command -p -- tar -xf "$pkg_install_catalog_archive") || return 1
  command -p -- rm -f -- "$pkg_install_catalog_archive" || return 1

  printf -- '%s\n' "$pkg_install_catalog_head"
)

_pkg_install_catalog_snapshot()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_install_catalog_snapshot_impl \
    "https://github.com/massimilianonardi-ai/pkg-catalog.git" \
    main \
    "$m_CACHE_DIR/sys/pkg/pkg-catalog" \
    "$m_RUN_DIR/sys/pkg/pkg-catalog.lock" \
    "$1"
}

_pkg_install_stream_select()
{
  [ "$#" -eq 3 ] || return 2
  pkg_install_catalog=$1
  pkg_install_pkg=$2
  pkg_install_target=$3
  pkg_install_package_dir="$pkg_install_catalog/$pkg_install_pkg"
  [ -d "$pkg_install_package_dir" ] && [ ! -L "$pkg_install_package_dir" ] || return 1

  if [ -d "$pkg_install_package_dir/catalog-$pkg_install_target" ] && [ ! -L "$pkg_install_package_dir/catalog-$pkg_install_target" ]
  then
    pkg_install_stream="$pkg_install_package_dir/catalog-$pkg_install_target"
    pkg_install_identity_osarch=$pkg_install_target
  elif [ -d "$pkg_install_package_dir/catalog" ] && [ ! -L "$pkg_install_package_dir/catalog" ]
  then
    pkg_install_stream="$pkg_install_package_dir/catalog"
    pkg_install_identity_osarch=
  else
    return 1
  fi
}

_pkg_install_ranges_validate()
{
  [ "$#" -eq 2 ] || return 2
  pkg_install_stream=$1
  pkg_install_ranges_file=$2
  : > "$pkg_install_ranges_file" || return 1
  pkg_install_lf='
'

  [ -d "$pkg_install_stream/repository" ] && [ ! -L "$pkg_install_stream/repository" ] || return 1

  for pkg_install_stream_entry in \
    "$pkg_install_stream"/* \
    "$pkg_install_stream"/.[!.]* \
    "$pkg_install_stream"/..?*
  do
    [ -e "$pkg_install_stream_entry" ] || [ -L "$pkg_install_stream_entry" ] || continue
    pkg_install_stream_name=${pkg_install_stream_entry##*/}
    case "$pkg_install_stream_name" in
      *"$pkg_install_lf"*) return 1 ;;
      repository)
        [ -d "$pkg_install_stream_entry" ] && [ ! -L "$pkg_install_stream_entry" ] || return 1
        ;;
      n[0-9][0-9][0-9][0-9]=*)
        [ -d "$pkg_install_stream_entry" ] && [ ! -L "$pkg_install_stream_entry" ] || return 1
        pkg_install_range_prefix=${pkg_install_stream_name%%=*}
        pkg_install_range_anchor=${pkg_install_stream_name#*=}
        _pkg_install_version_valid "$pkg_install_range_anchor" || return 1
        printf -- '%s\t%s\n' "$pkg_install_stream_name" "$pkg_install_range_anchor" >> "$pkg_install_ranges_file" || return 1
        ;;
      *)
        return 1
        ;;
    esac
  done

  [ -s "$pkg_install_ranges_file" ] || return 1
  LC_ALL=C command -p -- sort "$pkg_install_ranges_file" > "$pkg_install_ranges_file.sorted" || return 1
  command -p -- mv -- "$pkg_install_ranges_file.sorted" "$pkg_install_ranges_file" || return 1

  pkg_install_expected=1
  pkg_install_tab="$(printf '\t')"
  while IFS="$pkg_install_tab" read -r pkg_install_range_name pkg_install_range_anchor pkg_install_range_extra
  do
    [ -z "$pkg_install_range_extra" ] || return 1
    pkg_install_expected_prefix="$(printf 'n%04d' "$pkg_install_expected")" || return 1
    pkg_install_range_prefix=${pkg_install_range_name%%=*}
    [ "$pkg_install_range_prefix" = "$pkg_install_expected_prefix" ] || return 1
    pkg_install_expected=$((pkg_install_expected + 1))
  done < "$pkg_install_ranges_file"
}

_pkg_install_repository_adapter()
{
  [ "$#" -eq 1 ] || return 2
  pkg_install_repository_dir=$1
  pkg_install_repository_type="$(_pkg_install_scalar "$pkg_install_repository_dir/type")" || return 1
  case "$pkg_install_repository_type" in
    "" | [!a-z0-9]* | *[!a-z0-9-]* | *-) return 1 ;;
  esac
  pkg_install_adapter="$m_LIB_DIR/sh/pkg-repository-$pkg_install_repository_type.lib.sh"
  [ -f "$pkg_install_adapter" ] && [ ! -L "$pkg_install_adapter" ] && [ -r "$pkg_install_adapter" ] && [ ! -x "$pkg_install_adapter" ] || return 1
}

_pkg_install_versions_validate()
{
  [ "$#" -eq 1 ] || return 2
  [ -s "$1" ] || return 1
  LC_ALL=C command -p -- awk '
BEGIN { ok=1 }
$0 !~ /^[A-Za-z0-9][A-Za-z0-9._+~-]*$/ { ok=0; exit }
seen[$0]++ { ok=0; exit }
END { if (!ok || NR == 0) exit 1 }
' "$1"
}

_pkg_install_resolve_range()
{
  [ "$#" -eq 3 ] || return 2
  pkg_install_ranges_file=$1
  pkg_install_versions_file=$2
  pkg_install_version=$3

  pkg_install_requested_pos="$(LC_ALL=C command -p -- awk -v wanted="$pkg_install_version" '$0 == wanted { print NR; count++ } END { if (count != 1) exit 1 }' "$pkg_install_versions_file")" || return 1
  pkg_install_selected_range=
  pkg_install_previous_anchor_pos=0
  pkg_install_tab="$(printf '\t')"

  while IFS="$pkg_install_tab" read -r pkg_install_range_name pkg_install_anchor pkg_install_range_extra
  do
    [ -z "$pkg_install_range_extra" ] || return 1
    pkg_install_anchor_pos="$(LC_ALL=C command -p -- awk -v wanted="$pkg_install_anchor" '$0 == wanted { print NR; count++ } END { if (count != 1) exit 1 }' "$pkg_install_versions_file")" || return 1
    [ "$pkg_install_anchor_pos" -gt "$pkg_install_previous_anchor_pos" ] || return 1
    pkg_install_previous_anchor_pos=$pkg_install_anchor_pos
    if [ "$pkg_install_anchor_pos" -le "$pkg_install_requested_pos" ]
    then
      pkg_install_selected_range="$pkg_install_stream/$pkg_install_range_name"
    fi
  done < "$pkg_install_ranges_file"

  [ -n "$pkg_install_selected_range" ] || return 1
}

_pkg_install_one()
(
  [ "$#" -eq 3 ] || return 2
  pkg_install_catalog=$1
  pkg_install_operand=$2
  pkg_install_item=$3

  _pkg_install_operand_parse "$pkg_install_operand" || return 2

  if [ -n "$pkg_install_requested_osarch" ]
  then
    pkg_install_target=$pkg_install_requested_osarch
  else
    pkg_install_target=${m_OSARCH-}
    _pkg_install_osarch_valid "$pkg_install_target" || return 1
  fi

  _pkg_install_stream_select "$pkg_install_catalog" "$pkg_install_pkg" "$pkg_install_target" || return 1

  pkg_install_ranges="$pkg_install_item/ranges"
  _pkg_install_ranges_validate "$pkg_install_stream" "$pkg_install_ranges" || return 1
  pkg_install_repository_dir="$pkg_install_stream/repository"
  _pkg_install_repository_adapter "$pkg_install_repository_dir" || return 1

  pkg_install_versions="$pkg_install_item/versions"
  if ! (
    . "$pkg_install_adapter" || exit 1
    pkg_repository_list_versions "$pkg_install_repository_dir"
  ) > "$pkg_install_versions"
  then
    return 1
  fi
  _pkg_install_versions_validate "$pkg_install_versions" || return 1

  pkg_install_resolved_file="$pkg_install_item/version"
  if [ -n "$pkg_install_requested_version" ]
  then
    if ! (
      . "$pkg_install_adapter" || exit 1
      pkg_repository_resolve_version "$pkg_install_repository_dir" "$pkg_install_requested_version"
    ) > "$pkg_install_resolved_file"
    then
      return 1
    fi
  else
    if ! (
      . "$pkg_install_adapter" || exit 1
      pkg_repository_resolve_version "$pkg_install_repository_dir"
    ) > "$pkg_install_resolved_file"
    then
      return 1
    fi
  fi

  pkg_install_version="$(_pkg_install_scalar "$pkg_install_resolved_file")" || return 1
  _pkg_install_version_valid "$pkg_install_version" || return 1
  if [ -n "$pkg_install_requested_version" ]
  then
    [ "$pkg_install_version" = "$pkg_install_requested_version" ] || return 1
  else
    pkg_install_latest="$(LC_ALL=C command -p -- awk 'END { if (NR == 0) exit 1; print }' < "$pkg_install_versions")" || return 1
    [ "$pkg_install_version" = "$pkg_install_latest" ] || return 1
  fi

  _pkg_install_resolve_range "$pkg_install_ranges" "$pkg_install_versions" "$pkg_install_version" || return 1

  pkg_install_descriptor="$pkg_install_item/artifact"
  if ! (
    . "$pkg_install_adapter" || exit 1
    pkg_repository_resolve_artifact "$pkg_install_repository_dir" "$pkg_install_selected_range" "$pkg_install_version"
  ) > "$pkg_install_descriptor"
  then
    return 1
  fi

  pkg_install_format="$(_pkg_install_scalar "$pkg_install_selected_range/format")" || return 1

  pkg_install_download_dir="$pkg_install_item/download"
  pkg_install_extract_dir="$pkg_install_item/extract"
  command -p -- mkdir -- "$pkg_install_download_dir" "$pkg_install_extract_dir" || return 1

  pkg_install_artifact_file="$pkg_install_item/artifact-path"
  if ! pkg_download "$pkg_install_download_dir" < "$pkg_install_descriptor" > "$pkg_install_artifact_file"
  then
    return 1
  fi
  pkg_install_artifact="$(_pkg_install_scalar "$pkg_install_artifact_file")" || return 1

  pkg_extract "$pkg_install_artifact" "$pkg_install_format" "$pkg_install_extract_dir" || return 1

  if [ -n "$pkg_install_identity_osarch" ]
  then
    pkg_integrate "$pkg_install_pkg" "$pkg_install_version" "$pkg_install_selected_range" "$pkg_install_extract_dir" "$pkg_install_identity_osarch"
  else
    pkg_integrate "$pkg_install_pkg" "$pkg_install_version" "$pkg_install_selected_range" "$pkg_install_extract_dir"
  fi
)

_pkg_install_cleanup()
{
  if [ -n "${pkg_install_work-}" ] && [ -d "$pkg_install_work" ] && [ ! -L "$pkg_install_work" ]
  then
    command -p -- rm -rf -- "$pkg_install_work" 2>/dev/null || :
    command -p -- rmdir -- "$pkg_install_work_parent" 2>/dev/null || :
    command -p -- rmdir -- "$m_TMP_DIR/sys" 2>/dev/null || :
  fi
}

pkg_install()
(
  [ "$#" -ge 1 ] || return 2
  [ -d "$m_TMP_DIR" ] && [ ! -L "$m_TMP_DIR" ] || return 1

  for pkg_install_operand
  do
    _pkg_install_operand_parse "$pkg_install_operand" || return 2
  done

  umask 077
  pkg_install_work_parent="$m_TMP_DIR/sys/pkg"
  pkg_install_work="$pkg_install_work_parent/install-$$"
  command -p -- mkdir -p -- "$pkg_install_work_parent" || return 1
  [ ! -e "$pkg_install_work" ] && [ ! -L "$pkg_install_work" ] || return 1
  command -p -- mkdir -- "$pkg_install_work" || return 1
  trap '_pkg_install_cleanup' 0
  trap 'exit 130' HUP INT TERM

  pkg_install_catalog="$pkg_install_work/catalog"
  command -p -- mkdir -- "$pkg_install_catalog" || return 1
  pkg_install_catalog_head="$(_pkg_install_catalog_snapshot "$pkg_install_catalog")" || {
    _pkg_install_error catalog-snapshot-failed
    return 1
  }
  _pkg_install_git_head_valid "$pkg_install_catalog_head" || return 1

  pkg_install_index=0
  for pkg_install_operand
  do
    pkg_install_index=$((pkg_install_index + 1))
    pkg_install_item="$pkg_install_work/item-$pkg_install_index"
    command -p -- mkdir -- "$pkg_install_item" || return 1
    _pkg_install_one "$pkg_install_catalog" "$pkg_install_operand" "$pkg_install_item"
    pkg_install_status=$?
    if [ "$pkg_install_status" -ne 0 ]
    then
      _pkg_install_error package-failed
      return "$pkg_install_status"
    fi
  done

  return 0
)
