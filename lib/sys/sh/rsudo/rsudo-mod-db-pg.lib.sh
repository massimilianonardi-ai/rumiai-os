#------------------------------------------------------------------------------

rsudo_mod_db_pg_psql()
{
  rsudo --user "postgres" psql "$@"
}

#------------------------------------------------------------------------------

rsudo_mod_db_pg_getdb()
{
  rsudo --user "postgres" pg_dump "$@"
}

#------------------------------------------------------------------------------

# Set the persistent PostgreSQL connection state for a database.
#
# PostgreSQL >= 9.5 exposes datallowconn through ALTER DATABASE
# ALLOW_CONNECTIONS. Older releases already have pg_database.datallowconn,
# therefore use the catalog value directly instead of emulating offline state
# with CONNECTION LIMIT.
_rsudo_mod_db_pg_allowconnections()
(
  [ "$#" -eq 2 ] || exit 1
  [ -n "$1" ] || exit 1

  REMOTE_DB="$1"
  case "$2" in
    true | false) ALLOW_CONNECTIONS="$2";;
    *) exit 1;;
  esac

  REMOTE_SCRIPT="$(cat <<'RSUDO_REMOTE'
target="$1"
allow_connections="$2"

psql_base()
{
  psql -X -qAt -d template1 --set ON_ERROR_STOP=1 "$@"
}

version="$(
  psql_base <<SQL
SHOW server_version_num;
SQL
)" || exit 1

case "$version" in
  "" | *[!0-9]*) exit 1;;
esac

if [ "$version" -ge 90500 ]
then
  psql_base --set target="$target" --set allow_connections="$allow_connections" <<SQL
ALTER DATABASE :"target" ALLOW_CONNECTIONS :allow_connections;
SQL
else
  psql_base --set target="$target" --set allow_connections="$allow_connections" <<SQL
UPDATE pg_database
SET datallowconn = CAST(:'allow_connections' AS boolean)
WHERE datname = :'target';
SQL
fi
RSUDO_REMOTE
)" || exit 1

  rsudo --user "postgres" sh -c "$REMOTE_SCRIPT" sh "$REMOTE_DB" "$ALLOW_CONNECTIONS"
)

#------------------------------------------------------------------------------

# Persistently prevent new connections to a database and terminate all existing
# PostgreSQL backend processes connected to it.
rsudo_mod_db_pg_offlinedb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  REMOTE_DB="$1"

  # datallowconn=false is the persistent offline state. Set it before killing
  # existing sessions so they cannot reconnect while the database is drained.
  _rsudo_mod_db_pg_allowconnections "$REMOTE_DB" false || exit 1

  REMOTE_SCRIPT="$(cat <<'RSUDO_REMOTE'
target="$1"

psql_base()
{
  psql -X -qAt -d template1 --set ON_ERROR_STOP=1 "$@"
}

version="$(
  psql_base <<SQL
SHOW server_version_num;
SQL
)" || exit 1

case "$version" in
  "" | *[!0-9]*) exit 1;;
esac

if [ "$version" -ge 90200 ]
then
  pid_column="pid"
else
  pid_column="procpid"
fi

attempt=0
while [ "$attempt" -lt 10 ]
do
  pids="$(
    psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
  )" || exit 1

  [ -z "$pids" ] && exit 0

  for backend_pid in $pids
  do
    case "$backend_pid" in
      "" | *[!0-9]*) continue;;
    esac

    kill -TERM "$backend_pid" 2>/dev/null || :
  done

  attempt=$((attempt + 1))
  sleep 1
done

# Success means both persistent offline state and no remaining sessions.
remaining="$(
  psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
)" || exit 1

[ -z "$remaining" ]
RSUDO_REMOTE
)" || exit 1

  rsudo --user "postgres" sh -c "$REMOTE_SCRIPT" sh "$REMOTE_DB"
)

#------------------------------------------------------------------------------

