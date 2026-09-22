NAME
    mk.lib.js - JavaScript lifecycle engine used by mk

DESCRIPTION
    mk.lib.js implements the current JavaScript project discovery, JSON project
    model validation, profile composition, goal/operation planning and sequential
    process-action execution used by the public mk command.

    The library is loaded by the bootstrap-integrated mk shell entrypoint through
    the current Node.js runtime.

PUBLIC FUNCTIONS
    mkMain(argv)
        Execute one mk request.

        argv is an array of command-line argument strings excluding the public
        command name.

        The function performs CLI parsing, project discovery, mk.json loading and
        validation, optional profile composition, goal resolution, prerequisite
        planning and either introspection, plan output or action execution.

        Return value:
            0   Success.
            1   Project/configuration/resolution/execution/runtime failure.
            2   Invalid CLI invocation.

        Diagnostics are written to standard error. Introspection/plan output is
        written to standard output. Executed process actions inherit the process
        standard streams.

ENVIRONMENT
    The public mk launcher supplies private caller-environment preservation data
    used to prevent the Node.js package launcher's HOME/PATH setup from becoming
    the intended environment of project actions. Those private variables are
    consumed internally and are not public library API.

    Project/profile/action environment overlays are supplied by mk.json.

FILES
    <project-root>/mk.json
        Current declarative project configuration.

    lib/sys/js/mk.lib.js
        This library.

NOTES
    Only mkMain is public. Underscore-prefixed functions are implementation
    details and are not callable API.
