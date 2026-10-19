NAME
    chatgpt-export.lib.js - ChatGPT Electron conversation snapshot exporter over native CDP

DESCRIPTION
    Node.js CommonJS library that ports the Python ChatGPT exporter from its
    renderer/CDP connection onward. It attaches to an existing ChatGPT
    Electron main renderer, discovers the snapshot applicator using the
    mergeActiveBranch semantic marker, arms a URL breakpoint, triggers
    conversation loading, reads and serializes the in-memory conversation
    argument, resumes the paused debugger, and produces the Python export's
    forensic artifacts.

    The caller owns ChatGPT startup and the CDP host/port. This library does
    not launch applications, use Playwright, require Python, or read SQLite.

PUBLIC FUNCTIONS
    chatgptExport(host, port, options)
        Async. Required host is the hostname or IP of the existing CDP HTTP
        endpoint; port is its TCP port. options is optional:
          conversationId   ChatGPT conversation ID. With an ID, navigates to
                           app://-/index.html?initialRoute=...
                           and accepts only the matching snapshot.
                           Without an ID, reloads the current renderer and
                           accepts the first valid conversation snapshot;
                           manual chat navigation is possible while waiting.
          outputDir        Destination parent directory; default process.cwd().
          title            Optional title fallback when snapshot has none.
          createdAt        Optional Unix timestamp fallback.
          timeoutMs        Optional positive snapshot-wait timeout in ms;
                           default 0 means unbounded, as in original Python.
          onEvent          Optional function(level, code, context), for
                           operational diagnostics (info, warn, debug).
        Returns Promise resolving to:
          {outdir, zip, title, conversation_id, raw_bytes, raw_sha256,
           mapping_nodes, active_nodes, visible_messages, non_text_parts}.
        Rejects errors with branch-identifying chatgpt-export.* code.
        The paused renderer is resumed even if frame extraction fails.
        A failed Page.navigate is reported as a warning; the operator can
        open the requested conversation manually.

    exportChatgptSnapshot(rawJson, selected, outputRoot)
        Synchronous converter that does no CDP operations. rawJson is the
        captured JSON string; selected is optional fallback metadata
        {display_title, source_created_at}; outputRoot is the destination
        directory (default current working directory).
        Returns the same export summary as chatgptExport.

DIRECT LIBRARY INVOCATION
    nodejs /path/to/chatgpt-export.lib.js <host> <port> [conversation-id] [output-dir]

    This is direct execution of the library for convenience; no standalone
    m command is created. The omitted ID uses the current-renderer reload
    behavior described above.

OUTPUT
    A new YYYY-MM-DD title directory, with a numeric suffix if necessary,
    and an adjacent ZIP archive containing:
        conversation.raw.json.gz    complete compressed captured snapshot
        TRANSCRIPT.md               readable active-branch transcript
        VISIBLE_MESSAGES.jsonl      full visible candidate message objects
        NON_TEXT_PARTS.json         non-string parts from included messages
        AUDIT.json                  per-node classification and counts
        README.md                   export metadata and file explanation
        SHA256SUMS                  uncompressed-RAW and artifact hashes

    Alternate mapping branches remain in the RAW snapshot but not in the
    active-branch transcript. Tool traffic and assistant analysis are omitted
    from derived visible messages; they are not removed from the RAW.
    File contents preserve the Python text/classification semantics; gzip
    and ZIP are produced with Node core compression and may differ bytewise
    from Python archives even when extracted content is equal.

DEPENDENCIES AND CONDITIONS
    Node.js >=22 (native WebSocket), a reachable CDP HTTP/WebSocket endpoint,
    a ChatGPT Electron main renderer whose app://-/index.html target and
    mergeActiveBranch snapshot-applicator signature match the original Python
    exporter. No external Node modules are required. Browser updates can
    change the minified snapshot hook and invalidate discovery. This is not
    a general ChatGPT share-URL exporter and does not download attachment bytes.

SECURITY
    CDP debugger access is privileged and may read sensitive conversation
    content. Use only authorized trusted CDP endpoints. Output files are
    created with restrictive permissions (0600) under new directories (0700).
    Do not make the resulting RAW JSON and archives publicly accessible.