# Persistently allow connections to a database again.
rsudo_mod_db_pg_onlinedb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  _rsudo_mod_db_pg_allowconnections "$1" true
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_renamedb()
(
  [ "$#" -eq 2 ] || exit 1
  [ -n "$1" ] && [ -n "$2" ] || exit 1

  REMOTE_DB="$1"
  REMOTE_DB_NEW="$2"

  # Keep both names as psql variables so they are quoted as SQL identifiers.
  rsudo --user "postgres" psql -X -qAt -d template1 --set ON_ERROR_STOP=1 \
    --set source="$REMOTE_DB" \
    --set destination="$REMOTE_DB_NEW" <<'SQL'
ALTER DATABASE :"source" RENAME TO :"destination";
SQL
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_putdb()
(
  # Usage:
  #   putdb REMOTE_DB LOCAL_PATH
  #   ... | putdb REMOTE_DB
  #
  # Restore into a new database first. The active database is not touched until
  # the complete restore has succeeded.
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || exit 1
  [ -n "$1" ] || exit 1

  REMOTE_DB="$1"
  LOCAL_PATH="${2-}"

  if [ -n "$LOCAL_PATH" ]
  then
    [ -r "$LOCAL_PATH" ] || exit 1
  elif [ -t 0 ]
  then
    exit 1
  fi

  TRANSFER_ID="$(date -u '+%Y%m%dT%H%M%SZ').$$" || exit 1
  STAGE_DB="rsudo_new_${TRANSFER_ID}"
  OLD_DB="rsudo_old_${TRANSFER_ID}"

  rsudo_mod_db_pg_createdb "$STAGE_DB" || exit 1

  if [ -n "$LOCAL_PATH" ]
  then
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$STAGE_DB" < "$LOCAL_PATH"
  else
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$STAGE_DB"
  fi

  if [ "$?" -ne 0 ]
  then
    rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
    exit 1
  fi

  # Read the current target state before changing it. datallowconn itself is the
  # persistent online/offline state, so no external state file is needed.
  TARGET_STATE="$(
    rsudo --user "postgres" psql -X -qAt -d template1 --set ON_ERROR_STOP=1 \
      --set target="$REMOTE_DB" <<'SQL'
SELECT CASE
         WHEN datallowconn THEN 'online'
         ELSE 'offline'
       END
FROM pg_database
WHERE datname = :'target';
SQL
  )" || {
    rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
    exit 1
  }

  case "$TARGET_STATE" in
    "")
      # First deployment: the staging database can simply take the final name.
      rsudo_mod_db_pg_renamedb "$STAGE_DB" "$REMOTE_DB"
      exit "$?"
    ;;

    online | offline)
      ;;
    *)
      rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
      exit 1
    ;;
  esac

  # Preserve an already-offline target as offline after replacement.
  if [ "$TARGET_STATE" = "offline" ]
  then
    rsudo_mod_db_pg_offlinedb "$STAGE_DB" || {
      rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
      exit 1
    }
  fi

  rsudo_mod_db_pg_offlinedb "$REMOTE_DB" || {
    rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
    exit 1
  }

  if ! rsudo_mod_db_pg_renamedb "$REMOTE_DB" "$OLD_DB"
  then
    [ "$TARGET_STATE" = "online" ] && rsudo_mod_db_pg_onlinedb "$REMOTE_DB"
    rsudo_mod_db_pg_dropdb "$STAGE_DB" 2>/dev/null || :
    exit 1
  fi

  if ! rsudo_mod_db_pg_renamedb "$STAGE_DB" "$REMOTE_DB"
  then
    # The old database still exists intact. Restore its original name and, when
    # it was originally online, its original online state.
    if rsudo_mod_db_pg_renamedb "$OLD_DB" "$REMOTE_DB"
    then
      [ "$TARGET_STATE" = "online" ] && rsudo_mod_db_pg_onlinedb "$REMOTE_DB"
    fi
    exit 1
  fi

  # A target that was online remains online because the staging DB was never
  # offlined. A target that was offline received an already-offline staging DB.
  #
  # The old database is already offline, therefore cleanup cannot race with new
  # connections. Cleanup failure is reported but does not undo a successful
  # promotion.
  if ! rsudo_mod_db_pg_dropdb "$OLD_DB"
  then
    printf '%s\n' "rsudo db-pg putdb: old database retained as $OLD_DB" >&2
  fi

  exit 0
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_createdb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  rsudo --user "postgres" createdb -- "$1"
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_dropdb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  REMOTE_DB="$1"

  EXISTS="$(
    rsudo --user "postgres" psql -X -qAt -d template1 --set ON_ERROR_STOP=1 \
      --set target="$REMOTE_DB" <<'SQL'
SELECT 1
FROM pg_database
WHERE datname = :'target';
SQL
  )" || exit 1

  [ -n "$EXISTS" ] || exit 0

  rsudo_mod_db_pg_offlinedb "$REMOTE_DB" || exit 1
  rsudo --user "postgres" dropdb -- "$REMOTE_DB"
)

#------------------------------------------------------------------------------

# Drop the database if it exists, then recreate it.
rsudo_mod_db_pg_resetdb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  rsudo_mod_db_pg_dropdb "$1" || exit 1
  rsudo_mod_db_pg_createdb "$1"
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_postgis_create_string()
{
  printf '%s\n' "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_topology;"
}

#------------------------------------------------------------------------------
