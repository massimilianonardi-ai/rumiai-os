
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
  log_base_print "$@"
}

fatal()
{
  case "$1" in *[!0-9]* | "") EXIT_CODE="1";; "0" | "00" | "000" | ????*) EXIT_CODE="1"; shift;; *) EXIT_CODE="$1"; shift; [ "$EXIT_CODE" -gt "255" ] && EXIT_CODE="1";; esac

  log fatal "$@" || log_base_print "$@"

  exit "$EXIT_CODE"
}

#-------------------------------------------------------------------------------

readpathce()
{
  [ "$#" -eq 2 ] && [ -n "$1" ] && [ -n "$2" ] || return 1

  # safeguard against invalid variable name: read will make entire script fail when passing an invalid variable name
  case "$1" in "" | [0-9]* | *[!a-zA-Z0-9_]*) return 2 ;; esac

  eval $1=''

  set -- "$1" "$(
    set -eu
    shift
    # if invoked by PATH search, then acquire path used, safeguard against paths with trailing newline (NB command -v always adds a newline)
    case $1 in */*) cmd="$1";; *) if [ -e "./$1" ] || [ -L "./$1" ]; then cmd="./$1"; else cmd="$(command -v -- "$1" 2>/dev/null; printf -- '%s' "x")"; cmd="${cmd%
x}"; fi;; esac
    [ -e "$cmd" ] || exit 1
    # resolve and canonicalize an existing path portably
    cmd="$(command -p -- realpath -- "$cmd" 2>/dev/null; printf -- '%s' "x")"
    cmd="${cmd%
x}"
    [ -e "$cmd" ] || exit 1
    printf -- '%s' "${cmd}x"
)"

  # safeguard here has no additional newlines, only the last character
  set -- "$1" "${2%x}"

  # safeguard against failed subshell: read will pass with zero return code, but its varible will be empty and path empty is an error
  [ -n "$2" ] || return 3

  eval $1='$2'
}

#-------------------------------------------------------------------------------

lang()
(
  [ "$#" -eq 2 ] && case "${1}${2}" in [!a-z0-9]* | *[!a-z0-9._-]* | *[._-]) false;; esac || return 1

  lang_message="$(command -p -- cat "$m_LANG_CURRENT_DIR/$1/$2" 2>/dev/null)" || \
  lang_message="$(command -p -- cat "$m_LANG_FALLBACK_DIR/$1/$2" 2>/dev/null)" || \
  lang_message="${1}.${2}"

  printf -- '%s\n' "$lang_message"
)
#-------------------------------------------------------------------------------

: "${m_LOG_LEVEL:=info}"

export -- m_LOG_LEVEL

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
        "5") printf -- '%s ' "invalid log message id: $@" >&2;;
        "6") printf -- '%s ' "invalid parity check of <field, value> pairs: $@" >&2;;
        "7") printf -- '%s ' "invalid field name: $@" >&2;;
        *) printf -- '%s ' "unknown error: $@" >&2;;
      esac
      printf -- '\n' >&2

      exit "$exit_code"
    fi
  )
}

#-------------------------------------------------------------------------------

shell()
{
  : "${SHELL:=sh}"

  : "${m_SHELL_NAME:=}"
  m_SHELL_NAME="${SHELL##*/}"
  export -- m_SHELL_NAME
  printf -- '%s\n'  "$(tput setaf 2)$(tput bold)${m_SHELL_NAME} $(tput setaf 7)${m_OS_NAME}$(tput sgr0)" >&2

  : "${m_SHELL_EXT:=}"
  export m_SHELL_EXT

  case "${SHELL##*/}" in
    bash)
      exec "$SHELL" --rcfile "$m_CONF_DIR/shell/bash/bashrc" "$@"
      ;;

    zsh)
      m_SHELL_ZDOTDIR="${ZDOTDIR:-$HOME}"
      export -- m_SHELL_ZDOTDIR

      m_SHELL_ZDOTDIR_INIT="$m_CONF_DIR/shell/zsh"
      export -- m_SHELL_ZDOTDIR_INIT

      ZDOTDIR="$m_SHELL_ZDOTDIR_INIT"
      export -- ZDOTDIR

      exec "$SHELL" "$@"
      ;;

    sh | dash | ash | ksh | mksh)
      m_SHELL_ENV="${ENV-}"
      export -- m_SHELL_ENV

      ENV="$m_CONF_DIR/shell/sh/env"
      export -- ENV

      exec "$SHELL" "$@"
      ;;

    *)
      exec "$SHELL" "$@"
      ;;
  esac
}

#-------------------------------------------------------------------------------
