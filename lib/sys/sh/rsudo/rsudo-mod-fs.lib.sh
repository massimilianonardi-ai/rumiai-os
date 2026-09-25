
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
  if [ -z "$1" ] || [ -z "$2" ]
  then
    exit 1
  fi

  REMOTE_PATH="$1"
  LOCAL_PATH="$2"

  REMOTE_PATH_TYPE="$(rsudo ls -ld "$REMOTE_PATH" | cut -c 1 | tr '-' 'f' | tr 'l' 'L')"

  if [ ! "$?" -eq "0" ]
  then
    exit 1
  fi

  log info "REMOTE_PATH_TYPE=$REMOTE_PATH_TYPE"

  if [ "$REMOTE_PATH_TYPE" = "L" ]
  then
    TARGET="$(rsudo ls -ld -- "$REMOTE_PATH")"
    TARGET=${TARGET#*" $REMOTE_PATH -> "}
    rm -rf -- "$LOCAL_PATH" && mkdir -p "${LOCAL_PATH%/*}" && ln -s "$TARGET" "$LOCAL_PATH"
  elif [ "$REMOTE_PATH_TYPE" = "f" ]
  then
    rm -rf -- "$LOCAL_PATH" && mkdir -p "${LOCAL_PATH%/*}" && rsudo cat "$REMOTE_PATH" > "$LOCAL_PATH"
  elif [ "$REMOTE_PATH_TYPE" = "d" ]
  then
    rm -rf -- "$LOCAL_PATH" && mkdir -p "$LOCAL_PATH" && cd "$LOCAL_PATH" && rsudo "cd '$REMOTE_PATH' && tar -c -f - ." | tar -x -f -
  else
    log error "get: $REMOTE_PATH doesn't exists"
    exit 1
  fi
)

