NAME
    ssh.lib.sh - password-authenticated OpenSSH invocation library

SYNOPSIS
    loadsyslib "ssh"

    ssh_password password ssh-argument...

DESCRIPTION
    ssh.lib.sh provides a thin authenticated invocation facility around the
    system OpenSSH client. After the password operand, arguments are passed
    unchanged to ssh. Standard input, output and error retain their normal ssh
    meanings.

    Password delivery uses a private one-shot m IPC value and ssh-askpass.
    OpenSSH remains responsible for host verification, SSH configuration,
    authentication policy, terminal allocation and remote-command semantics.

FUNCTIONS
    ssh_password password ssh-argument...

        Invoke ssh with ssh-argument... unchanged while making password available
        through the m askpass path.

        password must be non-empty and at least one ssh argument must be supplied.

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
    The facility does not disable or weaken OpenSSH host-key verification.

SEE ALSO
    ssh-askpass
    ipc.lib.sh
