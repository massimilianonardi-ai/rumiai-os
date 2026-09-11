_pkg_dependency_constraint_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_dependency_constraint="$1"

  case "$pkg_dependency_constraint" in
    '>='*) pkg_dependency_operator=">="; pkg_dependency_constraint_compatibility="${pkg_dependency_constraint#'>='}" ;;
    '<='*) pkg_dependency_operator="<="; pkg_dependency_constraint_compatibility="${pkg_dependency_constraint#'<='}" ;;
    '>'*) pkg_dependency_operator=">"; pkg_dependency_constraint_compatibility="${pkg_dependency_constraint#'>'}" ;;
    '<'*) pkg_dependency_operator="<"; pkg_dependency_constraint_compatibility="${pkg_dependency_constraint#'<'}" ;;
    '='*) pkg_dependency_operator="="; pkg_dependency_constraint_compatibility="${pkg_dependency_constraint#'='}" ;;
    *) return 1 ;;
  esac

  [ -n "$pkg_dependency_constraint_compatibility" ] || return 1
  _pkg_facility_compatibility_valid "$pkg_dependency_constraint_compatibility"
}

_pkg_dependency_line_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_dependency_line="$1"

  case "$pkg_dependency_line" in
    "" | " "* | *" " | *"  "*) return 1 ;;
    *" "*) : ;;
    *) return 1 ;;
  esac

  pkg_dependency_facility="${pkg_dependency_line%% *}"
  pkg_dependency_constraints="${pkg_dependency_line#* }"
  _pkg_facility_name_valid "$pkg_dependency_facility" || return 1
  [ -n "$pkg_dependency_constraints" ] || return 1

  pkg_dependency_constraints_rest="$pkg_dependency_constraints"
  while :
  do
    case "$pkg_dependency_constraints_rest" in
      *" "*)
        pkg_dependency_constraint="${pkg_dependency_constraints_rest%% *}"
        pkg_dependency_constraints_rest="${pkg_dependency_constraints_rest#* }"
        ;;
      *)
        pkg_dependency_constraint="$pkg_dependency_constraints_rest"
        pkg_dependency_constraints_rest=""
        ;;
    esac
    _pkg_dependency_constraint_parse "$pkg_dependency_constraint" || return 1
    [ -n "$pkg_dependency_constraints_rest" ] || break
  done
}

_pkg_dependency_file_validate()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_dependency_original="$(
    command -p -- cat -- "$1" || exit 1
    printf -- '%s' x
  )" || return 1
  pkg_dependency_sorted="$(
    LC_ALL=C command -p -- sort < "$1" || exit 1
    printf -- '%s' x
  )" || return 1
  [ "$pkg_dependency_original" = "$pkg_dependency_sorted" ] || return 1

  pkg_dependency_count="0"
  pkg_dependency_previous=""
  while IFS= read -r pkg_dependency_line
  do
    _pkg_dependency_line_parse "$pkg_dependency_line" || return 1
    [ "$pkg_dependency_facility" != "$pkg_dependency_previous" ] || return 1
    pkg_dependency_previous="$pkg_dependency_facility"
    pkg_dependency_count="$((pkg_dependency_count + 1))"
  done < "$1"

  [ "$pkg_dependency_count" -gt 0 ]
}

