NAME
    mk.lib.js - JavaScript lifecycle engine used by mk

DESCRIPTION
    mk.lib.js implements the JavaScript lifecycle engine used by the public mk
    command.

    It provides project discovery, declarative JSON validation, profile
    composition, goal/operation resolution and process-action execution.

    Version 1 retains the original static prerequisite-plan behavior. Version 2
    additionally resolves project-to-project dependencies through recursive child
    mk engine processes, resolves reachable context-derived file collections,
    invokes trusted registered provider implementations to derive ordinary
    operations, preserves unresolved declarative conditions in structured plans
    and refines the reachable plan after execution produces new
    result/output/state evidence.

    The library is loaded by the bootstrap-integrated mk shell entrypoint through
    the current Node.js runtime.

PUBLIC FUNCTIONS
    mkMain(argv)
        Execute one mk request.

        argv is an array of command-line argument strings excluding the public
        command name.

        The function performs CLI parsing, project discovery, mk.json loading and
        validation, optional profile composition, goal resolution and either
        introspection, plan output or action execution.

        For version 2, active project dependencies are first delegated to child
        mk engine processes. Child project internals remain encapsulated and child
        profiles are selected only when explicitly declared by the dependency.
        After dependencies succeed, local resolution/execution is iterative:
        currently reachable dynamic context is resolved, ready work executes,
        results are recorded and resolution is refreshed until the requested goal
        roots are satisfied or no valid refinement is possible.

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
    the intended environment of project actions. Recursive project-dependency
    delegation also carries a private active-project chain used only for cycle
    detection. Those private variables are consumed internally and are not public
    library API.

    Project/profile/action environment overlays are supplied by mk.json.

FILES
    <project-root>/mk.json
        Declarative project configuration.

    lib/sys/js/mk.lib.js
        This library.

NOTES
    Only mkMain is public. Underscore-prefixed functions are implementation
    details and are not callable API.

    Version-2 provider implementations are trusted runtime behavior. mk.json
    selects a supported provider type and data; it is not an executable module
    loading surface.
