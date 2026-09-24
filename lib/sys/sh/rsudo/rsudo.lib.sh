#!/bin/sh

# rsudo [--interactive] [--askpass] [--connect user@host] [--load file:name] [--user sudo_as_user] [submodule] [--] [args]
#
# if not provided on command line if env vars are defined outside, then they will be used
# in any case if password is empty in interactive sessions is asked to user, if RSUDO_ASKPASS=true it is read from pipe
# if args are empty and not attached to pipe or RSUDO_INTERACTIVE=true, an interactive session is started, otherwise non interactive
# a single arg is treated as multiple command and passed to sh -c, otherwise args are treated to preserve quotes and be correctly executed without extreme escaping
# submodule is sourced allowing recursive calls to rsudo reuse env vars (not exported) of the same process

#------------------------------------------------------------------------------

. "$m_LIB_DIR/sys/sh/rand.lib.sh"
. "$m_LIB_DIR/sys/sh/enc.lib.sh"
. "$m_LIB_DIR/sys/sh/rsudo/rsudo-env.lib.sh"

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
{
  # log message stating rsudo is started and parameters used
  log info rsudo start user "$RSUDO_USER" host "$RSUDO_HOST" command "$*"
  log debug rsudo password-state present "$([ -n "$RSUDO_PASSWORD" ] && printf '%s' true || printf '%s' false)"

  # basic env vars check
  if [ -z "$RSUDO_HOST" ] || [ -z "$RSUDO_USER" ] || [ -z "$RSUDO_PASSWORD" ]
  then
    exit 1
  fi

  # check args and eventually manipulate them to a usable form
  if [ "$#" -eq "0" ] || [ -z "$*" ]
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
  else
    if [ "$RSUDO_INTERACTIVE" = "true" ] && [ ! -t 0 ]
    then
      RSUDO_PIPE_COMMANDS="$(cat)"
      if [ -n "$RSUDO_PIPE_COMMANDS" ]
      then
        set -- "${RSUDO_PIPE_COMMANDS}" "$@"
      fi
    fi

    if [ "$RSUDO_NO_PRESERVE_QUOTES" != "true" ]
    then
      if [ "$#" -gt "1" ]
      then
        set -- "$(quote "$@")"
      fi

      set -- sh -c "$(quote "$@")"
      # actually equivalent to because of prior check/set: set -- sh -c "$(quote "$1")"
    fi
  fi

  # prepare ipc to rsudo-askpass
  RSUDO_IPC_CHANNEL="$(ipc_create "$RSUDO_RUNTIME_DIR")" || return 1
  RSUDO_IPC_TOKEN="$(randhex 32)" || { ipc_destroy "$RSUDO_IPC_CHANNEL"; return 1; }
  (
      set +x

      ipc_open "$RSUDO_IPC_CHANNEL" a 3 4 || exit 20

      _token="$(ipc_read 3)" || {
          ipc_close 3 4
          exit 21
      }

      [ "$_token" = "$RSUDO_IPC_TOKEN" ] || {
          ipc_close 3 4
          exit 22
      }

      ipc_write 4 "$RSUDO_PASSWORD" || {
          ipc_close 3 4
          exit 23
      }

      _ack="$(ipc_read 3)" || {
          ipc_close 3 4
          exit 24
      }

      [ "$_ack" = "ok" ] || {
          ipc_close 3 4
          exit 25
      }

      ipc_close 3 4
  ) &
  RSUDO_IPC_PID="$!"

  # export DISPLAY=":0.0"
  export SSH_ASKPASS="$m_BIN_SYS_DIR/rsudo-askpass"
  export SSH_ASKPASS_REQUIRE="force"

  # check if impersonating another user
  if [ -n "$RSUDO_AS_USER" ]
  then
    SUDO_AS_USER="--user=\"$RSUDO_AS_USER\""
  fi

  # execute an interactive or non interactive session
  if [ "$RSUDO_INTERACTIVE" != "true" ]
  then
    # non interactive command
    log debug rsudo execution-mode mode non-interactive

    # ssh contract is to guarrantee that pipe data is sent correctly and secretly to ssh command, thus piping password is secure
    (printf '%s\n' "$RSUDO_PASSWORD"; [ ! -t 0 ] && cat) | \
    ssh -l "$RSUDO_USER" "$RSUDO_HOST" \
    "sudo -K; (sudo -n true 1>/dev/null 2>/dev/null) && read SUDO_PASS;" \
    sudo -S --prompt='' $SUDO_AS_USER -- "$@"

    EXIT_CODE="$?"
  else
    # interactive command
    log debug rsudo execution-mode mode interactive

    export RSUDO_TOKEN="$(randstr 255)"
    RSUDO_REMOTE_FIFO="/tmp/$(randstr 32)"
    RSUDO_PASSWORD_ENCODED="$(printf '%s\n' "$RSUDO_PASSWORD" | RSUDO_TOKEN="$RSUDO_TOKEN" openssl enc -e -aes-256-cbc -pbkdf2 -pass "env:RSUDO_TOKEN" | openssl enc -e -A -base64)"

    RSUDO_DAEMON_COMMANDS="$(cat << EOF
trap "rm -f '$RSUDO_REMOTE_FIFO'" INT QUIT TERM HUP PIPE ABRT TSTP EXIT
mkfifo "$RSUDO_REMOTE_FIFO"
chmod 600 "$RSUDO_REMOTE_FIFO"
printf '%s\n' "READY" > "$RSUDO_REMOTE_FIFO"
read RSUDO_TOKEN < "$RSUDO_REMOTE_FIFO"
if [ "\$RSUDO_TOKEN" = "$RSUDO_TOKEN" ]
then
  # printf '%s\n' "$RSUDO_PASSWORD" > "$RSUDO_REMOTE_FIFO"
  printf '%s\n' "$RSUDO_PASSWORD_ENCODED" > "$RSUDO_REMOTE_FIFO"
else
  printf '%s\n' "wrong RSUDO_TOKEN!" > "$RSUDO_REMOTE_FIFO"
fi
read RSUDO_ACKNOWLEDGEMENT < "$RSUDO_REMOTE_FIFO"
rm -f '$RSUDO_REMOTE_FIFO'
EOF
)"

    ((printf '%s\n' "$RSUDO_PASSWORD"; printf '%s\n' "$RSUDO_DAEMON_COMMANDS") | RSUDO_INTERACTIVE="" ssh -l "$RSUDO_USER" "$RSUDO_HOST" sh -s) &

    export RSUDO_FIFO="/tmp/$(randstr 32)"
    # delete redundant to ensure removal even on some interruption
    trap "rm -f '$RSUDO_FIFO'" INT QUIT TERM HUP PIPE ABRT TSTP EXIT
    mkfifo "$RSUDO_FIFO"
    chmod 600 "$RSUDO_FIFO"
    exec 3<>"$RSUDO_FIFO"
    # printf '%s\n' "$RSUDO_PASSWORD" > "$RSUDO_FIFO"
    printf '%s\n' "$RSUDO_PASSWORD_ENCODED" > "$RSUDO_FIFO"

    ssh -t -l "$RSUDO_USER" "$RSUDO_HOST" \
    while [ ! -e "$RSUDO_REMOTE_FIFO" ]\; do true\; done\; \
    read RSUDO_DAEMON_READY \< "$RSUDO_REMOTE_FIFO"\; printf "'%s\n'" "$RSUDO_TOKEN" \> "$RSUDO_REMOTE_FIFO"\; read RSUDO_PASSWORD \< "$RSUDO_REMOTE_FIFO"\; printf "'%s\n'" "OK_ACKNOWLEDGED" \> "$RSUDO_REMOTE_FIFO"\; \
    'RSUDO_PASSWORD=$(printf "%s\n" "$RSUDO_PASSWORD" | openssl enc -d -A -base64 | RSUDO_TOKEN="'$RSUDO_TOKEN'" openssl enc -d -aes-256-cbc -pbkdf2 -pass "env:RSUDO_TOKEN");' \
    printf "'%s\n'" '"$RSUDO_PASSWORD"' \| sudo -S --prompt='' -- true\; sudo $SUDO_AS_USER -- "$@" </dev/tty

    EXIT_CODE="$?"

    # delete redundant with rsudo-askpass to ensure removal even on some interruption
    rm -f "$RSUDO_FIFO"
  fi

  log info rsudo end user "$RSUDO_USER" host "$RSUDO_HOST" status "$EXIT_CODE" command "$*"

  return "$EXIT_CODE"
}

