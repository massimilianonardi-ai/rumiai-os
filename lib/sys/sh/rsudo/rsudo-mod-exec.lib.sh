#------------------------------------------------------------------------------

loadsyslib "loadlib-inject-stream"

#------------------------------------------------------------------------------

rsudo_mod_exec_inject()
(
  _rsudo_mod_exec_inject_source="$(loadlib_inject_stream "$@" || exit "$?"; printf x)" || exit "$?"
  _rsudo_mod_exec_inject_source=${_rsudo_mod_exec_inject_source%x}
  printf '%s' "$_rsudo_mod_exec_inject_source" | rsudo
)

#------------------------------------------------------------------------------