_pkg_dependency_decimal_compare()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_decimal_left="$1"
  pkg_dependency_decimal_right="$2"

  if [ "${#pkg_dependency_decimal_left}" -lt "${#pkg_dependency_decimal_right}" ]
  then
    pkg_dependency_compare="-1"
    return 0
  fi
  if [ "${#pkg_dependency_decimal_left}" -gt "${#pkg_dependency_decimal_right}" ]
  then
    pkg_dependency_compare="1"
    return 0
  fi
  if [ "$pkg_dependency_decimal_left" = "$pkg_dependency_decimal_right" ]
  then
    pkg_dependency_compare="0"
    return 0
  fi

  while [ -n "$pkg_dependency_decimal_left" ]
  do
    pkg_dependency_decimal_left_tail="${pkg_dependency_decimal_left#?}"
    pkg_dependency_decimal_left_digit="${pkg_dependency_decimal_left%"$pkg_dependency_decimal_left_tail"}"
    pkg_dependency_decimal_left="$pkg_dependency_decimal_left_tail"
    pkg_dependency_decimal_right_tail="${pkg_dependency_decimal_right#?}"
    pkg_dependency_decimal_right_digit="${pkg_dependency_decimal_right%"$pkg_dependency_decimal_right_tail"}"
    pkg_dependency_decimal_right="$pkg_dependency_decimal_right_tail"

    case "$pkg_dependency_decimal_left_digit" in
      0) pkg_dependency_decimal_left_rank="0" ;;
      1) pkg_dependency_decimal_left_rank="1" ;;
      2) pkg_dependency_decimal_left_rank="2" ;;
      3) pkg_dependency_decimal_left_rank="3" ;;
      4) pkg_dependency_decimal_left_rank="4" ;;
      5) pkg_dependency_decimal_left_rank="5" ;;
      6) pkg_dependency_decimal_left_rank="6" ;;
      7) pkg_dependency_decimal_left_rank="7" ;;
      8) pkg_dependency_decimal_left_rank="8" ;;
      9) pkg_dependency_decimal_left_rank="9" ;;
      *) return 1 ;;
    esac
    case "$pkg_dependency_decimal_right_digit" in
      0) pkg_dependency_decimal_right_rank="0" ;;
      1) pkg_dependency_decimal_right_rank="1" ;;
      2) pkg_dependency_decimal_right_rank="2" ;;
      3) pkg_dependency_decimal_right_rank="3" ;;
      4) pkg_dependency_decimal_right_rank="4" ;;
      5) pkg_dependency_decimal_right_rank="5" ;;
      6) pkg_dependency_decimal_right_rank="6" ;;
      7) pkg_dependency_decimal_right_rank="7" ;;
      8) pkg_dependency_decimal_right_rank="8" ;;
      9) pkg_dependency_decimal_right_rank="9" ;;
      *) return 1 ;;
    esac

    if [ "$pkg_dependency_decimal_left_rank" -lt "$pkg_dependency_decimal_right_rank" ]
    then
      pkg_dependency_compare="-1"
      return 0
    fi
    if [ "$pkg_dependency_decimal_left_rank" -gt "$pkg_dependency_decimal_right_rank" ]
    then
      pkg_dependency_compare="1"
      return 0
    fi
  done

  pkg_dependency_compare="0"
}

_pkg_dependency_compatibility_compare()
{
  [ "$#" -eq 2 ] || return 2
  _pkg_facility_compatibility_valid "$1" || return 1
  _pkg_facility_compatibility_valid "$2" || return 1
  pkg_dependency_compatibility_left="$1"
  pkg_dependency_compatibility_right="$2"

  while [ -n "$pkg_dependency_compatibility_left" ] || [ -n "$pkg_dependency_compatibility_right" ]
  do
    if [ -n "$pkg_dependency_compatibility_left" ]
    then
      case "$pkg_dependency_compatibility_left" in
        *.*)
          pkg_dependency_compatibility_left_component="${pkg_dependency_compatibility_left%%.*}"
          pkg_dependency_compatibility_left="${pkg_dependency_compatibility_left#*.}"
          ;;
        *)
          pkg_dependency_compatibility_left_component="$pkg_dependency_compatibility_left"
          pkg_dependency_compatibility_left=""
          ;;
      esac
    else
      pkg_dependency_compatibility_left_component="0"
    fi

    if [ -n "$pkg_dependency_compatibility_right" ]
    then
      case "$pkg_dependency_compatibility_right" in
        *.*)
          pkg_dependency_compatibility_right_component="${pkg_dependency_compatibility_right%%.*}"
          pkg_dependency_compatibility_right="${pkg_dependency_compatibility_right#*.}"
          ;;
        *)
          pkg_dependency_compatibility_right_component="$pkg_dependency_compatibility_right"
          pkg_dependency_compatibility_right=""
          ;;
      esac
    else
      pkg_dependency_compatibility_right_component="0"
    fi

    _pkg_dependency_decimal_compare "$pkg_dependency_compatibility_left_component" "$pkg_dependency_compatibility_right_component" || return 1
    [ "$pkg_dependency_compare" -eq 0 ] || return 0
  done

  pkg_dependency_compare="0"
}

