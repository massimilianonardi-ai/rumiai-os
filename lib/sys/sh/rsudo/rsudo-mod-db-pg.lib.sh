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
  # Validate the complete local side before touching the remote database.
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || exit 1
  [ -n "$1" ] || exit 1

  REMOTE_DB="$1"
  LOCAL_PATH="${2-}"

  if [ -n "$LOCAL_PATH" ]
  then
    [ -r "$LOCAL_PATH" ] || exit 1
  elif [ -t 0 ]
  then
    # No path and no piped stdin means there is nothing to restore.
    exit 1
  fi

  # Do not attempt the restore unless the destructive reset completed.
  rsudo_mod_db_pg_resetdb "$REMOTE_DB" || exit 1

  # psql normally continues after SQL errors and can therefore finish with a
  # successful process status even though part of the restore failed.
  # ON_ERROR_STOP makes the restore fail on the first SQL error.
  if [ -n "$LOCAL_PATH" ]
  then
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$REMOTE_DB" < "$LOCAL_PATH"
  else
    rsudo --user "postgres" psql --set ON_ERROR_STOP=1 "$REMOTE_DB"
  fi
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

  # Let PostgreSQL handle connection termination instead of interpolating the
  # database name into SQL. Keeping the name as a separate argv value avoids
  # both shell-code construction and SQL identifier/string quoting problems.
  rsudo --user "postgres" dropdb --force -- "$1"
)

#------------------------------------------------------------------------------

# Drop the database if it exists, then recreate it.
rsudo_mod_db_pg_resetdb()
(
  [ "$#" -eq 1 ] || exit 1
  [ -n "$1" ] || exit 1

  # --if-exists gives reset its intended create-or-recreate semantics.
  # The second step is reached only if dropdb completed successfully.
  rsudo --user "postgres" dropdb --if-exists --force -- "$1" || exit 1
  rsudo --user "postgres" createdb -- "$1"
)

#------------------------------------------------------------------------------

rsudo_mod_db_pg_postgis_create_string()
{
  printf '%s\n' "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_topology;"
}

#------------------------------------------------------------------------------