rsudo_mod_fs_get()
(
  set -o pipefail

  [ "$#" -eq 2 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  REMOTE_PATH="$1"
  LOCAL_PATH="$2"

  _fits()
  {
    awk -v available="$1" -v required="$2" \
      'BEGIN { exit !(available >= required) }'
  }

  _fits_after_delete()
  {
    awk -v free="$1" -v old="$2" -v required="$3" \
      'BEGIN { exit !(free + old >= required) }'
  }

  _parent()
  {
    case "$1" in
      */*)
        parent="${1%/*}"
        [ -n "$parent" ] || parent="/"
        ;;
      *)
        parent="."
        ;;
    esac

    printf '%s\n' "$parent"
  }

  REMOTE_INFO="$(
    rsudo -- sh -c '
      set -o pipefail

      path="$1"
      if [ -L "$path" ]
      then
        type="L"
      elif [ -f "$path" ]
      then
        type="f"
      elif [ -d "$path" ]
      then
        type="d"
      else
        exit 1
      fi

      size="$(du -sk "$path" | awk "NR == 1 { print \$1; exit }")" || exit 1
      valid_integer "$size" || exit 1

      printf "%s %s\n" "$type" "$size"
    ' sh "$REMOTE_PATH"
  )" || { log error rsudo-fs source-inspection-failed operation get path "$REMOTE_PATH"; exit 1; }

  set -- $REMOTE_INFO
  [ "$#" -eq 2 ] || exit 1

  REMOTE_PATH_TYPE="$1"
  REMOTE_SIZE_KB="$2"

  LOCAL_PARENT="$(_parent "$LOCAL_PATH")" || exit 1
  mkdir -p -- "$LOCAL_PARENT" || exit 1

  LOCAL_FREE_KB="$(df -Pk "$LOCAL_PARENT" | awk 'NR == 2 { print $4; found = 1 } END { if (!found) exit 1 }')" || exit 1

  TRANSFER_ID="$(date -u '+%Y%m%dT%H%M%SZ').$$" || exit 1
  LOCAL_STAGE="${LOCAL_PATH}.${TRANSFER_ID}"
  LOCAL_ORIG="${LOCAL_STAGE}.orig"

  if [ -e "$LOCAL_PATH" ] || [ -L "$LOCAL_PATH" ]
  then
    LOCAL_EXISTS="true"
    LOCAL_OLD_SIZE_KB="$(du -sk "$LOCAL_PATH" | awk 'NR == 1 { print $1; exit }')" || exit 1

    if ! _fits "$LOCAL_FREE_KB" "$REMOTE_SIZE_KB"
    then
      if _fits_after_delete "$LOCAL_FREE_KB" "$LOCAL_OLD_SIZE_KB" "$REMOTE_SIZE_KB"
      then
        log error rsudo-fs insufficient-space operation get mode staged required-kb "$REMOTE_SIZE_KB" free-kb "$LOCAL_FREE_KB" existing-kb "$LOCAL_OLD_SIZE_KB" destructive-fit true
      else
        log error rsudo-fs insufficient-space operation get mode any required-kb "$REMOTE_SIZE_KB" free-kb "$LOCAL_FREE_KB" existing-kb "$LOCAL_OLD_SIZE_KB" destructive-fit false
      fi

      exit 1
    fi

    [ ! -e "$LOCAL_STAGE" ] && [ ! -L "$LOCAL_STAGE" ] || { log error rsudo-fs staging-path-unavailable operation get path "$LOCAL_STAGE"; exit 1; }
    [ ! -e "$LOCAL_ORIG" ] && [ ! -L "$LOCAL_ORIG" ] || { log error rsudo-fs staging-path-unavailable operation get path "$LOCAL_ORIG"; exit 1; }

    LOCAL_COPY_PATH="$LOCAL_STAGE"
  else
    LOCAL_EXISTS="false"

    if ! _fits "$LOCAL_FREE_KB" "$REMOTE_SIZE_KB"
    then
      log error rsudo-fs insufficient-space operation get mode direct required-kb "$REMOTE_SIZE_KB" free-kb "$LOCAL_FREE_KB"
      exit 1
    fi

    LOCAL_COPY_PATH="$LOCAL_PATH"
  fi

  case "$REMOTE_PATH_TYPE" in
    f)
      if ! rsudo -- sh -c 'cat < "$1"' sh "$REMOTE_PATH" > "$LOCAL_COPY_PATH"
      then
        rm -rf -- "$LOCAL_COPY_PATH"
        exit 1
      fi
      ;;
    d)
      mkdir -- "$LOCAL_COPY_PATH" || exit 1
      if ! rsudo -- sh -c '
        set -o pipefail
        cd "$1" || exit 1
        tar -cf - .
      ' sh "$REMOTE_PATH" |
      (
        cd "$LOCAL_COPY_PATH" || exit 1
        tar -xf -
      )
      then
        rm -rf -- "$LOCAL_COPY_PATH"
        exit 1
      fi
      ;;

    L)
      REMOTE_NAME="${REMOTE_PATH##*/}"
      [ -n "$REMOTE_NAME" ] || exit 1

      LOCAL_EXTRACT="${LOCAL_COPY_PATH}.extract"

      [ ! -e "$LOCAL_EXTRACT" ] && [ ! -L "$LOCAL_EXTRACT" ] || exit 1
      mkdir -- "$LOCAL_EXTRACT" || exit 1

      if ! rsudo -- sh -c '
        path="$1"

        case "$path" in
          */*)
            parent="${path%/*}"
            name="${path##*/}"
            [ -n "$parent" ] || parent="/"
            ;;
          *)
            parent="."
            name="$path"
            ;;
        esac

        [ -n "$name" ] || exit 1

        cd "$parent" || exit 1
        tar -cf - "./$name"
      ' sh "$REMOTE_PATH" |
      (
        cd "$LOCAL_EXTRACT" || exit 1
        tar -xf -
      )
      then
        rm -rf -- "$LOCAL_EXTRACT"
        exit 1
      fi

      mv -- "$LOCAL_EXTRACT/$REMOTE_NAME" "$LOCAL_COPY_PATH" || {
        rm -rf -- "$LOCAL_EXTRACT"
        exit 1
      }

      rmdir -- "$LOCAL_EXTRACT" || exit 1
      ;;

    *)
      exit 1
      ;;

  esac

  [ "$LOCAL_EXISTS" = "true" ] || exit 0

  mv -- "$LOCAL_PATH" "$LOCAL_ORIG" || {
    rm -rf -- "$LOCAL_STAGE"
    exit 1
  }

  if ! mv -- "$LOCAL_STAGE" "$LOCAL_PATH"
  then
    if mv -- "$LOCAL_ORIG" "$LOCAL_PATH"
    then
      rm -rf -- "$LOCAL_STAGE"

      log error rsudo-fs replacement-failed \
        operation get \
        rollback succeeded
    else
      log error rsudo-fs rollback-failed \
        operation get \
        original "$LOCAL_ORIG" \
        staging "$LOCAL_STAGE"
    fi

    exit 1
  fi

  if ! rm -rf -- "$LOCAL_ORIG"
  then
    log error rsudo-fs cleanup-failed \
      operation get \
      state committed \
      path "$LOCAL_ORIG"

    exit 1
  fi
)

