#!/bin/sh

. log.lib.sh

#------------------------------------------------------------------------------

log_debug "rsudo-export args: $@"
if [ -z "$1" ]
then
  log_fatal "env vars list is empty!"
fi

EXPORT_VARS="$(env_return set "$1")"
shift

if [ -t 0 ]
then
  log_debug "rsudo-export: terminal attached"
  rsudo eval $EXPORT_VARS "$@"
else
  log_debug "rsudo-export: terminal NOT attached"
  rsudo eval $EXPORT_VARS "$(cat)" "$@"
fi

#-------------------------------------------------------------------------------
