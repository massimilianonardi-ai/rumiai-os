NAME
    web-analyze.lib.js - Chromium manual-session analyzer over native CDP/TCP

DESCRIPTION
    Node.js CommonJS library within the m sys runtime. Launches the chromium
    executable resolved through the current process PATH (including the m
    shell's package/provider PATH), opens a dedicated Chromium profile, and
    observes a human-operated browser session using Chromium's native Chrome
    DevTools Protocol over a WebSocket/TCP connection on loopback.

    Chromium selects an ephemeral debugging port with
    --remote-debugging-port=0 and writes its endpoint to DevToolsActivePort
    inside the profile. The library connects only to 127.0.0.1; it does not
    require Playwright, a bundled browser, or an external CDP driver package.

PUBLIC FUNCTION
    startWebAnalyze(options)
        Returns Promise<session>. options is an object containing:

          url           Required absolute http:// or https:// URL.
          outputDir     Required NEW pathname for the evidence directory.
          profileDir    Optional dedicated Chromium profile directory.
                        Default: <outputDir>/profile.
          chromium      Optional executable identity/path. Default: chromium.
          headless      Optional boolean; default false (visible browser).
          timeoutMs     Optional startup time limit; default 20000.

        The function launches Chromium and instruments targets, then attempts
        the initial navigation. If browser policy/network blocks that
        navigation, the failure is logged and the capture stays active so
        the operator may navigate manually. A process, CDP or instrumentation
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
    records event counts, dropped event counts and duration. Evidence is
    created with private directory/file permissions and is not overwritten.

    Captures page/frame/target lifecycle; HTTP requests/responses and errors;
    WebSocket/SSE metadata; JavaScript console calls/exceptions; DOM mutation
    batches; click/pointer/keyboard-classification/input/focus/scroll events;
    browser performance entries. A bounded writer reports dropped records.

    Browser instrumentation is deliberately privacy-aware. It does not
    record passwords, typed values, request/response bodies, cookies or
    WebSocket payloads. It removes URL query strings and fragments; URL paths
    and HTTP status/error metadata may still be sensitive. Chrome itself may
    store authenticated session material in profileDir. Handle the directory
    as confidential and delete it when no longer needed.

    Sampling, lifecycle races, debugger permissions and browser policies can
    result in incomplete observation; the logs are detailed diagnostic
    evidence, not a guaranteed lossless recording of all browser activity.

EXAMPLE
    From the m shell:

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
