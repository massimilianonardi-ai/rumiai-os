_pkg_facility_service_scalar_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_facility_service_scalar=
  pkg_facility_service_extra=
  {
    IFS= read -r pkg_facility_service_scalar || return 1
    IFS= read -r pkg_facility_service_extra
    pkg_facility_service_second_status=$?
  } < "$1"

  [ "$pkg_facility_service_second_status" -ne 0 ] || return 1
  [ -z "$pkg_facility_service_extra" ] || return 1
  [ -n "$pkg_facility_service_scalar" ] || return 1

  pkg_facility_service_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_facility_service_expected="$(printf -- '%s\n' "$pkg_facility_service_scalar" | command -p -- wc -c)" || return 1
  [ "$pkg_facility_service_actual" = "$pkg_facility_service_expected" ]
}

_pkg_facility_service_realization_start_read()
{
  [ "$#" -eq 1 ] || return 2
  pkg_facility_service_realization=$1

  [ -d "$pkg_facility_service_realization" ] && [ ! -L "$pkg_facility_service_realization" ] || return 1

  pkg_facility_service_count=0
  for pkg_facility_service_entry in \
    "$pkg_facility_service_realization"/* \
    "$pkg_facility_service_realization"/.[!.]* \
    "$pkg_facility_service_realization"/..?*
  do
    [ -e "$pkg_facility_service_entry" ] || [ -L "$pkg_facility_service_entry" ] || continue
    [ -f "$pkg_facility_service_entry" ] && [ ! -L "$pkg_facility_service_entry" ] || return 1
    [ "${pkg_facility_service_entry##*/}" = start ] || return 1
    pkg_facility_service_count=$((pkg_facility_service_count + 1))
  done
  [ "$pkg_facility_service_count" -eq 1 ] || return 1

  _pkg_facility_service_scalar_read "$pkg_facility_service_realization/start"
}

_pkg_facility_service_contract_validate()
{
  [ "$#" -eq 1 ] || return 2
  pkg_facility_service_contract=$1

  [ -d "$pkg_facility_service_contract" ] && [ ! -L "$pkg_facility_service_contract" ] || return 1

  pkg_facility_service_count=0
  for pkg_facility_service_entry in \
    "$pkg_facility_service_contract"/* \
    "$pkg_facility_service_contract"/.[!.]* \
    "$pkg_facility_service_contract"/..?*
  do
    [ -e "$pkg_facility_service_entry" ] || [ -L "$pkg_facility_service_entry" ] || continue
    [ -f "$pkg_facility_service_entry" ] && [ ! -L "$pkg_facility_service_entry" ] || return 1

    case "${pkg_facility_service_entry##*/}" in
      start | process | stop) : ;;
      *) return 1 ;;
    esac
    pkg_facility_service_count=$((pkg_facility_service_count + 1))
  done
  [ "$pkg_facility_service_count" -eq 3 ] || return 1

  _pkg_facility_service_scalar_read "$pkg_facility_service_contract/start" || return 1
  [ "$pkg_facility_service_scalar" = package-command ] || return 1

  _pkg_facility_service_scalar_read "$pkg_facility_service_contract/process" || return 1
  [ "$pkg_facility_service_scalar" = foreground ] || return 1

  _pkg_facility_service_scalar_read "$pkg_facility_service_contract/stop" || return 1
  [ "$pkg_facility_service_scalar" = sigterm ]
}

