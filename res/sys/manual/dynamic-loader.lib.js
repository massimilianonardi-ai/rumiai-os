NAME
    dynamic-loader.lib.js - independent classic JavaScript module loader

PURPOSE AND SCOPE
    dynamic-loader.lib.js owns the runtime portion of the current controlled
    classic JavaScript module system. It can load modules previously compiled
    by jsc or accept manually authored module registrations WITHOUT jsc.

    It is a non-executable browser classic-script library, not a command,
    Node.js package or native ES Module implementation. It is distributed
    at lib/sys/js/dynamic-loader.lib.js. Copy or serve that file as an asset.

    On first evaluation, it installs a read-only, non-configurable global
    property JscRuntime containing a frozen public API. Loading a second
    copy into the same global realm throws "JscRuntime already defined".

THE TWO DIFFERENT ACTIONS
    1. Registration: install(), installBatch() or a compiled registration
       script adds module DEFINITIONS to the registry. No factory is run.
    2. Evaluation: require(id) executes a registered module's factory on
       demand and caches its exports; declared dependencies are evaluated
       when the module actually requires them.

    This separation makes a compiled multi-module bundle lazy at execution
    time. If the module script was downloaded as a bundle, its source bytes
    were already downloaded; lazy evaluation does not defer network traffic.

USING THE LOADER WITH JSC (COMPLETE EXAMPLE)
    First create counter.js:

        exports.increment = function (n) {
          return n + 1;
        };

    Create application.js:

        const counter = require('counter');
        module.exports = {
          run: function () { return counter.increment(41); }
        };

    Create modules.json:

        {
          "version": 1,
          "modules": [
            {"id": "counter", "file": "counter.js", "deps": []},
            {"id": "application", "file": "application.js",
             "deps": ["counter"]}
          ]
        }

    Compile using the installed m command:

        jsc modules.json compiled.js

    Make dynamic-loader.lib.js and compiled.js accessible to a web page,
    then create index.html in the same web-served directory:

        <!doctype html>
        <meta charset="utf-8">
        <script src="dynamic-loader.lib.js"></script>
        <script src="compiled.js"></script>
        <body>
          <div id="result"></div>
          <script>
            console.log(JscRuntime.state());
            // Registered: 2; active: 0. No factory has run yet.

            const app = JscRuntime.require('application');
            document.getElementById('result').textContent = String(app.run());
          </script>

    Opening the page displays 42. Include the loader BEFORE compiled.js.
    Both tags are ordinary scripts, without type="module". A web server
    must serve their actual contents; the library is not served by m
    automatically. There is no need to load jsc itself in the browser.

USING THE LOADER WITHOUT JSC
    In an ordinary classic script after dynamic-loader.lib.js:

        JscRuntime.install('math', [], function (require, module, exports) {
          exports.double = function (n) { return 2 * n; };
        });

        JscRuntime.install('app', ['math'],
          function (require, module, exports) {
            const math = require('math');
            module.exports = {
              compute: function () { return math.double(21); }
            };
          });

        console.log(JscRuntime.state()); // registered 2, active 0
        console.log(JscRuntime.require('app').compute()); // 42

    The manual registrations demonstrate the independence of the library
    from jsc and show that a dependency must be declared explicitly.

PUBLIC API
    JscRuntime.install(id, deps, factory)
        Register or replace a single module definition. Returns id.

        id is a case-sensitive identifier starting with an ASCII letter,
        followed by ASCII letters, digits, dots, underscore, slash or hyphen.
        The substring ".." is forbidden. deps is an array of distinct
        registered dependency IDs, not paths or URLs. factory is a FUNCTION
        called as factory(require, module, exports) on first require(id).

        Installing a definition referencing a missing module is rejected.
        For mutually dependent definitions, cycles are always rejected.
        The factory is not run during install().

    JscRuntime.installBatch(changes, options)
        Atomically validate a WHOLE prospective dependency graph before
        changing the registry. changes is a nonempty array of records:

            [
              {id: 'math', deps: [], factory: function(...) {...}},
              {id: 'app', deps: ['math'], factory: function(...) {...}}
            ]

        Every record has exactly id, deps and factory; extra keys fail.
        The batch cannot contain duplicate IDs.

        Optional optimistic concurrency check:

            JscRuntime.installBatch(
              [{id: 'math', deps: [], factory: newFactory}],
              {expectedRevisions: {math: 1}}
            );

        expectedRevisions must specify exactly every ID in changes,
        with a nonnegative safe-integer revision. For a previously unknown
        module, the expected revision is 0. A stale expected value is
        rejected BEFORE existing module instances are disposed. Revision
        numbers increase with successful replacement registrations.

        A valid replacement invalidates the changed module and every
        instantiated transitive dependent; their registered disposers
        run before new definitions are committed. If any disposer throws,
        definitions still commit and installBatch throws AggregateError:
        arbitrary external effects CANNOT be rolled back.

        Compiler-produced registrations call installBatch automatically.
        Current jsc does not generate the optional expectedRevisions object.

    JscRuntime.require(id)
        Evaluate a registered definition on first request and cache the
        resulting module.exports. Repeated require() calls return that
        cached exports object until invalidation or replacement.

        Factories have the parameters require, module, exports. The local
        require() may access ONLY the IDs listed in the module's deps.
        An undeclared dependency raises an error. A factory can mutate
        exports.foo or assign module.exports to replace the whole value.

        A factory that throws is removed from the active-instance cache;
        any onDispose callbacks already registered by that instance are
        attempted in reverse order. The original initialization exception
        is propagated.

    module.onDispose(callback)
        Register cleanup inside a module factory:

            const timer = setInterval(tick, 1000);
            module.onDispose(function () {
              clearInterval(timer);
            });

        The runtime does not automatically remove timers, event handlers,
        external subscriptions, application objects or network activity.
        The application must release what the factory allocated.
        Disposal callbacks for a module run in reverse registration order.
        Replacement of dependency A first disposes instantiated consumers
        of A, then A. Reentrant registry actions during updates are rejected.

    JscRuntime.invalidate(id)
        Dispose the instantiated module and its instantiated transitive
        consumers WITHOUT removing their definitions. Returns an array
        of affected names in cleanup traversal order. The next require()
        evaluates fresh instances. Throws AggregateError if any cleanup
        callback fails; the runtime does not rewind external effects.

    JscRuntime.remove(id)
        Remove one definition if present AND no other registered definition
        depends on it. Returns false if absent or true when removed.
        Removing an ID with registered dependents throws even if those
        dependents have not been evaluated. It invalidates the module's
        current instance before deleting the definition. To remove a
        dependency graph, remove dependent definitions first.

    JscRuntime.revision(id)
        Return the current definition revision (1 for first registration,
        2 after one replacement) or 0 if absent. The revision is NOT a
        cryptographic asset version or multi-file deployment identifier.

    JscRuntime.state()
        Return a new object:

            {
              registered: number,
              active: number,
              names: arrayOfActiveModuleIDs
            }

        registered counts current definitions; active counts cached
        instances. names reports active instance names, not every
        registered ID. No public ordering of names should be relied upon.

    JscRuntime.loadScript(url, options)
        Browser-only asynchronous loading of one ORDINARY classic script.
        Inserts <script async src="..."> under document.head, removes
        that element after load/error and resolves a Promise on load.
        Rejects when the browser reports a script-load error.

        options may contain:
            nonce   script element CSP nonce (if required)
            expect  one module ID or array of IDs expected to advance

        Example:

            await JscRuntime.loadScript('./optional.js', {
              expect: 'optional'
            });

        When expect is set, the loader records each prior revision before
        adding the script tag. The load is considered successful only if
        each expected revision INCREASES. This detects a script that loads
        without updating the promised registry entries; it is NOT a
        security, rollback, cache-coherence or integrity guarantee.

        This method is unavailable without document, e.g. direct Node
        execution without a DOM. It does NOT read modules.json, parse the
        source manifest, fetch arbitrary dependency files on require(),
        watch the filesystem or compile source code in the browser.

