#!/bin/sh

. log.lib.sh

#------------------------------------------------------------------------------

log debug "rsudo-export args: $@"
if [ -z "$1" ]
then
  log fatal "env vars list is empty!"
fi

EXPORT_VARS="$(env_return set "$1")"
shift

if [ -t 0 ]
then
  log debug "rsudo-export: terminal attached"
  rsudo eval $EXPORT_VARS "$@"
else
  log debug "rsudo-export: terminal NOT attached"
  rsudo eval $EXPORT_VARS "$(cat)" "$@"
fi

#-------------------------------------------------------------------------------
