NAME
    mk-materialize-copy.lib.sh - copy materialization type adapter

DESCRIPTION
    mk-materialize-copy.lib.sh implements the copy adapter used by
    mk-materialize.lib.sh.

FUNCTIONS
    mk_materialize_type <source-root> <definition-root> <staging-root>
        Validate a copy materialization definition and copy the source contents
        into an already-created staging directory.

        The copy definition accepts only its type entry. Source trees containing
        symbolic links are rejected. When the definition root is exactly
        <source-root>/mk, that embedded mk directory is omitted from the copied
        useful material; other definition nesting inside source-root is rejected.

RETURN STATUS
    0   Copy materialization succeeded.
    1   Definition, source or copy operation failed.
    2   Invalid function invocation.

CALLER OBLIGATIONS
    The generic materialization layer supplies validated source, definition and
    staging directories and owns final publication of the useful root.
