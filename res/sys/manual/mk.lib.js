NAME
    mk.lib.js - JavaScript lifecycle engine used by mk

DESCRIPTION
    mk.lib.js implements the JavaScript lifecycle engine used by the public mk
    command.

    It provides project discovery, declarative JSON validation, profile
    composition, goal/operation resolution and process-action execution.

    Version 1 retains the original static prerequisite-plan behavior. Version 2
    additionally resolves project-to-project dependencies through recursive child
    mk engine processes, resolves reachable external facility requirements through
    the public pkg requirement query, resolves reachable context-derived file
    collections, applies content-based incremental freshness to opted-in ordinary
    process operations, invokes trusted registered provider implementations to
    derive ordinary operations, preserves unresolved declarative conditions in
    structured plans, refines the reachable plan after execution produces new
    result/output/state/external-state evidence, and implements long-running
    watch supervision around fresh one-shot lifecycle requests.

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

        With --watch, mkMain returns an asynchronous result for a long-running
        version-2 watch session. The session derives authoritative trigger identity
        through the same trusted resolver, composes active child-project trigger
        identity recursively, and executes every trigger pass and lifecycle cycle
        through a fresh m bootstrap. Temporary invalid project configuration pauses
        without lifecycle work; failed lifecycle cycles are reported and followed
        by waiting for another trigger change. SIGINT/SIGTERM are forwarded to an
        active one-shot lifecycle child.

        After dependencies succeed, ordinary local resolution/execution is iterative:
        currently reachable dynamic context, named external requirements and
        operation data dependencies are resolved, verified up-to-date work is
        established when possible, ready work executes, results are recorded and
        resolution is refreshed until the requested goal roots are satisfied or no
        valid refinement is possible.

        Incremental freshness records and cached copies of supported declared
        outputs are non-authoritative user cache state resolved through state-path.
        Freshness metadata remains canonical-project-root/operation scoped, while
        verified artifact bytes are shared locally by the existing effective
        operation fingerprint.

        When current outputs are missing or modified, ordinary execution may
        restore a complete verified selected artifact candidate before running the
        action, including in another canonical checkout with the same effective
        fingerprint. Restoration is execution-only; plan resolution remains
        non-mutating. A successful cross-checkout restore writes the receiving
        checkout's own freshness record before normal refinement observes
        up-to-date output evidence. Invalid/incomplete artifact state is a
        conservative miss. Restoration does not synthesize current execution-result
        fields, so result observation still forces actual execution. Failed
        executions do not create reusable freshness state.

        Concurrent publication uses immutable verified candidates and an atomic
        per-fingerprint selector. Equivalent publishers may converge without a
        global lock; corrupt selected state is refreshed through another immutable
        candidate rather than destructively replacing a verified candidate another
        process may be reading.

        Facility requirements are queried through the public pkg requirement
        resolve boundary against the configured system facility default. The
        library does not implement provider selection, package installation or
        provider-configuration mutation.

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

    Facility requirements are gates only. Provider command/environment projection
    remains owned by the normal m/pkg bootstrap and is not reimplemented here.

    Version-2 operations may declare shared path/collection/output inputs without
    becoming incrementally reusable. Incremental freshness consumes that same input
    map when enabled; legacy incremental.inputs remains a compatible declaration.

    Trusted map-process providers may template the same ordinary inputs and named
    outputs for each derived member and may opt those members into incremental
    freshness with incremental: {}. Each member receives a private $item path input
    bound to its concrete collection item. Provider path inputs and output paths
    may use ${item} substitution. Derived members use the same per-operation
    freshness records/up-to-date semantics; no provider aggregate cache record is
    introduced.

    Incremental fingerprints include the complete effective process environment,
    effective operation/action definition, supported executable identity,
    requirement-provider identities and resolved operation inputs. Supported file
    identity is content-based; mtime is not used as freshness evidence.

    Watch trigger identity reuses these resolver-owned identities plus current
    reachable collection content, declared input evidence and incremental output
    validity. Ordinary non-incremental unconsumed outputs are excluded. Active
    dependent projects contribute only opaque recursively resolved child digests
    to their parent.

FILES
    <project-root>/mk.json
        Declarative project configuration.

    state-path user sys mk cache
        Semantic user cache area used for project-scoped non-authoritative
        incremental freshness metadata and user-local shared verified copies of
        supported declared output artifacts. Private layout below it is an
        implementation detail.

    lib/sys/js/mk.lib.js
        This library.

NOTES
    mkMain may return either an integer status for ordinary requests or a Promise
    resolving to an integer status for --watch. The public shell launcher handles
    both forms through Promise.resolve().

    Only mkMain is public. Underscore-prefixed functions are implementation
    details and are not callable API.

    Version-2 provider implementations are trusted runtime behavior. mk.json
    selects a supported provider type and data; it is not an executable module
    loading surface.

    For map-process incremental templates, derived operation identity is based on
    provider identity plus collection-item pathname identity rather than collection
    enumeration position. Adding/removing/reordering members therefore does not by
    itself invalidate unchanged reachable members. Derived members use the same
    ordinary per-operation shared-local artifact restoration path as configured
    incremental operations. Unreachable stale output/cache cleanup is not implied
    by this freshness model.

    Shared-local artifact reuse remains user-local and does not establish
    remote/network transport, cross-user sharing/trust, eviction/garbage
    collection, distributed locking, or a public artifact-cache API.
