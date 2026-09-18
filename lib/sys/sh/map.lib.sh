
_map_name_valid()
{
  case "$1" in
    ""|[0123456789]*|*[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_]*)
      return 1
    ;;
  esac

  return 0
}

_map_uint_valid()
{
  case "$1" in
    ""|*[!0123456789]*|0[0123456789]*)
      return 1
    ;;
  esac

  [ "$1" -ge "0" ] 2>/dev/null
}

_map_var_is_set()
{
  _map_name_valid "$1" || return 1

  eval "[ \"\${$1+x}\" = \"x\" ]"
}

_map_var_set()
{
  _map_name_valid "$1" || return 1

  eval "$1=\"\${2}\""
}

_map_var_copy()
{
  _map_name_valid "$1" || return 1
  _map_name_valid "$2" || return 1
  _map_var_is_set "$2" || return 1

  eval "$1=\"\${$2}\""
}

_map_var_print()
{
  _map_name_valid "$1" || return 1
  _map_var_is_set "$1" || return 1

  eval "printf '%s\n' \"\${$1}\""
}

_map_destination_valid()
{
  _map_name_valid "$2" || return 1

  case "$2" in
    "${1}_TYPE"|"${1}_SIZE"|"${1}_KEY_"[0123456789]*|"${1}_VALUE_"[0123456789]*)
      return 1
    ;;

    *_TYPE)
      set -- "$1" "$2" "${2%_TYPE}" "metadata"
    ;;

    *_SIZE)
      set -- "$1" "$2" "${2%_SIZE}" "metadata"
    ;;

    *_KEY_*)
      set -- "$1" "$2" "${2%_KEY_*}" "${2##*_}"

      _map_uint_valid "$4" || return 0

      set -- "$1" "$2" "$3" "map"
    ;;

    *_VALUE_*)
      set -- "$1" "$2" "${2%_VALUE_*}" "${2##*_}"

      _map_uint_valid "$4" || return 0

      set -- "$1" "$2" "$3" "map"
    ;;

    *_*)
      set -- "$1" "$2" "${2%_*}" "${2##*_}"

      _map_uint_valid "$4" || return 0

      set -- "$1" "$2" "$3" "array"
    ;;

    *)
      return 0
    ;;
  esac

  _map_name_valid "$3" || return 0
  _map_var_is_set "${3}_TYPE" || return 0

  case "$4" in
    metadata)
      eval "[ \"\${${3}_TYPE}\" = \"map\" ]" && return 1
      eval "[ \"\${${3}_TYPE}\" = \"array\" ]" && return 1
    ;;

    map)
      eval "[ \"\${${3}_TYPE}\" = \"map\" ]" && return 1
    ;;

    array)
      eval "[ \"\${${3}_TYPE}\" = \"array\" ]" && return 1
    ;;
  esac

  return 0
}

_map_state()
{
  if ! _map_var_is_set "${1}_TYPE"
  then
    _map_var_is_set "${1}_SIZE" && return 2
    return 1
  fi

  eval "[ \"\${${1}_TYPE}\" = \"map\" ]" || return 2

  _map_var_is_set "${1}_SIZE" || return 2

  eval "set -- \"\$1\" \"\${${1}_SIZE}\""

  _map_uint_valid "$2" || return 2

  return 0
}

_map_slot_valid()
{
  _map_uint_valid "$2" || return 1
  _map_var_is_set "${1}_KEY_${2}" || return 1
  _map_var_is_set "${1}_VALUE_${2}" || return 1

  return 0
}

_map_slots_valid()
{
  set -- "$1" "$2" "0"

  while [ "$3" -lt "$2" ]
  do
    _map_slot_valid "$1" "$3" || return 1

    set -- "$1" "$2" "$(($3 + 1))"
  done

  return 0
}