rsudo_mod_fs_get()
(
  set -o pipefail
  set -f

  [ "$#" -eq 2 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  REMOTE_PATH="$1"
  LOCAL_PATH="$2"

  REMOTE_NAME="${REMOTE_PATH##*/}"
  [ -n "$REMOTE_NAME" ] || exit 1

  case "$LOCAL_PATH" in
    */*) LOCAL_PARENT="${LOCAL_PATH%/*}"; [ -n "$LOCAL_PARENT" ] || LOCAL_PARENT="/";;
    *) LOCAL_PARENT=".";;
  esac

  mkdir -p -- "$LOCAL_PARENT" || exit 1

  TRANSFER_ID="$(date -u '+%Y%m%d-%H%M%S').$$" || exit 1

  LOCAL_STAGE="${LOCAL_PATH}.${TRANSFER_ID}"
  LOCAL_ORIG="${LOCAL_STAGE}.orig"
  LOCAL_EXTRACT="${LOCAL_STAGE}.extract"

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

  if ! rsudo -- sh -c '
    set -f

    path="$1"

    [ -e "$path" ] || [ -L "$path" ] || exit 1

    case "$path" in
      */*) parent="${path%/*}"; name="${path##*/}"; [ -n "$parent" ] || parent="/";;
      *) parent="."; name="$path";;
    esac

    [ -n "$name" ] || exit 1

    cd "$parent" || exit 1
    tar -cf - "./$name"
  ' sh "$REMOTE_PATH" |
  (
    cd "$LOCAL_EXTRACT" || exit 1
    tar -xf -
  )
  then
    rm -rf -- "$LOCAL_EXTRACT"
    log error rsudo-fs transfer-failed operation get path "$REMOTE_PATH"
    exit 1
  fi

  mv -- "$LOCAL_EXTRACT/$REMOTE_NAME" "$LOCAL_COPY_PATH" || exit 1
  rmdir -- "$LOCAL_EXTRACT" || exit 1

  [ "$LOCAL_COPY_PATH" = "$LOCAL_PATH" ] && exit 0

  mv -- "$LOCAL_PATH" "$LOCAL_ORIG" || { rm -rf -- "$LOCAL_STAGE"; exit 1; }

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
  if [ -z "$1" ] || [ -z "$2" ]
  then
    exit 1
  fi

  LOCAL_PATH="$1"
  REMOTE_PATH="$2"
  REMOTE_OWNER_GROUP="$3"
  REMOTE_PERMISSIONS="$4"

  if [ -L "$LOCAL_PATH" ]
  then
    TARGET=$(ls -ld -- "$LOCAL_PATH")
    TARGET=${TARGET#*" $LOCAL_PATH -> "}
    rsudo "rm -rf -- '$REMOTE_PATH' && mkdir -p '${REMOTE_PATH%/*}' && ln -s '$TARGET' '$REMOTE_PATH'"
  elif [ -f "$LOCAL_PATH" ]
  then
    cat "$LOCAL_PATH" | rsudo "rm -rf -- '$REMOTE_PATH' && mkdir -p '${REMOTE_PATH%/*}' && cat > '$REMOTE_PATH'"
  elif [ -d "$LOCAL_PATH" ]
  then
    cd "$LOCAL_PATH" && tar -c -f - . | rsudo "rm -rf -- '$REMOTE_PATH' && mkdir -p '$REMOTE_PATH' && cd '$REMOTE_PATH' && tar -x -f -"
  else
    log error "put: $LOCAL_PATH doesn't exists"
    exit 1
  fi

  if [ ! "$?" -eq "0" ]
  then
    exit 1
  fi

  if [ -n "$REMOTE_OWNER_GROUP" ]; then rsudo chown -R "$REMOTE_OWNER_GROUP" "$REMOTE_PATH"; fi && \
  if [ -n "$REMOTE_PERMISSIONS" ]; then rsudo chmod -R "$REMOTE_PERMISSIONS" "$REMOTE_PATH"; fi
)

