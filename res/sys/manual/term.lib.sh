NAME
    term.lib.sh - reusable POSIX sh terminal, TTY and terminfo helpers

DESCRIPTION
    term.lib.sh provides terminal primitives for RumiAI-owned shell code
    without imposing menu, logging, layout or signal-handling policy.

    The library operates on a selected terminal device, /dev/tty by default.
    Terminal control sequences are written directly to that device rather than
    stdout or stderr, keeping command output composable.

    The library installs no traps and never intentionally exits the caller.
    TTY lifecycle and signal handling remain caller responsibilities.

PUBLIC STATE
    term_tty_device
        Selected terminal device. Defaults to /dev/tty.

    term_rows
        Terminal row count set by term_size_update.

    term_cols
        Terminal column count set by term_size_update.

    term_byte_dec
        Last byte read by term_read_byte as unsigned decimal 0..255.

    term_byte_hex
        Last byte read by term_read_byte as two lowercase hexadecimal digits.

    term_key
        Key classification set by term_read_key. Current values are:

            text
            nul
            tab
            enter
            escape
            backspace
            up
            down
            left
            right
            home
            end
            pageup
            pagedown
            insert
            delete
            backtab
            f1 ... f20
            control
            unknown

    term_key_hex
        Complete sequence for the last decoded key as lowercase hexadecimal.

    term_key_text
        Decoded text value when term_key is text.

    term_escape_time
        Escape-sequence and UTF-8 continuation timeout in stty tenths.
        Defaults to 1 and must be an unsigned decimal value from 0 through 255
        when consumed by term_read_key.

FUNCTIONS
    term_tty_use <device>
        Select device as the terminal used by this library.

        The device must be readable, writable and accepted by stty.

    term_tty_available
        Return success when the selected terminal device is readable,
        writable and usable by stty.

    term_tty_save [<device>]
        Save the exact current stty state.

        When device is supplied, select it first. A second save while saved
        state is still active is an operational failure.

    term_tty_restore
        Restore the exact state previously captured by term_tty_save and clear
        the saved-state marker.

    term_tty_blocking
        Configure character-at-a-time, no-echo input with blocking one-byte
        reads.

    term_tty_timed <tenths>
        Configure character-at-a-time, no-echo input with nonblocking minimum
        zero and an stty timeout of tenths.

        tenths must be an unsigned decimal value from 0 through 255.

    term_tty_nowait
        Equivalent to term_tty_timed 0.

    term_size_update
        Update term_rows and term_cols.

        The function first attempts terminfo dimensions through tput and falls
        back to stty size when necessary. Both resulting dimensions must be
        positive decimal integers.

    term_screen_enter
        Enter the alternate screen through the terminfo smcup capability.

    term_screen_leave
        Leave the alternate screen through the terminfo rmcup capability.

    term_keypad_enable
        Enable application keypad mode through the terminfo smkx capability.

    term_keypad_disable
        Disable application keypad mode through the terminfo rmkx capability.

    term_cursor_hide
        Hide the cursor through the terminfo civis capability.

    term_cursor_show
        Show the cursor through the terminfo cnorm capability.

    term_cursor_move <row> <column>
        Move the cursor through the terminfo cup capability.

        row and column are zero-based unsigned decimal terminal coordinates.

    term_clear
        Clear the selected terminal through the terminfo clear capability.

    term_line_clear
        Clear from the current cursor position through the end of the current
        terminal line using the terminfo el capability.

    term_key_is_text <key>
        Predicate for one complete text key.

        Success means key is either printable ASCII or exactly one valid
        non-ASCII UTF-8 Unicode scalar value. Status 1 means the operand is not
        one complete text key or text inspection failed.

    term_read_byte
        Read one byte from the selected TTY.

        The raw byte is not stored in a shell variable, allowing NUL to be
        represented safely. On success term_byte_dec and term_byte_hex are
        updated.

        Status 3 means no byte was available or input ended.

    term_keymap_init
        Query common navigation and function-key sequences from terminfo and
        cache the available mappings for term_read_key.

        Unsupported individual capabilities remain unavailable rather than
        being replaced by embedded terminal-specific escape sequences.

    term_read_key
        Read and decode one key from the selected TTY.

        The caller should normally save the TTY and put it into character mode
        with term_tty_blocking first.

        On success term_key and term_key_hex are updated; term_key_text is also
        set when term_key is text. Escape-sequence and UTF-8 continuation
        reads temporarily use term_tty_timed with term_escape_time and restore
        the preceding stty state afterward.

        Status 3 means no initial byte was available or input ended.

    term_read_secret [<prompt>]
        Read one line from the selected TTY with echo disabled and write the
        captured value to stdout followed by a newline.

        An optional prompt is written directly to the selected TTY. The exact
        previous stty state is restored before the function returns, and a
        newline is emitted to the selected TTY after input.

RETURN STATUS
    Unless a function-specific note above narrows the meaning:

        0   Success.
        1   Runtime, terminal, input, unsupported-operation or state failure.
        2   Invalid function arguments.
        3   No byte available or end of input, only for term_read_byte and
            term_read_key.

CALLER OBLIGATIONS
    The caller owns signal handling and terminal lifecycle.

    After term_tty_save, arrange for term_tty_restore on every path that must
    restore the terminal, including applicable failure or signal paths.

    Do not rely on terminal capabilities being present. Operations implemented
    through tput return failure when the selected terminal, TERM value or
    requested capability cannot support them.

    term_read_key expects the selected TTY to have been prepared for
    character-at-a-time input by the caller, normally using term_tty_blocking.

DEPENDENCIES
    External utilities used by the library as applicable:

        stty
        tput
        dd
        od
        tr

    Terminfo-dependent operations require a non-empty TERM value other than
    dumb and a working tput implementation.

SEE ALSO
    read-key
    manual
