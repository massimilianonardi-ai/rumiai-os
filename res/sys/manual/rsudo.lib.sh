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

    The library is intended for an m-integrated shell environment. It uses SSH
    for the remote transport, the local rsudo-askpass command for SSH password
    acquisition, and sudo on the remote host for privilege elevation.

    rsudo is the normal public entrypoint. It parses rsudo options, resolves the
    connection state, acquires a password when required, dispatches an rsudo
    submodule when one is selected, and otherwise invokes rsudo_core.

    rsudo_core executes the already-resolved remote operation in a subshell. Its
    caller provides RSUDO_HOST, RSUDO_USER and RSUDO_PASSWORD. It selects
    interactive or non-interactive execution, prepares one-shot SSH askpass
    credentials, preserves the remote command status, and cleans up asynchronous
    credential state on normal exit and termination signals.

AUTHENTICATION MODEL
    SSH authentication and sudo authentication are distinct consumers of the
    same caller-provided password value.

    SSH authentication uses SSH_ASKPASS together with rsudo-askpass and a
    private one-shot IPC value. Each SSH invocation receives its own opaque
    one-shot identifier. The local owner later clears that slot whether or not
    SSH consumed it.

    sudo authentication is performed before target-command execution and is
    separated from the target command's input channel.

    For non-interactive execution, the remote side consumes the transferred
    sudo password separately from the remaining SSH standard input, validates
    sudo credentials with:

        sudo -S --prompt='' -v

    and then executes the requested target through:

        sudo -n ...

    The target command therefore receives only its own standard input. It must
    never receive the sudo password as an input record, including when the
    selected sudoers rule is NOPASSWD.

    For interactive execution, the first SSH session provides the sudo password
    to a private remote rendezvous. The second SSH session reads that password,
    validates sudo credentials with sudo -S --prompt='' -v, and then executes
    the requested target through sudo -n under a remote TTY.

    After pre-authentication, target execution is non-interactive with respect
    to sudo. If the validation is not sufficient for the selected target or the
    sudo policy changes before execution, sudo fails rather than reading a
    password from the target's stdin or TTY.

FUNCTIONS
    rsudo [options] [submodule] [--] [args...]

        Parses rsudo options and connection state, then delegates to either an
        rsudo submodule or rsudo_core.

        Connection state can be supplied by RSUDO_HOST, RSUDO_USER and
        RSUDO_PASSWORD, by --connect, by --load, or by password acquisition from
        stdin/TTY as described below.

        A literal -- ends rsudo option/submodule interpretation and forces the
        remaining operands to rsudo_core.

        When the first two non-option operands identify a valid installed rsudo
        submodule and submodule function, rsudo sources that module and delegates
        to the selected function in the current shell so recursive rsudo calls
        can reuse the same connection variables.

        Return status:
            0 or command-defined
                successful delegated operation
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

        When rsudo delegates to rsudo_core or a submodule, the delegated status
        is returned unchanged unless one of the local errors above occurs first.

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
        through the m quoting facility and executed through sh -c so caller
        argument boundaries remain representable across the SSH command channel.

        Non-interactive execution forwards the caller's remaining stdin to the
        target after sudo authentication data has been consumed separately.

        Interactive execution uses SSH -t and /dev/tty for the terminal session.

        Return status:
            0..255
                final SSH/remote-command status
            1   missing required connection state or credential/IPC setup failed
            2   failed to collect piped interactive command input

        If an interactive helper session fails after the foreground SSH command
        succeeded, its failure becomes the final status.

OPTIONS
    --interactive
        Force interactive execution.

    --askpass
        When stdin is not a TTY, read RSUDO_PASSWORD from the first stdin record
        before processing the remote operation.

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
        Request sudo execution as sudo_as_user.

    --no-preserve-quotes
        Disable the normal rsudo command normalization through quote and sh -c.

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
        Password value used for SSH askpass and remote sudo authentication.
        rsudo requires a non-empty value before rsudo_core is entered.

    RSUDO_AS_USER
        Optional sudo target user.

    RSUDO_INTERACTIVE
        The literal value true selects interactive execution.

    RSUDO_ASKPASS
        The literal value true causes rsudo to read the password from stdin when
        stdin is not a TTY.

    RSUDO_NO_PRESERVE_QUOTES
        The literal value true disables normal quote/sh -c normalization.

    RSUDO_ENV_<name>_HOST
    RSUDO_ENV_<name>_USER
    RSUDO_ENV_<name>_PASS
        Named connection groups used by --load.

INPUT AND OUTPUT
    rsudo does not print password data.

    In non-interactive mode, caller stdin after any explicitly acquired password
    record is forwarded to the remote operation. The remote authentication phase
    must consume only its own password transport and leave target stdin intact.

    In interactive mode, the foreground SSH session owns the terminal.

    stdout and stderr from SSH and the remote target are propagated normally
    subject to SSH/sudo behavior.

CLEANUP AND SIGNALS
    rsudo_core owns its temporary one-shot SSH credential slots and any
    asynchronous interactive helper process for that invocation.

    Normal exit clears owned credential slots. HUP, INT, QUIT and TERM trigger
    cleanup and then preserve signal termination semantics.

DEPENDENCIES
    rsudo.lib.sh sources:

        rand.lib.sh
        enc.lib.sh
        ipc.lib.sh
        rsudo-env.lib.sh

    It also relies on m-integrated facilities including log, quote, readpass,
    valid_cli_name, valid_shell_identifier and exist_function.

    External/runtime dependencies include SSH locally and sudo plus a POSIX
    shell on the remote host.

SECURITY
    Password values are not passed as remote command-line operands.

    SSH password delivery uses private one-shot local IPC through rsudo-askpass.

    sudo password delivery is separated from target stdin. Target execution uses
    sudo -n after credential validation so sudo cannot fall back to reading a
    password from target stdin or the interactive command TTY.

    Remote interactive password rendezvous data must remain private to the
    remote login user and be removed after use or failure.

SEE ALSO
    rsudo
    rsudo-askpass
    ipc.lib.sh
    rsudo-env.lib.sh
