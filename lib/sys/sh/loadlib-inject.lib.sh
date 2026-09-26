# In-memory loadlib backend for generated source-injection streams.
#
# The injection stream must redefine _loadlib_inject_dispatch after loading this
# library and before the first loadlib call. The generated dispatcher maps the
# explicitly embedded library references to their generated wrapper functions.
#
# Public function:
#   loadlib LIBRARY_REFERENCE
#
# Status:
#   delegated  status returned by the generated dispatcher/library wrapper
#   1          invalid invocation
#   2          library reference not available in the injected stream

_loadlib_inject_dispatch()
{
  return 2
}

loadlib()
{
  [ "$#" -eq 1 ] || return 1

  _loadlib_inject_dispatch "$1"
}
