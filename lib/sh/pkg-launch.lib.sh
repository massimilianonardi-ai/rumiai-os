_pkg_launch_error()
{
  log error execution execution-failed operation launcher reason "$1"
}

_pkg_launch_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) return 1 ;;
  esac
}

_pkg_launch_env_apply()
{
  [ "$#" -eq 1 ] || return 2
  pkg_launch_env=$1

  if [ ! -e "$pkg_launch_env" ] && [ ! -L "$pkg_launch_env" ]
  then
    return 0
  fi

  [ -f "$pkg_launch_env" ] && [ ! -L "$pkg_launch_env" ] && [ -r "$pkg_launch_env" ] || return 1
  command -p -- sh -n "$pkg_launch_env" >/dev/null 2>&1 || return 1
  . "$pkg_launch_env" || return 1
}

launcher()
{
  [ "$#" -ge 1 ] || return 2
  pkg_launch_pkg=$1
  shift

  _pkg_launch_name_valid "$pkg_launch_pkg" || return 2

  [ -n "${m_COMMAND_BIN-}" ] && \
  [ -n "${m_PKG_DIR-}" ] && \
  [ -n "${m_HOME_DIR-}" ] && \
  [ -n "${m_CONF_DIR-}" ] || {
    _pkg_launch_error runtime-variable-missing
    return 1
  }

  readpathce pkg_launch_command_bin "$m_COMMAND_BIN" || {
    _pkg_launch_error command-invalid
    return 1
  }
  [ -f "$pkg_launch_command_bin" ] && [ -r "$pkg_launch_command_bin" ] && [ -x "$pkg_launch_command_bin" ] || {
    _pkg_launch_error command-invalid
    return 1
  }

  pkg_launch_command=${pkg_launch_command_bin##*/}
  _pkg_launch_name_valid "$pkg_launch_command" || {
    _pkg_launch_error command-name-invalid
    return 1
  }

  pkg_launch_cmd_dir=${pkg_launch_command_bin%/*}
  [ "${pkg_launch_cmd_dir##*/}" = cmd ] || {
    _pkg_launch_error command-layout-invalid
    return 1
  }

  pkg_launch_concrete=${pkg_launch_cmd_dir%/*}
  [ -d "$pkg_launch_concrete" ] && [ ! -L "$pkg_launch_concrete" ] || {
    _pkg_launch_error concrete-invalid
    return 1
  }

  readpathce pkg_launch_pkg_dir "$m_PKG_DIR" || {
    _pkg_launch_error package-store-invalid
    return 1
  }
  [ -d "$pkg_launch_pkg_dir" ] && [ ! -L "$pkg_launch_pkg_dir" ] || {
    _pkg_launch_error package-store-invalid
    return 1
  }
  [ "${pkg_launch_concrete%/*}" = "$pkg_launch_pkg_dir" ] || {
    _pkg_launch_error command-outside-package-store
    return 1
  }

  pkg_launch_root="$pkg_launch_concrete/root"
  [ -d "$pkg_launch_root" ] && [ ! -L "$pkg_launch_root" ] || {
    _pkg_launch_error root-invalid
    return 1
  }
  readpathce pkg_launch_root "$pkg_launch_root" || {
    _pkg_launch_error root-invalid
    return 1
  }

  pkg_launch_link="$pkg_launch_concrete/link/$pkg_launch_command"
  [ -L "$pkg_launch_link" ] || {
    _pkg_launch_error link-missing
    return 1
  }
  pkg_launch_link_text="$(command -p -- readlink "$pkg_launch_link")" || {
    _pkg_launch_error link-invalid
    return 1
  }
  case "$pkg_launch_link_text" in
    "" | /* | *'
'*)
      _pkg_launch_error link-invalid
      return 1
      ;;
  esac

  readpathce pkg_launch_target "$pkg_launch_link" || {
    _pkg_launch_error target-invalid
    return 1
  }
  case "$pkg_launch_target" in
    "$pkg_launch_root"/*) : ;;
    *)
      _pkg_launch_error target-outside-root
      return 1
      ;;
  esac
  [ -f "$pkg_launch_target" ] && [ -x "$pkg_launch_target" ] || {
    _pkg_launch_error target-not-executable
    return 1
  }

  readonly -- \
    pkg_launch_pkg \
    pkg_launch_command_bin \
    pkg_launch_command \
    pkg_launch_cmd_dir \
    pkg_launch_concrete \
    pkg_launch_pkg_dir \
    pkg_launch_root \
    pkg_launch_link \
    pkg_launch_link_text \
    pkg_launch_target

  HOME="$m_HOME_DIR/$pkg_launch_pkg"
  export -- HOME

  _pkg_launch_env_apply "$pkg_launch_concrete/env" || {
    _pkg_launch_error package-env-invalid
    return 1
  }
  _pkg_launch_env_apply "$m_CONF_DIR/$pkg_launch_pkg/env" || {
    _pkg_launch_error user-env-invalid
    return 1
  }

  exec "$pkg_launch_target" "$@"
}
