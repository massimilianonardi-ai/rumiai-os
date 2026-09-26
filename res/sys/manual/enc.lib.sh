NAME
    enc.lib.sh - POSIX sh encryption, encrypted-source and encrypted-file helpers

DESCRIPTION
    enc.lib.sh is the sys-owned shell library for symmetric OpenPGP encryption,
    authenticated decryption, authenticated shell-source evaluation, in-memory
    editing of encrypted files, and byte/octal conversion.

    Source it from an m-integrated shell environment:

        loadsyslib "enc"

    The library exposes six public functions:

        encode
        decode
        encoded_file_eval
        encoded_file_edit
        a2o
        o2a

    encode and decode use GNU GnuPG. encoded_file_eval builds on decode and
    pathsearch. encoded_file_edit builds on decode, vsed and encode.

PASSPHRASE
    m_ENC_PASS
        Optional shell variable containing a non-empty passphrase.

        When non-empty, encode and decode copy the value into private subshell
        positional state, unset m_ENC_PASS before starting external commands,
        and supply the passphrase to GnuPG through file descriptor 3.

        m_ENC_PASS should not be exported.

        A supplied passphrase containing an LF byte is rejected because GnuPG
        reads the passphrase channel as one line.

        When m_ENC_PASS is unset or empty, GnuPG/Pinentry owns interactive
        passphrase acquisition. encode requests passphrase confirmation.

ENCRYPTION PROFILE
    encode produces a binary symmetric OpenPGP stream using:

        AES-256
        OCB authenticated encryption
        64 KiB OCB chunks
        iterated-and-salted S2K
        SHA-256 S2K digest
        S2K count 65011712
        no compression
        no symmetric-key cache

    encode prefers GnuPG's --use-ocb-sym option and falls back to
    --force-ocb only when that option is advertised by the installed GnuPG.
    If neither OCB option is available, encode fails before consuming input or
    requesting a passphrase.

FUNCTIONS
    encode
        Read plaintext from stdin and write the binary OpenPGP ciphertext to
        stdout.

        Encryption is streaming. A runtime failure can occur after partial
        ciphertext has already been written. A caller replacing durable data
        must therefore commit the output only after encode returns success.

        Arguments are not accepted.

        Return status:
            0   complete successful encryption
            1   GnuPG unavailable/unsupported, invalid supplied passphrase,
                or encryption/runtime failure
            2   invalid function arguments

    decode
        Read an OpenPGP encrypted stream from stdin and write plaintext to
        stdout.

        Decryption is deliberately streaming and best-effort. GnuPG can emit
        plaintext before discovering corruption or authentication failure.
        Therefore a non-zero return can accompany partial plaintext already
        written to stdout.

        Callers requiring authenticated all-or-nothing plaintext must buffer
        the output and use it only after status 0.

        Arguments are not accepted.

        Return status:
            0   complete successful authenticated decryption
            1   GnuPG unavailable, invalid supplied passphrase, or
                decryption/authentication/runtime failure
            2   invalid function arguments

    encoded_file_eval <file> [<argument>...]
        Resolve file, completely decode and authenticate it, then evaluate the
        resulting text as POSIX shell source.

        A file operand containing '/' is resolved as a pathname. A bare file
        operand is resolved through PATH by pathsearch.

        The source is not evaluated unless decode completes successfully.
        Partial plaintext emitted by a failing decode is discarded.

        Only the explicitly forwarded arguments are visible as the source
        positional parameters. The encrypted file operand itself is removed
        before evaluation.

        Evaluation occurs in the current shell function context. Ordinary
        shell-state changes performed by the source, such as variable,
        directory, option or trap changes, can therefore affect the caller.
        Positional-parameter changes remain local to the encoded_file_eval
        function frame. A return command in the source returns from
        encoded_file_eval.

        Authenticated input is expected to be valid POSIX shell source.
        Syntax-error behavior during eval is shell-dependent and can be fatal
        in a non-interactive shell.

        When xtrace was enabled on entry, encoded_file_eval disables it before
        decrypted source is captured, then restores xtrace immediately before
        the authenticated source executes. The complete plaintext is therefore
        not intentionally exposed as one traced eval operand.

        Return status:
            1   missing or empty file operand
            2   file resolution failure
            3   decode/authentication failure
            other
                status produced by the evaluated source

    encoded_file_edit [--preserve-timestamp] [--] <file>...
        Sequentially edit one or more encrypted files.

        Each file is resolved through pathsearch. A bare name is therefore
        searched through PATH; use an explicit pathname such as ./name when
        the current-directory file is intended independently of PATH.

        For each target, the function:

            records a cksum content fingerprint
            exclusively creates the adjacent ciphertext candidate <file>.$$
            seeds that candidate with cp -p metadata from the original
            runs:

                decode < <file> | vsed | encode > <file>.$$

            verifies that the original target content still has the same cksum
            optionally restores the target mtime onto the candidate
            replaces the target with the candidate using same-directory mv

        POSIX pipefail is enabled for the edit pipeline. A decode failure,
        vsed cancellation/failure, or encode failure therefore prevents the
        candidate from replacing the original.

        Plaintext has no filesystem pathname in this operation. It flows only
        through the pipeline and vsed's in-memory document state.

        cp -p preserves the original mode, including executable bits, and
        attempts to preserve owner/group. If the caller lacks privileges
        required to reproduce metadata, the operation fails rather than
        intentionally degrading it.

        The candidate pathname is created with noclobber semantics. If the
        corresponding <file>.$$ already exists, the operation fails without
        overwriting or deleting that pre-existing pathname.

        The cksum comparison is best-effort concurrent-content detection. It
        is not a lock or compare-and-swap primitive and does not detect a
        change that returns the target to the same byte content.

        Processing stops on the first failure. Files committed before a later
        failure remain committed.

        Options:
            --preserve-timestamp
                Preserve the target's current modification time (mtime) on
                the replacement file. ctime is not preserved.

                Without this option, the replacement keeps the modification
                time produced by the new encryption.

            --
                End option parsing. This is required when the first file
                operand could otherwise be parsed as an option. For an
                explicitly local pathname beginning with '-', ./-name is
                usually the clearest form.

        Return status:
            0   every requested file was committed successfully
            non-zero
                invalid invocation, file-resolution failure, user
                cancellation, pipeline/runtime failure, metadata failure,
                concurrent-content change, temporary-path collision, or
                replacement failure

        Handled HUP, INT, QUIT and TERM return their signal-derived statuses
        after candidate cleanup is attempted.

    a2o [<data>...]
        Convert bytes to whitespace-separated three-digit octal octets.

        With no arguments, read bytes from stdin. With arguments, concatenate
        the argument values without separators and convert that byte stream.

        Output is produced by POSIX od in octal-byte form. Repeated groups are
        not collapsed.

        Return status is the underlying conversion/output status.

    o2a [<octets>...]
        Convert whitespace-separated octal octets to bytes and write the bytes
        to stdout without adding a final newline.

        With no arguments, read the octet text from stdin. With arguments,
        treat their combined text as one whitespace-separated octet stream.

        Each octet must contain one through three digits from 0 through 7 and
        represent a value from 0 through 377 inclusive.

        Empty input is valid and produces empty output.

        Return status:
            0   success
            1   input read failure, invalid octet, or output failure

