#------------------------------------------------------------------------------

loadsyslib "loadlib-inject-stream"

#------------------------------------------------------------------------------

rsudo_mod_exec_inject()
(
  { loadlib_inject_stream "$@"; if [ ! -t 0 ]; then cat; fi; } | rsudo
)

#------------------------------------------------------------------------------

___rsudo_mod_exec_inject()
(
  _rsudo_exec_inject_command_mode=false

  for _rsudo_exec_inject_arg
  do
    if [ "$_rsudo_exec_inject_arg" = "--" ]
    then
      _rsudo_exec_inject_command_mode=true
      break
    fi
  done

  # Generate the complete injected-library source first.
  # The trailing sentinel preserves final newlines through command substitution.
  _rsudo_exec_inject_source="$(
    loadlib_inject_stream "$@"
    _rsudo_exec_inject_status=$?

    [ "$_rsudo_exec_inject_status" -eq 0 ] ||
      exit "$_rsudo_exec_inject_status"

    printf x
  )"
  _rsudo_exec_inject_status=$?

  [ "$_rsudo_exec_inject_status" -eq 0 ] ||
    return "$_rsudo_exec_inject_status"

  _rsudo_exec_inject_source=${_rsudo_exec_inject_source%x}

  # Without command-source mode, residual non-TTY stdin is additional
  # shell source executed after the injected libraries.
  if [ "$_rsudo_exec_inject_command_mode" != "true" ] && [ ! -t 0 ]
  then
    _rsudo_exec_inject_stdin="$(
      cat
      _rsudo_exec_inject_status=$?

      [ "$_rsudo_exec_inject_status" -eq 0 ] ||
        exit "$_rsudo_exec_inject_status"

      printf x
    )"
    _rsudo_exec_inject_status=$?

    [ "$_rsudo_exec_inject_status" -eq 0 ] ||
      return "$_rsudo_exec_inject_status"

    _rsudo_exec_inject_stdin=${_rsudo_exec_inject_stdin%x}

    if [ -n "$_rsudo_exec_inject_stdin" ]
    then
      _rsudo_exec_inject_source="${_rsudo_exec_inject_source}
${_rsudo_exec_inject_stdin}"
    fi
  fi

  # Recursive rsudo intentionally resets invocation-local modes.
  # Preserve only the outer sudo target user when explicitly selected.
  _rsudo_exec_inject_as_user=${RSUDO_AS_USER-}

  if [ -n "$_rsudo_exec_inject_as_user" ]
  then
    printf '%s\n' "$_rsudo_exec_inject_source" |
      rsudo \
        --interactive \
        --user "$_rsudo_exec_inject_as_user" \
        --
  else
    printf '%s\n' "$_rsudo_exec_inject_source" |
      rsudo \
        --interactive \
        --
  fi
)