_pkg_facility_service_realization_validate()
{
  [ "$#" -eq 3 ] || return 2
  pkg_facility_service_realization=$1
  pkg_facility_service_definition=$2
  pkg_facility_service_root=$3

  [ -d "$pkg_facility_service_definition" ] && [ ! -L "$pkg_facility_service_definition" ] || return 1
  [ -d "$pkg_facility_service_root" ] && [ ! -L "$pkg_facility_service_root" ] || return 1
  _pkg_facility_service_realization_start_read "$pkg_facility_service_realization" || return 1

  pkg_facility_service_command=$pkg_facility_service_scalar
  _pkg_facility_cmd_name_valid "$pkg_facility_service_command" || return 1

  pkg_facility_service_command_file="$pkg_facility_service_definition/cmd/$pkg_facility_service_command"
  [ -f "$pkg_facility_service_command_file" ] && \
  [ ! -L "$pkg_facility_service_command_file" ] && \
  [ -r "$pkg_facility_service_command_file" ] && \
  [ ! -x "$pkg_facility_service_command_file" ] || return 1

  pkg_facility_service_link="$pkg_facility_service_definition/link/$pkg_facility_service_command"
  _pkg_facility_cmd_target_read "$pkg_facility_service_link" || return 1

  readpathce pkg_facility_service_root_resolved "$pkg_facility_service_root" || return 1
  [ -e "$pkg_facility_service_root/$pkg_facility_cmd_target" ] || \
  [ -L "$pkg_facility_service_root/$pkg_facility_cmd_target" ] || return 1
  readpathce pkg_facility_service_target_resolved "$pkg_facility_service_root/$pkg_facility_cmd_target" || return 1
  case "$pkg_facility_service_target_resolved" in
    "$pkg_facility_service_root_resolved"/*) : ;;
    *) return 1 ;;
  esac

  [ -f "$pkg_facility_service_target_resolved" ] && [ -x "$pkg_facility_service_target_resolved" ]
}

_pkg_facility_service_provider_validate()
{
  [ "$#" -eq 4 ] || return 2
  _pkg_facility_service_contract_validate "$1" || return 1
  _pkg_facility_service_realization_validate "$2" "$3" "$4"
}

pkg_facility_service_start_resolve()
(
  [ "$#" -eq 2 ] || return 2
  pkg_facility_service_runtime_facility=$1
  pkg_facility_service_runtime_concrete_name=$2

  _pkg_facility_name_valid "$pkg_facility_service_runtime_facility" || return 2
  case "$pkg_facility_service_runtime_concrete_name" in
    "" | */* | *'
'*) return 2 ;;
  esac
  [ -n "${m_PKG_DIR-}" ] || return 1

  pkg_facility_service_runtime_concrete="$m_PKG_DIR/$pkg_facility_service_runtime_concrete_name"
  [ -d "$pkg_facility_service_runtime_concrete" ] && [ ! -L "$pkg_facility_service_runtime_concrete" ] || return 1
  readpathce pkg_facility_service_runtime_concrete_resolved "$pkg_facility_service_runtime_concrete" || return 1

  _pkg_facility_file_validate "$pkg_facility_service_runtime_concrete/facility" || return 1
  pkg_facility_service_runtime_declared=0
  while IFS= read -r pkg_facility_service_runtime_line
  do
    _pkg_facility_line_parse "$pkg_facility_service_runtime_line" || return 1
    if [ "$pkg_facility_name" = "$pkg_facility_service_runtime_facility" ]
    then
      pkg_facility_service_runtime_declared=1
      break
    fi
  done < "$pkg_facility_service_runtime_concrete/facility"
  [ "$pkg_facility_service_runtime_declared" -eq 1 ] || return 1

  _pkg_facility_service_realization_start_read \
    "$pkg_facility_service_runtime_concrete/facility-service/$pkg_facility_service_runtime_facility" || return 1
  pkg_facility_service_runtime_command=$pkg_facility_service_scalar
  _pkg_facility_cmd_name_valid "$pkg_facility_service_runtime_command" || return 1

  pkg_facility_service_runtime_command_path="$pkg_facility_service_runtime_concrete/cmd/$pkg_facility_service_runtime_command"
  [ -f "$pkg_facility_service_runtime_command_path" ] && \
  [ ! -L "$pkg_facility_service_runtime_command_path" ] && \
  [ -x "$pkg_facility_service_runtime_command_path" ] || return 1
  readpathce pkg_facility_service_runtime_command_resolved "$pkg_facility_service_runtime_command_path" || return 1
  [ "$pkg_facility_service_runtime_command_resolved" = "$pkg_facility_service_runtime_concrete_resolved/cmd/$pkg_facility_service_runtime_command" ] || return 1

  printf -- '%s\n' "$pkg_facility_service_runtime_command_resolved"
)