#------------------------------------------------------------------------------

# replaces "rsudo command" with "rsudo function" to allow safe use of env (without exporting) in recursive calls
rsudo()
{
  while [ "$#" -gt "0" ] && [ "$1" != "--" ] && [ "$1" != "${1#--}" ]
  do
    case "$1" in
      --no-preserve-quotes) RSUDO_NO_PRESERVE_QUOTES="true";;
      --interactive) RSUDO_INTERACTIVE="true";;
      --askpass) RSUDO_ASKPASS="true";;
      --connect)
        shift

        [ "$1" = "${1#*@}" ] && log fatal execution invalid-arguments operand connect value "$1"

        RSUDO_HOST="${1#*@}"
        RSUDO_USER="${1%@*}"
      ;;
      --load)
        shift

        [ "$1" = "${1%:*}" ] && fatal execution invalid-arguments operand load value "$1"

        ENV_ENCODED_FILE="${1%:*}"
        ENV_GROUP_NAME="${1#*:}"

        if [ -z "$ENV_ENCODED_FILE" ]
        then
          log warn rsudo env-file-fallback reason not-provided
        elif ! rsudoenv_load "$ENV_ENCODED_FILE"
        then
          log warn rsudo env-file-fallback reason load-failed file "$ENV_ENCODED_FILE"
        fi

        eval "RSUDO_HOST=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_HOST\""
        eval "RSUDO_USER=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_USER\""
        eval "RSUDO_PASSWORD=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_PASS\""
      ;;
      --user) shift; RSUDO_AS_USER="$1";;
      *) fatal execution invalid-arguments option "$1";;
    esac
    shift
  done



  # validate connection args: RSUDO_HOST, RSUDO_USER, RSUDO_PASSWORD.
  if [ -z "$RSUDO_HOST" ]
  then
    log fatal execution invalid-arguments field rsudo-host reason empty
    exit 1
  fi

  if [ -z "$RSUDO_USER" ]
  then
    log info rsudo user-defaulted user "$USER"
    RSUDO_USER="$USER"
  fi

  if [ "$RSUDO_ASKPASS" = "true" ] && [ ! -t 0 ]
  then
    log debug rsudo password-source source pipe
    read -r RSUDO_PASSWORD
  elif [ -z "$RSUDO_PASSWORD" ] && [ -t 0 ]
  then
    log debug rsudo password-source source tty
    RSUDO_PASSWORD="$(readpass "[rsudo] Enter password for ${RSUDO_USER}@${RSUDO_HOST}:" < /dev/tty)"
  fi

  if [ -z "$RSUDO_PASSWORD" ]
  then
    log fatal execution invalid-arguments field rsudo-password reason empty
    exit 1
  fi

  log debug rsudo connection-state host "$RSUDO_HOST" user "$RSUDO_USER" password-present "$([ -n "$RSUDO_PASSWORD" ] && printf '%s' true || printf '%s' false)"



  # determine what has to be called: rsudo_core or a sub-module.
  if [ "$1" = "--" ]
  then
    shift
    rsudo_core "$@"
  elif RSUDO_MODULE="rsudo-mod-${1}.lib.sh" && command -v "$RSUDO_MODULE" > /dev/null
  then
    # RSUDO_MODULE_PREFIX="rsudo_mod_${1}"
    RSUDO_MODULE_PREFIX="rsudo_mod_$(printf '%s\n' "$1" | sed 's/-/_/g')"
    shift
    log debug rsudo module-load module "$RSUDO_MODULE" prefix "$RSUDO_MODULE_PREFIX" arguments "$*"
    . "$RSUDO_MODULE"
    if exist_function "${RSUDO_MODULE_PREFIX}"
    then
      log debug rsudo module-delegate function "$RSUDO_MODULE_PREFIX"
      "${RSUDO_MODULE_PREFIX}" "$@"
    elif exist_function "${RSUDO_MODULE_PREFIX}"_"$1"
    then
      log debug rsudo module-delegate function "${RSUDO_MODULE_PREFIX}_$1"
      "${RSUDO_MODULE_PREFIX}"_"$@"
    else
      log debug rsudo module-delegate-missing module "$RSUDO_MODULE"
    fi
  else
    rsudo_core "$@"
  fi
}

#------------------------------------------------------------------------------
