_mk_materialize_copy_definition_validate()
{
  [ "$#" -eq 1 ] || return 2
  mk_materialize_copy_definition=$1

  for mk_materialize_copy_entry in \
    "$mk_materialize_copy_definition"/* \
    "$mk_materialize_copy_definition"/.[!.]* \
    "$mk_materialize_copy_definition"/..?*
  do
    [ -e "$mk_materialize_copy_entry" ] || [ -L "$mk_materialize_copy_entry" ] || continue
    [ "$mk_materialize_copy_entry" = "$mk_materialize_copy_definition/type" ] || return 1
  done

  return 0
}

_mk_materialize_copy_source_validate()
{
  [ "$#" -eq 1 ] || return 2
  mk_materialize_copy_source=$1

  mk_materialize_copy_symlinks="$(command -p -- find "$mk_materialize_copy_source" -type l -print 2>/dev/null)" || return 1
  [ -z "$mk_materialize_copy_symlinks" ]
}

mk_materialize_type()
(
  [ "$#" -eq 3 ] || return 2
  mk_materialize_copy_source=$1
  mk_materialize_copy_definition=$2
  mk_materialize_copy_staging=$3

  [ -d "$mk_materialize_copy_source" ] && [ ! -L "$mk_materialize_copy_source" ] || return 1
  [ -d "$mk_materialize_copy_definition" ] && [ ! -L "$mk_materialize_copy_definition" ] || return 1
  [ -d "$mk_materialize_copy_staging" ] && [ ! -L "$mk_materialize_copy_staging" ] || return 1

  _mk_materialize_copy_definition_validate "$mk_materialize_copy_definition" || return 1
  _mk_materialize_copy_source_validate "$mk_materialize_copy_source" || return 1

  mk_materialize_copy_embedded=0
  if [ "$mk_materialize_copy_definition" = "$mk_materialize_copy_source" ]
  then
    return 1
  fi
  case "$mk_materialize_copy_definition" in
    "$mk_materialize_copy_source"/*)
      [ "$mk_materialize_copy_definition" = "$mk_materialize_copy_source/mk" ] || return 1
      mk_materialize_copy_embedded=1
      ;;
  esac

  for mk_materialize_copy_entry in \
    "$mk_materialize_copy_source"/* \
    "$mk_materialize_copy_source"/.[!.]* \
    "$mk_materialize_copy_source"/..?*
  do
    [ -e "$mk_materialize_copy_entry" ] || [ -L "$mk_materialize_copy_entry" ] || continue
    if [ "$mk_materialize_copy_embedded" -eq 1 ] && [ "$mk_materialize_copy_entry" = "$mk_materialize_copy_source/mk" ]
    then
      continue
    fi
    mk_materialize_copy_name=${mk_materialize_copy_entry##*/}
    command -p -- cp -R -- "$mk_materialize_copy_entry" "$mk_materialize_copy_staging/$mk_materialize_copy_name" || return 1
  done

  return 0
)
