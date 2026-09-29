# rsudo [--interactive] [--askpass] [--connect user@host] [--load file:name] [--user sudo_as_user] [submodule] [--] [args]
#
# if not provided on command line if env vars are defined outside, then they will be used
# in any case if password is empty in interactive sessions is asked to user, if RSUDO_ASKPASS=true it is read from pipe
# if args are empty and not attached to pipe or RSUDO_INTERACTIVE=true, an interactive session is started, otherwise non interactive
# a single arg is treated as multiple command and passed to sh -c, otherwise args are treated to preserve quotes and be correctly executed without extreme escaping
# submodule is sourced allowing recursive calls to rsudo reuse env vars (not exported) of the same process

#------------------------------------------------------------------------------

loadsyslib "rand"
loadsyslib "enc"
loadsyslib "ssh"

#------------------------------------------------------------------------------

# needs the following env vars to be defined outside
#
# required:
# RSUDO_HOST
# RSUDO_USER
# RSUDO_PASSWORD
#
# optional:
# RSUDO_AS_USER
# RSUDO_INTERACTIVE
# RSUDO_ASKPASS

rsudo_core()
(
  set +x

  # log message stating rsudo is started and parameters used
  log info rsudo start user "$RSUDO_USER" host "$RSUDO_HOST" command "$*"
  log debug rsudo password-state present "$([ -n "$RSUDO_PASSWORD" ] && printf '%s' true || printf '%s' false)"

  # basic env vars check
  [ -n "$RSUDO_HOST" ] && [ -n "$RSUDO_USER" ] && [ -n "$RSUDO_PASSWORD" ] || exit 1

  # check args and eventually manipulate them to a usable form
  RSUDO_PIPE_SOURCE=""

  if [ "$RSUDO_INTERACTIVE" = "true" ] && [ ! -t 0 ]
  then
    RSUDO_PIPE_SOURCE="$(cat && printf x)" || exit 2
    RSUDO_PIPE_SOURCE="${RSUDO_PIPE_SOURCE%x}"
  fi

  if [ -n "$RSUDO_PIPE_SOURCE" ]
  then
    if [ "$#" -gt "0" ]
    then
      if [ "$RSUDO_NO_PRESERVE_QUOTES" = "true" ]
      then
        RSUDO_PIPE_SOURCE="${RSUDO_PIPE_SOURCE}
$*"
      else
        RSUDO_PIPE_SOURCE="${RSUDO_PIPE_SOURCE}
$(quote "$@")"
      fi
    fi

    set -- sh -c "$(quote "$RSUDO_PIPE_SOURCE")"
  elif [ "$#" -eq "0" ] || [ -z "$*" ]
  then
    log debug rsudo no-arguments
    if [ -t 0 ]
    then
      log debug rsudo default-command mode interactive command su reason tty-present
      RSUDO_INTERACTIVE="true"
      set -- su
    else
      log debug rsudo default-command mode non-interactive command "sh -s" reason stdin-not-tty
      set -- sh -s
    fi
  elif [ "$RSUDO_NO_PRESERVE_QUOTES" != "true" ]
  then
    [ "$#" -gt "1" ] && set -- "$(quote "$@")"
    set -- sh -c "$(quote "$1")"
  fi

  unset RSUDO_PIPE_SOURCE



  # prepare cleanup
  RSUDO_DAEMON_PID=""

  _rsudo_core_cleanup()
  {
    if [ -n "$RSUDO_DAEMON_PID" ]
    then
      kill "$RSUDO_DAEMON_PID" 2>/dev/null || :
      wait "$RSUDO_DAEMON_PID" 2>/dev/null || :
      RSUDO_DAEMON_PID=""
    fi
  }

  _rsudo_core_terminate()
  {
    signal=$1

    trap - 0 "$signal"
    _rsudo_core_cleanup

    kill -s "$signal" "$$"
  }

  trap '_rsudo_core_cleanup' 0

  trap '_rsudo_core_terminate HUP'  HUP
  trap '_rsudo_core_terminate INT'  INT
  trap '_rsudo_core_terminate QUIT' QUIT
  trap '_rsudo_core_terminate TERM' TERM


  # execute an interactive or non interactive session
  if [ "$RSUDO_INTERACTIVE" != "true" ]
  then
    # -------------------------------------------------------------------------
    # non interactive command
    log debug rsudo execution-mode mode non-interactive

    (printf '%s\n' "$RSUDO_PASSWORD"; if [ ! -t 0 ]; then cat; fi) | \
    ssh_auth "$RSUDO_PASSWORD" -l "$RSUDO_USER" "$RSUDO_HOST" \
    "sudo -K; (sudo -n true 1>/dev/null 2>/dev/null) && read SUDO_PASS;" \
    sudo -S --prompt=''${RSUDO_AS_USER:+ --user "$RSUDO_AS_USER"} -- "$@"

    RSUDO_STATUS="$?"
  else
    # -------------------------------------------------------------------------
    # interactive command
    log debug rsudo execution-mode mode interactive

    RSUDO_REMOTE_TOKEN="$(randhex 16)" || exit 1

    # setup commands for 1st ssh
    RSUDO_REMOTE_DAEMON="$(cat <<EOF
umask 077
RSUDO_DIR="\${TMPDIR:-/tmp}/rsudo.$RSUDO_REMOTE_TOKEN"
RSUDO_FIFO="\$RSUDO_DIR/password"

cleanup()
{
  rm -f "\$RSUDO_FIFO" 2>/dev/null || :
  rmdir "\$RSUDO_DIR" 2>/dev/null || :
}

trap cleanup 0 HUP INT QUIT TERM

mkdir "\$RSUDO_DIR" || exit 1
mkfifo "\$RSUDO_FIFO" || exit 1

IFS= read -r RSUDO_PASSWORD || exit 1

printf '%s\n' "\$RSUDO_PASSWORD" > "\$RSUDO_FIFO" || exit 1

unset RSUDO_PASSWORD
EOF
)" || exit 1

    # launch 1st ssh (daemon password broker)
    (printf '%s\n' "$RSUDO_PASSWORD" | ssh_auth "$RSUDO_PASSWORD" -l "$RSUDO_USER" "$RSUDO_HOST" "$RSUDO_REMOTE_DAEMON") &

    RSUDO_DAEMON_PID="$!"

    # setup commands for 2nd ssh
    RSUDO_REMOTE_INTERACTIVE="$(cat <<EOF
