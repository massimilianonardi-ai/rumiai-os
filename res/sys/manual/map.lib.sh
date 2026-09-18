NAME
    map.lib.sh - POSIX sh map emulation library

DESCRIPTION
    map.lib.sh provides one public function, map, backed by opaque global
    shell variables. Callers must manipulate maps only through the function.

    Keys are unique and preserve insertion order. Updating an existing key
    does not move it. Empty keys and values are supported. POSIX shell
    variables cannot represent NUL bytes.

FUNCTIONS
    map <name>
        Create a missing empty map or reset an existing map.

    map <name> size [<destination>]
        Write the number of entries, or copy it into a destination shell
        variable.

    map <name> keys
        Write all keys in insertion order as a shell-safe serialized argument
        list.

    map <name> get
        Write all values in map order as a shell-safe serialized argument list.

    map <name> get <key> [<destination>]
        Write the value for key, or copy it into a destination shell variable.
        A missing key is an operational failure.

    map <name> put <key> <value>
        Add a new key/value pair or replace the value for an existing key.
        New keys are appended; replacement preserves the existing position.

    map <name> rem <key>
        Remove an existing key/value pair and compact the remaining entries.

    map <name> set [<key> <value> ...]
        Replace the complete map contents.

        Arguments after set are consumed as key/value pairs. Duplicate keys
        retain the position of their first occurrence and the last supplied
        value.

    map <name> unset
        Destroy the map and its opaque storage.

OUTPUT
    size without a destination writes one decimal size followed by a newline.

    keys serializes the keys through the runtime quote() facility and writes
    one shell-safe argument list followed by a newline.

    get without a key serializes all values in map order in the same form.

    get with a key and without a destination writes that value followed by a
    newline.

RETURN STATUS
    0   Success.
    1   Operational, state, missing-key or storage failure.
    2   Invalid API usage or invalid argument syntax.

CALLER OBLIGATIONS
    Map names and destination variable names must be valid shell identifiers.

    Backing variables are opaque implementation state and must not be
    modified, unset or made readonly by callers.

    A destination must not overlap storage belonging to this map, another
    existing map, or an existing array.

    Keys and values are arbitrary shell strings except NUL.

DEPENDENCIES
    The runtime quote() facility is required for keys and get-all
    serialization. In an m-integrated environment it is provided by the
    bootstrap core library.

SEE ALSO
    array.lib.sh
    manual
