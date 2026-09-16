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
      cmd="$(command -v -- "$1" 2>/dev/null; printf -- '%s' "x")"; cmd="${cmd%
x}"
    fi
    [ -e "$cmd" ] || exit 1
    cmd="$(command -p -- realpath -- "$cmd" 2>/dev/null; printf -- '%s' "x")"
    cmd="${cmd%
x}"
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

lang()
(
  [ "$#" -eq 2 ] && case "${1}${2}" in [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) false;; esac || return 1

  lang_message="$(command -p -- cat "$m_LANG_CURRENT_DIR/$1/$2" 2>/dev/null)" || \
  lang_message="$(command -p -- cat "$m_LANG_FALLBACK_DIR/$1/$2" 2>/dev/null)" || \
  lang_message="${1}.${2}"

  printf -- '%s\n' "$lang_message"
)

: "${m_LOG_LEVEL:=info}"
export -- m_LOG_LEVEL

log_base_print()
{
  if [ "$#" -gt "0" ]
  then
    printf -- '%s' "$1" >&2
    shift
    if [ "$#" -gt "0" ]
    then
      printf -- ' %s' "$1" >&2
      shift
    fi
    if [ "$#" -gt "0" ]
    then
      printf -- '.%s' "$@" >&2
    fi
    printf -- '\n' >&2
  fi
}

log()
{
  (
    [ "$#" -ge 3 ] || exit 1

    log_severity="$1"
    shift

    case "$log_severity" in
      fatal) log_priority=1;;
      error) log_priority=2;;
      warn) log_priority=3;;
      info) log_priority=4;;
      debug) log_priority=5;;
      trace) log_priority=6;;
      *) exit 2;;
    esac

    case "$m_LOG_LEVEL" in
      off | none) log_threshold="0";;
      fatal) log_threshold="1";;
      error) log_threshold="2";;
      warn) log_threshold="3";;
      info) log_threshold="4";;
      debug) log_threshold="5";;
      trace | all) log_threshold="6";;
      *) exit 3;;
    esac

    [ "$log_priority" -le "$log_threshold" ] || exit 0

    case "$1" in "" | [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) exit 4 ;; esac
    case "$2" in "" | [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) exit 5 ;; esac

    log_domain=$1
    log_message_id=$2
    shift 2

    log_message=$(lang "$log_domain" "$log_message_id") || log_message=$log_domain.$log_message_id
    log_timestamp=$(command -p -- date '+%Y-%m-%d|%H:%M:%S' 2>/dev/null) || log_timestamp=-

    printf -- '[%s] [%s] [%s.%s] %s' \
      "$log_timestamp" \
      "$log_severity" \
      "$log_domain" \
      "$log_message_id" \
      "$log_message" >&2

    if [ ! "$(( $# % 2 ))" -eq 0 ]
    then
      printf -- '\n' >&2
      exit 6
    fi

    while [ "$#" -gt 0 ]
    do
      case "$1" in "" | [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) printf -- '\n' >&2; exit 7 ;; esac
      log_field_name=$1
      log_field_value=$2
      shift 2

      printf -- ' [%s="%s"]' \
        "$log_field_name" \
        "$log_field_value" >&2
    done

    printf -- '\n' >&2
  )

  (
    exit_code="$?"
    if [ "$exit_code" != "0" ]
    then
      printf -- '[%s] [%s] [%s] ' \
        "$(command -p -- date '+%Y-%m-%d|%H:%M:%S' 2>/dev/null)" \
        "error" \
        "log" >&2
      case "$exit_code" in
        "1") printf -- '%s ' "invalid number of arguments: $@" >&2;;
        "2") printf -- '%s ' "invalid log severity: $@" >&2;;
        "3") printf -- '%s ' "invalid m_LOG_LEVEL: $@" >&2;;
        "4") printf -- '%s ' "invalid log domain: $@" >&2;;
        "5") printf -- '%s ' "invalid message id: $@" >&2;;
        "6") printf -- '%s ' "invalid parity check of <field, value> pairs: $@" >&2;;
        "7") printf -- '%s ' "invalid field name: $@" >&2;;
        *) printf -- '%s ' "unknown error: $@" >&2;;
      esac
      printf -- '\n' >&2

      exit "$exit_code"
    fi
  )
}

