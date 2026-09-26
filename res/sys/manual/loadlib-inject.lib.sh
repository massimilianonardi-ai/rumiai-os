NAME
    loadlib-inject.lib.sh - in-memory loadlib backend for source injection

SYNOPSIS
    loadsyslib "loadlib-inject"

    loadlib <library-reference>

DESCRIPTION
    loadlib-inject.lib.sh replaces the normal filesystem-backed loadlib
    implementation with an in-memory backend intended for generated shell
    source-injection streams.

    The injection stream explicitly selects which libraries are embedded.
    This library performs no dependency discovery, filesystem fallback or
    automatic preload closure.

    After this library is loaded, the generated stream must redefine the
    internal function:

        _loadlib_inject_dispatch <library-reference>

    before the first loadlib call. That generated dispatcher maps each
    explicitly embedded library reference to the generated wrapper that
    contains that library's source.

    The default dispatcher supplied by this library returns status 2, so a
    library reference that is not present in the generated injected set fails
    deterministically rather than falling back to a remote m library tree.

FUNCTIONS
    loadlib <library-reference>
        Request one embedded library by its exact injected library reference.

        Exactly one operand is required. Positional-parameter forwarding to the
        loaded library is not part of this interface.

        loadlib delegates execution to _loadlib_inject_dispatch and returns the
        resulting status unchanged.

RETURN STATUS
    loadlib:
        delegated
            Status returned by the generated dispatcher/library wrapper.
        1   Invalid invocation; exactly one library reference is required.
        2   The default dispatcher is active, or the generated dispatcher
            reports that the requested library is not embedded.

CALLER OBLIGATIONS
    This library is a backend for generated injection streams, not a filesystem
    loader.

    The stream generator must redefine _loadlib_inject_dispatch after loading
    this library and before any injected code calls loadlib.

    The dispatcher and generated wrappers are internal injection machinery.
    Callers must use loadlib rather than calling underscore-prefixed helpers.

    The complete embedded library set, including transitive and dynamically
    selected candidates, is the responsibility of the caller constructing the
    injection stream.
