NAME
    rand.lib.sh - cryptographically secure random-value helpers

DESCRIPTION
    rand.lib.sh is the sys-owned POSIX sh random-value library.

    Source it from an m-integrated shell environment:

        . "$m_LIB_DIR/sys/sh/rand.lib.sh"

    The library exposes four public functions:

        randhex
        rand64
        randuint
        randstr

    Random bytes are obtained from OpenSSL's rand facility. The textual
    helpers then normalize those bytes into the documented output alphabet.

FUNCTIONS
    randhex [bytes]

        Generates bytes cryptographically secure random bytes and writes
        them as lowercase hexadecimal followed by a newline.

        bytes defaults to 32. When supplied, it must be a canonical positive
        decimal integer with no leading zero.

        Output length is exactly 2 * bytes hexadecimal characters.

        Return status:
            0   success
            1   more than one argument, or the underlying openssl command
                returned status 1
            2   empty byte-count operand
            3   byte-count operand contains a non-decimal character
            4   byte-count operand begins with zero
            5   byte-count operand is not a positive value representable by
                the shell numeric comparison
            other
                status returned by openssl rand

    rand64 [bytes]

        Generates bytes cryptographically secure random bytes and writes
        their Base64 representation as one line followed by a newline.

        bytes defaults to 32 and follows the same canonical-positive-decimal
        input rules as randhex.

        Embedded newlines produced by the OpenSSL Base64 formatter are
        removed before output.

        Return status:
            0   success
            1   more than one argument
            2   empty byte-count operand
            3   byte-count operand contains a non-decimal character
            4   byte-count operand begins with zero
            5   byte-count operand is not a positive value representable by
                the shell numeric comparison
            6   openssl random generation failed
            7   Base64 output normalization failed
            other
                failure while writing the final output

    randuint [digits]

        Generates exactly digits uniformly distributed decimal digits and
        writes them followed by a newline.

        digits defaults to 4. When supplied, it must be a canonical positive
        decimal integer with no leading zero.

        Leading zeroes in the generated result are allowed because the
        result is a fixed-length digit string, not a mathematical integer.

        Return status:
            0   success
            1   random generation or digit filtering failed
            2   invalid invocation or invalid digits operand

    randstr [characters]

        Generates exactly characters characters from the RFC 4648 Base64URL
        alphabet:

            A-Z a-z 0-9 _ -

        characters defaults to 32. When supplied, it must be a canonical
        positive decimal integer with no leading zero.

        The result contains no whitespace, slash, plus sign or Base64
        padding and is followed by a newline.

        The function generates complete 3-byte random blocks, converts them
        through Base64, maps '/' to '_' and '+' to '-', and truncates the
        result to the requested character count. Each output character
        therefore represents 6 uniformly distributed random bits.

        Return status:
            0   success
            1   random generation, transformation or output validation failed
            2   invalid invocation or invalid characters operand

DEPENDENCIES
    randhex and rand64 require:

        openssl

    rand64, randuint and randstr use the POSIX text-processing utility:

        tr

    randuint depends on randhex.
    randstr depends on rand64.

EXAMPLES
    Generate the default 32-byte hexadecimal value:

        randhex

    Generate 16 random bytes as hexadecimal:

        randhex 16

    Generate 32 random bytes as a single-line Base64 value:

        rand64 32

    Generate an 8-digit fixed-length decimal string:

        randuint 8

    Generate a 48-character Base64URL-alphabet token:

        randstr 48

SEE ALSO
    manual
