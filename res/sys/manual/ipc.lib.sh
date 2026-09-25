NAME
    ipc.lib.sh - private local duplex IPC channels for POSIX sh

DESCRIPTION
    ipc.lib.sh is the sys-owned POSIX sh IPC library.

    Source it from an m-integrated shell environment:

        . "$m_LIB_DIR/sys/sh/ipc.lib.sh"

    The library creates a private local duplex channel from two named pipes and
    exposes eleven public functions:

        ipc_create
        ipc_open
        ipc_write
        ipc_read
        ipc_close
        ipc_sync
        ipc_cancel
        ipc_destroy
        ipc_once_set
        ipc_once_get
        ipc_once_clear

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

    ipc_once_set result_variable value [base_dir]

        Creates a private one-shot value channel and assigns its opaque identity
        to the shell variable named by result_variable.

        result_variable must satisfy valid_shell_identifier and must not use the
        library-private _ipc_ prefix.

        value is one record and therefore must not contain a newline. An empty
        string is valid. base_dir follows the same rules and defaulting behavior
        as ipc_create.

        The function starts one asynchronous producer child owned by the
        calling shell. The child retains its private copy of value until a
        consumer successfully rendezvous with ipc_once_get or until the owner
        revokes it with ipc_once_clear.

        If result_variable already contains a valid one-shot identity created
        by an earlier ipc_once_set in the same shell, that value is revoked and
        reaped before the replacement is created. Therefore one result variable
        represents at most one currently authorized one-shot value.

        The assigned identity is opaque. Callers pass it unchanged to
        ipc_once_get and keep the result variable itself for later
        ipc_once_clear. Callers must not parse or synthesize the identity.

        The shell that calls ipc_once_set remains responsible for eventually
        calling ipc_once_clear on result_variable, including after successful
        consumption, so that the producer child is reaped.

        Return status:
            0   previous value, if any, revoked and new one-shot value created
            1   invalid/reserved result variable, invalid value/base directory,
                previous-value cleanup failure, channel/producer creation
                failure, or result assignment failure
            2   invalid number of arguments

    ipc_once_get id

        Consumes the one-shot value identified by id and writes the value to
        standard output without a trailing record delimiter.

        The first successful rendezvous consumes the underlying channel. The
        channel pathnames and directory are removed by the normal ipc_open
        endpoint-a lifecycle, so the same id cannot successfully deliver the
        value a second time.

        ipc_once_get may run in a different descendant process from the shell
        that created the value. It does not reap the producer child; producer
        ownership remains with the ipc_once_set caller, which must later call
        ipc_once_clear on the original result variable.

        id is an opaque identity returned by ipc_once_set. Invalid, revoked,
        already-consumed or otherwise unavailable identities fail.

        Return status:
            0   one value consumed and written to standard output
            1   invalid/unavailable identity, rendezvous/read/close failure
            2   invalid number of arguments

    ipc_once_clear result_variable

        Revokes and clears the one-shot value represented by result_variable.

        result_variable follows the same identifier rules as ipc_once_set. An
        unset or empty result variable is treated as already clear and succeeds.

        For an unread value, ipc_once_clear stops and reaps the producer child
        before destroying the unused channel. For an already-consumed value,
        it reaps the producer if necessary and accepts the already-removed
        channel as successfully destroyed. On success it unsets result_variable.

        Because ipc_cancel operates on a child of the current shell,
        ipc_once_clear must be called by the same shell that called the matching
        ipc_once_set. A consumer that only receives the opaque id uses
        ipc_once_get and does not call ipc_once_clear.

        Return status:
            0   value revoked/reaped and result variable unset, or already clear
            1   invalid/reserved result variable, malformed stored identity,
                cancellation/reap failure, or channel cleanup failure
            2   invalid number of arguments

DEPENDENCIES
    ipc.lib.sh sources:

        rand.lib.sh

    ipc_create therefore transitively requires the random-generation dependency
    documented by rand.lib.sh, currently OpenSSL for randhex.

    ipc_once_set and ipc_once_clear use valid_shell_identifier from core.lib.sh.
    As documented above, ipc.lib.sh is intended to be sourced from an
    m-integrated shell environment where the core library is already loaded.

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

    One-shot values add a higher-level lifecycle on top of the same channels:

        ipc_once_set secret_slot "value" || exit 1
        secret_id=$secret_slot

        value="$(ipc_once_get "$secret_id")" || exit 1

        # Reap the producer and clear the owning slot after consumption.
        ipc_once_clear secret_slot || exit 1

    Reusing the same result variable with ipc_once_set revokes an unread prior
    value before creating its replacement. Distinct result variables create
    distinct one-shot channels and may coexist independently.

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

    A one-shot value exists in the memory of its producer child until it is
    consumed or revoked. Its channel uses the same private 0700 directory and
    0600 FIFO permissions as ordinary IPC channels. Successful consumption
    removes the channel pathname before the value can be obtained again.

    The opaque identity returned by ipc_once_set is the locator needed by a
    consumer to attempt ipc_once_get within the operating-system permission
    boundary. Callers should expose that identity only to processes that are
    intended to consume the value.

SEE ALSO
    manual
    rand.lib.sh
