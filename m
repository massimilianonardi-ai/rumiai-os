#!/bin/sh

#-------------------------------------------------------------------------------
# FUNCTIONS
#-------------------------------------------------------------------------------

readpathce()
{
  [ "$#" -eq 2 ] && [ -n "$1" ] && [ -n "$2" ] || return 1

  case "$1" in "" | [0-9]* | *[!a-zA-Z0-9_]*) return 2 ;; esac

  eval $1=''

  set -- "$1" "$(
    set -eu
    shift
    if [ "${1#*/}" != "$1" ]
    then
      cmd="$1"
    elif [ -e "./$1" ] || [ -L "./$1" ]
    then
      cmd="./$1"
    else
      cmd="$(command -v -- "$1" 2>/dev/null; printf -- '%s' "x")"; cmd="${cmd%\nx}"
    fi
    [ -e "$cmd" ] || exit 1
    cmd="$(command -p -- realpath -- "$cmd" 2>/dev/null; printf -- '%s' "x")"
    cmd="${cmd%\nx}"
    [ -e "$cmd" ] || exit 1
    printf -- '%s' "${cmd}x"
  )"

  set -- "$1" "${2%x}"
  [ -n "$2" ] || return 3

  eval $1='$2'
}

export_readonly()
{
  while [ "$#" -gt "0" ]
  do
    export -- "$1"
    readonly -- "$1"
    shift
  done
}

#-------------------------------------------------------------------------------
# ROOT RESOLUTION
#-------------------------------------------------------------------------------

readpathce "m_BOOTSTRAP_BIN" "$0" && [ -f "$m_BOOTSTRAP_BIN" ] || { printf -- '%s\n' 'bootstrap bin resolution error' >&2; exit 1; }

m_ROOT=${m_BOOTSTRAP_BIN%/*}
[ -n "$m_ROOT" ] || m_ROOT=/

(cd -- "$m_ROOT" 2>/dev/null) || { printf -- '%s\n' 'bootstrap dir error' >&2; exit 1; }

export_readonly m_BOOTSTRAP_BIN m_ROOT

#-------------------------------------------------------------------------------
# SYSTEM VARIABLES
#-------------------------------------------------------------------------------

m_BIN_DIR="$m_ROOT/bin"
m_BIN_SYS_DIR="$m_BIN_DIR/sys"
m_BIN_SYS_OSARCH_DIR="$m_BIN_DIR/sys-osarch"
m_BIN_EXT_DIR="$m_BIN_DIR/ext"
m_BIN_EXT_OSARCH_DIR="$m_BIN_DIR/ext-osarch"
m_LIB_DIR="$m_ROOT/lib"
m_PKG_DIR="$m_ROOT/pkg"

m_LANG_DIR="$m_ROOT/lang"
m_SRC_DIR="$m_ROOT/src"

export_readonly \
  m_BIN_DIR \
  m_BIN_SYS_DIR \
  m_BIN_SYS_OSARCH_DIR \
  m_BIN_EXT_DIR \
  m_BIN_EXT_OSARCH_DIR \
  m_LIB_DIR \
  m_PKG_DIR \
  m_LANG_DIR \
  m_SRC_DIR \

PATH=$m_BIN_SYS_OSARCH_DIR:$m_BIN_SYS_DIR:$m_BIN_EXT_OSARCH_DIR:$m_BIN_EXT_DIR${PATH:+:$PATH}
export -- PATH

m_LANGUAGE_FALLBACK="en_US"
m_TEXT_ENCODING="UTF-8"
m_LANG_CURRENT_DIR="$m_LANG_DIR/current"
m_LANG_FALLBACK_DIR="$m_LANG_DIR/$m_LANGUAGE_FALLBACK"

export_readonly \
  m_LANGUAGE_FALLBACK \
  m_TEXT_ENCODING \
  m_LANG_CURRENT_DIR \
  m_LANG_FALLBACK_DIR

export -- m_LOG_LEVEL

#-------------------------------------------------------------------------------
# LOAD CORE LIB
#-------------------------------------------------------------------------------

. "$m_LIB_DIR/sys/sh/core.lib.sh"

#-------------------------------------------------------------------------------
# STATE ROOTS
#-------------------------------------------------------------------------------

m_STATE_DIR="$m_ROOT/state"
m_STATE_SYS_DIR="$m_STATE_DIR/system/current"
m_STATE_USER_DIR="$m_STATE_DIR/user/current"

export_readonly m_STATE_DIR m_STATE_SYS_DIR m_STATE_USER_DIR

#-------------------------------------------------------------------------------
# EXECUTE
#-------------------------------------------------------------------------------

if [ "$#" -eq 0 ]
then
  shell
fi

if ! readpathce "m_COMMAND_BIN" "$1" || [ ! -f "$m_COMMAND_BIN" ] || [ ! -r "$m_COMMAND_BIN" ] || [ "$m_COMMAND_BIN" = "$m_BOOTSTRAP_BIN" ]
then
  log fatal filesystem path-invalid command-original "$1" command-resolved "$m_COMMAND_BIN"
  exit 1
fi
shift

export -- m_COMMAND_BIN
readonly -- m_COMMAND_BIN

. "$m_COMMAND_BIN"
exit $?
