NAME
    web-analyze-rest.lib.js - deep read-only Chromium/CDP resting-page evidence

DESCRIPTION
    Takes a fully initialized native web-analyze CDP recording session and
    records as much observable page state as Chromium exposes before any
    automatic scrolling or other browser input by the web-analyze command.

    The capture is best effort, non-atomic and not a proof of the entire
    application's possible runtime behavior. An unvisited interaction may
    load additional code/resources; server-only logic is not observable.

PUBLIC FUNCTIONS
    captureRestEvidence(session, directory, options = {})
        session     Active startWebAnalyze() return value; must expose
                    sendTarget, targets, targetGraph, styleSheets,
                    networkActivity.
        directory   Root private run directory (existing).
        options     Optional {interrupted: () => boolean} to stop between
                    target captures.
        Returns a Promise for a manifest with status, artifact outcomes,
        attached target inventory, metadata, SHA-256 and limitations.

        Individual unavailable CDP capabilities are retained as explicit
        artifact outcomes rather than silently synthesized as success.
        Filesystem failures propagate to the caller.

    auditWebAnalyzeEvidence(directory, options = {})
        directory   Root private run directory after the native CDP session
                    has finalized summary.json and all archive streams.
        options     Optional {write: boolean, interrupted: boolean}.
                    write=true creates evidence-integrity.json once with
                    private permissions; the default read-only invocation
                    returns the same reconciliation without modifying files.
        Returns a ledger of independently checked file digests, expected
        sizes, source outcomes, JSONL parse/sequence checks, per-target
        and per-domain statuses and reconciliation discrepancies.
        Statuses are saved, partial, failed, interrupted, inapplicable and
        unsupported, with private file paths but no copied response contents.
        IndexedDB pages, Cache Storage response bodies, CSS sources and
        frame-scoped Accessibility tree responses and the per-node CSS result
        pages, CSS rule-usage target dumps, WebAssembly auxiliary text
        artifacts and source-map payloads are verified recursively
        against their indexed SHA-256/size.
        Re-audit read-only after evidence tampering detects missing, altered
        or permission-exposed files rather than trusting a previous manifest.

        A successfully read file does not prove its contents are authentic;
        hash agreement proves only agreement with its saved index. Some
        browser events can be missing before debugger attachment. A captured
        REST manifest may still have partial network, DOM or storage coverage.
        Integrity status is not a universal page-reconstruction certificate.

