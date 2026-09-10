. "$m_LIB_DIR/sh/pkg-integration.lib.sh"

_pkg_uninstall_error()
{
  log error execution execution-failed operation pkg-uninstall reason "$1"
}

_pkg_uninstall_operand_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_uninstall_operand=$1
  pkg_uninstall_pkg=
  pkg_uninstall_requested_version=
  pkg_uninstall_requested_osarch=
  pkg_uninstall_left=$pkg_uninstall_operand

  case "$pkg_uninstall_left" in
    *!*)
      pkg_uninstall_requested_osarch=${pkg_uninstall_left##*!}
      pkg_uninstall_left=${pkg_uninstall_left%!"$pkg_uninstall_requested_osarch"}
      case "$pkg_uninstall_left" in *!*) return 2 ;; esac
      _pkg_integration_osarch_valid "$pkg_uninstall_requested_osarch" || return 2
      ;;
  esac

  case "$pkg_uninstall_left" in
    *@*)
      pkg_uninstall_requested_version=${pkg_uninstall_left##*@}
      pkg_uninstall_pkg=${pkg_uninstall_left%@"$pkg_uninstall_requested_version"}
      case "$pkg_uninstall_pkg" in *@*) return 2 ;; esac
      _pkg_integration_version_valid "$pkg_uninstall_requested_version" || return 2
      ;;
    *)
      pkg_uninstall_pkg=$pkg_uninstall_left
      ;;
  esac

  _pkg_integration_name_valid "$pkg_uninstall_pkg" || return 2
}

_pkg_uninstall_class_scan()
{
  [ "$#" -eq 2 ] || return 2
  pkg_uninstall_scan_pkg=$1
  pkg_uninstall_scan_osarch=$2
  pkg_uninstall_class_present=0
  pkg_uninstall_class_count=0
  pkg_uninstall_class_single_version=
  pkg_uninstall_class_current_version=
  pkg_uninstall_class_current_name=
  pkg_uninstall_class_current_found=0

  if [ -n "$pkg_uninstall_scan_osarch" ]
  then
    pkg_uninstall_selector_name="$pkg_uninstall_scan_pkg!$pkg_uninstall_scan_osarch"
  else
    pkg_uninstall_selector_name=$pkg_uninstall_scan_pkg
  fi
  pkg_uninstall_selector="$m_PKG_DIR/$pkg_uninstall_selector_name"

  if [ -e "$pkg_uninstall_selector" ] || [ -L "$pkg_uninstall_selector" ]
  then
    pkg_uninstall_class_present=1
    [ -L "$pkg_uninstall_selector" ] || return 1
    pkg_uninstall_class_current_name="$(command -p -- readlink "$pkg_uninstall_selector")" || return 1
    case "$pkg_uninstall_class_current_name" in
      "" | */*) return 1 ;;
    esac

    if [ -n "$pkg_uninstall_scan_osarch" ]
    then
      pkg_uninstall_current_prefix="$pkg_uninstall_scan_pkg@"
      pkg_uninstall_current_suffix="!$pkg_uninstall_scan_osarch"
      case "$pkg_uninstall_class_current_name" in
        "$pkg_uninstall_current_prefix"*"$pkg_uninstall_current_suffix")
          pkg_uninstall_class_current_version=${pkg_uninstall_class_current_name#"$pkg_uninstall_current_prefix"}
          pkg_uninstall_class_current_version=${pkg_uninstall_class_current_version%"$pkg_uninstall_current_suffix"}
          ;;
        *)
          return 1
          ;;
      esac
      _pkg_integration_version_valid "$pkg_uninstall_class_current_version" || return 1
      [ "$pkg_uninstall_class_current_name" = "$pkg_uninstall_scan_pkg@$pkg_uninstall_class_current_version!$pkg_uninstall_scan_osarch" ] || return 1
    else
      pkg_uninstall_current_prefix="$pkg_uninstall_scan_pkg@"
      case "$pkg_uninstall_class_current_name" in
        "$pkg_uninstall_current_prefix"*)
          pkg_uninstall_class_current_version=${pkg_uninstall_class_current_name#"$pkg_uninstall_current_prefix"}
          ;;
        *)
          return 1
          ;;
      esac
      _pkg_integration_version_valid "$pkg_uninstall_class_current_version" || return 1
      [ "$pkg_uninstall_class_current_name" = "$pkg_uninstall_scan_pkg@$pkg_uninstall_class_current_version" ] || return 1
    fi
  fi

  for pkg_uninstall_path in "$m_PKG_DIR/$pkg_uninstall_scan_pkg@"*
  do
    [ -e "$pkg_uninstall_path" ] || [ -L "$pkg_uninstall_path" ] || continue
    pkg_uninstall_name=${pkg_uninstall_path##*/}

    if [ -n "$pkg_uninstall_scan_osarch" ]
    then
      pkg_uninstall_suffix="!$pkg_uninstall_scan_osarch"
      case "$pkg_uninstall_name" in
        "$pkg_uninstall_scan_pkg@"*"$pkg_uninstall_suffix")
          pkg_uninstall_version=${pkg_uninstall_name#"$pkg_uninstall_scan_pkg@"}
          pkg_uninstall_version=${pkg_uninstall_version%"$pkg_uninstall_suffix"}
          ;;
        *)
          continue
          ;;
      esac
      _pkg_integration_version_valid "$pkg_uninstall_version" || return 1
      [ "$pkg_uninstall_name" = "$pkg_uninstall_scan_pkg@$pkg_uninstall_version!$pkg_uninstall_scan_osarch" ] || return 1
    else
      case "$pkg_uninstall_name" in
        *!*) continue ;;
        "$pkg_uninstall_scan_pkg@"*)
          pkg_uninstall_version=${pkg_uninstall_name#"$pkg_uninstall_scan_pkg@"}
          ;;
        *)
          continue
          ;;
      esac
      _pkg_integration_version_valid "$pkg_uninstall_version" || return 1
      [ "$pkg_uninstall_name" = "$pkg_uninstall_scan_pkg@$pkg_uninstall_version" ] || return 1
    fi

    pkg_uninstall_class_present=1
    [ -d "$pkg_uninstall_path" ] && [ ! -L "$pkg_uninstall_path" ] || return 1
    pkg_uninstall_class_count=$((pkg_uninstall_class_count + 1))
    if [ "$pkg_uninstall_class_count" -eq 1 ]
    then
      pkg_uninstall_class_single_version=$pkg_uninstall_version
    else
      pkg_uninstall_class_single_version=
    fi
    if [ -n "$pkg_uninstall_class_current_name" ] && [ "$pkg_uninstall_name" = "$pkg_uninstall_class_current_name" ]
    then
      pkg_uninstall_class_current_found=1
    fi
  done

  if [ -n "$pkg_uninstall_class_current_name" ]
  then
    [ "$pkg_uninstall_class_current_found" -eq 1 ] || return 1
  fi

  return 0
}

