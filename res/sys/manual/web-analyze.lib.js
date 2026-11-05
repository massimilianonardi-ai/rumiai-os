NAME
    web-analyze.lib.js - Chromium manual-session analyzer over native CDP/TCP

DESCRIPTION
    Directly executable Node.js CommonJS library within the m sys runtime.
    Launches the chromium
    executable resolved through the current process PATH (including the m
    shell's package/provider PATH), opens a dedicated Chromium profile, and
    observes a human-operated browser session using Chromium's native Chrome
    DevTools Protocol over a WebSocket/TCP connection on loopback.

    Chromium selects an ephemeral debugging port with
    --remote-debugging-port=0 and writes its endpoint to DevToolsActivePort
    inside the profile. The library connects only to 127.0.0.1; it does not
    require Playwright, a bundled browser, or an external CDP driver package.

INVOCATION
    From the m shell or an environment exposing nodejs and chromium:

      nodejs <path-to-lib> <url> <analisys-dir>

    For the library distributed with m:

      nodejs "$m_LIB_DIR/sys/js/web-analyze.lib.js" \
        "https://chatgpt.com/share/6ad1c0d5-49ec-83eb-a79b-85b04b938835" \
        "./analysis"

    The final argument is the directory for this recording. It and any
    missing parent directories are created automatically. An existing
    directory is accepted when it contains no conflicting evidence files.
    Existing JSONL files, resource/script indexes, resource directories or
    summary.json, cdp-wire.jsonl, cdp-capabilities.json and cdp-protocol.json
    are never overwritten: if found,
    the invocation fails and the previous evidence remains unchanged.

    Chromium opens visibly and remains under observation while the operator
    browses. Closing Chromium, pressing Ctrl+C or sending a termination
    signal ends the capture and writes summary.json. On requested shutdown,
    it first waits for network completion and outstanding CDP body/source reads
    for up to 6 seconds, requiring 750 ms of network quiet. Long-lived
    requests (including SSE) can prevent quiescence; the index and summary
    mark unfinished and unrecoverable resources. Closing the Chromium window
    externally cannot wait for network completion after CDP disconnects.
    Normal completion returns status 0;
    invalid argument count returns 2; start or recording failures return 1.
    The caller does not need to write a launcher or import the JavaScript
    module to use this command.

PUBLIC FUNCTION
    startWebAnalyze(options)
        Returns Promise<session>. options is an object containing:

          url           Required absolute http:// or https:// URL.
          outputDir     Required evidence directory; created if missing,
                        including missing parents, or reused if it contains
                        no conflicting previous analysis evidence.
          profileDir    Optional dedicated Chromium profile directory.
                        Default: <outputDir>/profile.
          chromium      Optional executable identity/path. Default: chromium.
          headless      Optional boolean; default false (visible browser).
          timeoutMs     Optional startup time limit; default 20000.
          cssRuleUsage  Optional boolean; default false. When true, the
                        recorder enables CSS selector coverage on attached
                        page/iframe targets before navigation where the
                        installed browser schema supports the methods.
                        This introduces CSS profiling overhead; it does not
                        synthesize user input or change page style rules.

        For page targets, the recorder also attempts version-gated
        ServiceWorker.enable (passive event subscription only), archiving
        registration/version events as raw private CDP packets. It never
        requests worker start/stop/update or unregisters a registration.
        For attached page/iframe targets, browser-schema-gated Animation.enable,
        Media.enable, WebAudio.enable and Preload.enable subscribe to naturally
        occurring animation, media, audio-context/node and browser speculation
        rule/prefetch/prerender events. Preload.enable does not create a rule,
        trigger a prefetch or navigate the page. Failed or
        unsupported observers are visible in targetGraph domains and are not
        treated as captured evidence. No animation seeking/pausing, playback
        control or WebAudio realtime-data acquisition is invoked.
        For page/iframe targets with browser-schema support,
        Network.enableReportingApi({enable:true}) subscribes to existing and
        subsequent browser-generated Reporting API notifications. This is a
        Network-domain feature, not an independent ReportingAPI domain;
        absent/failed subscriptions remain explicit. No report is generated,
        queued, transmitted or modified by the recorder.

        The function launches Chromium and instruments targets, then starts
        initial navigation without requiring the remote page to finish loading.
        It allows up to 1 second for a fast navigation acknowledgement; a slow
        Page.navigate response continues asynchronously while Chromium stays
        open and all CDP evidence continues to be recorded. The navigation
        command may itself time out after 120 seconds, but this is logged as
        page.initial-navigation-command-failed rather than shutting down the
        observation session. A blocked navigation is likewise logged without
        closing Chromium. The capture.ready record contains navigationPending
        to distinguish a pending navigation acknowledgement from a settled one. A process, CDP or instrumentation
        startup failure rejects the promise with a distinguishable
        web-analyze.<condition> error code. It never disables browser sandbox
        or certificate verification automatically.

        The returned session exposes:

          stop()       Async orderly shutdown; resolves with summary.
          closed       Promise resolving with summary after browser exit.
          outputDir    Absolute evidence directory pathname.
          profileDir   Absolute Chromium profile pathname.
          pid          Launched Chromium process identifier.
          sendPage(method, params = {})
                       Sends one raw CDP method in the session's initial
                       page target and resolves with its unmodified result.
                       Chromium-specific, privileged, valid only while the
                       captured page/session exists. It is intended for
                       deterministic read/scroll/screenshot probes; callers
                       own their effects and error handling.
          sendTarget(targetId, method, params = {}, timeoutMs = 12000)
                       Sends a CDP request to a live attached target,
                       including out-of-process iframe targets. Unknown
                       or detached targets fail explicitly.
          targets()    Returns current attached target IDs, types,
                       readiness and main-target indicator.
          targetGraph()
                       Async read-only inventory using Target.getTargets:
                       discovered targets, parent/child attachments,
                       enabled instrumentation domains, execution contexts,
                       missing/unready targets and capability errors.
                       Includes previously detached/destroyed identities.
          styleSheets()
                       Returns CSS stylesheet headers exposed by CDP,
                       including target identity, after CSS.enable.
                       When cssRuleUsage was requested, targets() also
                       reports cssRuleUsage instrumentation status, start
                       timestamp and failure identity per attached target.
                       The caller can end tracking with the native
                       CSS.stopRuleUsageTracking CDP command per target;
                       m web-analyze does this at the rest boundary.
          networkActivity()
                       Returns a read-only observation containing
                       inFlightRequests, pendingReads and quietForMs.
                       The counts reflect CDP-observed resources attached
                       to this recorder; quietForMs is milliseconds since
                       the last request/response/end/failure event.
                       This does not prove the page will remain idle.

        The consumer must retain and stop the session when finished. Closing
        Chromium externally also triggers finalization.

EVIDENCE
    JSONL files: lifecycle.jsonl, interaction.jsonl, dom.jsonl,
    network.jsonl, console.jsonl, performance.jsonl and error.jsonl.
    Events contain a globally increasing sequence, UTC timestamp, monotonic
    elapsed time in milliseconds and topic/type metadata. summary.json
    records event counts, dropped event counts, duration and resourceCapture
    totals including saved/missing/pending resources, compiled scripts and
    cdp wireCapture packet/write-error counts. Evidence is
    created with private permissions (new directory and evidence files)
    and is not overwritten. Existing directory permissions are preserved.

    Recursively configures target auto-attach for page, iframe, worker,
    shared_worker and service_worker targets. Context creation/destruction
    is preserved, with per-target instrumentation failures; workers need
    not provide DOM or Page domains. Browser target enumeration does not
    prove that every discovered target was successfully attached.
    Captures page/frame/target lifecycle; HTTP requests/responses and errors;
    WebSocket/SSE metadata; JavaScript console calls/exceptions; DOM mutation
    batches; click/pointer/keyboard-classification/input/focus/scroll events;
    browser performance entries. A bounded writer reports dropped records.

    The ordinary seven event streams remain privacy-redacted: they do not
    record entered values, cookies, raw requests/responses or WebSocket
    frames, and remove URL query strings/fragments. The new raw evidence
    files are intentionally different and can contain sensitive data:

      cdp-capabilities.json
                         Browser.getVersion result; attempted version-specific
                         local protocol retrieval and success/failure outcome;
                         enumerated browser-supported CDP domains, commands
                         and events when the protocol endpoint is available
      cdp-protocol.json  Unmodified /json/protocol schema from the running
                         Chromium build; absent on retrieval failure
      cdp-wire.jsonl     Private chronological inbound/outbound connected-CDP
                         message ledger, including unhandled notifications,
                         browser commands, target sessions and full results;
                         no filter by domain and no bounded diagnostic queue
      dom-mutations.jsonl
                         Sensitive ordered DOM mutation batches and shadow
                         root attachment/observation, including stable node
                         IDs scoped to one execution context, original text
                         and markup snapshots for added/removed nodes,
                         attribute old/current values, timing and frame
                         provenance. This is separate from dom.jsonl.
      network-details.jsonl
                         unredacted CDP request/response metadata, headers,
                         available POST content (including best-effort CDP
                         Network.getRequestPostData results), WebSocket frames,
                         EventSource events and handshake messages; private
      resources.jsonl    outcomes for completed requests, redirects,
                         failures and unfinished streams, including linked
                         redirect steps, body source, SHA-256/size and
                         separate partialBody metadata when available
      resources/         CDP-decoded complete or explicitly partial bodies,
                         stored by content hash with source extensions
      scripts.jsonl      parsed-script metadata (script language, context,
                         compilation hash, module flag, source-map reference),
                         archive kind, SHA-256, availability and pathname
      scripts/           JavaScript source text and, where CDP returns it,
                         binary WebAssembly bytecode from getScriptSource;
                         optional human-readable Wasm disassembly remains
                         separate from the binary module

    When the installed Chromium CDP protocol advertises the optional
    Page.addScriptToEvaluateOnNewDocument runImmediately parameter, the same
    document-start observer is also installed in execution contexts that
    already exist at target attachment time, including existing iframe
    contexts. The source has a per-document duplicate-installation guard.
    Older Chromium retains a best-effort Runtime.evaluate fallback for the
    main context only. cdp-capabilities.json records
    protocol.pageScriptRunImmediatelySupported. A late observer cannot
    reconstruct changes that happened before it was installed.

    The document-start page observer now also registers a MutationObserver
    on document before the root element is required. It observes newly
    discovered open ShadowRoots and wraps attachShadow when supported to
    observe both open and closed roots created after installation. Nodes
    receive stable per-document IDs; CDP execution-context and frame IDs
    distinguish different documents. Added/removed elements include a
    callback-time markup snapshot. Character-data and attributes carry
    previous values and callback-time current values. A node's current
    value at callback is not proof of each intermediate value within a
    mutation batch. Page instrumentation and attachShadow wrapping may
    perturb behavior; closed roots created before the hook or through
    a cached native function may not be observed.

    Raw DOM values are stored in dom-mutations.jsonl through a separate,
    synchronous 0600 evidence writer. Individual markup/text snapshots
    are bounded to 256 Ki UTF-16 code units and the truncation counter
    and per-field truncated flags must be inspected. Errors in this raw
    writer are reported in summary.json resourceCapture.domHistory;
    even a successful writer status does not prove the observer ran in
    every frame, stayed installed, or observed unvisited application
    states. Per-context rest snapshots and hook health are stored under
    rest/dom-history-contexts.json.

    All wire packets received or sent on the connected debugger WebSocket
    are archived, including command results. The ledger cannot recover
    events from before attachment, disabled domains or unconnected targets.
    A disk write failure is exposed as wireCapture.status=partial in the
    final summary and must never be interpreted as a lossless archive.
    Browser capabilities identify the local Chromium protocol, not a
    guarantee that every available method was invoked.

    The recorder requests Network.enable with 64 MiB total and 32 MiB
    per-resource buffer limits, plus up to 1 MiB of request post data.
    If unavailable, ordinary Network.enable is used with recorded fallback
    status. When supported, the dedicated Network.configureDurableMessages
    method is attempted after Network.enable to preserve response bodies
    across process navigations. The deprecated enableDurableMessages
    flag is not used while a target is suspended. The observed result per
    target is in summary.json resourceCapture.networkConfiguration.

    Streaming is activated for EventSource requests and for responses
    identified as text/event-stream, only when the browser advertises
    Network.streamResourceContent. Ordinary Fetch/XHR responses are not
    forcibly streamed: doing so can disturb completion and resource-body
    recovery. Buffered data and subsequent dataReceived chunks are
    preserved in order within a 16 MiB per-request and 64 MiB total
    in-memory limit. Completed bodies prefer
    Network.getResponseBody; if unavailable, complete streamed data or
    read-only Page.getResourceContent for known frame resources may be used.
    No resource URLs are replayed or re-requested. Incomplete and aborted
    streams may produce SHA-256-indexed .partial artifacts, which never
    mean that the complete response was recovered.

    The resource index records request failures, CDP-unavailable bodies,
    redirect responses without bodies, and unfinished requests.
    If Chromium supplies a response event without a request event (for
    example after enabling CSS inspection for cached stylesheets), the
    response URL, type, frame, cache flag and status are preserved with
    requestProvenance=response-only; the archive attempts normal CDP body
    retrieval without inventing request method, initiator or timestamp.
    A recovered body is saved but request provenance remains partial;
    unavailable bytes retain an explicit body-unavailable outcome.
    summary.json resourceCapture.responseOnly counts these observations,
    separately from observed requestWillBeSent events. Two
    identical bodies may share a content-addressed file. CDP can expose
    bodies from cache/service workers, but cannot guarantee bytes for all
    network activity, streaming requests, WebSocket traffic or response
    bodies evicted before retrieval. Some Chromium versions may provide
    only textual WebAssembly disassembly rather than bytecode; this is
    labelled wasm-text-only with bytecodeStatus=unavailable and does not
    certify the original binary. A saved Wasm bytecode artifact uses the
    exact CDP base64-decoded bytes with a separate content digest.
    Source-map URLs from scriptParsed remain reference metadata; the
    companion rest collector may resolve inline data or already archived
    map bodies without new browser/network requests.
    The saved bytes are the body returned
    by CDP (after transport/content decoding where applicable), not a raw
    packet capture. JavaScript compilation metadata is captured for
    parsed scripts, but this does not itself enumerate registered event
    listeners or prove causality for DOM changes.

    IMPORTANT: dom-mutations.jsonl can include raw user-entered text,
    passwords, authentication tokens and removed DOM content. It is
    restricted private evidence, not an audit-friendly log.
    cdp-wire.jsonl contains unredacted CDP messages and may
    include session keys, passwords, authorization headers, cookies, storage
    data and entire private responses. Handle it as highly confidential.
    network-details.jsonl can include authorization headers,
    session credentials, cookies, request data and real-time message bodies;
    do not share it or include it in external diagnostics.
    resources.jsonl preserves full original URLs including
    query strings; bodies, compiled JavaScript and HTML can expose signed
    URLs, access tokens or personal information. Treat the entire analysis
    directory as confidential, do not commit it to Git, and securely
    review/discard it after analysis. Existing directory permissions are
    preserved, so use an isolated private output directory. Chromium also
    writes potentially sensitive session state under profileDir.

    Sampling, lifecycle races, debugger permissions and browser policies can
    result in incomplete observation; inspect resourceCapture and per-request
    statuses rather than assuming that every downloaded response was saved.

LIBRARY EXAMPLE
    A program may also import the library instead of executing it:

      node - <<'NODE'
      const {startWebAnalyze} = require(
        process.env.m_LIB_DIR + '/sys/js/web-analyze.lib.js');
      (async () => {
        const session = await startWebAnalyze({
          url: 'https://example.org',
          outputDir: './session-001'
        });
        console.log('Chromium open; press Enter to finish.');
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once('data', resolve));
        console.log(await session.stop());
      })().catch(error => { console.error(error); process.exitCode = 1; });
      NODE

DEPENDENCIES
    Node.js >= 22 (native WebSocket), Chromium available as chromium on the
    effective PATH, functional native Chrome DevTools Protocol over local TCP.
    No Playwright dependency.

SECURITY
    The local TCP CDP endpoint grants debugger-level privileges to local
    processes capable of accessing it. The library restricts the listener
    address to loopback but does not implement authentication of other local
    processes. Do not expose the endpoint through a proxy or port forward.
    A dedicated user-data-dir is mandatory for Chromium remote debugging.
