NAME
    jsc.lib.js - Node.js engine for the m-owned jsc classic compiler

ROLE
    This non-executable JavaScript library implements the compiler invoked
    by the public bin/sys/jsc shell command. It performs the same work
    when called directly by a Node.js program. It DOES NOT contain or
    initialize the independent browser dynamic-loader.lib.js runtime.

    Most users should run jsc from the shell. The PRIMARY format is the
    original ordered nested "modules" description with name/file/symbols,
    compiled to classic namespace source without a runtime loader.
    The version-1 id/deps registration format is available separately
    for explicit JscRuntime consumers. See "manual sys jsc" for both
    formats, full examples, release artifacts, and exit statuses.

PUBLIC FUNCTION
    jscMain(args)
        Async function. args is one or two nonempty strings:

            [
              manifestPath,       // filename of nested or version-1 descriptor
              outputPath          // optional destination, omit for stdout
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

        When no outputPath is supplied, the generated source is emitted to
        stdout without status chatter. In legacy mode, supplying outputPath
        writes the raw source and produces a gzip release using Node's
        built-in compression; installed external JS/CSS minifiers can
        additionally generate .min.js/.min.css and compressed siblings.

        A failed manifest, source or graph validation is detected before
        modifying the destination file. A filesystem write failure is NOT
        guaranteed to preserve a previous destination.

        The function does not initialize a browser runtime, load DOM scripts,
        evaluate modules, download packages or install a default Node runtime.

PROGRAMMATIC EXAMPLE
    In a Node CommonJS application:

        const {jscMain} =
          require('/path/to/rumiai-os/lib/sys/js/jsc.lib.js');

        jscMain(['./modules-js.json', './compiled.js'])
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

        node /path/to/lib/sys/js/jsc.lib.js modules-js.json compiled.js

    The public m-integrated command is preferable for normal use:

        jsc modules-js.json compiled.js

    It validates invocation and uses the default m-managed Node.js runtime,
    normal m log/fatal facilities and localized launcher diagnostics.

MANIFEST AND OUTPUT EXAMPLES
    Original ordered source assembly:

        {
          "modules": [
            {"name":"m","modules":[
              {"file":"m/Base.js","symbols":"Base"},
              {"name":"srv","modules":[
                {"file":"m/srv/Worker.js","symbols":"Worker"}
              ]}
            ]}
          ]
        }

    Earlier source declarations in the same namespace remain available to
    later source modules without any id/deps declarations. The output is a
    classic executable namespace assembly. It does NOT need JscRuntime.

    Optional explicit registration mode:

        {
          "version": 1,
          "modules": [
            {"id": "answer", "file": "answer.js", "deps": []}
          ]
        }

    With answer.js containing:

        module.exports = {value: 42};

    This separate mode emits globalThis.JscRuntime.installBatch([...]).
    To execute in a browser, load dynamic-loader.lib.js BEFORE the generated
    registrations and then call JscRuntime.require('answer').value.


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
