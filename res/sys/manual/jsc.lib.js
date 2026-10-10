NAME
    jsc.lib.js - the Node.js classic JavaScript compiler engine

DESCRIPTION
    Implements the compiler invoked by bin/sys/jsc. This library does not
    include a dynamic loader or accept native ES Module import/export syntax.

PUBLIC FUNCTIONS
    jscMain(args)
        Asynchronously compile a version-1 classic module manifest.

        args must be [manifestPath, outputPath]. Returns a Promise resolving
        to process-style status 0 on success and a nonzero status on failure.
        Emits a concise success line to standard output or a branch-specific
        compiler diagnostic to standard error. The caller owns the process
        lifecycle; the function does not exit its caller process.

        The compiler checks manifest shape, source containment, module
        syntax, dependencies and output syntax before writing output.
        Invalid input does not overwrite a previous valid output.
        A filesystem write failure does not promise an atomic destination
        replacement.

DEPENDENCIES
    Node.js 22 or newer, standard Node fs/path/vm APIs. No npm packages or
    loader registry are required at compile time.

EXAMPLE
    const { jscMain } = require('/path/to/lib/sys/js/jsc.lib.js');
    const status = await jscMain(['modules.json', 'compiled.js']);

SEE ALSO
    manual sys jsc
    manual sys dynamic-loader.lib.js
