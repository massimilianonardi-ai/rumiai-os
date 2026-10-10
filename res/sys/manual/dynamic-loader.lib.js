NAME
    dynamic-loader.lib.js - independent classic JavaScript module loader

DESCRIPTION
    Include this m-owned JavaScript library as an ordinary classic script
    before jsc-generated registration scripts. It creates a read-only global
    property JscRuntime holding the runtime interface.

    The library can be used without jsc: install manually authored factories.
    It does not parse, transform or emulate native ESM import/export semantics.

PUBLIC FUNCTIONS
    JscRuntime.install(id, deps, factory)
        Register or replace one module definition. deps is an array of
        declared module IDs and factory receives require, module, exports.
        Returns id after a successful validated registration.

    JscRuntime.installBatch(changes, {expectedRevisions?})
        Register/replace a whole graph batch. Each change contains id, deps
        and factory. Validates graph, missing/cyclic dependencies and optional
        optimistic revision expectations before disposing active instances.
        Commits definitions after disposal begins. Cleanup callback failures
        throw AggregateError after commit: external effects cannot be rolled
        back and a full document reload may be necessary.

    JscRuntime.require(id)
        Evaluate on first request, cache the module exports for later calls.
        Only declared dependencies may be required within a factory.
        Reacquire exports after hot replacement; old references are not
        live-bound to new module versions.

    JscRuntime.invalidate(id)
        Dispose instantiated affected consumers, then their dependencies,
        and return the affected instance order. Calls registered cleanup
        callbacks in reverse order. A cleanup failure throws AggregateError.

    JscRuntime.remove(id)
        Remove a definition that has no registered dependents. Returns true
        for a removed definition or false if absent; rejects dependents.

    JscRuntime.revision(id)
        Return registered definition revision or zero when not registered.

    JscRuntime.state()
        Return the current number of definitions and active instances plus
        active module names.

    JscRuntime.loadScript(url, {nonce?, expect?})
        Browser-only asynchronous classic script transport. Insert a script
        element and resolve on load only when the expected module ID(s)
        advanced in revision. Reject on failed load or missing updates.
        The server owns freshness headers and the app owns release coherence.

    module.onDispose(callback)
        Within a factory, register cleanup for listener/timer/resource
        teardown before runtime invalidation or replacement. There is no
        automatic cleanup of arbitrary user-created resources.

DEPENDENCIES
    Modern classic-script JavaScript globalThis, Map, Set, AggregateError.
    No compiler, Node.js or dependency package is needed at browser runtime.

USAGE
    <script src="dynamic-loader.lib.js"></script>
    <script src="compiled.js"></script>
    <script>
      const application = JscRuntime.require('application');
    </script>

NOTES
    One-file compilation with embedded definitions defers evaluation only;
    separate files are needed to defer physical network transfer.
    Browser script fetching respects server HTTP cache policy and CSP.
    The loader is not a global application-state transaction manager:
    disposer failures and stale retained references may require page reload.

SEE ALSO
    manual sys jsc
    manual sys jsc.lib.js
