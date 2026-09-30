pkg_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz0123456789]* | *[!abcdefghijklmnopqrstuvwxyz0123456789._-]* | *[._-]) return 1 ;;
  esac
}

pkg_version_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._+~-]*) return 1 ;;
  esac
}

pkg_osarch_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    linux-arm64 | linux-x86_64 | macos-arm64 | macos-x86_64 | windows-arm64 | windows-x86_64) return 0 ;;
    *) return 1 ;;
  esac
}

pkg_concrete_read()
{
  [ "$#" -eq 4 ] || return 2

  for pkg_concrete_variable in "$1" "$2" "$3"
  do
    case "$pkg_concrete_variable" in
      "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_]*) return 2 ;;
    esac
  done
  [ "$1" != "$2" ] && [ "$1" != "$3" ] && [ "$2" != "$3" ] || return 2

  pkg_concrete_name_variable=$1
  pkg_concrete_version_variable=$2
  pkg_concrete_osarch_variable=$3
  pkg_concrete=$4
  pkg_concrete_left=$pkg_concrete
  pkg_concrete_osarch=

  case "$pkg_concrete_left" in
    *!*)
      pkg_concrete_osarch=${pkg_concrete_left##*!}
      pkg_concrete_left=${pkg_concrete_left%!"$pkg_concrete_osarch"}
      case "$pkg_concrete_left" in *!*) return 1 ;; esac
      pkg_osarch_valid "$pkg_concrete_osarch" || return 1
      ;;
  esac

  case "$pkg_concrete_left" in
    *@*)
      pkg_concrete_version=${pkg_concrete_left##*@}
      pkg_concrete_name=${pkg_concrete_left%@"$pkg_concrete_version"}
      case "$pkg_concrete_name" in *@*) return 1 ;; esac
      ;;
    *) return 1 ;;
  esac

  pkg_name_valid "$pkg_concrete_name" || return 1
  pkg_version_valid "$pkg_concrete_version" || return 1

  pkg_concrete_tab="$(printf '\t')" || return 1
  IFS="$pkg_concrete_tab" read -r "$pkg_concrete_name_variable" "$pkg_concrete_version_variable" "$pkg_concrete_osarch_variable" <<EOF_PKG_CONCRETE
$pkg_concrete_name	$pkg_concrete_version	$pkg_concrete_osarch
EOF_PKG_CONCRETE
}
