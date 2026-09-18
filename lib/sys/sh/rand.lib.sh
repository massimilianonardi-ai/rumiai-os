
randhex()
{
  [ "$#" -le "1" ] || return 1

  if [ "$#" -eq "0" ]
  then
    set -- "32"
  fi

  [ -n "$1" ] || return 2
  [ "$1" = "${1%%[!0123456789]*}" ] || return 3
  [ "$1" = "${1#0}" ] || return 4
  [ "$1" -gt "0" ] 2>/dev/null || return 5

  openssl rand -hex "$1"
}

rand64()
{
  [ "$#" -le "1" ] || return 1

  if [ "$#" -eq "0" ]
  then
    set -- "32"
  fi

  [ -n "$1" ] || return 2
  [ "$1" = "${1%%[!0123456789]*}" ] || return 3
  [ "$1" = "${1#0}" ] || return 4
  [ "$1" -gt "0" ] 2>/dev/null || return 5

  (
    _rand64_output="$(openssl rand -base64 "$1")" || exit 6
    _rand64_output="$(printf '%s' "$_rand64_output" | tr -d '\012')" || exit 7
    printf '%s\n' "$_rand64_output"
  )
}

randuint()
{
  [ "$#" -le "1" ] || return 2

  if [ "$#" -eq "0" ]
  then
    set -- "4"
  fi

  [ -n "$1" ] || return 2
  [ "$1" = "${1%%[!0123456789]*}" ] || return 2
  [ "$1" = "${1#0}" ] || return 2
  [ "$1" -gt "0" ] 2>/dev/null || return 2

  (
    _randu_digits=""

    while [ "${#_randu_digits}" -lt "$1" ]
    do
      _randu_chunk="$(randhex "$1")" || return 1

      _randu_chunk="$(
        printf '%s' "$_randu_chunk" |
          tr -cd '0123456789'
      )" || return 1

      _randu_digits="$_randu_digits$_randu_chunk"
    done

    printf '%.*s\n' "$1" "$_randu_digits"
  )
}

randstr()
{
  [ "$#" -le "1" ] || return 2

  if [ "$#" -eq "0" ]
  then
    set -- "32"
  fi

  [ -n "$1" ] || return 2
  [ "$1" = "${1%%[!0123456789]*}" ] || return 2
  [ "$1" = "${1#0}" ] || return 2
  [ "$1" -gt "0" ] 2>/dev/null || return 2

  (
    _randstr_blocks="$((($1 + 3) / 4))"
    _randstr_bytes="$((_randstr_blocks * 3))"

    _randstr_output="$(rand64 "$_randstr_bytes")" || return 1

    _randstr_output="$(
      printf '%s' "$_randstr_output" |
        tr '/+' '_-'
    )" || return 1

    [ "${#_randstr_output}" -eq "$((_randstr_blocks * 4))" ] || return 1

    _randstr_remainder="$(($1 % 4))"

    if [ "$_randstr_remainder" -eq "1" ]
    then
      _randstr_output="${_randstr_output%???}"
    elif [ "$_randstr_remainder" -eq "2" ]
    then
      _randstr_output="${_randstr_output%??}"
    elif [ "$_randstr_remainder" -eq "3" ]
    then
      _randstr_output="${_randstr_output%?}"
    fi

    [ "${#_randstr_output}" -eq "$1" ] || return 1

    [ "$_randstr_output" = \
      "${_randstr_output%%[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-]*}" ] ||
      return 1

    printf '%s\n' "$_randstr_output"
  )
}
