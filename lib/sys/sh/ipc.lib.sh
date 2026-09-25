. "$m_LIB_DIR/sys/sh/rand.lib.sh"

#-------------------------------------------------------------------------------

_ipc_fd_valid()
{
  [ "$#" -eq "1" ] || return 2

  case "$1" in
    [3-9]) return 0 ;;
    *) return 1 ;;
  esac
}

#-------------------------------------------------------------------------------

_ipc_pid_valid()
{
  [ "$#" -eq "1" ] || return 2

  case "$1" in
    "" | 0* | *[!0123456789]*) return 1 ;;
  esac

  [ "$1" -gt "0" ] 2>/dev/null
}

#-------------------------------------------------------------------------------

_ipc_channel_valid()
(
  [ "$#" -eq "1" ] || return 2

  case "$1" in
    /*) ;;
    *) return 1 ;;
  esac

  _ipc_name="${1##*/}"
  _ipc_rest="${_ipc_name#ipc.}"

  [ "$_ipc_rest" != "$_ipc_name" ] || return 1

  _ipc_pid="${_ipc_rest%%.*}"
  _ipc_token="${_ipc_rest#*.}"

  [ "$_ipc_token" != "$_ipc_rest" ] || return 1
  _ipc_pid_valid "$_ipc_pid" || return 1

  [ "${#_ipc_token}" -eq "32" ] || return 1
  [ "$_ipc_token" = "${_ipc_token%%[!0123456789abcdef]*}" ] || return 1
)

#-------------------------------------------------------------------------------

# ipc_create [base_dir]
# creates a private duplex IPC channel and prints its directory path
ipc_create()
(
  set +x

  [ "$#" -le "1" ] || return 2

  _ipc_base="${1:-${TMPDIR:-/tmp}}"

  [ "${_ipc_base#/}" != "$_ipc_base" ] || return 1

  [ -d "$_ipc_base" ] && [ -w "$_ipc_base" ] || return 1

  umask 077
  _ipc_try="0"

  while [ "$_ipc_try" -lt "10" ]
  do
    _ipc_token="$(randhex 16)" || return 1

    [ "${#_ipc_token}" -eq "32" ] || return 1
    [ "$_ipc_token" = "${_ipc_token%%[!0123456789abcdef]*}" ] || return 1

    _ipc_dir="${_ipc_base%/}/ipc.$$.$_ipc_token"

    if mkdir "$_ipc_dir" 2>/dev/null
    then
      _ipc_ab="$_ipc_dir/a-to-b"
      _ipc_ba="$_ipc_dir/b-to-a"

      if ! mkfifo "$_ipc_ab" "$_ipc_ba" 2>/dev/null
      then
        rm -f "$_ipc_ab" "$_ipc_ba"
        rmdir "$_ipc_dir" 2>/dev/null || :
        return 1
      fi

      chmod 700 "$_ipc_dir" ||
      {
        rm -f "$_ipc_ab" "$_ipc_ba"
        rmdir "$_ipc_dir" 2>/dev/null || :
        return 1
      }

      chmod 600 "$_ipc_ab" "$_ipc_ba" ||
      {
        rm -f "$_ipc_ab" "$_ipc_ba"
        rmdir "$_ipc_dir" 2>/dev/null || :
        return 1
      }

      printf '%s\n' "$_ipc_dir"
      return 0
    fi

    _ipc_try="$((_ipc_try + 1))"
  done

  return 1
)

#-------------------------------------------------------------------------------