OUTPUT
    evidence-integrity.json     Post-finalization verified index/file ledger
                                and per-target/per-domain aggregate statuses
    rest/manifest.json          Capture ledger: status, per-artifact failures
    rest/README.md              Human-readable evidence index
    rest/target-graph-initial.json
                                Discovered/attached targets at rest entry
    rest/target-graph-final.json
                                Refreshed target/worker/context graph and gaps
    rest/css-rule-usage/index.json
                                Initial-navigation CSS rule-usage interval,
                                per-target start/stop status, rule totals
    rest/css-rule-usage/target-NNN.json
                                Full CDP CSS rule-use entries with used flags for
                                targets that supported selector tracking
    rest/css-rule-usage-error.json
                                Private name/code/message/stack if initial
                                selector coverage fails before its index is
                                written; remaining rest evidence continues
    rest/dom-history-contexts.json
                                Per-document Runtime observer counters, timing,
                                install/hook status, truncations and failures
    rest/dom-mutations-at-rest.jsonl
                                Private snapshot of the raw mutation ledger
                                before any subsequent automated scrolling
    rest/cookies.json           Browser-context cookies, including HttpOnly
    rest/network-details-at-rest.jsonl
                                Raw network events frozen before interaction
    rest/security/index.json    Frame security origins and isolation context,
                                network response TLS/security provenance and
                                browser-schema-gated HTTPS certificate outcomes.
                                Bounded response and origin enumeration; full
                                DER certificate chain, when available, remains
                                in separate private security/certificate-*.json.
                                HTTP-only frames have no applicable TLS chain,
                                and missing HTTPS details are explicit.
    rest/page.mhtml             Native Chromium MHTML, where supported
    rest/viewport.png           Current viewport screenshot
    rest/targets/target-NNN/
         environment.json       DOM, form value lengths, scripts/links, CSSOM,
                                adopted sheets, open shadow roots, iframe
                                readable markup, resource timing, globals,
                                storage, caches, service workers, IDB names
         worker-environment.json
                                Own worker Runtime global snapshot, for
                                worker/shared_worker/service_worker targets
         storage.json           localStorage/sessionStorage keys and values
         storage-usage.json     Origin usage and quota breakdown
         indexeddb/index.json  Database/store schemas and capture outcomes
         indexeddb/database-*-store-*-page-*.json
                                IndexedDB records and CDP-serialized values
         cache-storage/index.json
                                Cache names and response metadata/hashes
         cache-storage/bodies/<sha256>.bin
                                Exact cached HTTP response body bytes
         dom-tree.json          CDP DOM.getDocument(depth=-1,pierce=true)
         dom-snapshot.json      CDP DOM/layout/selected computed style table
         frame-tree.json        CDP frame tree
         frame-context.json     Private schema-gated per-frame storage keys,
                                permissions policy, origin trials and security
                                isolation, page resource tree, PWA manifest and
                                best-effort bucket-name inventory.
         storage-partitions/index.json
                                Separate bounded selections for observed frame
                                storage keys and named/default buckets. Uses
                                exact storageBucket CDP parameters only when
                                present in installed Chromium /json/protocol.
         storage-partitions/selection-NNN/indexeddb/
                                Reuses complete per-store/page IndexedDB capture
                                with explicit selection and item/time limits.
         storage-partitions/selection-NNN/cache-storage/
                                Reuses indexed Cache Storage body archiving.
         storage-partitions/selection-NNN/opfs.json
                                Read-only FileSystem.getDirectory metadata,
                                bounded to 12 directories and depth 3 when
                                available. Lists names/sizes but cannot recover
                                file bytes. No page inputs, OPFS root creation,
                                bucket writes or extra URL fetches are used.
                                Unknown frame buckets, unsupported methods,
                                interrupted reads and content limits are partial;
                                origin-wide indexes remain separate.
         accessibility/index.json
                                Per-frame full AX tree outcomes and frame IDs
         accessibility/frame-NNN.json
                                Unmodified CDP Accessibility.getFullAXTree
                                nodes, including backendDOMNodeId mappings
         css-nodes/index.json   CSS capability inventory and element counts,
                                acquisition limits and partial outcomes
         css-nodes/page-NNN.json
                                Per-node computed/matched rules, CSS custom
                                properties, pseudo rules and platform fonts
         layout.json            Current layout metrics
         event-listeners.json   CDP listeners for window/document/root subtree
    rest/resources-at-rest.jsonl  Indexed response outcomes before input
    rest/scripts-at-rest.jsonl    Indexed compiled scripts before input
    rest/source-maps/index.json  Offline source-map reference, resolution
                                outcomes, embedded original-source counts,
                                bounded/unknown references and limitations
    rest/source-maps/<sha>.bin   Private full map bytes from inline data or
                                an already archived response, SHA-256 indexed
    rest/stylesheets/index.json CDP CSS stylesheet headers/provenance/outcomes
    rest/stylesheets/<sha>.css  Exact stylesheet source as exposed by CDP

    The security pass consumes only events already recorded from the page
    before rest. It never uses Security.enable or certificate-error overrides,
    does not make additional HTTP requests, and does not independently verify
    certificate trust. Browser-reported TLS state is only observed evidence.
    The HTTPS certificate retrieval path requires a positive installed-browser
    CDP schema check; an HTTP-only fixture cannot validate this branch.

    The companion native CDP recorder separately saves all observed and
    recoverable response bodies and compiled script sources under the run
    root. Privacy-redacted event logs retain HTTP and WebSocket activity
    metadata; separate restricted network-details.jsonl preserves
    HTTP headers, available POST data and real-time messaging payloads.
    The root dom-mutations.jsonl additionally records sensitive raw
    additions/removals, attributes, text and observed ShadowRoot attachment.
    All source contexts remain distinct via execution-context/frame IDs.
    Not all response bodies or code are exposed; inspect archive
    statuses, time bounds and the manifest. Source-map recovery is strictly
    offline: no new HTTP requests, DOM mutations, breakpoints or debugger
    state changes are introduced. External source-map references that the
    page/browser never fetched remain explicitly unobserved. Resolved maps
    are parsed only as source-map version 3 and preserve raw bytes (including
    sourcesContent if present). This does not imply all original source
    files, all module chunks or future compiled code have been recovered.
    Reference enumeration is capped at 128, each raw map at 16 MiB, and
    cumulative accepted map bytes at 32 MiB; unfinished/invalid inputs
    are recorded as partial rather than silently dropped.

