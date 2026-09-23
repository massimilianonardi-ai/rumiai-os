#!/bin/sh

# rsudo [--interactive] [--askpass] [--connect user@host] [--load file:name] [--user sudo_as_user] [submodule] [--] [args]
#
# if not provided on command line if env vars are defined outside, then they will be used
# in any case if password is empty in interactive sessions is asked to user, if RSUDO_ASKPASS=true it is read from pipe
# if args are empty and not attached to pipe or RSUDO_INTERACTIVE=true, an interactive session is started, otherwise non interactive
# a single arg is treated as multiple command and passed to sh -c, otherwise args are treated to preserve quotes and be correctly executed without extreme escaping
# submodule is sourced allowing recursive calls to rsudo reuse env vars (not exported) of the same process

#------------------------------------------------------------------------------

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
  log info "RSUDO >>> START - $RSUDO_USER@$RSUDO_HOST: $@"
  log debug "RSUDO_PASSWORD $([ -n "$RSUDO_PASSWORD" ] && echo "is not null" || echo "is null")"

  if [ -z "$RSUDO_HOST" ] || [ -z "$RSUDO_USER" ] || [ -z "$RSUDO_PASSWORD" ]
  then
    exit 1
  fi

  # check args
  if [ "$#" -eq "0" ] || [ -z "$*" ]
  then
    log debug "rsudo no args"
    if [ -t 0 ]
    then
      log debug "tty present, setting interactive session = true and su command"
      RSUDO_INTERACTIVE="true"
      set -- su
    else
      log debug "pipe present, set command as /bin/sh -s (execute stream commands)"
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
      # set -- sh -c "$(quote "$1")"
    fi
  fi

  # log debug "ARGS - START"
  # for k in "$@"
  # do
  #   log debug "$k"
  # done
  # log debug "ARGS - END"

  # prepare vars for executing
  # export DISPLAY=":0.0"
  export SSH_ASKPASS="rsudo-askpass"
  export SSH_ASKPASS_REQUIRE="force"

  # check if impersonating another user
  if [ -n "$RSUDO_AS_USER" ]
  then
    SUDO_AS_USER="--user=\"$RSUDO_AS_USER\""
  fi

  # execute an interactive or non interactive session
  if [ "$RSUDO_INTERACTIVE" = "true" ]
  then
    # interactive command
    log debug "interactive command"

    export RSUDO_TOKEN="$(randstr 255)"
    RSUDO_REMOTE_FIFO="/tmp/$(randstr 32)"
    RSUDO_PASSWORD_ENCODED="$(echo "$RSUDO_PASSWORD" | RSUDO_TOKEN="$RSUDO_TOKEN" openssl enc -e -aes-256-cbc -pbkdf2 -pass "env:RSUDO_TOKEN" | openssl enc -e -A -base64)"

    RSUDO_DAEMON_COMMANDS="$(cat << EOF
trap "rm -f '$RSUDO_REMOTE_FIFO'" INT QUIT TERM HUP PIPE ABRT TSTP EXIT
mkfifo "$RSUDO_REMOTE_FIFO"
chmod 600 "$RSUDO_REMOTE_FIFO"
echo "READY" > "$RSUDO_REMOTE_FIFO"
read RSUDO_TOKEN < "$RSUDO_REMOTE_FIFO"
if [ "\$RSUDO_TOKEN" = "$RSUDO_TOKEN" ]
then
  # echo "$RSUDO_PASSWORD" > "$RSUDO_REMOTE_FIFO"
  echo "$RSUDO_PASSWORD_ENCODED" > "$RSUDO_REMOTE_FIFO"
else
  echo "wrong RSUDO_TOKEN!" > "$RSUDO_REMOTE_FIFO"
fi
read RSUDO_ACKNOWLEDGEMENT < "$RSUDO_REMOTE_FIFO"
rm -f '$RSUDO_REMOTE_FIFO'
EOF
)"

    ((echo "$RSUDO_PASSWORD"; echo "$RSUDO_DAEMON_COMMANDS") | RSUDO_INTERACTIVE="" ssh -l "$RSUDO_USER" "$RSUDO_HOST" sh -s) &

    export RSUDO_FIFO="/tmp/$(randstr 32)"
    # delete redundant to ensure removal even on some interruption
    trap "rm -f '$RSUDO_FIFO'" INT QUIT TERM HUP PIPE ABRT TSTP EXIT
    mkfifo "$RSUDO_FIFO"
    chmod 600 "$RSUDO_FIFO"
    exec 3<>"$RSUDO_FIFO"
    # echo "$RSUDO_PASSWORD" > "$RSUDO_FIFO"
    echo "$RSUDO_PASSWORD_ENCODED" > "$RSUDO_FIFO"

    ssh -t -l "$RSUDO_USER" "$RSUDO_HOST" \
    while [ ! -e "$RSUDO_REMOTE_FIFO" ]\; do true\; done\; \
    read RSUDO_DAEMON_READY \< "$RSUDO_REMOTE_FIFO"\; echo "$RSUDO_TOKEN" \> "$RSUDO_REMOTE_FIFO"\; read RSUDO_PASSWORD \< "$RSUDO_REMOTE_FIFO"\; echo "OK_ACKNOWLEDGED" \> "$RSUDO_REMOTE_FIFO"\; \
    'RSUDO_PASSWORD=$(echo "$RSUDO_PASSWORD" | openssl enc -d -A -base64 | RSUDO_TOKEN="'$RSUDO_TOKEN'" openssl enc -d -aes-256-cbc -pbkdf2 -pass "env:RSUDO_TOKEN");' \
    echo '$RSUDO_PASSWORD' \| sudo -S --prompt='' -- true\; sudo $SUDO_AS_USER -- "$@" </dev/tty

    EXIT_CODE="$?"

    # delete redundant with rsudo-askpass to ensure removal even on some interruption
    rm -f "$RSUDO_FIFO"
  else
    # non interactive command
    log debug "non interactive command"

    (echo "$RSUDO_PASSWORD"; echo "$RSUDO_PASSWORD"; [ ! -t 0 ] && cat) | \
    ssh -l "$RSUDO_USER" "$RSUDO_HOST" \
    "sudo -K; (sudo -n true 1>/dev/null 2>/dev/null) && read SUDO_PASS;" \
    sudo -S --prompt='' $SUDO_AS_USER -- "$@"

    EXIT_CODE="$?"
  fi

  log info "RSUDO <<< ENDED - $RSUDO_USER@$RSUDO_HOST: $@"

  return "$EXIT_CODE"
}