_pkg_dependency_constraint_satisfied()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_candidate_compatibility="$1"
  _pkg_dependency_constraint_parse "$2" || return 1
  _pkg_dependency_compatibility_compare "$pkg_dependency_candidate_compatibility" "$pkg_dependency_constraint_compatibility" || return 1

  case "$pkg_dependency_operator" in
    '=') [ "$pkg_dependency_compare" -eq 0 ] ;;
    '>') [ "$pkg_dependency_compare" -gt 0 ] ;;
    '>=') [ "$pkg_dependency_compare" -ge 0 ] ;;
    '<') [ "$pkg_dependency_compare" -lt 0 ] ;;
    '<=') [ "$pkg_dependency_compare" -le 0 ] ;;
    *) return 1 ;;
  esac
}

_pkg_dependency_constraints_satisfied()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_candidate_compatibility="$1"
  pkg_dependency_constraints_rest="$2"
  [ -n "$pkg_dependency_constraints_rest" ] || return 1

  while :
  do
    case "$pkg_dependency_constraints_rest" in
      *" "*)
        pkg_dependency_constraint="${pkg_dependency_constraints_rest%% *}"
        pkg_dependency_constraints_rest="${pkg_dependency_constraints_rest#* }"
        ;;
      *)
        pkg_dependency_constraint="$pkg_dependency_constraints_rest"
        pkg_dependency_constraints_rest=""
        ;;
    esac
    _pkg_dependency_constraint_satisfied "$pkg_dependency_candidate_compatibility" "$pkg_dependency_constraint" || return 1
    [ -n "$pkg_dependency_constraints_rest" ] || break
  done
}

_pkg_dependency_concrete_parse()
{
  [ "$#" -eq 1 ] || return 2
  pkg_dependency_concrete_name="$1"
  pkg_dependency_concrete_left="$pkg_dependency_concrete_name"
  pkg_dependency_provider_osarch=""

  case "$pkg_dependency_concrete_left" in
    *!*)
      pkg_dependency_provider_osarch="${pkg_dependency_concrete_left##*!}"
      pkg_dependency_concrete_left="${pkg_dependency_concrete_left%!"$pkg_dependency_provider_osarch"}"
      case "$pkg_dependency_concrete_left" in *!*) return 1 ;; esac
      _pkg_integration_osarch_valid "$pkg_dependency_provider_osarch" || return 1
      ;;
  esac

  case "$pkg_dependency_concrete_left" in
    *@*)
      pkg_dependency_provider_version="${pkg_dependency_concrete_left##*@}"
      pkg_dependency_provider_pkg="${pkg_dependency_concrete_left%@"$pkg_dependency_provider_version"}"
      case "$pkg_dependency_provider_pkg" in *@*) return 1 ;; esac
      ;;
    *)
      return 1
      ;;
  esac

  _pkg_integration_name_valid "$pkg_dependency_provider_pkg" || return 1
  _pkg_integration_version_valid "$pkg_dependency_provider_version" || return 1
}

_pkg_dependency_provider_target_eligible()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_consumer_osarch="$1"
  pkg_dependency_provider_osarch="$2"

  if [ -z "$pkg_dependency_consumer_osarch" ]
  then
    [ -z "$pkg_dependency_provider_osarch" ]
  else
    [ -z "$pkg_dependency_provider_osarch" ] || [ "$pkg_dependency_provider_osarch" = "$pkg_dependency_consumer_osarch" ]
  fi
}

