NAME
    chatgpt-export.lib.js - ChatGPT conversation snapshot exporter over Chromium CDP/TCP

DESCRIPTION
    A directly executable CommonJS Node.js library. Given a URL and an
    analysis directory, it launches 'chromium' from the effective PATH,
    opens a dedicated temporary Chromium profile with an ephemeral TCP CDP
    listener restricted to 127.0.0.1, navigates to the requested URL, then
    examines public share-page hydration data for a conversation snapshot,
    then reuses the Python exporter's forensic serialization pipeline. The
    prior Electron breakpoint path remains available separately.

    The original converter is preserved. No Python, SQLite or Playwright
    dependency is required. This exporter targets the in-memory ChatGPT
    conversation snapshot applicator, not page screenshots or mounted DOM.

DIRECT INVOCATION
    node <path-to-lib> <url> <analisys-dir>

    Example:
      nodejs "$m_LIB_DIR/sys/js/chatgpt-export.lib.js" \
        "https://chatgpt.com/share/6ad1c0d5-49ec-83eb-a79b-85b04b938835" \
        "./analysis"

    <url> must be an absolute HTTP(S) URL; <analisys-dir> may be a relative
    or absolute directory. It and any missing parents are created
    automatically. No external launcher or manually selected CDP port is
    needed. Existing analysis directories are accepted.

    The library starts Chromium visibly when a graphical display is
    configured, otherwise with Chromium's native --headless=new.
    It does not disable TLS verification or the browser sandbox.
    It opens about:blank first, discovers the actual ephemeral CDP port via
    DevToolsActivePort, attaches to that page, navigates to <url>, waits
    for document loading to complete, enables Runtime and Debugger, and
    verifies the loaded document is still at the requested page origin and
    share route (rather than an authentication redirect or Chromium error),
    then reads embedded share data from Remix/React Router loader state or
    React Router's inline streamed hydration payload. It recognizes an
    original mapping/current_node snapshot or a linear_conversation array.
    For linear_conversation it creates an active-branch projection for the
    existing transcript converter, without inventing missing branches.
    The captured decoded source is retained in the RAW file. Once recognized,
    the existing converter writes the forensic artifacts. The owned browser is closed
    and its temporary profile removed on success and handled failure.

    IMPORTANT: Shared-page loader/stream representations are undocumented
    and may change. If neither recognized structure is available, the tool
    fails explicitly with share-snapshot-not-found and reports whether loader
    globals or React Router chunks were observed. It does not use mounted
    DOM fragments to claim a complete export. Shared linear snapshots may
    omit alternate branches, internal state and attachment bytes.

PUBLIC FUNCTIONS
    exportChatgptUrl(url, analysisDir, options)
        Async. The direct invocation's programmatic equivalent.
        Required: HTTP(S) url, analysisDir pathname.
        Optional options:
          chromium             Binary name/path, default 'chromium'.
          headless             Explicit boolean browser headless mode.
          startupTimeoutMs     CDP readiness timeout; default 20000.
          navigationTimeoutMs  Page load wait; default 30000.
          timeoutMs            Snapshot breakpoint wait; default 0 means
                               unbounded as in the original Python exporter.
          onEvent              function(level, code, data) for diagnostics.
          shareTimeoutMs       Time to discover shared-page hydration data;
                               default 12000 ms.
        Resolves with an export summary, or rejects with a branch-specific
        chatgpt-export.* code. Chromium and CDP belong to this invocation.

    chatgptExport(host, port, options)
        Preserved lower-level asynchronous API: attaches to an already
        running ChatGPT Electron renderer at an explicit CDP host/port.
        options is optional:
          conversationId        With ID, navigates to the original
                                app://-/index.html?initialRoute=... route.
                                Without ID, reloads the current renderer and
                                accepts the first matching snapshot.
          outputDir             Destination parent; default process.cwd().
          title                 Optional title fallback.
          createdAt             Optional Unix timestamp fallback.
          timeoutMs             Optional snapshot-wait timeout; 0 unbounded.
          onEvent               Optional callback(level, code, context).

        This low-level API still supports the original Electron workflow;
        direct CLI invocation has changed to URL/directory and never reads
        SQLite or selects conversations.

    exportChatgptSnapshot(rawJson, selected, outputRoot)
        Synchronous snapshot converter with no CDP interaction.
        selected is optional {display_title, source_created_at}; outputRoot
        defaults to the working directory. Returns an export summary.

OUTPUT
    Creates one new "YYYY-MM-DD title" child directory inside the analysis
    directory, with a numeric suffix if needed, and an adjacent .zip.
    Child content:
        conversation.raw.json.gz    complete compressed captured snapshot
        TRANSCRIPT.md               readable active-branch transcript
        VISIBLE_MESSAGES.jsonl      full candidate-visible message objects
        NON_TEXT_PARTS.json         non-string parts from included messages
        AUDIT.json                  per-node classification and counts
        README.md                   export metadata and file explanation
        SHA256SUMS                  uncompressed-RAW and artifact hashes

    Original mapping snapshots retain tool traffic, assistant analysis and
    inactive branches in RAW; derived transcript uses the active branch.
    For a linear share snapshot, RAW holds the decoded linear source and
    AUDIT.json explicitly marks the mapping as a derived projection.
    No attachment download is performed. Temporary Chromium profile data
    is not part of the completed export.

DEPENDENCIES
    Node.js >= 22 (native WebSocket), the 'chromium' executable available
    through PATH, a functional local CDP TCP/WebSocket endpoint and a
    share page with recognized hydration data; the older Electron API
    retains its compatible snapshot-applicator requirement.

EXIT STATUS
    0   Snapshot captured and artifacts written.
    1   Browser, CDP, navigation, snapshot or filesystem failure.
    2   Invalid direct-invocation argument count.

SECURITY
    CDP is a privileged debugger interface. It is exposed on loopback TCP
    only for the duration of this invocation, with a dedicated temporary
    browser profile. Other local processes may nevertheless connect while
    active. Use only authorized URLs. RAW snapshots and ZIP archives may
    contain sensitive data and are created with restrictive file permissions
    under newly created private child directories.
