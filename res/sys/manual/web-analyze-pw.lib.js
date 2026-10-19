NAME
    web-analyze-pw.lib.js - deep browser analysis through Playwright

SYNOPSIS
    nodejs <path-to-lib> <http(s)-url> <analysis-dir>

DESCRIPTION
    This directly executable CommonJS Node.js library starts the Playwright-
    managed Chromium browser and observes navigation, network metadata,
    console/errors, DOM mutations, performance, scrolling and current page
    structure. It uses the installed 'playwright' command resolved from PATH
    to discover its matching Node API and browser-cache location, without a
    hardcoded package path.

    The <analysis-dir> directory is created if absent. Every invocation
    creates a unique private run-* subdirectory, so an existing analysis
    directory is accepted and previous recordings are preserved.

    The browser opens visibly by default. The automatic inspection scrolls
    down then back up, following the dominant scrollable page element.
    HTML and PNG snapshots are taken at observed positions. A Playwright trace,
    native final MHTML snapshot when available, events.jsonl and summary.json
    are also produced. Virtualized sites expose only the DOM mounted during
    each observation; complete recovery of unseen content is not promised.

PUBLIC FUNCTIONS
    webAnalyzePw(options)
        Asynchronous analysis. Options:
            url         HTTP(S) URL.
            output      Path of analysis directory (created if absent).
            headless    Optional boolean (default false).
            maxSteps    Optional positive steps per direction (default 80).
            settleMs    Optional wait per step (default 500 milliseconds).
            observeMs   Optional extra observation duration (default zero).

        Creates a private run-* child and resolves to {output, captures,
        droppedEvents}; output contains the actual run directory. Throws
        errors with id/status on failures.

    webAnalyzePwMain(argv)
        Async entrypoint equivalent to direct execution. argv is exactly
        [url, analysisDir]. Returns a numeric status instead of exiting.

EXIT STATUS
    0   Analysis finished.
    1   Arguments invalid.
    2   Playwright CLI invocation failed.
    3   Playwright Node resolution probe unavailable.
    4   Playwright Node module missing.
    5   Invalid Playwright browser API.
    6   Chromium failed to launch.
    7   Navigation failed.
    8   Other runtime, filesystem or evidence failure.

FILES
    lib/sys/js/web-analyze-pw.lib.js

OUTPUT AND PRIVACY
    Session directory mode 0700; evidence files use restrictive permissions.
    Screenshots, HTML, native MHTML and trace archives may contain user data.
    Event logs redact URL queries and fragments and do not store request bodies,
    cookies, headers or entered input text. URL paths can remain sensitive.

EXAMPLE
    nodejs /path/to/rumiai-os/lib/sys/js/web-analyze-pw.lib.js \
      https://chatgpt.com/share/6ad1c0d5-49ec-83eb-a79b-85b04b938835 \
      ./chatgpt-analysis
