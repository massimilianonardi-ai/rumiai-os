NAME
    ssh.lib.sh - controlled OpenSSH authentication invocation library

SYNOPSIS
    loadsyslib "ssh"

    ssh_auth secret ssh-argument...
    ssh_password password ssh-argument...

DESCRIPTION
    ssh.lib.sh provides controlled invocation facilities around the system
    OpenSSH client while keeping authentication data separate from ordinary SSH
    standard input.

    ssh_auth leaves authentication-method selection and ordering to OpenSSH. It
    supplies the same caller-provided secret whenever OpenSSH requests
    secret-entry input, including repeated requests during one invocation.

    ssh_password is the narrower password-only facility. It constrains OpenSSH
    to password authentication and permits one password prompt.

    After the secret operand, caller arguments are passed to ssh unchanged and
    in the same order. Standard input, output and error retain their normal ssh
    meanings.

FUNCTIONS
    ssh_auth secret ssh-argument...

        Invoke ssh using its normally configured authentication mechanisms while
        making secret available through the m askpass path for every
        secret-entry request.

        secret must be non-empty, must not contain a newline, and at least one
        ssh argument must be supplied.

        The invocation forces these OpenSSH settings:

            BatchMode=no
            StrictHostKeyChecking=yes

        It does not otherwise replace OpenSSH authentication-method selection or
        ordering.

        The same secret may therefore be tried as an encrypted private-key
        passphrase, an account password, or another OpenSSH secret-entry value.
        ssh_auth does not classify the mechanism by parsing prompt text.

        StrictHostKeyChecking=yes makes normal ssh_auth use require
        pre-established host trust. Host enrollment is performed outside this
        facility.

        Return status:
            ssh status   OpenSSH completed and local cleanup succeeded
            1            empty/newline secret or local transport/cleanup failure
            2            fewer than two arguments

    ssh_password password ssh-argument...

        Invoke ssh using password authentication with password supplied through
        the m askpass path.

        password must be non-empty, must not contain a newline, and at least one
        ssh argument must be supplied.

        The invocation forces these OpenSSH settings:

            BatchMode=no
            PasswordAuthentication=yes
            PreferredAuthentications=password
            NumberOfPasswordPrompts=1
            ControlPath=none

        Return status:
            ssh status   OpenSSH completed and local cleanup succeeded
            1            empty/newline password or local IPC/cleanup failure
            2            fewer than two arguments

DEPENDENCIES
    rand.lib.sh
    ipc.lib.sh
    ssh-askpass
    OpenSSH ssh client

SECURITY
    Authentication values are not added to ssh arguments or consumed from
    standard input.

    ssh_auth uses a private invocation-owned repeatable secret channel so
    separate askpass helper invocations can obtain the same value without
    placing it in the ssh environment or command arguments.

    ssh_password uses an invocation-owned one-shot IPC value.

    ssh-askpass refuses OpenSSH requests classified as confirmation prompts and
    therefore does not answer those requests with authentication data.

    ssh_auth additionally requires StrictHostKeyChecking=yes so an unknown or
    changed host key does not enter an interactive enrollment path during normal
    use.

SEE ALSO
    ssh-askpass
    ipc.lib.sh
