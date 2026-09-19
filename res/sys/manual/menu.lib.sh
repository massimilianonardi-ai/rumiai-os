NAME
    menu.lib.sh - reusable POSIX-sh terminal-menu engine

DESCRIPTION
    menu.lib.sh provides provider-driven menu rendering, terminal navigation,
    configurable action keys, multi-selection and structured result state.

    Terminal/TTY mechanics are delegated to term.lib.sh. The library uses
    array.lib.sh for array-backed providers/results and map.lib.sh for internal
    key/selection sets.

PUBLIC CONFIGURATION
    menu_header
        Header text rendered above the menu.

    menu_footer
        Footer text rendered immediately after visible items.

    menu_bottom_footer
        Footer text anchored at the bottom of the terminal.

    menu_array_values
        Array name used as values by menu_array_provider.

    menu_array_labels
        Parallel array name used as labels by menu_array_provider.

PUBLIC RESULT STATE
    menu_result_key
        Action key that completed the successful session.

    menu_result_value
        First returned value, provided as a single-result convenience.

    menu_result_values
        array.lib.sh array containing every returned value in provider order.

    menu_error
        Failure detail for invalid API use or engine/provider/terminal failure.

FUNCTIONS
    menu_reset
        Reset headers/footers, action keys, the default Space toggle key and
        public result state.

    menu_key_clear
        Remove every configured action key.

    menu_key_add <key>
        Add one action key. Navigation keys, Enter, Escape, the configured
        multi-selection toggle and duplicates are rejected.

    menu_toggle_key_set <key>
        Change the multi-selection toggle key. The new key must be a valid
        configurable terminal key, must not be navigation/Enter/Escape and
        must not already be configured as an action key.

    menu_run_provider <provider-function>
        Run one interactive menu session against provider-function. On success,
        populate menu_result_key, menu_result_value and menu_result_values.

    menu_array_provider
        Provider adapter for the parallel arrays named by menu_array_values and
        menu_array_labels. Both arrays must have the same positive size for a
        runnable menu.

PROVIDER CONTRACT
    A provider is called with:

        provider count
        provider item index
        provider event key index value label

    count sets menu_provider_count to a positive integer.

    item sets menu_provider_value and menu_provider_label. Values may contain
    embedded/trailing newlines. Labels must be single-line.

    Before event, the engine sets:

        menu_provider_action=return

    The provider may leave it unchanged or set:

        return
            Finish. If marks exist, return every marked value in provider
            order; otherwise return the current value.

        reload
            Re-read the count, preserve/clamp the cursor, preserve marked
            indices that remain valid and prune marks beyond the new count.

        reset
            Re-read the count, select index 0 and clear all marks.

        ignore
            Continue without finishing.

        cancel
            Finish as cancellation.

    Enter is always delivered as an event. The configured multi-selection key
    is handled by the engine and is not delivered to the provider.

MULTI-SELECTION
    Space is the default toggle key. Marks are index-based within the current
    provider view. A provider that changes identity/order incompatibly with
    index preservation must return reset rather than reload.

TERMINAL
    menu_run_provider uses the TTY selected by term_tty_device. Call
    term_tty_use before menu_run_provider to select another TTY.

    The menu session saves/restores exact TTY state and coordinates alternate
    screen, keypad and cursor lifecycle through term.lib.sh.

RETURN STATUS
    menu_reset, menu_key_clear, menu_key_add, menu_toggle_key_set,
    menu_array_provider:
        0   Success.
        1   Operational/storage failure where applicable.
        2   Invalid API usage/key/provider operation.

    menu_run_provider:
        0   Successful action result.
        1   User/provider cancellation.
        2   Invalid API usage or menu/provider/terminal failure.
        signal-derived statuses are propagated.

CALLER OBLIGATIONS
    The m runtime must be initialized so m_LIB_DIR and quote are available.
    Callers must treat underscore-prefixed functions as internal and must use
    only the public functions documented above.

    Provider callbacks must obey the provider protocol and keep labels to one
    terminal row. POSIX shell variables cannot represent NUL bytes.

SEE ALSO
    manual menu
    manual term.lib.sh
    manual array.lib.sh
    manual map.lib.sh
