loadsyslib "rand"
loadsyslib "ipc"

#------------------------------------------------------------------------------

ssh_auth()
(
  set +x

  [ "$#" -ge 2 ] || exit 2
  [ -n "$1" ] || exit 1

  _ssh_auth_secret="$1"
  case "$_ssh_auth_secret" in
    *'
'*) exit 1 ;;
  esac
  shift

  _ssh_auth_dir=""
  _ssh_auth_fifo=""
  _ssh_auth_broker_pid=""

  _ssh_auth_cleanup()
  {
    _ssh_auth_cleanup_status=0

    if [ -n "$_ssh_auth_broker_pid" ]
    then
      kill "$_ssh_auth_broker_pid" 2>/dev/null || :
      wait "$_ssh_auth_broker_pid" 2>/dev/null || :
      _ssh_auth_broker_pid=""
    fi

    if [ -n "$_ssh_auth_fifo" ]
    then
      if [ -e "$_ssh_auth_fifo" ] || [ -L "$_ssh_auth_fifo" ]
      then
        [ -p "$_ssh_auth_fifo" ] && [ ! -L "$_ssh_auth_fifo" ] ||
          _ssh_auth_cleanup_status=1
        rm -f "$_ssh_auth_fifo" 2>/dev/null ||
          _ssh_auth_cleanup_status=1
      fi
      _ssh_auth_fifo=""
    fi

    if [ -n "$_ssh_auth_dir" ]
    then
      if [ -e "$_ssh_auth_dir" ] || [ -L "$_ssh_auth_dir" ]
      then
        [ -d "$_ssh_auth_dir" ] && [ ! -L "$_ssh_auth_dir" ] ||
          _ssh_auth_cleanup_status=1
        rmdir "$_ssh_auth_dir" 2>/dev/null ||
          _ssh_auth_cleanup_status=1
      fi
      _ssh_auth_dir=""
    fi

    return "$_ssh_auth_cleanup_status"
  }

  _ssh_auth_terminate()
  {
    _ssh_auth_signal="$1"

    trap - 0 "$_ssh_auth_signal"
    _ssh_auth_cleanup

    kill -s "$_ssh_auth_signal" "$$"
  }

  trap '_ssh_auth_cleanup' 0
  trap '_ssh_auth_terminate HUP' HUP
  trap '_ssh_auth_terminate INT' INT
  trap '_ssh_auth_terminate QUIT' QUIT
  trap '_ssh_auth_terminate TERM' TERM

  _ssh_auth_base="${TMPDIR:-/tmp}"
  case "$_ssh_auth_base" in
    /*) ;;
    *) exit 1 ;;
  esac

  [ -d "$_ssh_auth_base" ] && [ -w "$_ssh_auth_base" ] || exit 1

  _ssh_auth_try=0

  while [ "$_ssh_auth_try" -lt 10 ]
  do
    _ssh_auth_token="$(randhex 16)" || exit 1
    [ "${#_ssh_auth_token}" -eq 32 ] || exit 1
    [ "$_ssh_auth_token" = "${_ssh_auth_token%%[!0123456789abcdef]*}" ] || exit 1

    _ssh_auth_dir="${_ssh_auth_base%/}/ssh-auth.$_ssh_auth_token"

    if (umask 077; mkdir "$_ssh_auth_dir" 2>/dev/null)
    then
      break
    fi

    _ssh_auth_dir=""
    _ssh_auth_try="$((_ssh_auth_try + 1))"
  done

  [ -n "$_ssh_auth_dir" ] || exit 1
  chmod 700 "$_ssh_auth_dir" || exit 1

  _ssh_auth_fifo="$_ssh_auth_dir/secret"
  (umask 077; mkfifo "$_ssh_auth_fifo") || exit 1
  chmod 600 "$_ssh_auth_fifo" || exit 1

  (
    set +x

    while :
    do
      printf '%s\n' "$_ssh_auth_secret" > "$_ssh_auth_fifo" || exit 0
    done
  ) &
  _ssh_auth_broker_pid="$!"
  case "$_ssh_auth_broker_pid" in
    ''|*[!0123456789]*) exit 1 ;;
  esac

  unset _ssh_auth_secret

  SSH_ASKPASS="$m_BIN_SYS_DIR/ssh-askpass" \
  SSH_ASKPASS_REQUIRE="force" \
  m_SSH_ASKPASS_FIFO="$_ssh_auth_fifo" \
  ssh \
    -o BatchMode=no \
    -o StrictHostKeyChecking=yes \
    "$@"
  _ssh_auth_status="$?"

  _ssh_auth_cleanup || exit 1
  trap - 0 HUP INT QUIT TERM

  exit "$_ssh_auth_status"
)

#------------------------------------------------------------------------------

ssh_password()
(
  set +x

  [ "$#" -ge 2 ] || exit 2
  [ -n "$1" ] || exit 1

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