# ipc_open channel endpoint read_fd write_fd
# endpoint must be "a" or "b"; read_fd and write_fd must be different FDs 3..9
# blocks until both endpoints are connected; endpoint a then removes the FIFO paths
ipc_open()
{
  [ "$#" -eq "4" ] || return 2

  _ipc_dir="$1"
  _ipc_endpoint="$2"
  _ipc_read_fd="$3"
  _ipc_write_fd="$4"

  _ipc_channel_valid "$_ipc_dir" || return 1
  _ipc_fd_valid "$_ipc_read_fd" || return 1
  _ipc_fd_valid "$_ipc_write_fd" || return 1
  [ "$_ipc_read_fd" != "$_ipc_write_fd" ] || return 1

  [ -d "$_ipc_dir" ] && [ ! -L "$_ipc_dir" ] || return 1

  _ipc_ab="$_ipc_dir/a-to-b"
  _ipc_ba="$_ipc_dir/b-to-a"

  [ -p "$_ipc_ab" ] && [ ! -L "$_ipc_ab" ] || return 1
  [ -p "$_ipc_ba" ] && [ ! -L "$_ipc_ba" ] || return 1

  case "$_ipc_endpoint" in
    a)
      _ipc_read_fifo="$_ipc_ba"
      _ipc_write_fifo="$_ipc_ab"

      eval "exec ${_ipc_write_fd}> \"\$_ipc_write_fifo\"" || return 1

      if ! eval "exec ${_ipc_read_fd}< \"\$_ipc_read_fifo\""
      then
        eval "exec ${_ipc_write_fd}>&-"
        return 1
      fi

      if ! rm -f "$_ipc_ab" "$_ipc_ba" || ! rmdir "$_ipc_dir"
      then
        eval "exec ${_ipc_read_fd}<&-"
        eval "exec ${_ipc_write_fd}>&-"
        return 1
      fi
    ;;

    b)
      _ipc_read_fifo="$_ipc_ab"
      _ipc_write_fifo="$_ipc_ba"

      eval "exec ${_ipc_read_fd}< \"\$_ipc_read_fifo\"" || return 1

      if ! eval "exec ${_ipc_write_fd}> \"\$_ipc_write_fifo\""
      then
        eval "exec ${_ipc_read_fd}<&-"
        return 1
      fi
    ;;

    *)
      return 1
    ;;
  esac

  unset _ipc_dir
  unset _ipc_endpoint
  unset _ipc_read_fd
  unset _ipc_write_fd
  unset _ipc_ab
  unset _ipc_ba
  unset _ipc_read_fifo
  unset _ipc_write_fifo

  return 0
}

#-------------------------------------------------------------------------------

# ipc_write write_fd data
# writes one newline-delimited shell string record; data must not contain newline
ipc_write()
(
  set +x

  [ "$#" -eq "2" ] || return 2
  _ipc_fd_valid "$1" || return 1

  case "$2" in
    *'
'*) return 1 ;;
  esac

  _ipc_fd="$1"

  eval "exec 1>&${_ipc_fd}" || return 1
  printf '%s\n' "$2"
)

#-------------------------------------------------------------------------------

# ipc_read read_fd
# reads one newline-delimited shell string record and writes it to stdout
ipc_read()
(
  set +x

  [ "$#" -eq "1" ] || return 2
  _ipc_fd_valid "$1" || return 1

  _ipc_fd="$1"

  eval "exec 0<&${_ipc_fd}" || return 1
  IFS= read -r _ipc_data || return 1
  printf '%s' "$_ipc_data"
)

#-------------------------------------------------------------------------------

# ipc_close read_fd write_fd
# closes both ends of an open IPC endpoint
ipc_close()
{
  [ "$#" -eq "2" ] || return 2

  _ipc_fd_valid "$1" || return 1
  _ipc_fd_valid "$2" || return 1
  [ "$1" != "$2" ] || return 1

  eval "exec $1<&-" || return 1
  eval "exec $2>&-" || return 1
}

#-------------------------------------------------------------------------------

# ipc_sync pid
# waits for an asynchronous IPC child operation and returns its status
ipc_sync()
{
  [ "$#" -eq "1" ] || return 2
  _ipc_pid_valid "$1" || return 1

  wait "$1"
}

#-------------------------------------------------------------------------------