_pkg_dependency_provider_declares()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_provider_concrete="$1"
  pkg_dependency_required_facility="$2"
  pkg_dependency_required_compatibility="$3"
  pkg_dependency_provider_facility_file="$pkg_dependency_provider_concrete/facility"

  _pkg_facility_file_validate "$pkg_dependency_provider_facility_file" || return 1
  pkg_dependency_provider_declaration_found="0"
  while IFS= read -r pkg_dependency_provider_line
  do
    _pkg_facility_line_parse "$pkg_dependency_provider_line" || return 1
    if [ "$pkg_facility_name" = "$pkg_dependency_required_facility" ] && [ "$pkg_facility_compatibility" = "$pkg_dependency_required_compatibility" ]
    then
      pkg_dependency_provider_declaration_found="1"
    fi
  done < "$pkg_dependency_provider_facility_file"

  [ "$pkg_dependency_provider_declaration_found" -eq 1 ]
}

_pkg_dependency_provider_marker_validate()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_provider_marker="$1"
  pkg_dependency_required_facility="$2"
  pkg_dependency_required_compatibility="$3"

  [ -f "$pkg_dependency_provider_marker" ] && [ ! -L "$pkg_dependency_provider_marker" ] && [ ! -s "$pkg_dependency_provider_marker" ] || return 1
  pkg_dependency_provider_identity="${pkg_dependency_provider_marker##*/}"
  _pkg_dependency_concrete_parse "$pkg_dependency_provider_identity" || return 1
  pkg_dependency_provider_concrete="$m_PKG_DIR/$pkg_dependency_provider_identity"
  [ -d "$pkg_dependency_provider_concrete" ] && [ ! -L "$pkg_dependency_provider_concrete" ] || return 1
  _pkg_dependency_provider_declares "$pkg_dependency_provider_concrete" "$pkg_dependency_required_facility" "$pkg_dependency_required_compatibility"
}

_pkg_dependency_compatibility_providers_scan()
{
  [ "$#" -eq 4 ] || return 2
  pkg_dependency_facility="$1"
  pkg_dependency_compatibility="$2"
  pkg_dependency_consumer_osarch="$3"
  pkg_dependency_compatibility_dir="$4"
  pkg_dependency_provider_count="0"
  pkg_dependency_selected_provider=""

  [ -d "$pkg_dependency_compatibility_dir" ] && [ ! -L "$pkg_dependency_compatibility_dir" ] || return 1
  for pkg_dependency_provider_marker in \
    "$pkg_dependency_compatibility_dir"/* \
    "$pkg_dependency_compatibility_dir"/.[!.]* \
    "$pkg_dependency_compatibility_dir"/..?*
  do
    [ -e "$pkg_dependency_provider_marker" ] || [ -L "$pkg_dependency_provider_marker" ] || continue
    _pkg_dependency_provider_marker_validate "$pkg_dependency_provider_marker" "$pkg_dependency_facility" "$pkg_dependency_compatibility" || return 1
    _pkg_dependency_provider_target_eligible "$pkg_dependency_consumer_osarch" "$pkg_dependency_provider_osarch" || continue
    pkg_dependency_provider_count="$((pkg_dependency_provider_count + 1))"
    pkg_dependency_selected_provider="$pkg_dependency_provider_identity"
  done
}

_pkg_dependency_resolve_one()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_facility="$1"
  pkg_dependency_constraints="$2"
  pkg_dependency_consumer_osarch="$3"
  pkg_dependency_facility_dir="$m_DATA_DIR/sys/pkg/providers/$pkg_dependency_facility"
  [ -d "$pkg_dependency_facility_dir" ] && [ ! -L "$pkg_dependency_facility_dir" ] || return 1

  pkg_dependency_best_compatibility=""
  pkg_dependency_best_provider=""
  pkg_dependency_best_count="0"

  for pkg_dependency_compatibility_path in \
    "$pkg_dependency_facility_dir"/* \
    "$pkg_dependency_facility_dir"/.[!.]* \
    "$pkg_dependency_facility_dir"/..?*
  do
    [ -e "$pkg_dependency_compatibility_path" ] || [ -L "$pkg_dependency_compatibility_path" ] || continue
    [ -d "$pkg_dependency_compatibility_path" ] && [ ! -L "$pkg_dependency_compatibility_path" ] || return 1
    pkg_dependency_compatibility="${pkg_dependency_compatibility_path##*/}"
    _pkg_facility_compatibility_valid "$pkg_dependency_compatibility" || return 1
    _pkg_dependency_constraints_satisfied "$pkg_dependency_compatibility" "$pkg_dependency_constraints" || continue

    _pkg_dependency_compatibility_providers_scan "$pkg_dependency_facility" "$pkg_dependency_compatibility" "$pkg_dependency_consumer_osarch" "$pkg_dependency_compatibility_path" || return 1
    [ "$pkg_dependency_provider_count" -gt 0 ] || continue

    if [ -z "$pkg_dependency_best_compatibility" ]
    then
      pkg_dependency_best_compatibility="$pkg_dependency_compatibility"
      pkg_dependency_best_provider="$pkg_dependency_selected_provider"
      pkg_dependency_best_count="$pkg_dependency_provider_count"
      continue
    fi

    _pkg_dependency_compatibility_compare "$pkg_dependency_compatibility" "$pkg_dependency_best_compatibility" || return 1
    if [ "$pkg_dependency_compare" -gt 0 ]
    then
      pkg_dependency_best_compatibility="$pkg_dependency_compatibility"
      pkg_dependency_best_provider="$pkg_dependency_selected_provider"
      pkg_dependency_best_count="$pkg_dependency_provider_count"
    fi
  done

  [ -n "$pkg_dependency_best_compatibility" ] || return 1
  [ "$pkg_dependency_best_count" -eq 1 ] || return 1
  pkg_dependency_resolved_provider="$pkg_dependency_best_provider"
}

