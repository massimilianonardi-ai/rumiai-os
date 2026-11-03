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
    rest/page.mhtml             Native Chromium MHTML, where supported
    rest/viewport.png           Current viewport screenshot
    rest/targets/target-NNN/
         environment.json       DOM, live form values, scripts/links, CSSOM,
                                adopted sheets, open shadow roots, iframe
                                readable markup, resource timing, globals,
                                storage, caches, service workers, IDB names
         dom-tree.json          CDP DOM.getDocument(depth=-1,pierce=true)
         dom-snapshot.json      CDP DOM/layout/selected computed style table
         frame-tree.json        CDP frame tree
         layout.json            Current layout metrics
         event-listeners.json   CDP listeners for window/document/root subtree
    rest/stylesheets/index.json CDP CSS stylesheet headers/provenance/outcomes
    rest/stylesheets/<sha>.css  Exact stylesheet source as exposed by CDP

    The companion native CDP recorder separately saves all observed and
    recoverable response bodies and compiled script sources under the run
    root. Privacy-redacted event logs retain HTTP and WebSocket activity
    metadata, not authorization headers, request POST contents or frame
    payloads. Not all response bodies or code are exposed; inspect archive
    statuses, time bounds and the manifest.

SECURITY
    This is private debugger evidence. Page markup, bodies, browser
    resources and signed URLs may expose credentials and private content.
    environment.json records storage value lengths, not their raw values;
    form values are not serialized, only type/length/checked state.
    Use private local analysis directories and never publish raw files or
    browser profiles without reviewing their contents.

LIMITATIONS
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
