NAME
    web-analyze-pw.lib.js - Playwright browser inspection library

DESCRIPTION
    This CommonJS Node.js library implements the web-analyze-pw command.
    It resolves the installed 'playwright' command by PATH, probes the Node
    module selected by that command without assuming an on-disk package layout,
    launches matching Chromium, observes the page and writes private evidence.

PUBLIC FUNCTIONS
    webAnalyzePw(options)
        Async function accepting a parsed options object with:
            url         Absolute HTTP(S) URL.
            output      NEW absolute output directory.
            headless    Boolean (default false).
            maxSteps    Positive maximum actions per direction.
            settleMs    Nonnegative wait after each wheel action.
            observeMs   Nonnegative extra observation duration.

        Creates output, launches/inspects browser, writes events.jsonl,
        summary.json, per-checkpoint HTML/PNG, trace.zip and best-effort MHTML.
        Resolves to {output, captures, droppedEvents}. On failure rejects
        with Error carrying id and status; partial evidence may still exist.
        Output directory must not exist. No external persistent profile reused.

    webAnalyzePwMain(argv)
        Parse the user-facing command arguments, run webAnalyzePw, and resolve
        with a numeric CLI status. Writes diagnostics to stderr and progress
        to stdout. Does not terminate the calling Node process.

NOTES
    Internal helpers have underscore-prefixed names and are not callable API.
    The CLI's Playwright Node-module probe is part of implementation; consumers
    should call webAnalyzePw or webAnalyzePwMain, not private helpers.

    Page snapshots cover the mounted DOM at each sampled scroll position and
    cannot promise completeness on virtualized websites. Network metadata
    excludes bodies, cookies and headers. Browser trace and HTML can contain
    sensitive material and should remain local.

FILES
    lib/sys/js/web-analyze-pw.lib.js
    bin/sys/web-analyze-pw

SEE ALSO
    manual sys web-analyze-pw