# ipc_cancel pid
# stops an asynchronous IPC child operation started by the current shell and reaps it
ipc_cancel()
{
  [ "$#" -eq "1" ] || return 2
  _ipc_pid_valid "$1" || return 1

  kill "$1" 2>/dev/null || :
  wait "$1" 2>/dev/null || :
}

#-------------------------------------------------------------------------------

# ipc_destroy channel
# removes an unused channel or cleans an incomplete rendezvous after all openers ended
ipc_destroy()
(
  set +x

  [ "$#" -eq "1" ] || return 2

  _ipc_dir="$1"

  _ipc_channel_valid "$_ipc_dir" || return 1

  [ ! -L "$_ipc_dir" ] || return 1

  if [ ! -d "$_ipc_dir" ]
  then
    _ipc_parent="${_ipc_dir%/*}"
    [ -n "$_ipc_parent" ] || _ipc_parent="/"
    [ -d "$_ipc_parent" ] && [ -x "$_ipc_parent" ] || return 1

    if command -p ls -d "$_ipc_dir" >/dev/null 2>&1
    then
      return 1
    fi

    return 0
  fi

  _ipc_ab="$_ipc_dir/a-to-b"
  _ipc_ba="$_ipc_dir/b-to-a"

  if [ -p "$_ipc_ab" ] && [ ! -L "$_ipc_ab" ]
  then
    _ipc_has_fifo="1"
  else
    _ipc_has_fifo="0"
  fi

  if [ -p "$_ipc_ba" ] && [ ! -L "$_ipc_ba" ]
  then
    _ipc_has_fifo="1"
  fi

  [ "$_ipc_has_fifo" -eq "1" ] || return 1

  if [ -p "$_ipc_ab" ] && [ ! -L "$_ipc_ab" ]
  then
    rm -f "$_ipc_ab" || return 1
  fi

  if [ -p "$_ipc_ba" ] && [ ! -L "$_ipc_ba" ]
  then
    rm -f "$_ipc_ba" || return 1
  fi

  rmdir "$_ipc_dir"
)

#-------------------------------------------------------------------------------

#-------------------------------------------------------------------------------

