NAME
    mk-materialize.lib.sh - generic source materialization library

DESCRIPTION
    mk-materialize.lib.sh implements the generic materialization transaction used
    by the mk materialize command.

FUNCTIONS
    mk_materialize <source-root> <definition-root> <useful-root>
        Validate the source, definition and destination; select the declared
        materialization type adapter; create a private sibling staging directory;
        run the adapter; and publish the completed staging tree at useful-root.

        source-root and definition-root must be existing real directories.
        useful-root must not exist and its parent must already exist. The useful
        root cannot be equal to or nested under the source or definition root.

RETURN STATUS
    0   Materialization succeeded.
    1   Input, definition, adapter, filesystem or materialization failure.
    2   Invalid function invocation.

DEPENDENCIES
    Uses the m runtime path and logging facilities. Type adapters are resolved as
    lib/sys/sh/mk-materialize-<type>.lib.sh.
