NAME
    dynamic-loader.lib.js - original m dynamic JavaScript/CSS source-list loader

DESCRIPTION
    This independent classic browser JavaScript library loads manifests
    that list source files in their intended order, including nested
    JavaScript namespaces and CSS files. It preserves the original m
    loader entrypoint names.

    Include lib/sys/js/dynamic-loader.lib.js using a normal script tag.
    No Node.js, npm package, module registry or compiler is needed in the
    browser. The loader reads JSON and individual source files over HTTP,
    assembles the result in memory and inserts a script or style element.

    Like the original implementation, loaded scripts execute on insertion.
    Replacing an old script element does NOT undo its JavaScript side
    effects; application code remains responsible for old event listeners,
    timers and other resources.

EXAMPLE
    Given a directory /example containing:

        modules-js.json
        modules-css.json
        m/srv/data/MyClass.js
        css/style.css

    Contents of modules-js.json:

        {
          "modules": [
            {"name": "m", "modules": [
              {"name": "srv", "modules": [
                {"name": "data", "modules": [
                  {"file": "m/srv/data/MyClass.js", "symbols": "MyClass"}
                ]}
              ]}
            ]}
          ]
        }

    Contents of m/srv/data/MyClass.js:

        function MyClass() { return 42; }

    Contents of modules-css.json:

        {
          "modules": [
            {"file": "css/style.css"}
          ]
        }

    Contents of css/style.css:

        #result { color: green; }

    Browser page:

        <!doctype html>
        <meta charset="utf-8">
        <script src="/dynamic-loader.lib.js"></script>
        <body>
          <div id="result"></div>
          <script>
            loadLibraryDynamically('/example').then(function () {
              document.getElementById('result').textContent =
                String(m.srv.data.MyClass());
            });
          </script>

    Serve the manifest and sources from /example and the independent
    loader at /dynamic-loader.lib.js. The page displays 42 in green.

PUBLIC FUNCTIONS
    loadModulesDynamically(path, modulesFile, callback)
        Fetch an ordered JavaScript modules description (default file
        modules-js.json) and its source files, assemble classic namespace
        code, then invoke callback(code). When callback is omitted,
        the function executes the result by inserting a script element.
        Returns a Promise resolving when this operation completes.

    replaceModulesDynamically(path, modulesFile, libraryElement,
                              defaultModulesFile, tag)
        Load source files for the selected type, then replace an existing
        script/style element if one is supplied. tag is 'script' or
        'style'; defaultModulesFile is the fallback JSON filename.
        libraryElement may be an element, element ID or matching URL.
        A failed source load leaves the previous element in place.
        Returns a Promise resolving to the inserted DOM element.

    loadJSLibraryDynamically(path, jsModulesFile, jsElement)
        Load JavaScript from a nested modules JSON descriptor and insert
        a classic script element. The default descriptor name is
        modules-js.json. An optional jsElement selects a previous element
        to replace. Returns a Promise.

    loadCSSLibraryDynamically(path, cssModulesFile, cssElement)
        Load the ordered CSS source list from modules-css.json (or an
        explicitly named manifest), create a style element and optionally
        replace a previous element. Returns a Promise.

    loadLibraryDynamically(path, jsModulesFile, cssModulesFile,
                           jsElement, cssElement)
        Request both the JavaScript and CSS manifests. Returns a Promise
        resolving when both have loaded. If path is omitted and the
        global dynamicLibs array exists, each listed directory is loaded.
        Source lists may be fetched in parallel across libraries; within
        each manifest source files are processed in declared order.

    As in the original standalone script, loading the loader starts
    loading automatically. With dynamicLibs present it loads the listed
    directories; otherwise it looks for modules-js.json and
    modules-css.json beside the loader script itself. Callers who want
    only explicit load operations can set dynamicLibs = [] before loading
    the library.

DESCRIPTOR CONTRACT
    Exactly the same ordered nested JSON source format as the original
    jsc command:

        {"modules":[
          {"name":"m","modules":[
            {"file":"m/init.js","symbols":""},
            {"file":"m/Class.js","symbols":"Class"}
          ]}
        ]}

    Namespace nodes name their object and declare a modules array.
    Source nodes provide a relative filename and optional comma-separated
    symbol names. No dependency IDs are needed. Earlier symbols are
    visible to later sources in the same namespace.

    CSS descriptor files contain only an ordered list of .css sources.
    The loader does not use the jsc build-time artifacts; it composes
    from the descriptor and original sources directly.

ERRORS AND LIMITS
    fetch() requires ordinary accessible HTTP resources; a server must
    serve the JSON and listed source files. HTTP failures, malformed
    descriptors and invalid names reject the Promise.

    Relative source paths resolve below the provided source directory.
    The loader does not watch local files automatically and does not
    undo external effects created by a previously executed script.
    Servers control HTTP caching and document CSP controls whether
    dynamically inserted classic scripts may run.

FILES
    lib/sys/js/dynamic-loader.lib.js
    res/sys/manual/dynamic-loader.lib.js

SEE ALSO
    manual sys jsc
    manual sys jsc.lib.js
