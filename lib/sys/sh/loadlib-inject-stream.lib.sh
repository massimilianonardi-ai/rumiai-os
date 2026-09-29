# Generator for explicit in-memory system-library and command injection streams.
#
# Public function:
#   loadlib_inject_stream
#     [LIBRARY_REFERENCE | --command COMMAND_NAME LOCAL_SOURCE]...
#     [-- COMMAND_SOURCE [COMMAND_ARG...]]
#
# The caller supplies the complete embedded library set and named command-source
# set explicitly. No dependency parsing or transitive-closure discovery is
# performed. Non-TTY standard input, when present, is appended as shell source
# after the selected libraries, named commands and optional one-shot command.

loadlib_inject_stream()
(
  _loadlib_inject_stream_refs=
  _loadlib_inject_stream_count=0
  _loadlib_inject_stream_commands=
  _loadlib_inject_stream_command_names=
  _loadlib_inject_stream_command=
  _loadlib_inject_stream_args=
  _loadlib_inject_stream_has_command=0

  while [ "$#" -gt 0 ] && [ "$1" != "--" ]
  do
    if [ "$1" = "--command" ]
    then
      shift
      [ "$#" -ge 2 ] || return 1

      _loadlib_inject_stream_name=$1
      _loadlib_inject_stream_path=$2
      shift 2

      case "$_loadlib_inject_stream_name" in
        "" | [!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_]* | *[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_]*)
          return 1
          ;;
        case | do | done | elif | else | esac | fi | for | if | in | then | until | while)
          return 1
          ;;
        loadlib | _loadlib_inject_stream_*)
          return 1
          ;;
      esac

      case " $_loadlib_inject_stream_command_names " in
        *" $_loadlib_inject_stream_name "*) return 1 ;;
      esac

      [ -f "$_loadlib_inject_stream_path" ] &&
        [ -r "$_loadlib_inject_stream_path" ] ||
        return 2

      _loadlib_inject_stream_quoted_path="$(quote "$_loadlib_inject_stream_path")" || return 3
      if [ -n "$_loadlib_inject_stream_commands" ]
      then
        _loadlib_inject_stream_commands="$_loadlib_inject_stream_commands $_loadlib_inject_stream_name $_loadlib_inject_stream_quoted_path"
      else
        _loadlib_inject_stream_commands="$_loadlib_inject_stream_name $_loadlib_inject_stream_quoted_path"
      fi

      if [ -n "$_loadlib_inject_stream_command_names" ]
      then
        _loadlib_inject_stream_command_names="$_loadlib_inject_stream_command_names $_loadlib_inject_stream_name"
      else
        _loadlib_inject_stream_command_names=$_loadlib_inject_stream_name
      fi

      continue
    fi

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

    _loadlib_inject_stream_count=$((_loadlib_inject_stream_count + 1))
    shift
  done

  if [ "$#" -gt 0 ]
  then
    shift

    [ "$#" -gt 0 ] || return 1

    _loadlib_inject_stream_command=$1
    shift

    [ -f "$_loadlib_inject_stream_command" ] &&
      [ -r "$_loadlib_inject_stream_command" ] ||
      return 2

    _loadlib_inject_stream_args="$(quote "$@")" || return 3
    _loadlib_inject_stream_has_command=1
  fi

  eval "set -- $_loadlib_inject_stream_refs"

  _loadlib_inject_stream_index=0
  for _loadlib_inject_stream_ref
  do
    _loadlib_inject_stream_index=$((_loadlib_inject_stream_index + 1))
    _loadlib_inject_stream_path="$m_LIB_DIR/sys/sh/${_loadlib_inject_stream_ref}.lib.sh"

    printf '\n_loadlib_inject_stream_library_%s()\n{\n' "$_loadlib_inject_stream_index" || exit 3
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
    printf '    %s) _loadlib_inject_stream_library_%s ;;\n' \
      "$_loadlib_inject_stream_case" \
      "$_loadlib_inject_stream_index" ||
      exit 3
  done

  printf '    *) return 2 ;;\n' || exit 3
  printf '  esac\n' || exit 3
  printf '}\n' || exit 3

  if [ "$_loadlib_inject_stream_count" -gt 0 ]
  then
    printf '\n' || exit 3
    for _loadlib_inject_stream_ref
    do
      _loadlib_inject_stream_case="$(quote "sys/sh/$_loadlib_inject_stream_ref")" || exit 3
      printf 'loadlib %s || exit "$?"\n' "$_loadlib_inject_stream_case" || exit 3
    done
  fi

  if [ -n "$_loadlib_inject_stream_commands" ]
  then
    eval "set -- $_loadlib_inject_stream_commands"

    while [ "$#" -gt 0 ]
    do
      _loadlib_inject_stream_name=$1
      _loadlib_inject_stream_path=$2
      shift 2

      printf '\n%s()\n(\n' "$_loadlib_inject_stream_name" || exit 3
      cat "$_loadlib_inject_stream_path" || exit 3
      printf '\n)\n' || exit 3
    done
  fi

  if [ "$_loadlib_inject_stream_has_command" -eq 1 ]
  then
    printf '\n_loadlib_inject_stream_command()\n(\n' || exit 3
    cat "$_loadlib_inject_stream_command" || exit 3
    printf '\n)\n' || exit 3

    if [ -n "$_loadlib_inject_stream_args" ]
    then
      printf '\n_loadlib_inject_stream_command %s\n' "$_loadlib_inject_stream_args" || exit 3
    else
      printf '\n_loadlib_inject_stream_command\n' || exit 3
    fi
  fi

  if [ ! -t 0 ]
  then
    printf '\n' || exit 3
    cat || exit 3
  fi
)