RSUDO_DIR="\${TMPDIR:-/tmp}/rsudo.$RSUDO_REMOTE_TOKEN"
RSUDO_FIFO="\$RSUDO_DIR/password"

RSUDO_WAIT=0
while [ ! -p "\$RSUDO_FIFO" ]
do
  RSUDO_WAIT="\$((RSUDO_WAIT + 1))"
  [ "\$RSUDO_WAIT" -lt 60 ] || exit 1
  sleep 1
done

IFS= read -r RSUDO_PASSWORD < "\$RSUDO_FIFO" || exit 1

printf '%s\n' "\$RSUDO_PASSWORD" | sudo -S --prompt='' -v || exit 1

unset RSUDO_PASSWORD;
EOF
)" || exit 1

    ssh_auth "$RSUDO_PASSWORD" -t -l "$RSUDO_USER" "$RSUDO_HOST" \
    "$RSUDO_REMOTE_INTERACTIVE" sudo${RSUDO_AS_USER:+ --user "$RSUDO_AS_USER"} -- "$@" </dev/tty

    RSUDO_STATUS="$?"

    wait "$RSUDO_DAEMON_PID" 2>/dev/null
    RSUDO_DAEMON_STATUS="$?"
    RSUDO_DAEMON_PID=""

    if [ "$RSUDO_STATUS" -eq 0 ] && [ "$RSUDO_DAEMON_STATUS" -ne 0 ]
    then
      RSUDO_STATUS="$RSUDO_DAEMON_STATUS"
    fi
  fi

  log info rsudo end user "$RSUDO_USER" host "$RSUDO_HOST" status "$RSUDO_STATUS" argn "$#"
  log trace rsudo end user "$RSUDO_USER" host "$RSUDO_HOST" status "$RSUDO_STATUS" command "$*"

  exit "$RSUDO_STATUS"
)

