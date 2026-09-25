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

rsudo_mod_db_pg_putdb()
(
  # Usage:
  #   putdb REMOTE_DB LOCAL_PATH
  #   ... | putdb REMOTE_DB
  #
  # Restore into a new database first. The current database is not touched
  # until the complete restore has succeeded.
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
  # Keep internal names short: PostgreSQL identifiers are limited in length,
  # while the requested database name may already be close to that limit.
  STAGE_DB="rsudo_new_${TRANSFER_ID}"
  OLD_DB="rsudo_old_${TRANSFER_ID}"

  # Build the replacement database without disturbing the active one.
  rsudo --user "postgres" createdb -- "$STAGE_DB" || exit 1

  if [ -n "$LOCAL_PATH" ]
  then
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$STAGE_DB" < "$LOCAL_PATH"
  else
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$STAGE_DB"
  fi

  if [ "$?" -ne 0 ]
  then
    # The failed restore never became active, so it is safe to discard it.
    rsudo --user "postgres" dropdb -- "$STAGE_DB" 2>/dev/null || :
    exit 1
  fi

  # Keep the remote program as data rather than embedding it in shell quoting:
  # SQL below deliberately contains both :'literal' and :"identifier" psql
  # interpolation forms.
  REMOTE_SWITCH_SCRIPT="$(cat <<'RSUDO_REMOTE'
target="$1"
stage="$2"
old="$3"

psql_base()
{
  psql -X -qAt -d template1 --set ON_ERROR_STOP=1 "$@"
}

target_exists="$(
  psql_base --set target="$target" <<SQL
SELECT 1
FROM pg_database
WHERE datname = :'target';
SQL
)" || exit 1

# First deployment: there is no old database to quiesce or preserve.
if [ -z "$target_exists" ]
then
  psql_base --set stage="$stage" --set target="$target" <<SQL
ALTER DATABASE :"stage" RENAME TO :"target";
SQL
  exit "$?"
fi

original_limit="$(
  psql_base --set target="$target" <<SQL
SELECT datconnlimit
FROM pg_database
WHERE datname = :'target';
SQL
)" || exit 1

limit_digits="${original_limit#-}"
case "$limit_digits" in
  "" | *[!0-9]*) exit 1;;
esac

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

# CONNECTION LIMIT 0 blocks ordinary reconnects. Existing sessions are
# terminated at OS level using the backend PIDs reported by pg_stat_activity.
psql_base --set target="$target" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT 0;
SQL
[ "$?" -eq 0 ] || exit 1

attempt=0
while [ "$attempt" -lt 10 ]
do
  pids="$(
    psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
  )" || {
    psql_base --set target="$target" --set limit="$original_limit" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT :limit;
SQL
    exit 1
  }

  [ -z "$pids" ] && break

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

remaining="$(
  psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
)" || exit 1

if [ -n "$remaining" ]
then
  psql_base --set target="$target" --set limit="$original_limit" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT :limit;
SQL
  exit 1
fi

# Preserve the old database under a unique name.
if ! psql_base --set target="$target" --set old="$old" <<SQL
ALTER DATABASE :"target" RENAME TO :"old";
SQL
then
  psql_base --set target="$target" --set limit="$original_limit" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT :limit;
SQL
  exit 1
fi

# Promote the completely restored staging database.
if ! psql_base --set stage="$stage" --set target="$target" <<SQL
ALTER DATABASE :"stage" RENAME TO :"target";
SQL
then
  # The first rename succeeded but promotion failed. Put the original database
  # back under its original name and restore its original connection limit.
  if psql_base --set old="$old" --set target="$target" <<SQL
ALTER DATABASE :"old" RENAME TO :"target";
SQL
  then
    psql_base --set target="$target" --set limit="$original_limit" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT :limit;
SQL
  fi
  exit 1
fi

# Promotion is complete. The old database is offline and no longer affects the
# active name, so cleanup failure is reported without undoing a successful put.
if ! dropdb -- "$old"
then
  printf "%s\n" "rsudo db-pg putdb: old database retained as $old" >&2
fi

exit 0
RSUDO_REMOTE
)" || exit 1

  rsudo --user "postgres" sh -c "$REMOTE_SWITCH_SCRIPT" sh "$REMOTE_DB" "$STAGE_DB" "$OLD_DB"
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

  # Query existence instead of depending on dropdb --if-exists, then quiesce
  # the database before dropping it. This also works with PostgreSQL < 9.2.
  REMOTE_DROP_SCRIPT="$(cat <<'RSUDO_REMOTE'
target="$1"

psql_base()
{
  psql -X -qAt -d template1 --set ON_ERROR_STOP=1 "$@"
}

exists="$(
  psql_base --set target="$target" <<SQL
SELECT 1
FROM pg_database
WHERE datname = :'target';
SQL
)" || exit 1

[ -n "$exists" ] || exit 0

original_limit="$(
  psql_base --set target="$target" <<SQL
SELECT datconnlimit
FROM pg_database
WHERE datname = :'target';
SQL
)" || exit 1

limit_digits="${original_limit#-}"
case "$limit_digits" in
  "" | *[!0-9]*) exit 1;;
esac

restore_limit()
{
  psql_base --set target="$target" --set limit="$original_limit" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT :limit;
SQL
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

psql_base --set target="$target" <<SQL
ALTER DATABASE :"target" CONNECTION LIMIT 0;
SQL
[ "$?" -eq 0 ] || exit 1

attempt=0
while [ "$attempt" -lt 10 ]
do
  pids="$(
    psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
  )" || {
    restore_limit
    exit 1
  }

  [ -z "$pids" ] && break

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

remaining="$(
  psql_base --set target="$target" <<SQL
SELECT $pid_column
FROM pg_stat_activity
WHERE datname = :'target';
SQL
)" || {
  restore_limit
  exit 1
}

if [ -n "$remaining" ]
then
  restore_limit
  exit 1
fi

if ! dropdb -- "$target"
then
  restore_limit
  exit 1
fi
RSUDO_REMOTE
)" || exit 1

  rsudo --user "postgres" sh -c "$REMOTE_DROP_SCRIPT" sh "$REMOTE_DB"
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