rsudo_mod_fs_put()
(
  set -o pipefail

  [ "$#" -ge 2 ] && [ "$#" -le 4 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  LOCAL_PATH="$1"
  REMOTE_PATH="$2"
  REMOTE_OWNER_GROUP="${3-}"
  REMOTE_PERMISSIONS="${4-}"

  _fits()
  {
    awk -v available="$1" -v required="$2" \
      'BEGIN { exit !(available >= required) }'
  }

  _fits_after_delete()
  {
    awk -v free="$1" -v old="$2" -v required="$3" \
      'BEGIN { exit !(free + old >= required) }'
  }

  _parent()
  {
    case "$1" in
      */*)
        parent="${1%/*}"
        [ -n "$parent" ] || parent="/"
        ;;
      *)
        parent="."
        ;;
    esac

    printf '%s\n' "$parent"
  }

  if [ -L "$LOCAL_PATH" ]
  then
    LOCAL_PATH_TYPE="L"
  elif [ -f "$LOCAL_PATH" ]
  then
    LOCAL_PATH_TYPE="f"
  elif [ -d "$LOCAL_PATH" ]
  then
    LOCAL_PATH_TYPE="d"
  else
    log error rsudo-fs source-invalid \
      operation put \
      path "$LOCAL_PATH"

    exit 1
  fi

  LOCAL_SIZE_KB="$(
    du -sk "$LOCAL_PATH" |
    awk 'NR == 1 { print $1; exit }'
  )" || exit 1

  case "$LOCAL_SIZE_KB" in
    "" | *[!0-9]*) exit 1 ;;
  esac

  TRANSFER_ID="$(date -u '+%Y%m%dT%H%M%SZ').$$" || exit 1

  REMOTE_STAGE="${REMOTE_PATH}.${TRANSFER_ID}"
  REMOTE_ORIG="${REMOTE_STAGE}.orig"

  REMOTE_INFO="$(
    rsudo -- sh -c '
      set -o pipefail

      path="$1"
      stage="$2"
      orig="$3"

      if [ -e "$stage" ] || [ -L "$stage" ] ||
         [ -e "$orig" ] || [ -L "$orig" ]
      then
        exit 2
      fi

      case "$path" in
        */*)
          parent="${path%/*}"
          [ -n "$parent" ] || parent="/"
          ;;
        *)
          parent="."
          ;;
      esac

      probe="$parent"

      while [ ! -d "$probe" ]
      do
        case "$probe" in
          */*)
            next="${probe%/*}"
            [ -n "$next" ] || next="/"
            ;;
          *)
            next="."
            ;;
        esac

        [ "$next" != "$probe" ] || exit 1
        probe="$next"
      done

      free="$(
        df -Pk "$probe" |
        awk "NR == 2 { print \$4; found = 1 }
             END { if (!found) exit 1 }"
      )" || exit 1

      case "$free" in
        "" | *[!0-9]*) exit 1 ;;
      esac

      if [ -e "$path" ] || [ -L "$path" ]
      then
        old="$(
          du -sk "$path" |
          awk "NR == 1 { print \$1; exit }"
        )" || exit 1

        printf "1 %s %s\n" "$free" "$old"
      else
        printf "0 %s 0\n" "$free"
      fi
    ' sh "$REMOTE_PATH" "$REMOTE_STAGE" "$REMOTE_ORIG"
  )"

  REMOTE_INFO_STATUS="$?"

  if [ "$REMOTE_INFO_STATUS" -ne 0 ]
  then
    log error rsudo-fs remote-preflight-failed \
      operation put \
      path "$REMOTE_PATH"

    exit 1
  fi

  set -- $REMOTE_INFO
  [ "$#" -eq 3 ] || exit 1

  REMOTE_EXISTS="$1"
  REMOTE_FREE_KB="$2"
  REMOTE_OLD_SIZE_KB="$3"

  if ! _fits "$REMOTE_FREE_KB" "$LOCAL_SIZE_KB"
  then
    if [ "$REMOTE_EXISTS" -eq 1 ] &&
       _fits_after_delete \
         "$REMOTE_FREE_KB" \
         "$REMOTE_OLD_SIZE_KB" \
         "$LOCAL_SIZE_KB"
    then
      log error rsudo-fs insufficient-space \
        operation put \
        mode staged \
        required-kb "$LOCAL_SIZE_KB" \
        free-kb "$REMOTE_FREE_KB" \
        existing-kb "$REMOTE_OLD_SIZE_KB" \
        destructive-fit true

      log error rsudo-fs explicit-delete-required \
        operation put \
        path "$REMOTE_PATH"
    else
      log error rsudo-fs insufficient-space \
        operation put \
        mode any \
        required-kb "$LOCAL_SIZE_KB" \
        free-kb "$REMOTE_FREE_KB" \
        existing-kb "$REMOTE_OLD_SIZE_KB" \
        destructive-fit false
    fi

    exit 1
  fi

  if [ "$REMOTE_EXISTS" -eq 1 ]
  then
    REMOTE_COPY_PATH="$REMOTE_STAGE"
  else
    REMOTE_COPY_PATH="$REMOTE_PATH"
  fi

  case "$LOCAL_PATH_TYPE" in
    f)
      if ! cat "$LOCAL_PATH" |
      rsudo -- sh -c '
        target="$1"

        case "$target" in
          */*)
            parent="${target%/*}"
            [ -n "$parent" ] || parent="/"
            ;;
          *)
            parent="."
            ;;
        esac

        mkdir -p -- "$parent" || exit 1

        [ ! -e "$target" ] && [ ! -L "$target" ] || exit 2

        cat > "$target"
      ' sh "$REMOTE_COPY_PATH"
      then
        rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :

        log error rsudo-fs transfer-failed \
          operation put \
          path "$REMOTE_PATH"

        exit 1
      fi
      ;;
    d)
      if ! (
        cd "$LOCAL_PATH" || exit 1
        tar -cf - .
      ) |
      rsudo -- sh -c '
        target="$1"

        case "$target" in
          */*)
            parent="${target%/*}"
            [ -n "$parent" ] || parent="/"
            ;;
          *)
            parent="."
            ;;
        esac

        mkdir -p -- "$parent" || exit 1

        [ ! -e "$target" ] && [ ! -L "$target" ] || exit 2

        mkdir -- "$target" || exit 1
        cd "$target" || exit 1

        tar -xf -
      ' sh "$REMOTE_COPY_PATH"
      then
        rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :

        log error rsudo-fs transfer-failed \
          operation put \
          path "$REMOTE_PATH"

        exit 1
      fi
      ;;
    L)
      LOCAL_PARENT="$(_parent "$LOCAL_PATH")" || exit 1
      LOCAL_NAME="${LOCAL_PATH##*/}"

      [ -n "$LOCAL_NAME" ] || exit 1

      if ! (
        cd "$LOCAL_PARENT" || exit 1
        tar -cf - "./$LOCAL_NAME"
      ) |
      rsudo -- sh -c '
        target="$1"
        name="$2"
        extract="${target}.extract"

        case "$target" in
          */*)
            parent="${target%/*}"
            [ -n "$parent" ] || parent="/"
            ;;
          *)
            parent="."
            ;;
        esac

        mkdir -p -- "$parent" || exit 1

        [ ! -e "$target" ] && [ ! -L "$target" ] || exit 2
        [ ! -e "$extract" ] && [ ! -L "$extract" ] || exit 3

        mkdir -- "$extract" || exit 1

        (
          cd "$extract" || exit 1
          tar -xf -
        ) || {
          rm -rf -- "$extract"
          exit 1
        }

        mv -- "$extract/$name" "$target" || {
          rm -rf -- "$extract"
          exit 1
        }

        rmdir -- "$extract"
      ' sh "$REMOTE_COPY_PATH" "$LOCAL_NAME"
      then
        rsudo -- rm -rf -- \
          "$REMOTE_COPY_PATH" \
          "${REMOTE_COPY_PATH}.extract" 2>/dev/null || :

        log error rsudo-fs transfer-failed \
          operation put \
          path "$REMOTE_PATH"

        exit 1
      fi
      ;;

  esac

  if ! rsudo -- sh -c '
    path="$1"
    owner_group="$2"
    permissions="$3"

    if [ -n "$owner_group" ]
    then
      chown -R "$owner_group" "$path" || exit 1
    fi

    if [ -n "$permissions" ]
    then
      chmod -R "$permissions" "$path" || exit 1
    fi
  ' sh \
    "$REMOTE_COPY_PATH" \
    "$REMOTE_OWNER_GROUP" \
    "$REMOTE_PERMISSIONS"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :

    log error rsudo-fs metadata-failed \
      operation put \
      path "$REMOTE_PATH"

    exit 1
  fi

  [ "$REMOTE_EXISTS" -eq 1 ] || exit 0

  rsudo -- sh -c '
    path="$1"
    stage="$2"
    orig="$3"

    [ -e "$path" ] || [ -L "$path" ] || exit 31
    [ -e "$stage" ] || [ -L "$stage" ] || exit 32
    [ ! -e "$orig" ] && [ ! -L "$orig" ] || exit 33

    mv -- "$path" "$orig" || exit 34

    if mv -- "$stage" "$path"
    then
      rm -rf -- "$orig" || exit 35
      exit 0
    fi

    if mv -- "$orig" "$path"
    then
      exit 36
    fi

    exit 37
  ' sh "$REMOTE_PATH" "$REMOTE_STAGE" "$REMOTE_ORIG"

  COMMIT_STATUS="$?"

  case "$COMMIT_STATUS" in

    0)
      ;;

    35)
      log error rsudo-fs cleanup-failed \
        operation put \
        state committed \
        path "$REMOTE_ORIG"

      exit 1
      ;;

    36)
      rsudo -- rm -rf -- "$REMOTE_STAGE" 2>/dev/null || :

      log error rsudo-fs replacement-failed \
        operation put \
        rollback succeeded

      exit 1
      ;;

    37)
      log error rsudo-fs rollback-failed \
        operation put \
        original "$REMOTE_ORIG" \
        staging "$REMOTE_STAGE"

      exit 1
      ;;

    *)
      log error rsudo-fs replacement-failed \
        operation put \
        status "$COMMIT_STATUS"

      exit 1
      ;;

  esac
)

rsudo_mod_fs_put()
(
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

  LOCAL_NAME="${LOCAL_PATH##*/}"
  [ -n "$LOCAL_NAME" ] || exit 1

  case "$LOCAL_PATH" in
    */*) LOCAL_PARENT="${LOCAL_PATH%/*}"; [ -n "$LOCAL_PARENT" ] || LOCAL_PARENT="/";;
    *) LOCAL_PARENT=".";;
  esac

  LOCAL_SIZE="$(du -sk "$LOCAL_PATH")" || exit 1
  set -- $LOCAL_SIZE

  LOCAL_SIZE_KB="$1"
  valid_integer "$LOCAL_SIZE_KB" || exit 1

  REMOTE_INFO="$(
    rsudo -- sh -c '
      set -o pipefail
      set -f

      path="$1"

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

      if [ -e "$path" ] || [ -L "$path" ]
      then
        exists=1

        old="$(du -sk "$path")" || exit 1
        set -- $old
        old="$1"
      else
        exists=0
        old=0
      fi

      free="$(df -Pk "$probe" | tail -n 1)" || exit 1
      set -- $free
      [ "$#" -ge 4 ] || exit 1
      free="$4"

      id="$(date -u "+%Y%m%d-%H%M%S").$$" || exit 1

      stage="${path}.${id}"
      orig="${stage}.orig"
      extract="${stage}.extract"

      [ ! -e "$stage" ] && [ ! -L "$stage" ] || exit 1
      [ ! -e "$orig" ] && [ ! -L "$orig" ] || exit 1
      [ ! -e "$extract" ] && [ ! -L "$extract" ] || exit 1

      printf "%s %s %s %s\n" "$id" "$exists" "$free" "$old"
    ' sh "$REMOTE_PATH"
  )" || {
    log error rsudo-fs remote-preflight-failed operation put path "$REMOTE_PATH"
    exit 1
  }

  set -- $REMOTE_INFO
  [ "$#" -eq 4 ] || exit 1

  TRANSFER_ID="$1"
  REMOTE_EXISTS="$2"
  REMOTE_FREE_KB="$3"
  REMOTE_OLD_SIZE_KB="$4"

  valid_integer "$REMOTE_EXISTS" "$REMOTE_FREE_KB" "$REMOTE_OLD_SIZE_KB" || exit 1

  case "$REMOTE_EXISTS" in 0 | 1) :;; *) exit 1;; esac
  case "$TRANSFER_ID" in "" | *[!0123456789.-]*) exit 1;; esac

  REMOTE_STAGE="${REMOTE_PATH}.${TRANSFER_ID}"
  REMOTE_ORIG="${REMOTE_STAGE}.orig"
  REMOTE_EXTRACT="${REMOTE_STAGE}.extract"

  SPACE_STATE="$(
    awk -v free="$REMOTE_FREE_KB" -v old="$REMOTE_OLD_SIZE_KB" -v required="$LOCAL_SIZE_KB" \
      'BEGIN { if (free >= required) print "ok"; else if (free + old >= required) print "delete"; else print "full" }'
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

  if [ "$REMOTE_EXISTS" -eq 1 ]
  then
    REMOTE_COPY_PATH="$REMOTE_STAGE"
  else
    REMOTE_COPY_PATH="$REMOTE_PATH"
  fi

  if ! (
    cd "$LOCAL_PARENT" || exit 1
    tar -cf - "./$LOCAL_NAME"
  ) |
  rsudo -- sh -c '
    set -f

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

    (
      cd "$extract" || exit 1
      tar -xf -
    ) || exit 1

    mv -- "$extract/$name" "$target" || exit 1
    rmdir -- "$extract" 2>/dev/null || :
  ' sh "$REMOTE_COPY_PATH" "$REMOTE_EXTRACT" "$LOCAL_NAME"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" "$REMOTE_EXTRACT" 2>/dev/null || :
    log error rsudo-fs transfer-failed operation put path "$REMOTE_PATH"
    exit 1
  fi

  if [ -n "$REMOTE_OWNER_GROUP" ] &&
     ! rsudo -- chown -R -- "$REMOTE_OWNER_GROUP" "$REMOTE_COPY_PATH"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :
    exit 1
  fi

  if [ -n "$REMOTE_PERMISSIONS" ] &&
     ! rsudo -- chmod -R -- "$REMOTE_PERMISSIONS" "$REMOTE_COPY_PATH"
  then
    rsudo -- rm -rf -- "$REMOTE_COPY_PATH" 2>/dev/null || :
    exit 1
  fi

  [ "$REMOTE_EXISTS" -eq 1 ] || exit 0

  rsudo -- sh -c '
    path="$1"
    stage="$2"
    orig="$3"

    [ -e "$stage" ] || [ -L "$stage" ] || exit 6
    [ ! -e "$orig" ] && [ ! -L "$orig" ] || exit 5

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
