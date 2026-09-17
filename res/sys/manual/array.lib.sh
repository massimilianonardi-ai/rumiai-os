NAME
    array.lib.sh - POSIX sh array emulation library

DESCRIPTION
    array.lib.sh provides one public function, array, backed by opaque global
    shell variables. Callers must manipulate arrays only through the function.

FUNCTIONS
    array <name>
        Create a missing empty array or reset an existing array.

    array <name> size [<destination>]
        Write the size, or copy it into a destination shell variable.

    array <name> get
        Write all elements as a shell-safe serialized argument list.

    array <name> get <index> [<destination>]
        Write one element, or copy it into a destination shell variable.

    array <name> put <index> <value>
        Replace an existing element.

    array <name> add <value>
        Append an element.

    array <name> ins <index> <value>
        Insert an element. Index equal to size appends.

    array <name> rem <index>
        Remove an element.

    array <name> set [<value> ...]
        Replace the complete array contents.

    array <name> unset
        Destroy the array and its opaque storage.

RETURN STATUS
    0   Success.
    1   Operational, state, range or storage failure.
    2   Invalid API usage or argument syntax.

CALLER OBLIGATIONS
    Array and destination names must be valid shell identifiers.
    Indices are canonical non-negative decimal integers.
    The library's backing variables are opaque and must not be modified directly.
    POSIX shell variables cannot represent NUL bytes.
