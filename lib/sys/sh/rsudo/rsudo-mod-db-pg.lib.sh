#!/bin/sh

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
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  REMOTE_DB="$1"
  LOCAL_PATH="$2"

  if [ -z "$LOCAL_PATH" ] && [ -t 0 ]
  then
    exit 1
  fi

  rsudo_mod_db_pg_resetdb "$REMOTE_DB"


  if [ -z "$LOCAL_PATH" ]
  then
    rsudo --user "postgres" psql "$REMOTE_DB"
  else
    cat "$LOCAL_PATH" | rsudo --user "postgres" psql "$REMOTE_DB"
  fi
)
}

#------------------------------------------------------------------------------

rsudo_mod_db_pg_createdb()
{
  if [ -z "$1" ]
  then
    exit 1
  fi

  rsudo --user "postgres" createdb "$1"
}

#------------------------------------------------------------------------------

rsudo_mod_db_pg_dropdb()
{
  if [ -z "$1" ]
  then
    exit 1
  fi

  rsudo --user "postgres" psql "$1" \
  -c "ALTER DATABASE $1 WITH CONNECTION LIMIT 0;" \
  -c "SELECT pg_terminate_backend (pid) FROM pg_stat_activity WHERE datname = '$1' AND pid <> pg_backend_pid();"

  rsudo --user "postgres" dropdb "$1"
}

#------------------------------------------------------------------------------

# drop existing one if exists, then recreate
rsudo_mod_db_pg_resetdb()
{
  if [ -z "$1" ]
  then
    exit 1
  fi

  rsudo --user "postgres" psql "$1" \
  -c "ALTER DATABASE $1 WITH CONNECTION LIMIT 0;" \
  -c "SELECT pg_terminate_backend (pid) FROM pg_stat_activity WHERE datname = '$1' AND pid <> pg_backend_pid();"

  rsudo --user "postgres" "dropdb '$1'; createdb '$1'"
}

#------------------------------------------------------------------------------

rsudo_mod_db_pg_postgis_create_string()
{
  echo "CREATE EXTENSION postgis; CREATE EXTENSION postgis_topology;"
}

#------------------------------------------------------------------------------
