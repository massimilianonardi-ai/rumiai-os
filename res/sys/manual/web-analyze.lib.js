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
    summary.json are never overwritten: if found,
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

        The consumer must retain and stop the session when finished. Closing
        Chromium externally also triggers finalization.

EVIDENCE
    JSONL files: lifecycle.jsonl, interaction.jsonl, dom.jsonl,
    network.jsonl, console.jsonl, performance.jsonl and error.jsonl.
    Events contain a globally increasing sequence, UTC timestamp, monotonic
    elapsed time in milliseconds and topic/type metadata. summary.json
    records event counts, dropped event counts, duration and resourceCapture
    totals including saved/missing/pending resources and compiled scripts. Evidence is
    created with private permissions (new directory and evidence files)
    and is not overwritten. Existing directory permissions are preserved.

    Captures page/frame/target lifecycle; HTTP requests/responses and errors;
    WebSocket/SSE metadata; JavaScript console calls/exceptions; DOM mutation
    batches; click/pointer/keyboard-classification/input/focus/scroll events;
    browser performance entries. A bounded writer reports dropped records.

    The ordinary seven event streams remain privacy-redacted: they do not
    record entered values, cookies, raw requests/responses or WebSocket
    frames, and remove URL query strings/fragments. The new raw evidence
    files are intentionally different and can contain sensitive data:

      resources.jsonl    one indexed outcome per observed completed request,
                         redirect or failure; full original response URL,
                         type, status, SHA-256, bytes and saved pathname
      resources/         exact decoded response bodies from CDP
                         Network.getResponseBody, content-hash filenames
      scripts.jsonl      parsed-script metadata, source availability,
                         SHA-256 and pathname
      scripts/           JavaScript sources from Debugger.getScriptSource,
                         including dynamically compiled or inline scripts

    The resource index records request failures, CDP-unavailable bodies,
    redirect responses without bodies, and unfinished requests. Two
    identical bodies may share a content-addressed file. CDP can expose
    bodies from cache/service workers, but cannot guarantee bytes for all
    network activity, streaming requests, WebSocket traffic or response
    bodies evicted before retrieval. The saved bytes are the body returned
    by CDP (after transport/content decoding where applicable), not a raw
    packet capture. JavaScript compilation metadata is captured for
    parsed scripts, but this does not itself enumerate registered event
    listeners or prove causality for DOM changes.

    IMPORTANT: resources.jsonl preserves full original URLs including
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