DEVELOPMENT: OPTIONAL MODULE AND HOT REPLACEMENT
    Suppose optional.js is output from jsc with one record:

        {"version":1,"modules":[
          {"id":"optional","file":"optional-v1.js","deps":[]}
        ]}

    The separately compiled optional.js only registers its definition:

        await JscRuntime.loadScript('./optional.js', {
          expect: 'optional'
        });

        const first = JscRuntime.require('optional');

    To replace it, compile another manifest containing the SAME module ID
    "optional" and source optional-v2.js to patch.js, then:

        await JscRuntime.loadScript('./patch.js', {
          expect: 'optional'
        });

        const second = JscRuntime.require('optional');

    Do not keep calling methods on first expecting them to change: first
    still references the OLD exports value. The consumer must reacquire
    second. Any active consumers that depend on optional are invalidated
    too, and must reacquire their exports.

    A DOM resource cleanup example for optional-v1.js:

        const button = document.getElementById('tap');
        const handler = function () { console.log('v1'); };
        button.addEventListener('click', handler);
        module.onDispose(function () {
          button.removeEventListener('click', handler);
        });
        module.exports = {version: 'v1'};

    The v2 source can create its own listener. If cleanup was registered
    and succeeds, replacement does not leave the old listener attached.
    A throwing disposer can leave externally visible state inconsistent:
    application code must decide when to reload the entire document.

CACHING, DELIVERY AND SAFETY
    Browser network transport is subject to HTTP caching, URL identity,
    CSP, server configuration and browser security restrictions.

    For development, configure your web server to serve reloadable scripts
    using appropriate freshness headers (for example Cache-Control:
    no-store). Do not rely on jsc or the loader to defeat stale caches.

    A one-file distribution can contain the loader and all compiled
    registrations using an EXPLICIT separate packaging step, with the
    loader first. That gives lazy EVALUATION but not lazy NETWORK transfer
    of embedded module source. Physical lazy download requires a separate
    compiled script and loadScript().

    loadScript's expected-revision check proves only that the script
    registered expected IDs. It does not verify origin trust, file hashes,
    security policy, application state migration or safe disposal of
    external effects.

LEGACY COMPATIBILITY BOUNDARY
    This is NOT the original m dynamic loader that accepts modules-js.json
    and modules-css.json and rebuilds a script or style element from
    source-file lists. This implementation manages CLASSIC JAVASCRIPT
    factory definitions. It does not load CSS libraries or transform
    legacy nested module descriptions. Those are distinct capabilities
    and require an explicit migration/design decision.

ERRORS
    Invalid module IDs, non-function factories, invalid graph records,
    unknown dependencies, cyclic dependencies and undeclared local
    require() calls raise TypeError or Error as applicable.

    A stale installBatch expected revision fails before cleanup.
    A failing onDispose is collected in AggregateError; when it occurs
    during replacement, new definitions can ALREADY be committed.
    The caller must not assume rollback of external application state.

    loadScript() returns a rejecting Promise for script load failures
    and for missing expected module revision advances.

FILES
    lib/sys/js/dynamic-loader.lib.js
    res/sys/manual/dynamic-loader.lib.js
    bin/sys/jsc
    res/sys/manual/jsc

SEE ALSO
    manual sys jsc
    manual sys jsc.lib.js