#------------------------------------------------------------------------------

# replaces "rsudo command" with "rsudo function" to allow safe use of env (without exporting) in recursive calls
rsudo()
{
# (
  while [ "$#" -gt "0" ] && [ "$1" != "--" ] && [ "$1" != "${1#--}" ]
  do
    case "$1" in
      --no-preserve-quotes) RSUDO_NO_PRESERVE_QUOTES="true";;
      --interactive) RSUDO_INTERACTIVE="true";;
      --askpass) RSUDO_ASKPASS="true";;
      --connect)
        shift

        if [ "$1" = "${1#*@}" ]
        then
          log fatal "wrong connection string: $1"
          exit 1
        fi

        RSUDO_HOST="${1#*@}"
        RSUDO_USER="${1%@*}"
      ;;
      --load)
        shift

        if [ "$1" = "${1%:*}" ]
        then
          log fatal "wrong load string: $1"
          exit 1
        fi

        ENV_ENCODED_FILE="${1%:*}"
        ENV_GROUP_NAME="${1#*:}"

        if [ -z "$ENV_ENCODED_FILE" ]
        then
          log warn "env file not provided, searching into current env."
        elif ! rsudoenv_load "$ENV_ENCODED_FILE"
        then
          log warn "env file error! not loaded, searching into current env."
        fi

        eval "RSUDO_HOST=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_HOST\""
        eval "RSUDO_USER=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_USER\""
        eval "RSUDO_PASSWORD=\"\$RSUDO_ENV_${ENV_GROUP_NAME}_PASS\""
      ;;
      --user) shift; RSUDO_AS_USER="$1";;
      *) log fatal "bad option: '$1'"; exit 1;;
    esac
    shift
  done



  # validate connection args: RSUDO_HOST, RSUDO_USER, RSUDO_PASSWORD.
  if [ -z "$RSUDO_HOST" ]
  then
    log fatal "empty RSUDO_HOST"
    exit 1
  fi

  if [ -z "$RSUDO_USER" ]
  then
    log info "empty RSUDO_USER, setting it to '$USER'"
    RSUDO_USER="$USER"
  fi

  if [ "$RSUDO_ASKPASS" = "true" ] && [ ! -t 0 ]
  then
    log debug "read pass from pipe"
    read -r RSUDO_PASSWORD
  elif [ -z "$RSUDO_PASSWORD" ] && [ -t 0 ]
  then
    log debug "read pass from tty"
    RSUDO_PASSWORD="$(readpass "[rsudo] Enter password for ${RSUDO_USER}@${RSUDO_HOST}:" < /dev/tty)"
  fi

  if [ -z "$RSUDO_PASSWORD" ]
  then
    log fatal "empty RSUDO_PASSWORD"
    exit 1
  fi

  log debug "RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD $([ -n "$RSUDO_PASSWORD" ] && echo "is not null" || echo "is null")"



  # determine what has to be called: rsudo_core or a sub-module.
  if [ "$1" = "--" ]
  then
    shift
    rsudo_core "$@"
  elif RSUDO_MODULE="rsudo-mod-${1}.lib.sh" && command -v "$RSUDO_MODULE" > /dev/null
  then
    # RSUDO_MODULE_PREFIX="rsudo_mod_${1}"
    RSUDO_MODULE_PREFIX="rsudo_mod_$(echo "$1" | sed 's/-/_/g')"
    shift
    log debug "loading module RSUDO_MODULE=$RSUDO_MODULE - RSUDO_MODULE_PREFIX=$RSUDO_MODULE_PREFIX - RSUDO_MODULE_ARGS=$@"
    . "$RSUDO_MODULE"
    if exist_function "${RSUDO_MODULE_PREFIX}"
    then
      log debug "delegate to module function: ${RSUDO_MODULE_PREFIX}"
      "${RSUDO_MODULE_PREFIX}" "$@"
    elif exist_function "${RSUDO_MODULE_PREFIX}"_"$1"
    then
      log debug "delegate to module function: ${RSUDO_MODULE_PREFIX}_$1"
      "${RSUDO_MODULE_PREFIX}"_"$@"
    else
      log debug "no module function to delegate to"
    fi
  else
    rsudo_core "$@"
  fi
# )
}

#------------------------------------------------------------------------------
