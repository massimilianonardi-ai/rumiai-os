. "$m_LIB_DIR/sys/sh/pkg/pkg-facility.lib.sh"
. "$m_LIB_DIR/sys/sh/pkg/pkg-dependency.lib.sh"

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

  if [ ! -e "$1" ] && [ ! -L "$1" ]
  then
    return 0
  fi

  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] || return 1
  command -p -- sh -n "$1" >/dev/null 2>&1 || return 1
  . "$1" || return 1
}

_pkg_launch_env_name_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_]* | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_]*) return 1 ;;
  esac
}

_pkg_launch_relative_path_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | /* | */ | *//* | *'
'*) return 1 ;;
  esac
  case "/$1/" in
    */./* | */../*) return 1 ;;
  esac
}

_pkg_launch_provider_env_apply()
{
  [ "$#" -eq 3 ] || return 2
  pkg_launch_provider_root=$1
  pkg_launch_provider_concrete=$2
  pkg_launch_provider_facility=$3
  pkg_launch_provider_env="$pkg_launch_provider_concrete/facility-env/$pkg_launch_provider_facility"

  if [ ! -e "$pkg_launch_provider_env" ] && [ ! -L "$pkg_launch_provider_env" ]
  then
    return 0
  fi
  [ -f "$pkg_launch_provider_env" ] && [ ! -L "$pkg_launch_provider_env" ] && [ -r "$pkg_launch_provider_env" ] && [ ! -x "$pkg_launch_provider_env" ] || return 1

  pkg_launch_provider_tab="$(printf '\t')"
  while IFS= read -r pkg_launch_provider_line
  do
    case "$pkg_launch_provider_line" in
      *"$pkg_launch_provider_tab"*) : ;;
      *) return 1 ;;
    esac
    pkg_launch_provider_variable=${pkg_launch_provider_line%%"$pkg_launch_provider_tab"*}
    pkg_launch_provider_descriptor=${pkg_launch_provider_line#*"$pkg_launch_provider_tab"}
    case "$pkg_launch_provider_descriptor" in *"$pkg_launch_provider_tab"*) return 1 ;; esac
    _pkg_launch_env_name_valid "$pkg_launch_provider_variable" || return 1

    case "$pkg_launch_provider_descriptor" in
      root)
        pkg_launch_provider_value=$pkg_launch_provider_root
        ;;
      "root-path "*)
        pkg_launch_provider_relative=${pkg_launch_provider_descriptor#root-path }
        _pkg_launch_relative_path_valid "$pkg_launch_provider_relative" || return 1
        [ -e "$pkg_launch_provider_root/$pkg_launch_provider_relative" ] || [ -L "$pkg_launch_provider_root/$pkg_launch_provider_relative" ] || return 1
        readpathce pkg_launch_provider_resolved "$pkg_launch_provider_root/$pkg_launch_provider_relative" || return 1
        case "$pkg_launch_provider_resolved" in
          "$pkg_launch_provider_root"/*) : ;;
          *) return 1 ;;
        esac
        pkg_launch_provider_value="$pkg_launch_provider_root/$pkg_launch_provider_relative"
        ;;
      literal)
        pkg_launch_provider_value=
        ;;
      "literal "*)
        pkg_launch_provider_value=${pkg_launch_provider_descriptor#literal }
        ;;
      *)
        return 1
        ;;
    esac

    export "$pkg_launch_provider_variable=$pkg_launch_provider_value" || return 1
  done < "$pkg_launch_provider_env"
}

_pkg_launch_provider_apply()
{
  [ "$#" -eq 2 ] || return 2
  pkg_launch_provider_facility=$1
  pkg_launch_provider_name=$2
  pkg_launch_provider_concrete="$m_PKG_DIR/$pkg_launch_provider_name"
  pkg_launch_provider_root="$pkg_launch_provider_concrete/root"

  [ -d "$pkg_launch_provider_concrete" ] && [ ! -L "$pkg_launch_provider_concrete" ] || return 1
  [ -d "$pkg_launch_provider_root" ] && [ ! -L "$pkg_launch_provider_root" ] || return 1
  readpathce pkg_launch_provider_root "$pkg_launch_provider_root" || return 1

  pkg_launch_provider_cmd="$pkg_launch_provider_concrete/facility-cmd/$pkg_launch_provider_facility"
  if [ -e "$pkg_launch_provider_cmd" ] || [ -L "$pkg_launch_provider_cmd" ]
  then
    [ -d "$pkg_launch_provider_cmd" ] && [ ! -L "$pkg_launch_provider_cmd" ] || return 1
    PATH="$pkg_launch_provider_cmd:$PATH"
    export PATH
  fi

  _pkg_launch_provider_env_apply "$pkg_launch_provider_root" "$pkg_launch_provider_concrete" "$pkg_launch_provider_facility"
}

_pkg_launch_dependencies_apply()
{
  [ "$#" -eq 3 ] || return 2
  pkg_launch_dependency_file=$1
  pkg_launch_dependency_consumer=$2
  pkg_launch_dependency_osarch=$3

  pkg_launch_dependency_set="$(pkg_dependency_resolve "$pkg_launch_dependency_file" "$pkg_launch_dependency_consumer" "$pkg_launch_dependency_osarch")" || return 1
  [ -n "$pkg_launch_dependency_set" ] || return 0

  pkg_launch_dependency_tab="$(printf '\t')"
  while IFS="$pkg_launch_dependency_tab" read -r pkg_launch_dependency_facility pkg_launch_dependency_provider pkg_launch_dependency_extra
  do
    [ -n "$pkg_launch_dependency_facility" ] && [ -n "$pkg_launch_dependency_provider" ] && [ -z "$pkg_launch_dependency_extra" ] || return 1
    _pkg_launch_provider_apply "$pkg_launch_dependency_facility" "$pkg_launch_dependency_provider" || return 1
  done <<EOF_DEPENDENCIES
$pkg_launch_dependency_set
EOF_DEPENDENCIES
}

launcher()
{
  [ "$#" -ge 1 ] || return 2
  pkg_launch_pkg=$1
  shift

  _pkg_launch_name_valid "$pkg_launch_pkg" || return 2

  [ -n "${m_COMMAND_BIN-}" ] && \
  [ -n "${m_PKG_DIR-}" ] || {
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
  pkg_launch_concrete_name=${pkg_launch_concrete##*/}
  case "$pkg_launch_concrete_name" in
    *!*) pkg_launch_osarch=${pkg_launch_concrete_name##*!} ;;
    *) pkg_launch_osarch= ;;
  esac

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

  pkg_launch_home="$(command -- state-path user pkg "$pkg_launch_pkg" home)" || {
    _pkg_launch_error home-state-invalid
    return 1
  }
  pkg_launch_conf="$(command -- state-path user pkg "$pkg_launch_pkg" conf)" || {
    _pkg_launch_error conf-state-invalid
    return 1
  }

  umask 077
  command -p -- mkdir -p -- "$pkg_launch_home" || {
    _pkg_launch_error home-state-create-failed
    return 1
  }
  [ -d "$pkg_launch_home" ] && [ ! -L "$pkg_launch_home" ] || {
    _pkg_launch_error home-state-invalid
    return 1
  }

  readonly -- \
    pkg_launch_pkg \
    pkg_launch_command_bin \
    pkg_launch_command \
    pkg_launch_cmd_dir \
    pkg_launch_concrete \
    pkg_launch_concrete_name \
    pkg_launch_osarch \
    pkg_launch_pkg_dir \
    pkg_launch_root \
    pkg_launch_link \
    pkg_launch_link_text \
    pkg_launch_target \
    pkg_launch_home \
    pkg_launch_conf

  HOME=$pkg_launch_home
  export -- HOME

  _pkg_launch_env_apply "$pkg_launch_concrete/env" || {
    _pkg_launch_error package-env-invalid
    return 1
  }
  _pkg_launch_dependencies_apply "$pkg_launch_concrete/dependency" "$pkg_launch_pkg" "$pkg_launch_osarch" || {
    _pkg_launch_error dependency-runtime-invalid
    return 1
  }
  _pkg_launch_env_apply "$pkg_launch_conf/.m/env" || {
    _pkg_launch_error user-env-invalid
    return 1
  }

  exec "$pkg_launch_target" "$@"
}
