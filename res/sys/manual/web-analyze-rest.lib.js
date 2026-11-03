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
                    sendTarget, targets, styleSheets, networkActivity.
        directory   Root private run directory (existing).
        options     Optional {interrupted: () => boolean} to stop between
                    target captures.
        Returns a Promise for a manifest with status, artifact outcomes,
        attached target inventory, metadata, SHA-256 and limitations.

        Individual unavailable CDP capabilities are retained as explicit
        artifact outcomes rather than silently synthesized as success.
        Filesystem failures propagate to the caller.

OUTPUT
    rest/manifest.json          Capture ledger: status, per-artifact failures
    rest/README.md              Human-readable evidence index
    rest/target-graph-initial.json
                                Discovered/attached targets at rest entry
    rest/target-graph-final.json
                                Refreshed target/worker/context graph and gaps
    rest/cookies.json           Browser-context cookies, including HttpOnly
    rest/network-details-at-rest.jsonl
                                Raw network events frozen before interaction
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
         layout.json            Current layout metrics
         event-listeners.json   CDP listeners for window/document/root subtree
    rest/resources-at-rest.jsonl  Indexed response outcomes before input
    rest/scripts-at-rest.jsonl    Indexed compiled scripts before input
    rest/stylesheets/index.json CDP CSS stylesheet headers/provenance/outcomes
    rest/stylesheets/<sha>.css  Exact stylesheet source as exposed by CDP

    The companion native CDP recorder separately saves all observed and
    recoverable response bodies and compiled script sources under the run
    root. Privacy-redacted event logs retain HTTP and WebSocket activity
    metadata; separate restricted network-details.jsonl preserves
    HTTP headers, available POST data and real-time messaging payloads.
    Not all response bodies or code are exposed; inspect archive
    statuses, time bounds and the manifest.

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