fatal()
{
  case "$1" in *[!0-9]* | "") EXIT_CODE="1";; "0" | "00" | "000" | ????*) EXIT_CODE="1"; shift;; *) EXIT_CODE="$1"; shift; [ "$EXIT_CODE" -gt "255" ] && EXIT_CODE="1";; esac

  log fatal "$@" || log_base_print "$@"

  exit "$EXIT_CODE"
}

shell()
{
  : "${SHELL:=sh}"

  m_SHELL_NAME="${SHELL##*/}"
  export -- m_SHELL_NAME
  printf -- '%s\n' "$(tput setaf 2)$(tput bold)${m_SHELL_NAME}$(tput sgr0)" >&2

  shell_conf_dir="$(command -- state-path system sys shell conf)" || return 1

  : "${m_SHELL_EXT:=}"
  export m_SHELL_EXT

  case "${SHELL##*/}" in
    bash)
      exec "$SHELL" --rcfile "$shell_conf_dir/bash/bashrc" "$@"
      ;;

    zsh)
      unset m_SHELL_ZDOTDIR

      if [ "${ZDOTDIR+x}" = "x" ]
      then
        m_SHELL_ZDOTDIR="$ZDOTDIR"
        export -- m_SHELL_ZDOTDIR
      fi

      shell_home_dir="$(command -- state-path user sys shell home)" || return 1
      shell_zdotdir_init="$shell_home_dir/zsh"
      command -p -- mkdir -p "$shell_zdotdir_init" || return 1

      for shell_zdotfile in .zshenv .zprofile .zshrc
      do
        shell_zdottmp="$shell_zdotdir_init/$shell_zdotfile.$$"

        if ! printf -- '. "$(state-path system sys shell conf)/zsh/%s"\n' "$shell_zdotfile" > "$shell_zdottmp"
        then
          command -p -- rm -f "$shell_zdottmp" 2>/dev/null
          return 1
        fi

        if ! command -p -- mv -f "$shell_zdottmp" "$shell_zdotdir_init/$shell_zdotfile"
        then
          command -p -- rm -f "$shell_zdottmp" 2>/dev/null
          return 1
        fi
      done

      m_SHELL_ZDOTDIR_INIT="$shell_zdotdir_init"
      export -- m_SHELL_ZDOTDIR_INIT

      ZDOTDIR="$m_SHELL_ZDOTDIR_INIT"
      export -- ZDOTDIR

      unset shell_conf_dir shell_home_dir shell_zdotdir_init shell_zdotfile shell_zdottmp

      exec "$SHELL" "$@"
      ;;

    sh | dash | ash)
      m_SHELL_ENV="${ENV-}"
      export -- m_SHELL_ENV

      ENV="$shell_conf_dir/sh/env"
      export -- ENV

      unset shell_conf_dir
      exec "$SHELL" "$@"
      ;;

    *)
      unset shell_conf_dir
      exec "$SHELL" "$@"
      ;;
  esac
}

#-------------------------------------------------------------------------------

# quote [arg] ...
# returns a perfectly safe quoted string.
# typical use is to store/restore command arguments:
# current_args="$(quote "$@")"
# set -- foo bar baz boo
# eval "set -- $current_args"
quote()
(
  while [ "$#" -gt 0 ]
  do
    _quote_arg="$1"

    printf "'" || exit 1

    while [ "$_quote_arg" != "${_quote_arg#*"'"}" ]
    do
      _quote_part="${_quote_arg%%"'"*}"

      printf "%s'\\\\''" "$_quote_part" || exit 2

      _quote_arg="${_quote_arg#*"'"}"
    done

    printf "%s'" "$_quote_arg" || exit 3

    shift

    if [ "$#" -gt 0 ]
    then
      printf " " || exit 4
    fi
  done
)

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
m_RES_DIR="$m_ROOT/res"
m_LANG_DIR="$m_RES_DIR/sys/lang"
m_SRC_DIR="$m_ROOT/src"

export_readonly \
  m_BIN_DIR \
  m_BIN_SYS_DIR \
  m_BIN_SYS_OSARCH_DIR \
  m_BIN_EXT_DIR \
  m_BIN_EXT_OSARCH_DIR \
  m_LIB_DIR \
  m_PKG_DIR \
  m_RES_DIR \
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
  fatal filesystem path-invalid command-original "$1" command-resolved "$m_COMMAND_BIN"
fi
shift

export -- m_COMMAND_BIN
readonly -- m_COMMAND_BIN

. "$m_COMMAND_BIN"
exit $?
