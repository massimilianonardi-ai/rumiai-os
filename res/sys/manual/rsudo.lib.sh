NAME
    rsudo.lib.sh - remote sudo execution library

SYNOPSIS
    loadsyslib "rsudo/rsudo"

    rsudo [--interactive] [--askpass] [--ssh-auth-check]
          [--connect user@host] [--load file:group] [--user sudo_as_user]
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

    Normal SSH transport uses ssh_auth with RSUDO_PASSWORD as the repeatable
    candidate secret. OpenSSH keeps its configured authentication-method
    selection and ordering; rsudo does not perform host enrollment during normal
    execution.

    Other SSH/sudo process-topology details remain internal. Callers should rely
    on the functional behavior documented here rather than on a particular
    temporary-resource layout.

FUNCTIONS
    rsudo [options] [submodule] [--] [args...]

        Parses rsudo options and connection state, then delegates to either an
        rsudo submodule or rsudo_core.

        Connection state can be supplied through RSUDO_HOST, RSUDO_USER and
        RSUDO_PASSWORD, by --connect, by --load, or by password acquisition as
        described under OPTIONS and ENVIRONMENT.

        Target-user and interactive state are reusable rsudo caller state.
        Existing RSUDO_AS_USER and RSUDO_INTERACTIVE values remain active unless
        the current invocation changes them through --user or --interactive.
        This allows submodules and recursive rsudo calls to preserve the selected
        privilege target and interactive transport mode.

        Askpass, no-preserve-quotes and ssh-auth-check remain invocation-local.
        At function entry rsudo clears RSUDO_ASKPASS,
        RSUDO_NO_PRESERVE_QUOTES and RSUDO_SSH_AUTH_CHECK, then enables them only
        from options in the current invocation.

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
            8   unknown rsudo option
            9   empty RSUDO_HOST after option/load processing
            10  no usable RSUDO_USER and no USER fallback
            11  --askpass password read from stdin failed
            12  password read from TTY failed
            13  RSUDO_PASSWORD is empty after acquisition
            14  invalid delegated submodule function name
            15  rsudo submodule load failed
            16  delegated submodule function is unavailable
            253 --ssh-auth-check received unexpected remaining operands
            254 --ssh-auth-check requires a TTY
            255 --ssh-auth-check authentication verification failed

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

        When interactive mode receives non-TTY standard input, the remaining
        input after password acquisition is consumed locally as shell source for
        the privileged remote program. If command operands are present, their
        invocation is appended after that source in the same shell environment.
        With no command operands, non-empty source is the complete program.

        The source stream is not ordinary target stdin. Normal quote-preserving
        mode preserves appended command argument meaning; no-preserve-quotes uses
        its alternate command-passing behavior for that appended invocation.

        Return status:
            final remote execution status
                propagated when the operation reaches the remote target
            1   missing required connection state or local setup failed
            2   failed to collect piped interactive source input

OPTIONS
    --ssh-auth-check
        Perform the explicit interactive SSH preparation and verification check,
        then return without executing a sudo target or submodule.

        The check requires a TTY and no remaining operands. It resolves host,
        user and password through the normal rsudo paths.

        First it runs ordinary interactive OpenSSH with BatchMode=no,
        StrictHostKeyChecking=ask, AddKeysToAgent=yes and ControlPath=none, with
        SSH_ASKPASS_REQUIRE=never. This permits host-key enrollment and ordinary
        OpenSSH credential interaction and allows a successfully loaded
        file-backed identity to be added to the current agent.

        If that succeeds, rsudo performs a fresh ssh_auth verification using
        RSUDO_PASSWORD and ControlPath=none. Success therefore verifies the same
        non-interactive authentication facility used by normal rsudo execution.

    --interactive
        Force interactive execution.

    --askpass
        When stdin is not a TTY, read RSUDO_PASSWORD from the first stdin record
        before processing the remaining operation input.

    --connect user@host
        Set RSUDO_USER and RSUDO_HOST from one connection operand. An empty user
        is allowed and falls back to USER; the host must be non-empty.

    --load file:group
        Split the operand at its final ':'.

        file and group are independent; either one or both may be empty.

        file:group
            Load/evaluate file, then select credentials from group.

        file:
            Load/evaluate file, but do not select or replace credentials from a
            group.

        :group
            Do not load a file. Select credentials from a group already present
            in the current shell state.

        :
            Do not load a file and do not select a group. Existing connection
            state is left unchanged.

        A non-empty group selects:

            RSUDO_CREDENTIALS_GROUP_<group>_HOST
            RSUDO_CREDENTIALS_GROUP_<group>_USER
            RSUDO_CREDENTIALS_GROUP_<group>_PASS

        A non-empty file may define one or more credential groups and other
        authenticated shell state. Loading the file does not by itself select a
        group.

        The ':' separator is mandatory.

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
        Non-empty authentication value used by normal rsudo as the ssh_auth
        candidate secret and made available to remote sudo when needed. OpenSSH
        may try it for any secret-entry request permitted by ssh_auth.

    RSUDO_AS_USER
        Optional reusable rsudo/rsudo_core caller state selecting the sudo target
        user. A current --user option replaces the existing value. Recursive
        rsudo calls inherit the current value.

    RSUDO_INTERACTIVE
        Optional reusable rsudo/rsudo_core caller state. The literal value true
        selects interactive execution. --interactive sets it to true and
        recursive rsudo calls inherit the current value.

    RSUDO_NO_PRESERVE_QUOTES
        Optional direct rsudo_core caller state. The literal value true disables
        normal command normalization. rsudo clears any ambient value before
        parsing its own --no-preserve-quotes option.

    RSUDO_SSH_AUTH_CHECK
        Internal invocation-local rsudo mode selected by --ssh-auth-check.
        rsudo clears any ambient value before parsing each invocation.

    RSUDO_CREDENTIALS_GROUP_<group>_HOST
    RSUDO_CREDENTIALS_GROUP_<group>_USER
    RSUDO_CREDENTIALS_GROUP_<group>_PASS
        Named credential groups selectable by --load.

INPUT AND OUTPUT
    Non-interactive mode forwards the caller's intended target stdin to the
    remote target.

    Authentication data must not appear as target stdin merely because an
    authentication step did not require a password.

    stdout and stderr from the remote operation remain observable to the caller.

    Interactive mode uses the terminal for the remote interactive operation.

    In interactive mode, non-TTY standard input is reserved for source injection
    after any --askpass password record. Non-empty injected source executes under
    remote sudo and may establish shell state used by command operands that follow
    it. It is not forwarded as ordinary target stdin.

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
    rsudo.lib.sh loads:

        rand.lib.sh
        enc.lib.sh
        ssh.lib.sh

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
    ssh.lib.sh