#------------------------------------------------------------------------------

# replaces "rsudo command" with "rsudo function" to allow safe use of env (without exporting) in recursive calls
rsudo()
{
  RSUDO_NO_PRESERVE_QUOTES=""
  RSUDO_ASKPASS=""
  RSUDO_SSH_AUTH_CHECK=""

  while [ "$#" -gt "0" ]
  do
    case "$1" in
      --) break;;
      --ssh-auth-check) RSUDO_SSH_AUTH_CHECK="true";;
      --no-preserve-quotes) RSUDO_NO_PRESERVE_QUOTES="true";;
      --interactive) RSUDO_INTERACTIVE="true";;
      --askpass) RSUDO_ASKPASS="true";;

      --user)
        shift
        [ "$#" -ge "1" ] && [ -n "$1" ] || { log fatal execution invalid-arguments operand user reason missing; return 1; }
        RSUDO_AS_USER="$1"
      ;;

      --connect)
        shift
        [ "$#" -ge "1" ] || { log fatal execution invalid-arguments operand connect reason missing; return 2; }

        # exactly one @.
        case "$1" in
          *@*@*) log fatal execution invalid-arguments operand connect value "$1"; return 3;;
          *@*) : ;;
          *) log fatal execution invalid-arguments operand connect value "$1"; return 4;;
        esac

        RSUDO_USER="${1%%@*}"
        RSUDO_HOST="${1#*@}"

        [ -z "$RSUDO_HOST" ] && { log fatal execution invalid-arguments operand connect value "$1"; return 5; }
      ;;

      --load)
        shift
        [ "$#" -ge "1" ] || { log fatal execution invalid-arguments operand load reason missing; return 6; }
        case "$1" in
          *:*) : ;;
          *) log fatal execution invalid-arguments operand load value "$1"; return 7;;
        esac

        # last ':' is the separator:
        #   file:name
        #   path:with:colons:name
        #   :name
        RSUDO_ENCODED_FILE="${1%:*}"
        RSUDO_CREDENTIALS_GROUP_NAME="${1##*:}"

        if [ -z "$RSUDO_ENCODED_FILE" ]
        then
          log warn rsudo env-file-fallback reason not-provided
        elif ! encoded_file_eval "$RSUDO_ENCODED_FILE"
        then
          log warn rsudo env-file-fallback reason load-failed file "$RSUDO_ENCODED_FILE"
        fi

        if valid_shell_identifier "$RSUDO_CREDENTIALS_GROUP_NAME"
        then
          eval "RSUDO_HOST=\"\${RSUDO_CREDENTIALS_GROUP_${RSUDO_CREDENTIALS_GROUP_NAME}_HOST-}\""
          eval "RSUDO_USER=\"\${RSUDO_CREDENTIALS_GROUP_${RSUDO_CREDENTIALS_GROUP_NAME}_USER-}\""
          eval "RSUDO_PASSWORD=\"\${RSUDO_CREDENTIALS_GROUP_${RSUDO_CREDENTIALS_GROUP_NAME}_PASS-}\""
        fi

        unset RSUDO_ENCODED_FILE RSUDO_CREDENTIALS_GROUP_NAME
      ;;

      --*) log fatal execution invalid-arguments option "$1"; return 8;;
      *) break;;
    esac
    shift
  done



  # validate connection args: RSUDO_HOST, RSUDO_USER, RSUDO_PASSWORD.
  [ -z "${RSUDO_HOST-}" ] && { log fatal execution invalid-arguments field rsudo-host reason empty; return 9; }

  if [ -z "${RSUDO_USER-}" ]
  then
    RSUDO_USER="${USER-}"
    [ -z "$RSUDO_USER" ] && { log fatal execution invalid-arguments field rsudo-user reason empty; return 10; }
    log info rsudo user-defaulted user "$RSUDO_USER"
  fi

  # acquire password when required.
  if [ "${RSUDO_ASKPASS-}" = "true" ] && [ ! -t 0 ]
  then
    log debug rsudo password-source source pipe
    if ! IFS= read -r RSUDO_PASSWORD
    then
      unset RSUDO_PASSWORD
      log fatal execution execution-failed operation rsudo-password-read source pipe
      return 11
    fi
  elif [ -z "${RSUDO_PASSWORD-}" ] && [ -t 0 ]
  then
    log debug rsudo password-source source tty
    if ! RSUDO_PASSWORD="$(readpass "[rsudo] Enter password for ${RSUDO_USER}@${RSUDO_HOST}:" < /dev/tty)"
    then
      unset RSUDO_PASSWORD
      log fatal execution execution-failed operation rsudo-password-read source tty
      return 12
    fi
  fi

  [ -z "${RSUDO_PASSWORD-}" ] && { log fatal execution invalid-arguments field rsudo-password reason empty; return 13; }

  log debug rsudo connection-state host "$RSUDO_HOST" user "$RSUDO_USER" password-present true



  if [ "${RSUDO_SSH_AUTH_CHECK-}" = "true" ]
  then
    unset RSUDO_SSH_AUTH_CHECK

    [ "$#" -eq 0 ] || { log fatal execution invalid-arguments option ssh-auth-check reason unexpected-operands; return 253; }

    [ -t 0 ] || { log fatal execution execution-failed operation ssh-auth-check reason tty-required; return 254; }

    log info rsudo ssh-auth-check start user "$RSUDO_USER" host "$RSUDO_HOST"

    SSH_ASKPASS_REQUIRE="never" ssh \
    -o BatchMode=no -o StrictHostKeyChecking=ask -o AddKeysToAgent=yes -o ControlPath=none \
    -l "$RSUDO_USER" "$RSUDO_HOST" true \
    && ssh_auth "$RSUDO_PASSWORD" -o ControlPath=none -l "$RSUDO_USER" "$RSUDO_HOST" true

    [ "$?" -ne "0" ] && { log fatal execution authentication-failed ssh-host "$RSUDO_HOST" ssh-user "$RSUDO_USER"; return 255; }

    log info rsudo ssh-auth-check end user "$RSUDO_USER" host "$RSUDO_HOST" status 0

    return 0
  fi



  # determine what has to be called: rsudo_core or a sub-module.
  if [ "$#" -gt 0 ] && [ "$1" = "--" ]
  then
    shift
    rsudo_core "$@"
  elif [ "$#" -ge "2" ] && valid_cli_name "$1" && [ -f "$m_LIB_DIR/sys/sh/rsudo/rsudo-mod-${1}.lib.sh" ] && [ -r "$m_LIB_DIR/sys/sh/rsudo/rsudo-mod-${1}.lib.sh" ]
  then
    log debug rsudo module-load module "$1" args "$*"

    valid_cli_name "$2" || { log fatal execution execution-failed operation rsudo-module-load function "$2"; return 14; }

    loadsyslib "rsudo/rsudo-mod-${1}" || { log fatal execution execution-failed operation rsudo-module-load module "$1"; return 15; }

    eval 'shift 2; set -- "rsudo_mod_'"$(printf '%s\n' "${1}_${2}" | sed 's/-/_/g')"'" "$@"'
    exist_function "$1" || { log fatal rsudo module-delegate-missing function "$1"; return 16; }
    "$@"
  else
    rsudo_core "$@"
  fi
}

#------------------------------------------------------------------------------
