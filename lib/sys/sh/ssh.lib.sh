loadsyslib "ipc"
loadsyslib "rand"

#------------------------------------------------------------------------------

_ssh_auth_cleanup()
{
  if [ -n "${_ssh_auth_broker_pid-}" ]
  then
    kill "$_ssh_auth_broker_pid" 2>/dev/null || :
    wait "$_ssh_auth_broker_pid" 2>/dev/null || :
    _ssh_auth_broker_pid=""
  fi

  if [ -n "${_ssh_auth_fifo-}" ]
  then
    rm -f "$_ssh_auth_fifo" 2>/dev/null || :
    _ssh_auth_fifo=""
  fi
}

#------------------------------------------------------------------------------

_ssh_auth_abort()
{
  _ssh_auth_abort_status="$1"

  trap - 0 HUP INT QUIT TERM
  _ssh_auth_cleanup

  exit "$_ssh_auth_abort_status"
}

#------------------------------------------------------------------------------

ssh_auth()
(
  set +x

  [ "$#" -ge 2 ] || exit 2
  [ -n "$1" ] || exit 1

  case "$1" in
    *'
'*) exit 1 ;;
  esac

  _ssh_auth_secret="$1"
  shift

  _ssh_auth_fifo=""
  _ssh_auth_broker_pid=""

  trap '_ssh_auth_cleanup' 0
  trap '_ssh_auth_abort 129' HUP
  trap '_ssh_auth_abort 130' INT
  trap '_ssh_auth_abort 131' QUIT
  trap '_ssh_auth_abort 143' TERM

  _ssh_auth_base="${TMPDIR:-/tmp}"
  [ -d "$_ssh_auth_base" ] && [ -w "$_ssh_auth_base" ] || exit 1

  _ssh_auth_try=0
  umask 077

  while [ "$_ssh_auth_try" -lt 10 ]
  do
    _ssh_auth_token="$(randhex 16)" || exit 1
    _ssh_auth_fifo="${_ssh_auth_base%/}/ssh-auth.$$.$_ssh_auth_token"

    if mkfifo "$_ssh_auth_fifo" 2>/dev/null
    then
      chmod 600 "$_ssh_auth_fifo" || exit 1
      break
    fi

    _ssh_auth_fifo=""
    _ssh_auth_try="$((_ssh_auth_try + 1))"
  done

  [ -n "$_ssh_auth_fifo" ] || exit 1

  (
    set +x

    trap - HUP INT QUIT TERM

    while :
    do
      printf '%s\n' "$_ssh_auth_secret" > "$_ssh_auth_fifo" || exit 0
    done
  ) &

  _ssh_auth_broker_pid="$!"
  unset _ssh_auth_secret

  SSH_ASKPASS="$m_BIN_SYS_DIR/ssh-askpass" \
  SSH_ASKPASS_REQUIRE="force" \
  m_SSH_ASKPASS_FIFO="$_ssh_auth_fifo" \
  ssh \
    -o BatchMode=no \
    -o ControlPath=none \
    "$@"
  _ssh_status="$?"

  _ssh_auth_cleanup

  trap - 0 HUP INT QUIT TERM

  exit "$_ssh_status"
)

#------------------------------------------------------------------------------

ssh_password()
(
  set +x

  [ "$#" -ge 2 ] || exit 2
  [ -n "$1" ] || exit 1

  case "$1" in
    *'
'*) exit 1 ;;
  esac

  _ssh_password="$1"
  shift
  _ssh_askpass_id=""

  _ssh_password_cleanup()
  {
    ipc_once_clear _ssh_askpass_id 2>/dev/null || :
  }

  _ssh_password_abort()
  {
    _ssh_abort_status="$1"

    trap - 0 HUP INT QUIT TERM
    _ssh_password_cleanup

    exit "$_ssh_abort_status"
  }

  trap '_ssh_password_cleanup' 0
  trap '_ssh_password_abort 129' HUP
  trap '_ssh_password_abort 130' INT
  trap '_ssh_password_abort 131' QUIT
  trap '_ssh_password_abort 143' TERM

  ipc_once_set _ssh_askpass_id "$_ssh_password" || exit 1
  unset _ssh_password

  SSH_ASKPASS="$m_BIN_SYS_DIR/ssh-askpass" \
  SSH_ASKPASS_REQUIRE="force" \
  m_SSH_ASKPASS_ID="$_ssh_askpass_id" \
  ssh \
    -o BatchMode=no \
    -o PasswordAuthentication=yes \
    -o PreferredAuthentications=password \
    -o NumberOfPasswordPrompts=1 \
    -o ControlPath=none \
    "$@"
  _ssh_status="$?"

  ipc_once_clear _ssh_askpass_id || exit 1
  _ssh_askpass_id=""

  trap - 0 HUP INT QUIT TERM

  exit "$_ssh_status"
)

#------------------------------------------------------------------------------