_map_range_unset()
{
  set -- "$1" "$2" "$3"

  while [ "$2" -lt "$3" ]
  do
    unset "${1}_KEY_${2}" "${1}_VALUE_${2}" || return 1

    set -- "$1" "$(($2 + 1))" "$3"
  done

  return 0
}

_map_key_equal()
{
  _map_name_valid "$1" || return 1
  _map_uint_valid "$2" || return 1
  _map_var_is_set "${1}_KEY_${2}" || return 1

  eval "[ \"\${${1}_KEY_${2}}\" = \"\$3\" ]"
}

_map_keys()
{
  _map_slots_valid "$1" "$2" || return 1

  set -- "$1" "$2"

  while [ "$(($# - 2))" -lt "$2" ]
  do
    eval \
      "set -- \"\$@\" \"\${${1}_KEY_$(($# - 2))}\"" ||
      return 1
  done

  shift 2

  quote "$@" || return 1

  printf '\n'
}

_map_get_all()
{
  _map_slots_valid "$1" "$2" || return 1

  set -- "$1" "$2"

  while [ "$(($# - 2))" -lt "$2" ]
  do
    eval \
      "set -- \"\$@\" \"\${${1}_VALUE_$(($# - 2))}\"" ||
      return 1
  done

  shift 2

  quote "$@" || return 1

  printf '\n'
}

_map_get_print()
{
  set -- "$1" "$2" "$3" "0"

  while [ "$4" -lt "$3" ]
  do
    _map_slot_valid "$1" "$4" || return 1

    if _map_key_equal "$1" "$4" "$2"
    then
      _map_var_print "${1}_VALUE_${4}"
      return "$?"
    fi

    set -- "$1" "$2" "$3" "$(($4 + 1))"
  done

  return 1
}

_map_get_copy()
{
  set -- "$1" "$2" "$3" "$4" "0"

  while [ "$5" -lt "$3" ]
  do
    _map_slot_valid "$1" "$5" || return 1

    if _map_key_equal "$1" "$5" "$2"
    then
      _map_var_copy "$4" "${1}_VALUE_${5}"
      return "$?"
    fi

    set -- "$1" "$2" "$3" "$4" "$(($5 + 1))"
  done

  return 1
}

_map_reset()
{
  eval "set -- \"\$1\" \"\${${1}_SIZE}\""

  _map_range_unset "$1" "0" "$2" || return 1

  _map_var_set "${1}_SIZE" "0"
}

_map_destroy()
{
  eval "set -- \"\$1\" \"\${${1}_SIZE}\""

  _map_range_unset "$1" "0" "$2" || return 1

  unset "${1}_SIZE" "${1}_TYPE"
}

_map_put()
{
  eval \
    "set -- \"\$1\" \"\$2\" \"\$3\" \"\${${1}_SIZE}\" \"0\""

  # Search existing entries. Each visited slot is validated, but no separate
  # full-map validation pass is added.

  while [ "$5" -lt "$4" ]
  do
    _map_slot_valid "$1" "$5" || return 1

    if _map_key_equal "$1" "$5" "$2"
    then
      _map_var_set "${1}_VALUE_${5}" "$3"
      return "$?"
    fi

    set -- "$1" "$2" "$3" "$4" "$(($5 + 1))"
  done

  # New key: append one key/value pair.

  set -- "$1" "$2" "$3" "$4" "$5" "$(($4 + 1))"

  [ "$6" -gt "$4" ] 2>/dev/null || return 1

  _map_var_is_set "${1}_KEY_${4}" && return 1
  _map_var_is_set "${1}_VALUE_${4}" && return 1

  _map_var_set "${1}_KEY_${4}" "$2" || return 1

  if ! _map_var_set "${1}_VALUE_${4}" "$3"
  then
    unset "${1}_KEY_${4}"
    return 1
  fi

  if ! _map_var_set "${1}_SIZE" "$6"
  then
    unset "${1}_KEY_${4}" "${1}_VALUE_${4}"
    return 1
  fi

  return 0
}

