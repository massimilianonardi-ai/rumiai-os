NAME
    ssh.lib.sh - password-only OpenSSH invocation library

SYNOPSIS
    loadsyslib "ssh"

    ssh_password password ssh-argument...

DESCRIPTION
    ssh.lib.sh provides a thin password-authenticated invocation facility around
    the system OpenSSH client.

    ssh_password requires a non-empty remote-account password and constrains
    OpenSSH to password authentication for a fresh connection. It disables
    connection sharing for the invocation, enables password authentication,
    selects password as the only preferred authentication method, disables
    batch mode and permits exactly one password prompt.

    After the password operand, caller arguments are passed to ssh unchanged and
    in the same order. Standard input, output and error retain their normal ssh
    meanings.

    Password delivery uses a private one-shot m IPC value and ssh-askpass.
    OpenSSH remains responsible for host-key verification, connection setup,
    terminal allocation and remote-command semantics.

FUNCTIONS
    ssh_password password ssh-argument...

        Invoke ssh using password authentication with password supplied through
        the m askpass path.

        password must be non-empty and at least one ssh argument must be supplied.

        The invocation forces these OpenSSH settings:

            BatchMode=no
            PasswordAuthentication=yes
            PreferredAuthentications=password
            NumberOfPasswordPrompts=1
            ControlPath=none

        Return status:
            ssh status   OpenSSH completed and local cleanup succeeded
            1            empty password or local IPC/cleanup failure
            2            fewer than two arguments

DEPENDENCIES
    ipc.lib.sh
    ssh-askpass
    OpenSSH ssh client

SECURITY
    The password is not added to ssh arguments or consumed from standard input.
    ssh-askpass refuses OpenSSH confirmation prompts and therefore does not use
    the password as host-key confirmation input.

    The facility does not disable or weaken OpenSSH host-key verification.

SEE ALSO
    ssh-askpass
    ipc.lib.sh
