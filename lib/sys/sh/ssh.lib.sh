loadsyslib "ipc"

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
