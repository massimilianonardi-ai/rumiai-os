#------------------------------------------------------------------------------

loadsyslib "loadlib-inject-stream"

#------------------------------------------------------------------------------

rsudo_mod_exec_inject()
(
  _rsudo_mod_exec_inject_source=$(
    loadlib_inject_stream "$@"
    _rsudo_mod_exec_inject_status=$?

    [ "$_rsudo_mod_exec_inject_status" -eq 0 ] ||
      exit "$_rsudo_mod_exec_inject_status"

    printf x
  )
  _rsudo_mod_exec_inject_status=$?

  [ "$_rsudo_mod_exec_inject_status" -eq 0 ] ||
    return "$_rsudo_mod_exec_inject_status"

  _rsudo_mod_exec_inject_source=${_rsudo_mod_exec_inject_source%x}

  printf '%s' "$_rsudo_mod_exec_inject_source" | rsudo
)

#------------------------------------------------------------------------------
