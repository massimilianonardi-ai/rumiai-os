#!/bin/sh

. log.lib.sh

#------------------------------------------------------------------------------

rsudo_mod_fs_delete()
{
  if [ -z "$*" ]
  then
    exit 1
  fi

  rsudo rm -r "$@"
}

#------------------------------------------------------------------------------

rsudo_mod_fs_get()
{
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

  log_info "REMOTE_PATH_TYPE=$REMOTE_PATH_TYPE"

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
    log_error "get: $REMOTE_PATH doesn't exists"
    exit 1
  fi
)
}

#------------------------------------------------------------------------------

rsudo_mod_fs_put()
{
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
    log_error "put: $LOCAL_PATH doesn't exists"
    exit 1
  fi

  if [ ! "$?" -eq "0" ]
  then
    exit 1
  fi

  if [ -n "$REMOTE_OWNER_GROUP" ]; then rsudo chown -R "$REMOTE_OWNER_GROUP" "$REMOTE_PATH"; fi && \
  if [ -n "$REMOTE_PERMISSIONS" ]; then rsudo chmod -R "$REMOTE_PERMISSIONS" "$REMOTE_PATH"; fi
)
}

#------------------------------------------------------------------------------
