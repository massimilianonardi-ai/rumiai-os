#!/bin/sh

. log.lib.sh
. env.lib.sh
. enc.lib.sh

#------------------------------------------------------------------------------

rsudoenv()
{
  rsudoenv_"$@"
}

# pass - asks user on tty for encoding/decoding password to keep in env for silent operations
rsudoenv_pass()
{
  RSUDO_ENC_PASS="$(readpass "[rsudoenv] enter $([ -z "$1" ] && echo "DEFAULT" || echo "'$1'") encoding/decoding password")"
}

# load $files - load each encoded $files (password from env)
rsudoenv_load()
{
  log_debug "rsudoenv_load: $@"
  while [ "$#" -gt "0" ]
  do
    log_echo "rsudoenv_load: '$1'"
    if ! ENC_PASS="$RSUDO_ENC_PASS" encoded_file_import "$1"
    then
      log_error "rsudoenv_load: cannot load '$1'"
      shift
      log_trace "rsudoenv_load: keep trying loading: $@"
      # this recursion allows to keep loading files, while returning error at the end without polluting environment variables
      rsudoenv_load "$@"
      return 1
    fi
    shift
  done
}

# save $file - save each named group of connection variables in the form RSUDO_ENV_${name}_HOST, RSUDO_ENV_${name}_USER and RSUDO_ENV_${name}_PASS into encoded file $file (password from env)
rsudoenv_save()
{
  log_debug "$(echo "rsudoenv_save RSUDO_ENV:"; env_return export $(env_list "RSUDO_ENV"))"

  log_echo "rsudoenv_save rsudo env connection vars to file:'$1'"
  env_return code $(env_list "RSUDO_ENV") | ENC_PASS="$RSUDO_ENC_PASS" encode > "$1"
}

# sets the editor to use when calling edit
rsudoenv_editor()
{
  RSUDO_ENV_EDITOR="$1"
}

# edit $file - calls the current editor (default is nano) to decode, edit and reencode $file
rsudoenv_edit()
{
  (
    # silently reusing env pass for decoding/re-encoding
    ENC_PASS="$RSUDO_ENC_PASS"
    encoded_file_editor "$RSUDO_ENV_EDITOR"
    encoded_file_edit "$1"
  )
}

#------------------------------------------------------------------------------

rsudoenv_echo()
{
  echo "rsudoenv_get: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD $([ -n "$RSUDO_PASSWORD" ] && echo "is not null" || echo "is null")"
}

# get - sets connection environment variables RSUDO_HOST, RSUDO_USER and RSUDO_PASSWORD form various sources
# get $name - gets variables from a named group of variables of the form RSUDO_ENV_${name}_HOST, RSUDO_ENV_${name}_USER and RSUDO_ENV_${name}_PASS
# get $env_file:$name - loads file $env_file, then gets variables from a named group $name
# get user@host - gets user and host from command line and asks user for password from tty
# get @host - gets user from current user and host from command line and asks user for password from tty
rsudoenv_get()
{
  if [ -z "$1" ]
  then
    log_debug "rsudoenv_get: empty arg"
    return 1
  fi

  if [ "$1" != "${1#*@}" ]
  then
    # user@host | @host -> always asks for password from tty user input
    log_debug "rsudoenv_get: ARG=$1 - RSUDO_HOST=${1#*@} - RSUDO_USER=${1%@*}"
    RSUDO_HOST="${1#*@}"
    RSUDO_USER="${1%@*}"
  else
    # env_name, :env_name, env_encoded_file:env_name
    log_debug "rsudoenv_get: ARG=$1 - ENV_ENCODED_FILE=$([ "$1" = "${1%:*}" ] && echo "" || echo "${1%:*}") - ENV_GROUP_NAME=${1#*:}"
    if [ "${1%:*}" != "$1" ] && ! rsudoenv_load "${1%:*}" || [ -z "${1%:*}" ]
    then
      log_warn "env file not provided, or not found, searching into current env."
    fi

    set -- "${1#*:}"

    eval "RSUDO_HOST=\"\$RSUDO_ENV_${1}_HOST\""
    eval "RSUDO_USER=\"\$RSUDO_ENV_${1}_USER\""
    eval "RSUDO_PASSWORD=\"\$RSUDO_ENV_${1}_PASS\""

    if [ -z "$RSUDO_HOST" ]
    then
      log_debug "rsudoenv_get: empty RSUDO_HOST from env group '$1'"
      return 1
    fi
  fi

  if [ -z "$RSUDO_USER" ]
  then
    # if user is not stored, it is intentionally wanted set it to current user
    log_info "rsudoenv_get: empty RSUDO_USER, setting it to '$USER'"
    RSUDO_USER="$USER"
  fi

  if [ "$1" != "${1#*@}" ] || [ -z "$RSUDO_PASSWORD" ]
  then
    # user@host | @host -> always asks for password from tty user input
    # if password is not stored, it is intentionally wanted set it to ask for it at runtime
    RSUDO_PASSWORD="$(readpass "[rsudo] Enter password for ${RSUDO_USER}@${RSUDO_HOST}:")"
  fi

  log_debug "rsudoenv_get: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD $([ -n "$RSUDO_PASSWORD" ] && echo "is not null" || echo "is null")"
  # log_trace "rsudoenv_get: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD=$RSUDO_PASSWORD"
}

