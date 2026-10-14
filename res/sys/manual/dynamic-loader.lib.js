NAME
    dynamic-loader.lib.js - independent browser JavaScript/CSS source loader

DESCRIPTION
    Classic browser JavaScript library providing the original named loader
    functions. It fetches ordered JSON source descriptors and source files
    over HTTP, then assembles and inserts classic script/style elements.
    JavaScript uses nested strict namespace closures without eval. The JSON
    uses exports instead of symbols and supports optional lexical imports
    that reference existing namespace properties; imports never load files.
    CSS sources are concatenated in descriptor order.

    Loaded scripts run on insertion. Replacing their script element cannot
    undo application side effects, listeners or timers created by execution.

PUBLIC FUNCTIONS
    loadModulesDynamically(path, modulesFile, callback)
        Fetch descriptor and files, return generated code via callback if
        supplied; otherwise insert and return a script/style element.
        Resolves to a Promise; default manifest is modules-js.json.

    replaceModulesDynamically(path, modulesFile, libraryElement,
                              defaultModulesFile, tag)
        Fetch and assemble content, then insert a script/style element and
        remove the chosen old element. The previous element survives a
        failed fetch or compilation. Returns Promise<Element>.

    loadJSLibraryDynamically(path, jsModulesFile, jsElement)
        Load and insert JavaScript via modules-js.json by default.
        Returns Promise<Element>.

    loadCSSLibraryDynamically(path, cssModulesFile, cssElement)
        Load and insert CSS via modules-css.json by default.
        Returns Promise<Element>.

    loadLibraryDynamically(path, jsModulesFile, cssModulesFile,
                           jsElement, cssElement)
        Load JavaScript and CSS in that order. Returns Promise of the
        element pair. When path is omitted and global dynamicLibs is an
        array, each listed directory is loaded. Load order is preserved.

    The loader automatically calls loadLibraryDynamically() on startup.
    Set globalThis.dynamicLibs = [] before including the script to disable
    implicit loading and use only explicit operations.

EXAMPLE
    Given HTTP-accessible descriptor /demo/modules-js.json:

        {"modules":[{"name":"m","modules":[
          {"file":"A.js","exports":"A"}
        ]}]}

    With /demo/A.js containing:

        function A(){ return 42; }

    Include dynamic-loader.lib.js after setting dynamicLibs=[]:

        <script>globalThis.dynamicLibs = [];</script>
        <script src="/dynamic-loader.lib.js"></script>
        <script>
        loadJSLibraryDynamically('/demo').then(() => console.log(m.A()));
        </script>

ERRORS AND LIMITS
    Fetch failures, invalid descriptors/imports/exports and wrong source
    types reject returned Promises. A server must host the descriptor and
    files; CSP must allow inserted classic scripts. Removing an element
    does not reverse script execution. This library is browser-only.

FILES
    lib/sys/js/dynamic-loader.lib.js
    res/sys/manual/dynamic-loader.lib.js

SEE ALSO
    manual sys jsc
    manual sys jsc.lib.js