SECURITY
    This is private debugger evidence. Page markup, bodies, browser
    resources and signed URLs may expose credentials and private content.
    environment.json records storage value lengths, not raw values.
    storage.json preserves unredacted local/session storage values; cookies.json
    includes browser cookie values. Those may be active credentials and must
    never be included in shared reports, logs or repository commits.
    Form values are not individually serialized except where already present
    in the captured page or network material.
    Use private local analysis directories and never publish raw files or
    browser profiles without reviewing their contents.

LIMITATIONS
    Full accessibility trees are collected only when the browser-specific
    protocol inventory exposes Accessibility.getFullAXTree. Each discovered
    frame is queried with its own frame ID (up to 128 per target); failure,
    missing frame discovery and capped enumeration remain partial rather
    than being presented as complete. The method does not require enabling
    Accessibility, which could change ongoing browser performance behavior.
    AX responses may contain private accessible names and values.

    When m web-analyze opts in, CSS.enable/startRuleUsageTracking run
    before initial navigation for attached page/iframe targets. The rest
    collector calls CSS.stopRuleUsageTracking at the beginning of rest
    analysis, before CSS detail probes or optional automatic scroll.
    Each target records timestamps, returned used flags, availability
    and explicit stop errors. The coverage describes only the interval
    actually observed after target attachment, not all rules that could
    ever be used. Chromium may return only ranges it has observed;
    a rule absent from the results cannot be classified as unused.
    reportedUnused counts only explicit used=false entries returned by CDP.
    Coverage collection can increase CPU/memory work;
    the stop method changes instrumentation state but not application
    input. The manual-session recorder does not enable it by default.
    Missing target attachment, unsupported protocol methods and the
    64-target / 20-second collection limit are not silently completed.
    If CSS rule-use collection itself throws, the collector records a
    partial coverage result and a private diagnostic file without aborting
    independent DOM, storage, network and accessibility acquisitions.

    The CSS pass uses the browser-specific protocol schema to check availability
    of CSS.getComputedStyleForNode, CSS.getMatchedStylesForNode and
    CSS.getPlatformFontsForNode. It traverses the CDP DOM tree including
    available shadow and frame descendants, querying at most 384 element
    identities per target, in bounded batches within a 20-second budget.
    Unknown support, unsupported methods, per-node errors, interruptions and
    unvisited elements are indexed explicitly. Applied/matched CSS, inherited
    custom properties, pseudo selectors and resolved font details can expose
    private page data. The pass does not force CSS pseudo states or animations.
    A saved index describes the observed DOM at one instant, not every
    unmounted/virtualized element or future CSS state.

    Event listener groups with failed CDP subcalls, stylesheet source failures,
    local/session storage subfailures and interrupted rest collection are now
    represented as partial/interrupted outcomes rather than as saved solely
    because their index file could be written.

    IndexedDB values use CDP deep serialization where supported; some complex
    browser objects may not be represented byte-for-byte. Unavailable
    values or failed requests are marked partial. Cache Storage bodies are
    read locally without requesting their URLs from the network. Large
    stores may consume substantial time and disk space.

    Target graph outcomes distinguish discovered but not attached relevant
    targets, attached but unready targets, previously destroyed targets, and
    attached-ready targets discovered too late for the per-target snapshot.
    The initial graph is rechecked for up to 3 seconds, requiring at least
    800 ms of stable attached/ready target identities before proceeding.
    Worker globals are evaluated in their own attached CDP sessions.
    Cross-origin iframe documents can have separate OOPIF targets when
    Chromium isolates their process; the frame tree is archived regardless.

    The rest collector queries instrumentation health for applicable
    document execution contexts. A missing hook, failed observer, initial
    late installation or clipped mutation value marks the corresponding
    artifact partial; unavailable contexts are not claimed complete.
    Root dom-mutations.jsonl is chronological for binding-delivered
    events, not an atomic record of browser execution. One callback may
    observe only the latest value following multiple synchronous writes;
    additions/removals before callback retain node identity and
    callback-time markup where accessible. Closed shadow roots can be
    observed only when the document-start attachShadow hook intercepted
    their creation (or other CDP observations happen to expose them);
    earlier roots and cached native calls remain limitations.

    The capture runs after the initial DOM-settlement heuristic, not from
    one globally frozen instant. Renderer DOM may still change while
    separate CDP commands execute. Attached out-of-process iframes are
    inspected when their target is ready; detached/blocked frames appear
    as partial evidence. Shadow DOM is observed through CDP pierce and
    open-root inspection where available; isolated worlds, workers,
    closed-root behavior, server source, future network replies, unloaded
    scripts and unseen application states are not certified complete.

SEE ALSO
    manual sys web-analyze
    manual sys web-analyze.lib.js
