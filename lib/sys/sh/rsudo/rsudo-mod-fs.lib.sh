#------------------------------------------------------------------------------

rsudo_mod_fs_rm()
(
  [ "$#" -gt 0 ] || exit 1

  rsudo -- rm "$@"
)

#------------------------------------------------------------------------------

rsudo_mod_fs_delete()
(
  [ "$#" -gt 0 ] || exit 1

  rsudo -- rm -rf -- "$@"
)

#------------------------------------------------------------------------------

rsudo_mod_fs_get()
(
  # Transfer errors from either side of the tar stream must fail the operation.
  # Disable pathname expansion because controlled preflight output is later
  # intentionally split with set --.
  set -o pipefail
  set -f

  [ "$#" -eq 2 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  REMOTE_PATH="$1"
  LOCAL_PATH="$2"

  # Split the source pathname without dirname/basename command substitution so
  # external pathname bytes remain data. The leaf is archived as ./$name: this
  # also prevents a name beginning with '-' from becoming a tar option.
  case "$REMOTE_PATH" in
    */*) REMOTE_PARENT="${REMOTE_PATH%/*}"; REMOTE_NAME="${REMOTE_PATH##*/}"; [ -n "$REMOTE_PARENT" ] || REMOTE_PARENT="/";;
    *) REMOTE_PARENT="."; REMOTE_NAME="$REMOTE_PATH";;
  esac
  [ -n "$REMOTE_NAME" ] || exit 1

  # Staging lives beside the requested local destination. Therefore promotion
  # uses rename/mv inside the same parent filesystem instead of copying the data
  # again after a potentially multi-terabyte transfer.
  case "$LOCAL_PATH" in
    */*) LOCAL_PARENT="${LOCAL_PATH%/*}"; [ -n "$LOCAL_PARENT" ] || LOCAL_PARENT="/";;
    *) LOCAL_PARENT=".";;
  esac
  mkdir -p -- "$LOCAL_PARENT" || exit 1

  TRANSFER_ID="$(date -u '+%Y%m%dT%H%M%SZ').$$" || exit 1
  LOCAL_STAGE="${LOCAL_PATH}.${TRANSFER_ID}"
  LOCAL_ORIG="${LOCAL_STAGE}.orig"
  LOCAL_EXTRACT="${LOCAL_STAGE}.extract"

  # Never reuse leftovers from another transfer. A collision is safer to fail
  # than to interpret an unrelated object as our staging state.
  [ ! -e "$LOCAL_STAGE" ] && [ ! -L "$LOCAL_STAGE" ] || exit 1
  [ ! -e "$LOCAL_ORIG" ] && [ ! -L "$LOCAL_ORIG" ] || exit 1
  [ ! -e "$LOCAL_EXTRACT" ] && [ ! -L "$LOCAL_EXTRACT" ] || exit 1

  if [ -e "$LOCAL_PATH" ] || [ -L "$LOCAL_PATH" ]
  then
    LOCAL_COPY_PATH="$LOCAL_STAGE"
  else
    LOCAL_COPY_PATH="$LOCAL_PATH"
  fi

  mkdir -- "$LOCAL_EXTRACT" || exit 1

  # tar is deliberately used as a stream: no complete archive and no temporary
  # copy of the payload is written on either side. Without -h/-L, GNU tar and
  # bsdtar archive a symbolic link as the link itself; regular files and
  # directories are likewise represented by the same single archive operation.
  # TAR_OPTIONS is unset so caller environment cannot silently enable
  # dereferencing or otherwise change this transfer contract.
  if ! rsudo -- sh -c '
    path="$1"
    parent="$2"
    name="$3"

    [ -e "$path" ] || [ -L "$path" ] || exit 1
    cd "$parent" || exit 1

    unset TAR_OPTIONS
    tar -cf - "./$name"
  ' sh "$REMOTE_PATH" "$REMOTE_PARENT" "$REMOTE_NAME" |
  (
    cd "$LOCAL_EXTRACT" || exit 1
    unset TAR_OPTIONS
    tar -xf -
  )
  then
    rm -rf -- "$LOCAL_EXTRACT"
    log error rsudo-fs transfer-failed operation get path "$REMOTE_PATH"
    exit 1
  fi

  # Extraction produced exactly one top-level source object. Move that object
  # from the extraction directory to either the final path or the sibling stage.
  [ ! -e "$LOCAL_COPY_PATH" ] && [ ! -L "$LOCAL_COPY_PATH" ] || {
    rm -rf -- "$LOCAL_EXTRACT"
    exit 1
  }
  mv -- "$LOCAL_EXTRACT/$REMOTE_NAME" "$LOCAL_COPY_PATH" || {
    rm -rf -- "$LOCAL_EXTRACT"
    exit 1
  }
  rmdir -- "$LOCAL_EXTRACT" || exit 1

  # No previous destination existed: the transferred object is already in its
  # final place and there is nothing to commit or clean up.
  [ "$LOCAL_COPY_PATH" = "$LOCAL_PATH" ] && exit 0

  # Commit a replacement only after the complete transfer succeeded. The old
  # object is first renamed to .orig; if promotion of the stage fails, restore
  # it before returning failure.
  mv -- "$LOCAL_PATH" "$LOCAL_ORIG" || {
    rm -rf -- "$LOCAL_STAGE"
    exit 1
  }

  if mv -- "$LOCAL_STAGE" "$LOCAL_PATH"
  then
    rm -rf -- "$LOCAL_ORIG" || {
      log error rsudo-fs cleanup-failed operation get state committed path "$LOCAL_ORIG"
      exit 1
    }
    exit 0
  fi

  if mv -- "$LOCAL_ORIG" "$LOCAL_PATH"
  then
    rm -rf -- "$LOCAL_STAGE"
    log error rsudo-fs replacement-failed operation get rollback succeeded
  else
    log error rsudo-fs rollback-failed operation get original "$LOCAL_ORIG" staging "$LOCAL_STAGE"
  fi

  exit 1
)

#------------------------------------------------------------------------------

rsudo_mod_fs_put()
(
  # The local tar producer and remote tar consumer are one operation. pipefail
  # prevents a producer failure from being hidden by a successful consumer.
  set -o pipefail
  set -f

  [ "$#" -ge 2 ] && [ "$#" -le 4 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  LOCAL_PATH="$1"
  REMOTE_PATH="$2"
  REMOTE_OWNER_GROUP="${3-}"
  REMOTE_PERMISSIONS="${4-}"

  [ -e "$LOCAL_PATH" ] || [ -L "$LOCAL_PATH" ] || {
    log error rsudo-fs source-invalid operation put path "$LOCAL_PATH"
    exit 1
  }

  # Split the local source pathname with shell parameter expansion so arbitrary
  # external pathname data does not pass through a textual pathname parser.
  case "$LOCAL_PATH" in
    */*) LOCAL_PARENT="${LOCAL_PATH%/*}"; LOCAL_NAME="${LOCAL_PATH##*/}"; [ -n "$LOCAL_PARENT" ] || LOCAL_PARENT="/";;
    *) LOCAL_PARENT="."; LOCAL_NAME="$LOCAL_PATH";;
  esac
  [ -n "$LOCAL_NAME" ] || exit 1

  # du/df values can represent multi-terabyte filesystems. Keep awk for parsing
  # and comparison instead of relying on the minimum integer width guaranteed to
  # POSIX shell arithmetic. valid_integer protects the values before use.
  LOCAL_SIZE_KB="$(du -sk "$LOCAL_PATH" | awk 'NR == 1 { print $1; exit }')" || exit 1
  valid_integer "$LOCAL_SIZE_KB" || exit 1

  # The transfer id is controlled data. Staging names are siblings of the final
  # remote pathname so staging and promotion stay on its filesystem.
  TRANSFER_ID="$(date -u '+%Y%m%dT%H%M%SZ').$$" || exit 1
  REMOTE_STAGE="${REMOTE_PATH}.${TRANSFER_ID}"
  REMOTE_ORIG="${REMOTE_STAGE}.orig"
  REMOTE_EXTRACT="${REMOTE_STAGE}.extract"

  # Remote preflight reports only controlled numeric state:
  #   exists free-kib old-size-kib
  # If the destination parent does not exist yet, df is run against the nearest
  # existing ancestor; newly-created descendants will belong to that filesystem.
  REMOTE_INFO="$(
    rsudo -- sh -c '
      set -o pipefail
      set -f

      path="$1"
      stage="$2"
      orig="$3"
      extract="$4"

      [ ! -e "$stage" ] && [ ! -L "$stage" ] || exit 1
      [ ! -e "$orig" ] && [ ! -L "$orig" ] || exit 1
      [ ! -e "$extract" ] && [ ! -L "$extract" ] || exit 1

      case "$path" in
        */*) parent="${path%/*}"; [ -n "$parent" ] || parent="/";;
        *) parent=".";;
      esac

      probe="$parent"
      while [ ! -d "$probe" ]
      do
        case "$probe" in
          */*) probe="${probe%/*}"; [ -n "$probe" ] || probe="/";;
          *) probe=".";;
        esac
      done

      free="$(df -Pk "$probe" | awk "NR == 2 { print \$4; exit }")" || exit 1

      if [ -e "$path" ] || [ -L "$path" ]
      then
        exists=1
        old="$(du -sk "$path" | awk "NR == 1 { print \$1; exit }")" || exit 1
      else
        exists=0
        old=0
      fi

      printf "%s %s %s\n" "$exists" "$free" "$old"
    ' sh "$REMOTE_PATH" "$REMOTE_STAGE" "$REMOTE_ORIG" "$REMOTE_EXTRACT"
  )" || {
    log error rsudo-fs remote-preflight-failed operation put path "$REMOTE_PATH"
    exit 1
  }

  set -- $REMOTE_INFO
  [ "$#" -eq 3 ] || exit 1

  REMOTE_EXISTS="$1"
  REMOTE_FREE_KB="$2"
  REMOTE_OLD_SIZE_KB="$3"

  valid_integer "$REMOTE_EXISTS" "$REMOTE_FREE_KB" "$REMOTE_OLD_SIZE_KB" || exit 1
  case "$REMOTE_EXISTS" in 0 | 1) :;; *) exit 1;; esac

  # Space policy:
  #   ok      enough free space to keep the old destination while staging new
  #   delete  staging does not fit, but deleting the old destination first would
  #           make the estimate fit; never do that implicitly
  #   full    even reclaiming the old destination would not make the estimate fit
  #
  # du/df are estimates of allocated/free filesystem space, not a mathematical
  # guarantee (sparse files, quotas, allocation rules, etc. can still differ).
  SPACE_STATE="$(
    awk -v free="$REMOTE_FREE_KB" -v old="$REMOTE_OLD_SIZE_KB" -v required="$LOCAL_SIZE_KB" '
      BEGIN {
        if (free >= required) print "ok"
        else if (free + old >= required) print "delete"
        else print "full"
      }
    '
  )" || exit 1

  case "$SPACE_STATE" in
    ok)
      ;;
    delete)
      log error rsudo-fs insufficient-space operation put mode staged required-kb "$LOCAL_SIZE_KB" free-kb "$REMOTE_FREE_KB" existing-kb "$REMOTE_OLD_SIZE_KB" destructive-fit true
      log error rsudo-fs explicit-delete-required operation put path "$REMOTE_PATH"
      exit 1
      ;;
    full)
      log error rsudo-fs insufficient-space operation put mode any required-kb "$LOCAL_SIZE_KB" free-kb "$REMOTE_FREE_KB" existing-kb "$REMOTE_OLD_SIZE_KB" destructive-fit false
      exit 1
      ;;
    *)
      exit 1
      ;;
  esac

  # With no existing destination there is nothing to protect, so the new object
  # can be promoted directly to REMOTE_PATH. Otherwise build it at the sibling
  # stage and leave the old object untouched until the transfer is complete.
  if [ "$REMOTE_EXISTS" -eq 1 ]
  then
    REMOTE_COPY_PATH="$REMOTE_STAGE"
  else
    REMOTE_COPY_PATH="$REMOTE_PATH"
  fi

  # One tar stream handles a regular file, directory or symbolic link. No -h/-L
  # is used, therefore symlinks are archived as symlinks. Extract into a unique
  # sibling directory first and only then rename the complete top-level object
  # to its copy/staging pathname.
  if ! (
    cd "$LOCAL_PARENT" || exit 1
    unset TAR_OPTIONS
    tar -cf - "./$LOCAL_NAME"
  ) |
  rsudo -- sh -c '
    target="$1"
    extract="$2"
    name="$3"

    case "$target" in
      */*) parent="${target%/*}"; [ -n "$parent" ] || parent="/";;
      *) parent=".";;
    esac

    mkdir -p -- "$parent" || exit 1
    [ ! -e "$target" ] && [ ! -L "$target" ] || exit 1
    [ ! -e "$extract" ] && [ ! -L "$extract" ] || exit 1

    mkdir -- "$extract" || exit 1
    cd "$extract" || exit 1

    unset TAR_OPTIONS
    tar -xf - || exit 1

    mv -- "$name" "$target" || exit 1
    cd .. || exit 1
    rmdir -- "$extract" || exit 1
  ' sh "$REMOTE_COPY_PATH" "$REMOTE_EXTRACT" "$LOCAL_NAME"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" "$REMOTE_EXTRACT" 2>/dev/null || :
    log error rsudo-fs transfer-failed operation put path "$REMOTE_PATH"
    exit 1
  fi

  # Apply requested metadata before commit. A metadata failure therefore removes
  # only the new copy/stage and leaves an existing destination untouched.
  if [ -n "$REMOTE_OWNER_GROUP" ] && ! rsudo -- chown -R -- "$REMOTE_OWNER_GROUP" "$REMOTE_COPY_PATH"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :
    log error rsudo-fs metadata-failed operation put path "$REMOTE_PATH"
    exit 1
  fi

  if [ -n "$REMOTE_PERMISSIONS" ] && ! rsudo -- chmod -R -- "$REMOTE_PERMISSIONS" "$REMOTE_COPY_PATH"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :
    log error rsudo-fs metadata-failed operation put path "$REMOTE_PATH"
    exit 1
  fi

  [ "$REMOTE_EXISTS" -eq 1 ] || exit 0

  # Commit the staged replacement on the remote host. The two mv operations are
  # individually same-filesystem renames, but the sequence is not one atomic
  # transaction: if promotion fails after moving the old object aside, restore
  # the old name immediately. Cleanup failure after successful promotion is
  # reported separately because the new destination is already committed.
  rsudo -- sh -c '
    path="$1"
    stage="$2"
    orig="$3"

    [ -e "$path" ] || [ -L "$path" ] || exit 5
    [ -e "$stage" ] || [ -L "$stage" ] || exit 6
    [ ! -e "$orig" ] && [ ! -L "$orig" ] || exit 7

    mv -- "$path" "$orig" || exit 1

    if ! mv -- "$stage" "$path"
    then
      mv -- "$orig" "$path" || exit 3
      exit 2
    fi

    rm -rf -- "$orig" || exit 4
  ' sh "$REMOTE_PATH" "$REMOTE_STAGE" "$REMOTE_ORIG"

  COMMIT_STATUS="$?"

  case "$COMMIT_STATUS" in
    0)
      ;;
    1 | 2)
      rsudo -- rm -rf -- "$REMOTE_STAGE" 2>/dev/null || :
      log error rsudo-fs replacement-failed operation put rollback succeeded
      exit 1
      ;;
    3)
      log error rsudo-fs rollback-failed operation put original "$REMOTE_ORIG" staging "$REMOTE_STAGE"
      exit 1
      ;;
    4)
      log error rsudo-fs cleanup-failed operation put state committed path "$REMOTE_ORIG"
      exit 1
      ;;
    *)
      log error rsudo-fs replacement-failed operation put status "$COMMIT_STATUS"
      exit 1
      ;;
  esac
)

#------------------------------------------------------------------------------