SECURITY NOTES
    encode and decode disable shell xtrace before handling passphrase state.

    A non-empty m_ENC_PASS is not intentionally placed in an external command
    argument vector or child environment by this library.

    decode is streaming and can expose unauthenticated partial plaintext to its
    stdout consumer before returning failure. encoded_file_eval prevents that
    partial plaintext from being executed by buffering the complete decode.
    encoded_file_edit prevents it from replacing the durable ciphertext by
    requiring the complete pipefail-governed pipeline to succeed.

    encoded_file_edit relies on vsed stream mode for memory-only visual editing.
    Its plaintext-security boundary is therefore the same as vsed's documented
    in-memory boundary; operating-system swap, hibernation, process-memory
    inspection, terminal-emulator capture and similar host effects are outside
    this library's guarantee.

DEPENDENCIES
    External/runtime facilities used as applicable:

        GNU gpg
        grep
        od
        cat
        cksum
        cp
        touch
        mv
        rm
        vsed
        pathsearch from core.lib.sh

    encoded_file_edit requires a POSIX.1-2024 shell implementation supporting
    set -o pipefail.

EXAMPLES
    Encrypt stdin to a file using interactive GnuPG/Pinentry:

        encode < plain.txt > secret.gpg

    Decrypt a file to stdout:

        decode < secret.gpg

    Use a non-exported supplied passphrase:

        m_ENC_PASS='example passphrase'
        encode < plain.txt > secret.gpg
        unset m_ENC_PASS

    Evaluate authenticated encrypted shell source with two forwarded
    positional arguments:

        encoded_file_eval setup.gpg alpha "beta gamma"

    Edit two encrypted files in sequence:

        encoded_file_edit first.gpg second.gpg

    Edit while preserving modification time:

        encoded_file_edit --preserve-timestamp secret.gpg

    Edit an explicitly local pathname beginning with '-':

        encoded_file_edit -- ./-secret.gpg

    Convert text bytes to octal and back:

        a2o hello
        printf '%s\n' '150 145 154 154 157' | o2a

SEE ALSO
    vsed
    term.lib.sh
    manual
