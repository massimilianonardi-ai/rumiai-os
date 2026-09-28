# Generator for explicit in-memory system-library injection streams.
#
# Public function:
#   loadlib_inject_stream COMMAND_SOURCE LIBRARY_REFERENCE... -- [COMMAND_ARG...]
#
# The caller supplies the complete embedded library set, including base.
# No dependency parsing or transitive-closure discovery is performed.

loadlib_inject_stream()
(
  [ "$#" -ge 3 ] || return 1

  _loadlib_inject_stream_command=$1
  shift

  [ -f "$_loadlib_inject_stream_command" ] &&
    [ -r "$_loadlib_inject_stream_command" ] ||
    return 2

  _loadlib_inject_stream_refs=
  _loadlib_inject_stream_count=0
  _loadlib_inject_stream_base=0

  while [ "$#" -gt 0 ] && [ "$1" != "--" ]
  do
    [ -n "$1" ] || return 1

    _loadlib_inject_stream_path="$m_LIB_DIR/sys/sh/${1}.lib.sh"
    [ -f "$_loadlib_inject_stream_path" ] &&
      [ -r "$_loadlib_inject_stream_path" ] ||
      return 2

    _loadlib_inject_stream_quoted_ref="$(quote "$1")" || return 3
    if [ -n "$_loadlib_inject_stream_refs" ]
    then
      _loadlib_inject_stream_refs="$_loadlib_inject_stream_refs $_loadlib_inject_stream_quoted_ref"
    else
      _loadlib_inject_stream_refs=$_loadlib_inject_stream_quoted_ref
    fi

    [ "$1" = "base" ] && _loadlib_inject_stream_base=1
    _loadlib_inject_stream_count=$((_loadlib_inject_stream_count + 1))
    shift
  done

  [ "$#" -gt 0 ] && [ "$1" = "--" ] || return 1
  shift

  [ "$_loadlib_inject_stream_count" -gt 0 ] || return 1
  [ "$_loadlib_inject_stream_base" -eq 1 ] || return 1

  _loadlib_inject_stream_args="$(quote "$@")" || return 3

  eval "set -- $_loadlib_inject_stream_refs"

  _loadlib_inject_stream_index=0
  for _loadlib_inject_stream_ref
  do
    _loadlib_inject_stream_index=$((_loadlib_inject_stream_index + 1))
    _loadlib_inject_stream_path="$m_LIB_DIR/sys/sh/${_loadlib_inject_stream_ref}.lib.sh"

    printf '\n_loadlib_inject_%s()\n{\n' "$_loadlib_inject_stream_index" || exit 3
    cat "$_loadlib_inject_stream_path" || exit 3
    printf '\n}\n' || exit 3
  done

  printf '\nloadlib()\n{\n' || exit 3
  printf '  [ "$#" -eq 1 ] || return 1\n' || exit 3
  printf '  case "$1" in\n' || exit 3

  _loadlib_inject_stream_index=0
  for _loadlib_inject_stream_ref
  do
    _loadlib_inject_stream_index=$((_loadlib_inject_stream_index + 1))
    _loadlib_inject_stream_case="$(quote "sys/sh/$_loadlib_inject_stream_ref")" || exit 3
    printf '    %s) _loadlib_inject_%s ;;\n' \
      "$_loadlib_inject_stream_case" \
      "$_loadlib_inject_stream_index" ||
      exit 3
  done

  printf '    *) return 2 ;;\n' || exit 3
  printf '  esac\n' || exit 3
  printf '}\n\n' || exit 3

  printf 'loadlib "sys/sh/base" || exit "$?"\n\n' || exit 3

  if [ -n "$_loadlib_inject_stream_args" ]
  then
    printf 'set -- %s\n\n' "$_loadlib_inject_stream_args" || exit 3
  else
    printf 'set --\n\n' || exit 3
  fi

  cat "$_loadlib_inject_stream_command" || exit 3
)
