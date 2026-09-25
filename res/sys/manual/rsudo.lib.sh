NAME
    rsudo.lib.sh - remote sudo execution library

SYNOPSIS
    . "$m_LIB_DIR/sys/sh/rsudo/rsudo.lib.sh"

    rsudo [--interactive] [--askpass] [--connect user@host]
          [--load file:name] [--user sudo_as_user]
          [--no-preserve-quotes] [submodule] [--] [args...]

    rsudo_core [args...]

DESCRIPTION
    rsudo.lib.sh provides the remote sudo execution logic used by the rsudo
    command and exposes two public functions:

        rsudo
        rsudo_core

    rsudo is the normal public entrypoint. It parses options and connection
    state, acquires a password when required, delegates to an rsudo submodule
    when selected, and otherwise invokes rsudo_core.

    rsudo_core executes one already-resolved remote operation in a subshell.

    A successful rsudo operation connects to RSUDO_HOST as RSUDO_USER and
    executes the requested target under remote sudo. The target's observable
    stdin, stdout, stderr and final status are preserved according to the
    selected interactive or non-interactive mode.

    Authentication details are internal to the implementation. Callers should
    rely on the functional behavior documented here rather than on a particular
    SSH/sudo call sequence, process topology or temporary-resource layout.

FUNCTIONS
    rsudo [options] [submodule] [--] [args...]

        Parses rsudo options and connection state, then delegates to either an
        rsudo submodule or rsudo_core.

        Connection state can be supplied through RSUDO_HOST, RSUDO_USER and
        RSUDO_PASSWORD, by --connect, by --load, or by password acquisition as
        described under OPTIONS and ENVIRONMENT.

        A literal -- ends rsudo option/submodule interpretation and forces the
        remaining operands to normal remote execution.

        When the first two non-option operands identify an installed rsudo
        submodule and valid submodule function, rsudo sources that module and
        delegates to the selected function in the current shell.

        Return status:
            delegated status
                returned unchanged when rsudo reaches rsudo_core or a submodule
            1   missing --user operand
            2   missing --connect operand
            3   --connect contains more than one @
            4   --connect contains no @
            5   --connect has an empty host
            6   missing --load operand
            7   --load operand contains no :
            8   invalid --load group identifier
            9   unknown rsudo option
            10  empty RSUDO_HOST after option/load processing
            11  no usable RSUDO_USER and no USER fallback
            12  --askpass password read from stdin failed
            13  password read from TTY failed
            14  RSUDO_PASSWORD is empty after acquisition
            15  invalid delegated submodule function name
            16  rsudo submodule load failed
            17  delegated submodule function is unavailable

    rsudo_core [args...]

        Executes one resolved remote operation in a subshell.

        Required caller state:
            RSUDO_HOST
            RSUDO_USER
            RSUDO_PASSWORD

        Optional caller state:
            RSUDO_AS_USER
            RSUDO_INTERACTIVE
            RSUDO_NO_PRESERVE_QUOTES

        With no command operands, a TTY invocation defaults to an interactive
        remote su command. Without a TTY it defaults to remote sh -s.

        Unless RSUDO_NO_PRESERVE_QUOTES=true, command operands are normalized
        through the m quoting facility so their caller-visible meaning can be
        represented across the remote command boundary.

        In non-interactive mode, target stdin is the caller's intended target
        input. Authentication data is not delivered to the target as ordinary
        stdin data.

        This must remain true whether remote sudo requires the supplied
        password, permits passwordless sudo, or the remote login is already
        privileged.

        In interactive mode, the target is executed through a remote terminal
        path suitable for commands that require a TTY.

        Return status:
            final remote execution status
                propagated when the operation reaches the remote target
            1   missing required connection state or local setup failed
            2   failed to collect piped interactive command input

OPTIONS
    --interactive
        Force interactive execution.

    --askpass
        When stdin is not a TTY, read RSUDO_PASSWORD from the first stdin record
        before processing the remaining operation input.

    --connect user@host
        Set RSUDO_USER and RSUDO_HOST from one connection operand. An empty user
        is allowed and falls back to USER; the host must be non-empty.

    --load file:name
        Load encoded rsudo environment data from file when provided, then resolve
        RSUDO_ENV_<name>_HOST, RSUDO_ENV_<name>_USER and
        RSUDO_ENV_<name>_PASS.

        An empty file component, as in :name, skips file loading and resolves the
        named group from the current environment.

    --user sudo_as_user
        Execute the remote target as sudo_as_user, subject to the remote sudo
        policy.

    --no-preserve-quotes
        Disable normal rsudo command normalization.

    --
        End rsudo option/submodule processing and pass the remaining operands to
        rsudo_core.

ENVIRONMENT
    RSUDO_HOST
        Remote SSH host. Required before rsudo_core executes.

    RSUDO_USER
        Remote SSH login user. If rsudo receives no value, USER is used when
        available.

    RSUDO_PASSWORD
        Non-empty password value available to the remote authentication process.
        The remote environment may or may not need it for each authentication
        step.

    RSUDO_AS_USER
        Optional sudo target user.

    RSUDO_INTERACTIVE
        The literal value true selects interactive execution.

    RSUDO_ASKPASS
        The literal value true causes rsudo to read the password from stdin when
        stdin is not a TTY.

    RSUDO_NO_PRESERVE_QUOTES
        The literal value true disables normal command normalization.

    RSUDO_ENV_<name>_HOST
    RSUDO_ENV_<name>_USER
    RSUDO_ENV_<name>_PASS
        Named connection groups used by --load.

INPUT AND OUTPUT
    Non-interactive mode forwards the caller's intended target stdin to the
    remote target.

    Authentication data must not appear as target stdin merely because an
    authentication step did not require a password.

    stdout and stderr from the remote operation remain observable to the caller.

    Interactive mode uses the terminal for the remote interactive operation.

    Password data is authentication data and is not ordinary command output.

REMOTE PRIVILEGE CASES
    rsudo supports remote systems where sudo requires the supplied password.

    It also supports remote systems where the selected remote user can execute
    sudo without a password, including an already privileged remote login.

    These cases must not change the target command's intended stdin.

TARGET STATUS
    When the remote target is executed, its resulting remote execution status is
    propagated by rsudo rather than replaced with an unrelated success status.

CLEANUP AND TERMINATION
    Per-invocation resources owned by rsudo are cleaned up when the invocation
    completes.

    Termination cleanup must not turn an interrupted rsudo operation into a
    continuing or successful operation.

DEPENDENCIES
    rsudo.lib.sh sources:

        rand.lib.sh
        enc.lib.sh
        ipc.lib.sh
        rsudo-env.lib.sh

    It also relies on m-integrated facilities used by the current implementation,
    including logging, quoting, password input and identifier/function
    validation.

    Runtime operation requires SSH locally and sudo plus a compatible shell on
    the remote host.

SECURITY
    RSUDO_PASSWORD is authentication data.

    It must not become ordinary target stdin or ordinary target output as a side
    effect of authentication.

    Callers should not depend on any current internal credential-transport
    mechanism as public API.

SEE ALSO
    rsudo
    rsudo-askpass
    ipc.lib.sh
    rsudo-env.lib.sh