_pkg_dependency_resolve()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_source="$1"
  pkg_dependency_consumer_osarch="$2"
  pkg_dependency_resolved=""

  if [ ! -e "$pkg_dependency_source" ] && [ ! -L "$pkg_dependency_source" ]
  then
    return 0
  fi

  _pkg_dependency_file_validate "$pkg_dependency_source" || return 1
  [ -d "$m_DATA_DIR/sys/pkg/providers" ] && [ ! -L "$m_DATA_DIR/sys/pkg/providers" ] || return 1
  pkg_dependency_tab="$(printf '\t')"

  while IFS= read -r pkg_dependency_line
  do
    _pkg_dependency_line_parse "$pkg_dependency_line" || return 1
    _pkg_dependency_resolve_one "$pkg_dependency_facility" "$pkg_dependency_constraints" "$pkg_dependency_consumer_osarch" || return 1
    if [ -n "$pkg_dependency_resolved" ]
    then
      pkg_dependency_resolved="$pkg_dependency_resolved
$pkg_dependency_facility$pkg_dependency_tab$pkg_dependency_resolved_provider"
    else
      pkg_dependency_resolved="$pkg_dependency_facility$pkg_dependency_tab$pkg_dependency_resolved_provider"
    fi
  done < "$pkg_dependency_source"
}

_pkg_dependency_materialize()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_source="$1"
  pkg_dependency_concrete="$2"
  pkg_dependency_resolved_set="$3"

  if [ ! -e "$pkg_dependency_source" ] && [ ! -L "$pkg_dependency_source" ]
  then
    [ -z "$pkg_dependency_resolved_set" ]
    return $?
  fi

  _pkg_dependency_file_validate "$pkg_dependency_source" || return 1
  [ -n "$pkg_dependency_resolved_set" ] || return 1
  command -p -- cp -- "$pkg_dependency_source" "$pkg_dependency_concrete/dependency" || return 1
  command -p -- mkdir -- "$pkg_dependency_concrete/binding" || return 1
  pkg_dependency_tab="$(printf '\t')"

  while IFS="$pkg_dependency_tab" read -r pkg_dependency_binding_facility pkg_dependency_binding_provider pkg_dependency_binding_extra
  do
    [ -n "$pkg_dependency_binding_facility" ] && [ -n "$pkg_dependency_binding_provider" ] && [ -z "$pkg_dependency_binding_extra" ] || return 1
    _pkg_facility_name_valid "$pkg_dependency_binding_facility" || return 1
    _pkg_dependency_concrete_parse "$pkg_dependency_binding_provider" || return 1
    printf -- '%s\n' "$pkg_dependency_binding_provider" > "$pkg_dependency_concrete/binding/$pkg_dependency_binding_facility" || return 1
    [ -f "$pkg_dependency_concrete/binding/$pkg_dependency_binding_facility" ] && [ ! -L "$pkg_dependency_concrete/binding/$pkg_dependency_binding_facility" ] && [ ! -x "$pkg_dependency_concrete/binding/$pkg_dependency_binding_facility" ] || return 1
  done <<EOF_RESOLVED
