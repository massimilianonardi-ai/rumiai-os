NAME
    ipc.lib.sh - private local duplex IPC channels for POSIX sh

DESCRIPTION
    ipc.lib.sh is the sys-owned POSIX sh IPC library.

    Source it from an m-integrated shell environment:

        . "$m_LIB_DIR/sys/sh/ipc.lib.sh"

    The library creates a private local duplex channel from two named pipes and
    exposes eight public functions:

        ipc_create
        ipc_open
        ipc_write
        ipc_read
        ipc_close
        ipc_sync
        ipc_cancel
        ipc_destroy

    Each channel has two endpoints named a and b. Endpoint a writes to the
    a-to-b FIFO and reads from b-to-a. Endpoint b uses the opposite directions.

    Public data transfer is record-oriented. One record is one shell string
    terminated on the wire by one newline. Embedded newline characters are not
    valid record data. POSIX shell variables cannot represent NUL bytes.

    File descriptors used by the public interface are restricted to 3 through 9.

FUNCTIONS
    ipc_create [base_dir]

        Creates a private channel directory below base_dir and writes its
        absolute pathname followed by a newline to standard output.

        base_dir defaults to TMPDIR when TMPDIR is non-empty, otherwise /tmp.
        It must be an existing writable absolute directory.

        A generated channel pathname has the form:

            <base_dir>/ipc.<pid>.<32-lowercase-hex-characters>

        The channel directory is mode 0700 and initially contains:

            a-to-b
            b-to-a

        Both FIFO paths are mode 0600.

        Return status:
            0   channel created and pathname written
            1   invalid/unusable base directory, random generation failure,
                channel creation/setup failure, or output failure
            2   invalid number of arguments

    ipc_open channel endpoint read_fd write_fd

        Opens one endpoint of channel.

        endpoint must be exactly:

            a
            b

        read_fd and write_fd must be distinct decimal file descriptors in the
        range 3 through 9.

        ipc_open is a rendezvous operation and blocks until the complementary
        endpoint is opened by another process. The two endpoints deliberately
        open the FIFO directions in complementary order.

        On success for endpoint a, after both FIFO directions have been opened,
        the FIFO pathnames and channel directory are removed. The already-open
        descriptors remain usable until ipc_close or process termination.

        channel must be a real directory with the identity shape produced by
        ipc_create. Symlinked channel directories or symlinked FIFO paths are
        rejected.

        Return status:
            0   endpoint opened
            1   invalid channel/endpoint/descriptors or open/cleanup failure
            2   invalid number of arguments

    ipc_write write_fd data

        Writes exactly one record to write_fd.

        data must not contain a newline character. An empty string is a valid
        record. The function appends one newline delimiter.

        Return status:
            0   record written
            1   invalid descriptor, invalid record data, or output failure
            2   invalid number of arguments

    ipc_read read_fd

        Reads exactly one newline-delimited record from read_fd and writes the
        record data to standard output without its newline delimiter.

        Return status:
            0   one complete record read and written
            1   invalid descriptor, EOF before a complete record, or I/O failure
            2   invalid number of arguments

    ipc_close read_fd write_fd

        Closes the read and write descriptors of one open endpoint.

        The descriptors must be distinct values in the range 3 through 9.

        Return status:
            0   both descriptors closed
            1   invalid descriptors or close failure
            2   invalid number of arguments

    ipc_sync pid

        Waits for an asynchronous IPC child operation and returns the status
        reported by wait.

        pid must be a canonical positive decimal PID: no sign, no leading zero,
        and no zero value. The caller must pass the PID of a child operation
        started asynchronously by the current shell, normally captured from $!.

        Return status:
            2   invalid number of arguments
            1   invalid pid operand
            other
                status returned by wait for the child operation

    ipc_cancel pid

        Requests termination of an asynchronous IPC child operation and then
        reaps it.

        pid uses the same canonical-positive-decimal syntax as ipc_sync.

        ipc_cancel is not a general process-control interface. The caller MUST
        pass only the PID captured from $! for an asynchronous IPC child
        operation started by the current shell. Portable sh provides no
        race-free primitive that lets this function independently prove child
        ownership before sending the signal.

        For a syntactically valid pid, signal/reap failures are intentionally
        absorbed so cancellation is idempotent for an operation that may
        already have exited.

        Return status:
            0   cancellation/reap sequence attempted for a valid pid
            1   invalid pid operand
            2   invalid number of arguments

    ipc_destroy channel

        Removes an unused channel or cleans up a channel left by an incomplete
        ipc_open rendezvous.

        ipc_destroy MUST NOT run concurrently with ipc_open. It is safe before
        either endpoint begins ipc_open. After a rendezvous has begun, the
        caller MUST first ensure that every process that may still be executing
        ipc_open for the channel has terminated and been reaped. An asynchronous
        child opener may be stopped and reaped with ipc_cancel before
        ipc_destroy is called.

        Removing FIFO pathnames while an endpoint is still blocked in ipc_open
        can strand that process or its peer, so process termination/reaping and
        channel destruction are deliberately separate operations.

        The channel operand must have the identity shape generated by
        ipc_create. Symlinked channel directories are rejected. A present
        directory must contain at least one real expected FIFO before cleanup
        is attempted, which prevents an arbitrary empty directory from being
        removed merely because its pathname was supplied.

        If a valid channel pathname no longer exists, including after a
        completed endpoint-a rendezvous removed it, ipc_destroy succeeds.

        Return status:
            0   channel removed, or valid channel pathname already absent
            1   invalid channel, unsafe/unexpected filesystem shape, or cleanup
                failure
            2   invalid number of arguments

DEPENDENCIES
    ipc.lib.sh sources:

        rand.lib.sh

    ipc_create therefore transitively requires the random-generation dependency
    documented by rand.lib.sh, currently OpenSSL for randhex.

    The implementation also uses POSIX shell facilities and standard utilities
    including mkdir, mkfifo, chmod, ls, rm and rmdir.

CONCURRENCY
    A channel is established by two processes opening complementary endpoints.

    A typical sequence is:

        channel="$(ipc_create)" || exit 1

        (
            ipc_open "$channel" b 3 4 || exit 1
            request="$(ipc_read 3)" || exit 1
            ipc_write 4 "reply" || exit 1
            ipc_close 3 4
        ) &
        peer_pid=$!

        ipc_open "$channel" a 3 4 || exit 1
        ipc_write 4 "request" || exit 1
        reply="$(ipc_read 3)" || exit 1
        ipc_close 3 4
        ipc_sync "$peer_pid"

    Running both ipc_open calls sequentially in one process does not work:
    the first call blocks waiting for the peer.

SECURITY
    Channel directories are private to the creating user through mode 0700 and
    FIFO paths use mode 0600.

    Channel and FIFO symlinks are rejected by ipc_open, and ipc_destroy refuses
    symlinked channel directories.

    Random channel tokens reduce accidental or adversarial pathname collision.
    The base directory remains caller-controlled; callers should choose a
    location whose ownership and trust properties match their use case.

    ipc_cancel can only validate PID syntax portably. Child ownership is a
    mandatory caller obligation as described in its function contract.

SEE ALSO
    manual
    rand.lib.sh
