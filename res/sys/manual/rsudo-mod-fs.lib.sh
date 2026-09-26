NAME
    rsudo-mod-fs.lib.sh - privileged remote filesystem transfer module

SYNOPSIS
    loadsyslib "rsudo/rsudo-mod-fs"

    rsudo_mod_fs_rm operand...
    rsudo_mod_fs_delete operand...
    rsudo_mod_fs_get remote_path local_path
    rsudo_mod_fs_put local_path remote_path [owner_group] [permissions]

DESCRIPTION
    rsudo-mod-fs.lib.sh implements the filesystem submodule delegated by rsudo.

    The module exists for administrative filesystem operations that must write
    directly through remote sudo. Large get/put transfers are streamed between
    source and destination instead of being copied first to an intermediate
    permissive remote area.

    Regular files, directories and symbolic links are transferred as filesystem
    objects. The transfer stream uses tar without symlink-dereference options;
    caller TAR_OPTIONS is ignored for the transfer so it cannot silently change
    link semantics.

FUNCTIONS
    rsudo_mod_fs_rm operand...

        Executes remote rm through rsudo for one or more operands.

        This function does not add recursive or force options.

        Return status:
            0       remote rm succeeded
            nonzero invalid invocation or remote rm failed

    rsudo_mod_fs_delete operand...

        Recursively and forcibly removes one or more remote operands through
        rsudo.

        This is the explicit destructive operation used when the caller intends
        to reclaim destination space before a later put.

        Return status:
            0       remote deletion succeeded
            nonzero invalid invocation or remote deletion failed

    rsudo_mod_fs_get remote_path local_path

        Streams one remote filesystem object to local_path.

        Before transferring, get estimates:

            remote source allocated size
            free space on the local destination filesystem
            allocated size of an existing local destination

        If local_path does not exist, get proceeds only when the currently free
        local destination-filesystem space is sufficient for the estimated
        incoming object.

        If local_path already exists, the existing object is kept intact while
        the new object is transferred to a sibling staging pathname. The
        operation proceeds only when the currently free local destination-
        filesystem space is sufficient for the estimated incoming object while
        the old object remains present.

        If staging does not fit but deleting the old local destination would
        make the estimate fit, get fails and reports that condition. It never
        performs an implicit destructive fallback. The caller must explicitly
        remove the local destination and then retry get.

        If even reclaiming the existing local destination would not make the
        estimated transfer fit, get fails as insufficient space.

        Space checks are preflight estimates, not absolute allocation guarantees.
        Sparse files, quotas, filesystem allocation behavior and other runtime
        conditions can still cause a transfer to fail.

        Only after the transfer succeeds is the old object renamed aside and the
        staged object promoted. If promotion fails, the implementation attempts
        to restore the original pathname before returning failure.

        A cleanup failure after successful promotion is reported as failure even
        though the new local destination is already committed.

        Return status:
            0       transfer and required replacement cleanup succeeded
            nonzero invalid invocation, insufficient space, transfer, promotion,
                    rollback or cleanup failed

    rsudo_mod_fs_put local_path remote_path [owner_group] [permissions]

        Streams one local filesystem object directly into the privileged remote
        destination filesystem.

        Before transferring, put estimates:

            local source allocated size
            free space on the destination filesystem
            allocated size of an existing remote destination

        If remote_path does not exist, the new object may be created directly at
        remote_path.

        If remote_path already exists, the existing object is kept intact while
        the new object is transferred to a sibling staging pathname. The
        operation proceeds only when the currently free destination-filesystem
        space is sufficient for the estimated incoming object while the old
        object remains present.

        If staging does not fit but deleting the old destination would make the
        estimate fit, put fails and reports that condition. It never performs an
        implicit destructive fallback. The caller must explicitly invoke
        rsudo_mod_fs_delete / rsudo fs delete first and then retry put.

        If even reclaiming the existing destination would not make the estimated
        transfer fit, put fails as insufficient space.

        Space checks are preflight estimates, not absolute allocation guarantees.
        Sparse files, quotas, filesystem allocation behavior and other runtime
        conditions can still cause a transfer to fail.

        For replacement, the completed staged object is promoted only after the
        transfer succeeds. The old destination is renamed aside, the new object
        is promoted, and the old copy is then removed. If promotion fails after
        the old object was moved aside, the implementation attempts rollback.

        owner_group, when non-empty, is applied recursively to the new object
        before promotion.

        permissions, when non-empty, is applied recursively to the new object
        before promotion.

        Return status:
            0       transfer, metadata application, promotion and cleanup
                    succeeded
            nonzero invalid invocation, insufficient space, transfer, metadata,
                    promotion, rollback or cleanup failed

STREAMING AND LINKS
    get and put stream tar output directly into tar extraction. They do not
    materialize a complete archive as an intermediate file.

    The current transfer path deliberately does not use tar -h or tar -L.
    Symbolic links are therefore transferred as symbolic links rather than by
    copying the objects they reference.

    TAR_OPTIONS is unset inside the transfer producer/consumer environments so
    caller configuration cannot enable dereferencing or otherwise alter the
    selected transfer options.

SPACE AND REPLACEMENT
    Staging objects are created as siblings of the requested destination. This
    keeps staging and promotion on the destination parent filesystem and avoids
    a second multi-gigabyte or multi-terabyte copy between filesystems.

    The replacement sequence is staged and rollback-capable, but the complete
    sequence is not one indivisible filesystem transaction. Individual same-
    filesystem rename operations are used for promotion.

DEPENDENCIES
    The module depends on rsudo and the m runtime facilities available in the
    invoking process, including logging and valid_integer.

    Current transfer operation requires compatible tar implementations locally
    and remotely.

    get and put also use awk, du and df for large-size parsing and destination-
    space preflight.

SEE ALSO
    rsudo.lib.sh
    rsudo