_pkg_uninstall_resolve()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_uninstall_operand_parse "$1" || return 2
  [ -d "$m_PKG_DIR" ] && [ ! -L "$m_PKG_DIR" ] || return 1

  if [ -n "$pkg_uninstall_requested_osarch" ]
  then
    pkg_uninstall_identity_osarch=$pkg_uninstall_requested_osarch
    _pkg_uninstall_class_scan "$pkg_uninstall_pkg" "$pkg_uninstall_identity_osarch" || return 1
    [ "$pkg_uninstall_class_present" -eq 1 ] || return 1
  else
    _pkg_integration_osarch_valid "$m_OSARCH" || return 1
    _pkg_uninstall_class_scan "$pkg_uninstall_pkg" "$m_OSARCH" || return 1
    if [ "$pkg_uninstall_class_present" -eq 1 ]
    then
      pkg_uninstall_identity_osarch=$m_OSARCH
    else
      _pkg_uninstall_class_scan "$pkg_uninstall_pkg" "" || return 1
      [ "$pkg_uninstall_class_present" -eq 1 ] || return 1
      pkg_uninstall_identity_osarch=
    fi
  fi

  if [ -n "$pkg_uninstall_requested_version" ]
  then
    pkg_uninstall_version=$pkg_uninstall_requested_version
    if [ -n "$pkg_uninstall_identity_osarch" ]
    then
      pkg_uninstall_concrete="$m_PKG_DIR/$pkg_uninstall_pkg@$pkg_uninstall_version!$pkg_uninstall_identity_osarch"
    else
      pkg_uninstall_concrete="$m_PKG_DIR/$pkg_uninstall_pkg@$pkg_uninstall_version"
    fi
    [ -d "$pkg_uninstall_concrete" ] && [ ! -L "$pkg_uninstall_concrete" ] || return 1
  elif [ -n "$pkg_uninstall_class_current_version" ]
  then
    pkg_uninstall_version=$pkg_uninstall_class_current_version
  elif [ "$pkg_uninstall_class_count" -eq 1 ]
  then
    pkg_uninstall_version=$pkg_uninstall_class_single_version
  else
    return 1
  fi

  pkg_uninstall_is_current=0
  if [ -n "$pkg_uninstall_class_current_version" ] && [ "$pkg_uninstall_version" = "$pkg_uninstall_class_current_version" ]
  then
    pkg_uninstall_is_current=1
  fi
}

_pkg_uninstall_one()
(
  [ "$#" -eq 1 ] || return 2
  _pkg_uninstall_resolve "$1" || return 1

  if [ "$pkg_uninstall_is_current" -eq 1 ]
  then
    if [ -n "$pkg_uninstall_identity_osarch" ]
    then
      pkg_default "$pkg_uninstall_pkg" "" "$pkg_uninstall_identity_osarch" || return 1
    else
      pkg_default "$pkg_uninstall_pkg" "" || return 1
    fi
  fi

  if [ -n "$pkg_uninstall_identity_osarch" ]
  then
    pkg_deintegrate "$pkg_uninstall_pkg" "$pkg_uninstall_version" "$pkg_uninstall_identity_osarch" || return 1
  else
    pkg_deintegrate "$pkg_uninstall_pkg" "$pkg_uninstall_version" || return 1
  fi
)

pkg_uninstall()
(
  [ "$#" -ge 1 ] || return 2

  for pkg_uninstall_operand
  do
    _pkg_uninstall_operand_parse "$pkg_uninstall_operand" || return 2
  done

  for pkg_uninstall_operand
  do
    if ! _pkg_uninstall_one "$pkg_uninstall_operand"
    then
      _pkg_uninstall_error package-failed
      return 1
    fi
  done

  return 0
)
