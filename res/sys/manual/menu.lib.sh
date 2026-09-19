NAME
    menu.lib.sh - reusable POSIX-sh terminal-menu engine

DESCRIPTION
    menu.lib.sh provides provider-driven menu rendering, terminal navigation,
    configurable action keys, optional multi-selection and structured result
    state.

    Single selection is the default. Multi-selection can be enabled explicitly
    and disabled again through the public API.

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
        In single-selection mode it contains exactly one value.

    menu_error
        Failure detail for invalid API use or engine/provider/terminal failure.

FUNCTIONS
    menu_reset
        Reset headers/footers, action keys, public result state and
        multi-selection configuration. Multi-selection becomes disabled and
        Space becomes the configured but inactive toggle key.

    menu_key_clear
        Remove every configured action key.

    menu_key_add <key>
        Add one action key. Navigation keys, Enter, Escape and duplicates are
        rejected. The configured multi-selection toggle is also rejected while
        multi-selection is enabled; while disabled it is not reserved.

    menu_multiselect_enable
        Enable multi-selection using the currently configured toggle key.
        Fails if that key is already configured as an action key. Enabling
        starts with no marks.

    menu_multiselect_disable
        Disable multi-selection and clear all current marks. The configured
        toggle key stops being reserved.

    menu_toggle_key_set <key>
        Change the configured multi-selection toggle key without changing
        whether multi-selection is enabled. The key must be a valid
        configurable terminal key and not navigation/Enter/Escape. If
        multi-selection is currently enabled, it must not already be an action
        key.

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
            Finish. In single-selection mode return the current value. In
            multi-selection mode return every marked value in provider order,
            falling back to the current value when no mark exists.

        reload
            Re-read the count and preserve/clamp the cursor. When
            multi-selection is enabled, preserve marked indices that remain
            valid and prune marks beyond the new count.

        reset
            Re-read the count, select index 0 and clear all marks.

        ignore
            Continue without finishing.

        cancel
            Finish as cancellation.

    Enter is always delivered as an event. An enabled multi-selection toggle
    key is handled by the engine and is not delivered to the provider.

SELECTION
    Single selection is the default. The renderer shows only the cursor and
    item label, and successful actions return exactly the current item.

    Multi-selection is enabled only through menu_multiselect_enable. Space is
    the default configured toggle key unless menu_toggle_key_set selects
    another one. While enabled, the renderer adds mark boxes and the toggle key
    marks/unmarks the current item without finishing the menu.

    Marks are index-based within the current provider view. A provider that
    changes identity/order incompatibly with index preservation must return
    reset rather than reload.

TERMINAL
    menu_run_provider uses the TTY selected by term_tty_device. Call
    term_tty_use before menu_run_provider to select another TTY.

    The menu session saves/restores exact TTY state and coordinates alternate
    screen, keypad and cursor lifecycle through term.lib.sh.

    Rendering is incremental when the surrounding layout is unchanged.
    Navigation within one viewport repaints only the old/new selection rows;
    a multi-selection toggle repaints only its row; navigation that shifts the
    viewport repaints only the list viewport. Whole-screen clear is reserved
    for initial or broader layout invalidation.

    Queued navigation input may be coalesced before repaint so repeated key
    presses produce one final visible update rather than one repaint per key.

RETURN STATUS
    menu_reset, menu_key_clear, menu_key_add, menu_multiselect_enable,
    menu_multiselect_disable, menu_toggle_key_set, menu_array_provider:
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
