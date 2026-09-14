_mk_materialize_error()
{
  [ "$#" -ge 1 ] || return 2
  mk_materialize_reason=$1
  shift
  log error execution execution-failed operation mk-materialize reason "$mk_materialize_reason" "$@"
}

_mk_materialize_scalar()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  mk_materialize_scalar_value=
  mk_materialize_scalar_extra=
  {
    IFS= read -r mk_materialize_scalar_value || return 1
    IFS= read -r mk_materialize_scalar_extra
    mk_materialize_scalar_second_status=$?
  } < "$1"

  [ "$mk_materialize_scalar_second_status" -ne 0 ] || return 1
  [ -z "$mk_materialize_scalar_extra" ] || return 1
  [ -n "$mk_materialize_scalar_value" ] || return 1

  mk_materialize_scalar_cr="$(printf '\r')"
  case "$mk_materialize_scalar_value" in
    *"$mk_materialize_scalar_cr"*) return 1 ;;
  esac

  mk_materialize_scalar_actual="$(command -p -- wc -c < "$1")" || return 1
  mk_materialize_scalar_expected="$(printf '%s\n' "$mk_materialize_scalar_value" | command -p -- wc -c)" || return 1
  [ "$mk_materialize_scalar_actual" = "$mk_materialize_scalar_expected" ] || return 1

  printf -- '%s\n' "$mk_materialize_scalar_value"
}

_mk_materialize_type_valid()
{
  [ "$#" -eq 1 ] || return 2
  case "$1" in
    "" | [!abcdefghijklmnopqrstuvwxyz]* | *[!abcdefghijklmnopqrstuvwxyz0123456789-]*) return 1 ;;
  esac
}

_mk_materialize_existing_dir()
{
  [ "$#" -eq 2 ] || return 2
  mk_materialize_existing_var=$1
  mk_materialize_existing_input=$2

  [ -d "$mk_materialize_existing_input" ] && [ ! -L "$mk_materialize_existing_input" ] || return 1
  readpathce "$mk_materialize_existing_var" "$mk_materialize_existing_input" || return 1
  eval "mk_materialize_existing_value=\${$mk_materialize_existing_var}"
  [ -d "$mk_materialize_existing_value" ] && [ ! -L "$mk_materialize_existing_value" ]
}

_mk_materialize_destination()
{
  [ "$#" -eq 2 ] || return 2
  mk_materialize_destination_var=$1
  mk_materialize_destination_input=$2

  [ ! -e "$mk_materialize_destination_input" ] && [ ! -L "$mk_materialize_destination_input" ] || return 1

  case "$mk_materialize_destination_input" in
    */*)
      mk_materialize_destination_parent=${mk_materialize_destination_input%/*}
      mk_materialize_destination_base=${mk_materialize_destination_input##*/}
      [ -n "$mk_materialize_destination_parent" ] || mk_materialize_destination_parent=/
      ;;
    *)
      mk_materialize_destination_parent=.
      mk_materialize_destination_base=$mk_materialize_destination_input
      ;;
  esac

  case "$mk_materialize_destination_base" in
    "" | . | ..) return 1 ;;
  esac

  [ -d "$mk_materialize_destination_parent" ] && [ ! -L "$mk_materialize_destination_parent" ] || return 1
  readpathce mk_materialize_destination_parent_canonical "$mk_materialize_destination_parent" || return 1
  [ -d "$mk_materialize_destination_parent_canonical" ] && [ ! -L "$mk_materialize_destination_parent_canonical" ] || return 1

  if [ "$mk_materialize_destination_parent_canonical" = / ]
  then
    mk_materialize_destination_value="/$mk_materialize_destination_base"
  else
    mk_materialize_destination_value="$mk_materialize_destination_parent_canonical/$mk_materialize_destination_base"
  fi

  [ ! -e "$mk_materialize_destination_value" ] && [ ! -L "$mk_materialize_destination_value" ] || return 1
  eval "$mk_materialize_destination_var=\$mk_materialize_destination_value"
}

