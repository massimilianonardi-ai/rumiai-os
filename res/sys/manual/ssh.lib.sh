NAME
    ssh.lib.sh - controlled OpenSSH authentication invocation library

SYNOPSIS
    loadsyslib "ssh"

    ssh_auth pass ssh-argument...
    ssh_password password ssh-argument...

DESCRIPTION
    ssh.lib.sh provides controlled invocation facilities around the system
    OpenSSH client without consuming ssh standard input for authentication.

    ssh_auth preserves normal OpenSSH authentication-method selection. Whenever
    OpenSSH requests secret-entry input through askpass, ssh_auth supplies the
    same caller-provided pass value. The same value may therefore be tried for
    more than one secret request during one invocation, including a private-key
    passphrase and later account-password authentication.

    ssh_password is the narrower password-only interface. It constrains OpenSSH
    to password authentication and permits exactly one password prompt.

    Both functions disable configured connection sharing for their invocation.
    Caller ssh arguments follow the facility-owned options unchanged and in the
    same order. Standard input, standard output and standard error retain their
    normal ssh meanings.

    OpenSSH remains responsible for host-key verification, connection setup,
    terminal allocation and remote-command semantics. Confirmation prompts are
    never answered with the supplied secret.

FUNCTIONS
    ssh_auth pass ssh-argument...

        Invoke ssh with its normal configured authentication-method selection.
        pass is supplied automatically for every accepted OpenSSH askpass
        secret-entry request during the invocation.

        pass must be non-empty, must not contain a newline, and at least one ssh
        argument must be supplied.

        The invocation forces:

            BatchMode=no
            ControlPath=none

        It does not force PreferredAuthentications, PasswordAuthentication or
        another authentication method.

        Return status:
            ssh status   OpenSSH completed and local cleanup succeeded
            1            invalid secret or local provider/cleanup failure
            2            fewer than two arguments

    ssh_password password ssh-argument...

        Invoke ssh using password authentication with password supplied through
        the m askpass path.

        password must be non-empty, must not contain a newline, and at least one
        ssh argument must be supplied.

        The invocation forces:

            BatchMode=no
            PasswordAuthentication=yes
            PreferredAuthentications=password
            NumberOfPasswordPrompts=1
            ControlPath=none

        Return status:
            ssh status   OpenSSH completed and local cleanup succeeded
            1            invalid password or local IPC/cleanup failure
            2            fewer than two arguments

DEPENDENCIES
    ipc.lib.sh
    rand.lib.sh
    ssh-askpass
    OpenSSH ssh client

SECURITY
    Authentication secrets are not added to ssh arguments or consumed from
    standard input.

    ssh_auth keeps its reusable secret in an invocation-owned broker process and
    exposes only a private FIFO identity to ssh-askpass. ssh_password uses a
    one-shot ipc_once value.

    ssh-askpass refuses OpenSSH confirmation prompts before reading either
    provider, so supplied secrets are never used as host-key confirmation input.

    The facility does not disable or weaken OpenSSH host-key verification.

SEE ALSO
    ssh-askpass
    ipc.lib.sh
