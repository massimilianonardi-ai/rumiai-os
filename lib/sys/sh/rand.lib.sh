
#------------------------------------------------------------------------------

# randhex [bytes]
#
# Generates cryptographically secure random bytes and writes them as
# lowercase hexadecimal characters followed by a newline.
#
# bytes defaults to 32 and must be a canonical positive decimal integer.
# Each random byte is represented by exactly two hexadecimal characters:
#
#   randhex      -> 32 random bytes -> 64 hexadecimal characters
#   randhex 16   -> 16 random bytes -> 32 hexadecimal characters
#   randhex 1    ->  1 random byte  ->  2 hexadecimal characters
#
# Returns 2 for invalid arguments and otherwise returns the status of
# openssl rand.

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

#------------------------------------------------------------------------------

# rand64 [bytes]
#
# Generates cryptographically secure random bytes and writes their Base64
# representation as a single line followed by a newline.
#
# bytes defaults to 32 and must be a canonical positive decimal integer.
# The output contains exactly 4 * ceil(bytes / 3) Base64 characters,
# including any '=' padding:
#
#   rand64      -> 32 random bytes -> 44 Base64 characters
#   rand64 3    ->  3 random bytes ->  4 Base64 characters
#   rand64 1    ->  1 random byte  ->  4 Base64 characters
#
# Returns 2 for invalid arguments and 1 if random generation or output
# normalization fails.

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

#------------------------------------------------------------------------------

# randuint [digits]
#
# Generates exactly the requested number of uniformly distributed decimal
# digits using the same cryptographically secure random source as randhex.
#
# digits defaults to 4 and must be a canonical positive decimal integer.
# Leading zeroes are allowed because the result is a fixed-length digit
# string rather than a mathematical integer:
#
#   randuint      -> e.g. 0387
#   randuint 8    -> e.g. 59102743
#   randuint 1    -> e.g. 7
#
# Hexadecimal digits a-f are discarded. Since every hexadecimal digit is
# uniformly distributed over 0-f, conditioning on the accepted set 0-9
# leaves every decimal digit with the same probability.
#
# Returns 2 for invalid arguments and 1 if random generation fails.

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

#------------------------------------------------------------------------------

# randstr [characters]
#
# Generates a cryptographically secure random string using only characters
# from the RFC 4648 Base64URL alphabet:
#
#   A-Z a-z 0-9 _ -
#
# The output contains exactly the requested number of characters followed by
# a newline. characters defaults to 32 and must be a canonical positive
# decimal integer.
#
# The function generates random input in complete 3-byte blocks, so every
# Base64 character is derived from exactly 6 uniformly distributed random
# bits. Standard Base64 '+' and '/' are translated to Base64URL '-' and '_',
# then the result is truncated to the requested length. No modulo operation
# or rejection mapping is used, so every output character remains uniformly
# distributed over the 64-character alphabet.
#
# Each output character therefore carries exactly 6 bits of entropy:
#
#   randstr       -> 32 characters -> 192 bits
#   randstr 16    -> 16 characters ->  96 bits
#   randstr 64    -> 64 characters -> 384 bits
#
# The result contains no whitespace, '/', '+', or '=' padding and is therefore
# suitable for tokens, filenames and URL components without further escaping.
#
# This is a random string drawn from the Base64URL alphabet; for arbitrary
# lengths it is not necessarily a decodable Base64URL encoding of a byte
# sequence.
#
# Returns 2 for invalid arguments and 1 if secure random generation or output
# transformation fails.

randstr()
(
  [ "$#" -le "1" ] || return 2

  if [ "$#" -eq "0" ]
  then
    set -- "32"
  fi

  [ -n "$1" ] || return 2
  [ "$1" = "${1%%[!0123456789]*}" ] || return 2
  [ "$1" = "${1#0}" ] || return 2
  [ "$1" -gt "0" ] 2>/dev/null || return 2

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

#------------------------------------------------------------------------------
