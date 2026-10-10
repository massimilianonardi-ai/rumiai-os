NAME
    jsc.lib.js - Node.js implementation of the original m/jsc compiler

DESCRIPTION
    This non-executable library implements the original ordered source
    compilation model for bin/sys/jsc. It accepts the nested modules,
    name, file and symbols JSON structure, combines source files in the
    specified order and produces standalone classic JavaScript namespaces
    or concatenated CSS.

    It is NOT a browser module loader. See manual sys dynamic-loader.lib.js
    for dynamically fetching ordered JS/CSS manifests and sources.

PUBLIC FUNCTION
    jscMain(args)
        Async function returning a Promise of a numeric status code.
        args is one or two nonempty strings:

            [manifestPath]
            [manifestPath, outputPath]

        With one argument, generated source is written to stdout, and no
        other artifact is created. With two arguments, the compiler writes
        to outputPath and produces a gzip release artifact. When the
        original minifier tool is already installed, a minified sibling
        and its gzip are also created.

        On handled failure, the Promise resolves to a nonzero status and
        emits [error] [jsc.<branch>] with contextual detail on stderr.
        The function does not terminate its caller process.

    Example from a Node.js CommonJS program:

        const {jscMain} =
          require('/path/to/lib/sys/js/jsc.lib.js');

        const status = await jscMain(['modules-js.json', 'bundle.js']);
        if (status !== 0) process.exitCode = status;

    Direct execution:

        node /path/to/lib/sys/js/jsc.lib.js modules-js.json bundle.js

    Normal use:

        jsc modules-js.json bundle.js

    Source paths are resolved relative to the descriptor's directory.
    A namespace node declares name and modules; a source node declares
    file and optional comma-separated symbols. The order matters.
    A CSS descriptor lists ordered .css source files without namespaces.
    There are no separate module IDs or dependency graphs.

DEPENDENCIES
    Node.js 22+ standard fs, path, vm, zlib and child_process APIs.
    Installed google-closure-compiler (JavaScript) or uglifycss (CSS) may
    be used for optional minification. No automatic npm installation.

FILES
    lib/sys/js/jsc.lib.js
    bin/sys/jsc

SEE ALSO
    manual sys jsc
    manual sys dynamic-loader.lib.js