_map_remove()
{
  eval \
    "set -- \"\$1\" \"\$2\" \"\${${1}_SIZE}\" \"0\""

  _map_slots_valid "$1" "$3" || return 1

  while [ "$4" -lt "$3" ]
  do
    if _map_key_equal "$1" "$4" "$2"
    then
      break
    fi

    set -- "$1" "$2" "$3" "$(($4 + 1))"
  done

  [ "$4" -lt "$3" ] || return 1

  while [ "$4" -lt "$(($3 - 1))" ]
  do
    set -- "$1" "$2" "$3" "$4" "$(($4 + 1))"

    _map_var_copy "${1}_KEY_${4}" "${1}_KEY_${5}" || return 1
    _map_var_copy "${1}_VALUE_${4}" "${1}_VALUE_${5}" || return 1

    set -- "$1" "$2" "$3" "$5"
  done

  set -- "$1" "$2" "$3" "$(($3 - 1))"

  unset "${1}_KEY_${4}" "${1}_VALUE_${4}" || return 1

  _map_var_set "${1}_SIZE" "$4"
}

_map_set()
{
  _map_reset "$1" || return 1

  # Keep MAP_NAME as the final positional parameter while consuming KEY VALUE
  # pairs from the front. eval performs positional indirection only; key/value
  # data are expanded inside quoted arguments and are not embedded into source.

  set -- "$@" "$1"
  shift 2

  while [ "$#" -gt "1" ]
  do
    eval \
      "_map_put \"\${$#}\" \"\$1\" \"\$2\"" ||
      return 1

    shift 2
  done

  return 0
}

map()
{
  [ "$#" -ge "1" ] || return 2

  _map_name_valid "$1" || return 2

  if _map_state "$1"
  then
    if [ "$#" -eq "1" ]
    then
      _map_reset "$1"
      return "$?"
    fi
  else
    case "$?" in
      1)
        if [ "$#" -eq "1" ]
        then
          _map_var_set "${1}_TYPE" "map" || return 1

          if ! _map_var_set "${1}_SIZE" "0"
          then
            unset "${1}_TYPE"
            return 1
          fi

          return 0
        fi

        return 1
      ;;

      *)
        return 1
      ;;
    esac
  fi

  case "$2" in
    size)
      [ "$#" -eq "2" ] ||
      [ "$#" -eq "3" ] ||
        return 2

      if [ "$#" -eq "2" ]
      then
        _map_var_print "${1}_SIZE"
      else
        _map_destination_valid "$1" "$3" || return 2
        _map_var_copy "$3" "${1}_SIZE"
      fi
    ;;

    keys)
      [ "$#" -eq "2" ] || return 2

      eval "set -- \"\$1\" \"\${${1}_SIZE}\""

      _map_keys "$1" "$2"
    ;;

    get)
      [ "$#" -ge "2" ] &&
      [ "$#" -le "4" ] ||
        return 2

      eval "set -- \"\$@\" \"\${${1}_SIZE}\""

      if [ "$#" -eq "3" ]
      then
        _map_get_all "$1" "$3"
        return "$?"
      fi

      if [ "$#" -eq "4" ]
      then
        _map_get_print "$1" "$3" "$4"
      else
        _map_destination_valid "$1" "$4" || return 2
        _map_get_copy "$1" "$3" "$5" "$4"
      fi
    ;;

    put)
      [ "$#" -eq "4" ] || return 2

      _map_put "$1" "$3" "$4"
    ;;

    rem)
      [ "$#" -eq "3" ] || return 2

      _map_remove "$1" "$3"
    ;;

    set)
      [ "$#" -ge "2" ] || return 2
      [ "$(($# % 2))" -eq "0" ] || return 2

      _map_set "$@"
    ;;

    unset)
      [ "$#" -eq "2" ] || return 2

      _map_destroy "$1"
    ;;

    *)
      return 2
    ;;
  esac
}
