NAME
    jsc.lib.js - Node.js engine for the m-owned jsc classic compiler

ROLE
    This non-executable JavaScript library implements the compiler invoked
    by the public bin/sys/jsc shell command. It performs the same work
    when called directly by a Node.js program. It DOES NOT contain or
    initialize the independent browser dynamic-loader.lib.js runtime.

    Most users should run jsc from the shell. See "manual sys jsc" for the
    complete version-1 modules.json format, a working two-module project,
    generated output, deployment steps, limitations and exit statuses.

PUBLIC FUNCTION
    jscMain(args)
        Async function. args is exactly an array of two nonempty strings:

            [
              manifestPath,       // filename of version-1 JSON descriptor
              outputPath          // destination compiled classic JS file
            ]

        Returns a Promise resolving to a numeric process-style status:
        zero for successful compilation; a branch-specific nonzero status
        for invalid input, unreadable modules, graph errors, syntax errors
        or failed output writing. It does not call process.exit().

        The library writes a concise success summary to stdout and
        errors to stderr, preserving distinct semantic identities in
        "[error] [jsc.<message-id>]" format with contextual detail.
        Unlike the m-owned shell launcher, this Node process does not
        inherit the shell functions log() and fatal(). The shell launcher
        propagates the compiler status instead of repeating its error.

        A failed manifest, source or graph validation is detected before
        modifying the destination file. A filesystem write failure is NOT
        guaranteed to preserve a previous destination.

        The function does not initialize a browser runtime, load DOM scripts,
        evaluate modules, download packages or install a default Node runtime.

PROGRAMMATIC EXAMPLE
    In a Node CommonJS application:

        const {jscMain} =
          require('/path/to/rumiai-os/lib/sys/js/jsc.lib.js');

        jscMain(['./modules.json', './compiled.js'])
          .then(function (status) {
            if (status !== 0) {
              process.exitCode = status;
            }
          })
          .catch(function (error) {
            console.error(error);
            process.exitCode = 1;
          });

    The calling process must already provide Node.js 22+.
    Relative manifest and destination paths resolve against the current
    working directory; source files declared by the manifest resolve
    relative to the manifest's own directory.

DIRECT NODE EXECUTION
    The same file also supports:

        node /path/to/lib/sys/js/jsc.lib.js modules.json compiled.js

    The public m-integrated command is preferable for normal use:

        jsc modules.json compiled.js

    It validates invocation and uses the default m-managed Node.js runtime,
    normal m log/fatal facilities and localized launcher diagnostics.

MANIFEST AND OUTPUT EXAMPLE
    A minimal version-1 manifest:

        {
          "version": 1,
          "modules": [
            {"id": "answer", "file": "answer.js", "deps": []}
          ]
        }

    With answer.js containing:

        module.exports = {value: 42};

    A successful compile writes ordinary classic JavaScript containing a
    call to globalThis.JscRuntime.installBatch([...]). It does not embed
    any runtime implementation and does not execute module factories.
    Before using the result in a browser, load dynamic-loader.lib.js and
    then the generated registration script, and call:

        JscRuntime.require('answer').value // 42

    This controlled classic system does not implement standard Node
    package lookup or reinterpret native ESM syntax. Legacy nested
    manifests using name/symbols are NOT accepted.

ERRORS AND DIAGNOSTICS
    jscMain resolves to nonzero status values rather than throwing its
    normal handled validation errors. These values are documented fully
    in "manual sys jsc". Distinct errors use distinct message IDs,
    including manifest-invalid-json, missing-dependency,
    module-source-unresolvable, module-source-unreadable,
    unsupported-source-format and module-syntax-invalid.

    The function can still reject unexpectedly if a failure falls outside
    its handled compiler boundary; a caller of the API must handle its
    Promise. Direct Node execution additionally sets process.exitCode.

ENVIRONMENT AND FILES
    Requires Node.js 22+ and the standard Node fs/promises, path and vm
    modules. It has no npm dependencies.

    lib/sys/js/jsc.lib.js
    bin/sys/jsc
    lib/sys/js/dynamic-loader.lib.js

SEE ALSO
    manual sys jsc
    manual sys dynamic-loader.lib.js