# set $name - sets a named group $name of connection variables from current RSUDO_HOST, RSUDO_USER and RSUDO_PASSWORD environment variables
# set $name $get_args - sets/copy a named group $name of connection variables from source defined by $get_args without changing current connection variables
rsudoenv_set()
{
  if [ -z "$1" ]
  then
    log_debug "rsudoenv_set: empty args"
    return 1
  fi

  if [ -z "$2" ]
  then
    eval "RSUDO_ENV_${1}_HOST=\"\${RSUDO_HOST}\""
    eval "RSUDO_ENV_${1}_USER=\"\${RSUDO_USER}\""
    eval "RSUDO_ENV_${1}_PASS=\"\${RSUDO_PASSWORD}\""
  else
    eval "$(
      rsudoenv_get "$2"
      echo "RSUDO_ENV_${1}_HOST=\"${RSUDO_HOST}\""
      echo "RSUDO_ENV_${1}_USER=\"${RSUDO_USER}\""
      echo "RSUDO_ENV_${1}_PASS=\"${RSUDO_PASSWORD}\""
    )"
  fi

  eval "log_debug \"rsudoenv_set: RSUDO_ENV_${1}_HOST=\$RSUDO_ENV_${1}_HOST | RSUDO_ENV_${1}_USER=\$RSUDO_ENV_${1}_USER\""
  # eval "log_trace \"rsudoenv_set: RSUDO_ENV_${1}_HOST=\$RSUDO_ENV_${1}_HOST | RSUDO_ENV_${1}_USER=\$RSUDO_ENV_${1}_USER | RSUDO_ENV_${1}_PASS=\$RSUDO_ENV_${1}_PASS\""
  log_trace "rsudoenv_set: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD=$RSUDO_PASSWORD"
}

# unset - unsets current connection variables RSUDO_HOST, RSUDO_USER and RSUDO_PASSWORD
# unset $name - unsets variables of a named group of variables of the form RSUDO_ENV_${name}_HOST, RSUDO_ENV_${name}_USER and RSUDO_ENV_${name}_PASS
rsudoenv_unset()
{
  if [ -z "$1" ]
  then
    log_debug "rsudoenv_unset: empty name, resetting RSUDO_HOST, RSUDO_USER, RSUDO_PASSWORD"
    eval "unset RSUDO_HOST"
    eval "unset RSUDO_USER"
    eval "unset RSUDO_PASSWORD"

    log_debug "rsudoenv_get: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER"
    # log_trace "rsudoenv_get: RSUDO_HOST=$RSUDO_HOST | RSUDO_USER=$RSUDO_USER | RSUDO_PASSWORD=$RSUDO_PASSWORD"
  else
    log_debug "rsudoenv_unset: unsetting group name \"$1\""
    eval "unset RSUDO_ENV_${1}_HOST"
    eval "unset RSUDO_ENV_${1}_USER"
    eval "unset RSUDO_ENV_${1}_PASS"

    eval "log_debug \"rsudoenv_unset: RSUDO_ENV_${1}_HOST=\$RSUDO_ENV_${1}_HOST | RSUDO_ENV_${1}_USER=\$RSUDO_ENV_${1}_USER\""
    # eval "log_trace \"rsudoenv_unset: RSUDO_ENV_${1}_HOST=\$RSUDO_ENV_${1}_HOST | RSUDO_ENV_${1}_USER=\$RSUDO_ENV_${1}_USER | RSUDO_ENV_${1}_PASS=\$RSUDO_ENV_${1}_PASS\""
  fi
}

#------------------------------------------------------------------------------

# rsudoenv_exec "$env_groups" command: executes command for each server in $env_groups
rsudoenv_exec()
{
  for k in $1
  do
    (
      log debug "rsudoenv_exec env_group=\$1" $k
      rsudoenv get "$k"
      shift
      "$@"
    )
  done
}

#------------------------------------------------------------------------------