_mk_materialize_cleanup()
{
  if [ -n "${mk_materialize_staging-}" ] && [ -d "$mk_materialize_staging" ] && [ ! -L "$mk_materialize_staging" ]
  then
    command -p -- rm -rf -- "$mk_materialize_staging" 2>/dev/null || :
  fi
}

mk_materialize()
(
  [ "$#" -eq 3 ] || return 2

  mk_materialize_source_input=$1
  mk_materialize_definition_input=$2
  mk_materialize_useful_input=$3

  _mk_materialize_existing_dir mk_materialize_source "$mk_materialize_source_input" || {
    _mk_materialize_error source-invalid path "$mk_materialize_source_input"
    return 1
  }
  _mk_materialize_existing_dir mk_materialize_definition "$mk_materialize_definition_input" || {
    _mk_materialize_error definition-invalid path "$mk_materialize_definition_input"
    return 1
  }
  _mk_materialize_destination mk_materialize_useful "$mk_materialize_useful_input" || {
    _mk_materialize_error destination-invalid path "$mk_materialize_useful_input"
    return 1
  }

  case "$mk_materialize_useful" in
    "$mk_materialize_source" | "$mk_materialize_source"/*)
      _mk_materialize_error destination-inside-source path "$mk_materialize_useful"
      return 1
      ;;
  esac
  case "$mk_materialize_useful" in
    "$mk_materialize_definition" | "$mk_materialize_definition"/*)
      _mk_materialize_error destination-inside-definition path "$mk_materialize_useful"
      return 1
      ;;
  esac

  mk_materialize_type="$(_mk_materialize_scalar "$mk_materialize_definition/type")" || {
    _mk_materialize_error definition-type-invalid path "$mk_materialize_definition/type"
    return 1
  }
  _mk_materialize_type_valid "$mk_materialize_type" || {
    _mk_materialize_error definition-type-invalid type "$mk_materialize_type"
    return 1
  }

  mk_materialize_adapter="$m_LIB_DIR/sys/sh/mk-materialize-$mk_materialize_type.lib.sh"
  [ -f "$mk_materialize_adapter" ] && [ ! -L "$mk_materialize_adapter" ] && [ -r "$mk_materialize_adapter" ] && [ ! -x "$mk_materialize_adapter" ] || {
    _mk_materialize_error type-unsupported type "$mk_materialize_type"
    return 1
  }

  mk_materialize_useful_parent=${mk_materialize_useful%/*}
  [ -n "$mk_materialize_useful_parent" ] || mk_materialize_useful_parent=/
  if [ "$mk_materialize_useful_parent" = / ]
  then
    mk_materialize_staging="/.mk-materialize-$$"
  else
    mk_materialize_staging="$mk_materialize_useful_parent/.mk-materialize-$$"
  fi

  [ ! -e "$mk_materialize_staging" ] && [ ! -L "$mk_materialize_staging" ] || {
    _mk_materialize_error staging-collision path "$mk_materialize_staging"
    return 1
  }

  command -p -- mkdir -- "$mk_materialize_staging" || {
    _mk_materialize_error staging-create-failed path "$mk_materialize_staging"
    return 1
  }
  trap '_mk_materialize_cleanup' 0
  trap 'exit 130' HUP INT TERM

  if ! (
    . "$mk_materialize_adapter" || exit 1
    mk_materialize_type "$mk_materialize_source" "$mk_materialize_definition" "$mk_materialize_staging"
  )
  then
    _mk_materialize_error materialization-failed type "$mk_materialize_type"
    return 1
  fi

  [ ! -e "$mk_materialize_useful" ] && [ ! -L "$mk_materialize_useful" ] || {
    _mk_materialize_error destination-collision path "$mk_materialize_useful"
    return 1
  }

  if ! command -p -- mv -- "$mk_materialize_staging" "$mk_materialize_useful"
  then
    _mk_materialize_error publish-failed path "$mk_materialize_useful"
    return 1
  fi

  mk_materialize_staging=
  trap - 0 HUP INT TERM
  return 0
)