# ipc_once_clear result_variable
# revokes an unread one-shot value or reaps an already consumed one
ipc_once_clear()
{
  [ "$#" -eq "1" ] || return 2

  _ipc_once_clear_var="$1"

  valid_shell_identifier "$_ipc_once_clear_var" || {
    unset _ipc_once_clear_var
    return 1
  }

  case "$_ipc_once_clear_var" in
    _ipc_*)
      unset _ipc_once_clear_var
      return 1
    ;;
  esac

  eval "_ipc_once_clear_id=\${${_ipc_once_clear_var}-}"

  if [ -z "$_ipc_once_clear_id" ]
  then
    unset "$_ipc_once_clear_var"
    unset _ipc_once_clear_var _ipc_once_clear_id
    return 0
  fi

  case "$_ipc_once_clear_id" in
    *:/*) ;;
    *)
      unset _ipc_once_clear_var _ipc_once_clear_id
      return 1
    ;;
  esac

  _ipc_once_clear_pid="${_ipc_once_clear_id%%:*}"
  _ipc_once_clear_channel="${_ipc_once_clear_id#*:}"

  _ipc_pid_valid "$_ipc_once_clear_pid" || {
    unset \
      _ipc_once_clear_var \
      _ipc_once_clear_id \
      _ipc_once_clear_pid \
      _ipc_once_clear_channel
    return 1
  }

  _ipc_channel_valid "$_ipc_once_clear_channel" || {
    unset \
      _ipc_once_clear_var \
      _ipc_once_clear_id \
      _ipc_once_clear_pid \
      _ipc_once_clear_channel
    return 1
  }

  ipc_cancel "$_ipc_once_clear_pid" || {
    unset \
      _ipc_once_clear_var \
      _ipc_once_clear_id \
      _ipc_once_clear_pid \
      _ipc_once_clear_channel
    return 1
  }

  if ! ipc_destroy "$_ipc_once_clear_channel"
  then
    unset \
      _ipc_once_clear_var \
      _ipc_once_clear_id \
      _ipc_once_clear_pid \
      _ipc_once_clear_channel
    return 1
  fi

  unset "$_ipc_once_clear_var"

  unset \
    _ipc_once_clear_var \
    _ipc_once_clear_id \
    _ipc_once_clear_pid \
    _ipc_once_clear_channel

  return 0
}

#-------------------------------------------------------------------------------

# ipc_once_set result_variable value [base_dir]
# replaces result_variable with an opaque id for a private one-shot value
ipc_once_set()
{
  [ "$#" -ge "2" ] && [ "$#" -le "3" ] || return 2

  _ipc_once_set_var="$1"

  valid_shell_identifier "$_ipc_once_set_var" || {
    unset _ipc_once_set_var
    return 1
  }

  case "$_ipc_once_set_var" in
    _ipc_*)
      unset _ipc_once_set_var
      return 1
    ;;
  esac

  _ipc_once_set_value="$2"
  _ipc_once_set_base="${3-}"

  case "$_ipc_once_set_value" in
    *'
'*)
      unset _ipc_once_set_var _ipc_once_set_value _ipc_once_set_base
      return 1
    ;;
  esac

  ipc_once_clear "$_ipc_once_set_var" || {
    unset _ipc_once_set_var _ipc_once_set_value _ipc_once_set_base
    return 1
  }

  _ipc_once_set_channel="$(ipc_create "$_ipc_once_set_base")" || {
    unset _ipc_once_set_var _ipc_once_set_value _ipc_once_set_base
    return 1
  }

  (
    set +x

    ipc_open "$_ipc_once_set_channel" a 3 4 || exit 20

    ipc_write 4 "$_ipc_once_set_value" || {
      ipc_close 3 4
      exit 21
    }

    unset _ipc_once_set_value

    ipc_close 3 4 || exit 22
  ) &

  _ipc_once_set_pid="$!"

  _ipc_pid_valid "$_ipc_once_set_pid" || {
    ipc_destroy "$_ipc_once_set_channel" 2>/dev/null || :
    unset \
      _ipc_once_set_var \
      _ipc_once_set_value \
      _ipc_once_set_base \
      _ipc_once_set_channel \
      _ipc_once_set_pid
    return 1
  }

  _ipc_once_set_id="${_ipc_once_set_pid}:${_ipc_once_set_channel}"

  if ! eval "${_ipc_once_set_var}=\$_ipc_once_set_id"
  then
    ipc_cancel "$_ipc_once_set_pid"
    ipc_destroy "$_ipc_once_set_channel" 2>/dev/null || :

    unset \
      _ipc_once_set_var \
      _ipc_once_set_value \
      _ipc_once_set_base \
      _ipc_once_set_channel \
      _ipc_once_set_pid \
      _ipc_once_set_id

    return 1
  fi

  unset \
    _ipc_once_set_var \
    _ipc_once_set_value \
    _ipc_once_set_base \
    _ipc_once_set_channel \
    _ipc_once_set_pid \
    _ipc_once_set_id

  return 0
}

#-------------------------------------------------------------------------------

# ipc_once_get id
# consumes one one-shot value and writes it to stdout
ipc_once_get()
(
  set +x

  [ "$#" -eq "1" ] || return 2

  _ipc_once_get_id="$1"

  case "$_ipc_once_get_id" in
    *:/*) ;;
    *) return 1 ;;
  esac

  _ipc_once_get_pid="${_ipc_once_get_id%%:*}"
  _ipc_once_get_channel="${_ipc_once_get_id#*:}"

  _ipc_pid_valid "$_ipc_once_get_pid" || return 1
  _ipc_channel_valid "$_ipc_once_get_channel" || return 1

  ipc_open "$_ipc_once_get_channel" b 3 4 || return 1

  if ! ipc_read 3
  then
    ipc_close 3 4
    return 1
  fi

  ipc_close 3 4 || return 1
)