$pkg_dependency_resolved_set
EOF_RESOLVED

  _pkg_dependency_file_validate "$pkg_dependency_concrete/dependency"
}

_pkg_dependency_binding_read()
{
  [ "$#" -eq 1 ] || return 2
  [ -f "$1" ] && [ ! -L "$1" ] && [ -r "$1" ] && [ ! -x "$1" ] || return 1

  pkg_dependency_binding_value=""
  pkg_dependency_binding_extra=""
  {
    IFS= read -r pkg_dependency_binding_value || return 1
    IFS= read -r pkg_dependency_binding_extra
    pkg_dependency_binding_second_status="$?"
  } < "$1"

  [ "$pkg_dependency_binding_second_status" -ne 0 ] || return 1
  [ -z "$pkg_dependency_binding_extra" ] || return 1
  [ -n "$pkg_dependency_binding_value" ] || return 1
  pkg_dependency_binding_actual="$(command -p -- wc -c < "$1")" || return 1
  pkg_dependency_binding_expected="$(printf -- '%s\n' "$pkg_dependency_binding_value" | command -p -- wc -c)" || return 1
  [ "$pkg_dependency_binding_actual" = "$pkg_dependency_binding_expected" ] || return 1
  _pkg_dependency_concrete_parse "$pkg_dependency_binding_value"
}

_pkg_dependency_provider_unreferenced()
{
  [ "$#" -eq 1 ] || return 2
  pkg_dependency_target_provider="$1"
  _pkg_dependency_concrete_parse "$pkg_dependency_target_provider" || return 1
  [ -d "$m_PKG_DIR" ] && [ ! -L "$m_PKG_DIR" ] || return 1

  for pkg_dependency_consumer in \
    "$m_PKG_DIR"/* \
    "$m_PKG_DIR"/.[!.]* \
    "$m_PKG_DIR"/..?*
  do
    [ -e "$pkg_dependency_consumer" ] || [ -L "$pkg_dependency_consumer" ] || continue
    [ -L "$pkg_dependency_consumer" ] && continue
    [ -d "$pkg_dependency_consumer" ] || return 1
    pkg_dependency_consumer_name="${pkg_dependency_consumer##*/}"
    _pkg_dependency_concrete_parse "$pkg_dependency_consumer_name" || return 1
    pkg_dependency_binding_dir="$pkg_dependency_consumer/binding"

    if [ ! -e "$pkg_dependency_binding_dir" ] && [ ! -L "$pkg_dependency_binding_dir" ]
    then
      continue
    fi
    [ -d "$pkg_dependency_binding_dir" ] && [ ! -L "$pkg_dependency_binding_dir" ] || return 1

    for pkg_dependency_binding in \
      "$pkg_dependency_binding_dir"/* \
      "$pkg_dependency_binding_dir"/.[!.]* \
      "$pkg_dependency_binding_dir"/..?*
    do
      [ -e "$pkg_dependency_binding" ] || [ -L "$pkg_dependency_binding" ] || continue
      pkg_dependency_binding_facility="${pkg_dependency_binding##*/}"
      _pkg_facility_name_valid "$pkg_dependency_binding_facility" || return 1
      _pkg_dependency_binding_read "$pkg_dependency_binding" || return 1
      [ "$pkg_dependency_binding_value" != "$pkg_dependency_target_provider" ] || return 1
    done
  done

  return 0
}
