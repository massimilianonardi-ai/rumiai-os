. "$m_LIB_DIR/sys/sh/pkg/pkg-provider.lib.sh"

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

_pkg_dependency_provider_satisfies()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_provider_name=$1
  pkg_dependency_required_facility=$2
  pkg_dependency_required_constraints=$3
  pkg_dependency_provider_concrete="$m_PKG_DIR/$pkg_dependency_provider_name"
  pkg_dependency_provider_facility_file="$pkg_dependency_provider_concrete/facility"

  [ -d "$pkg_dependency_provider_concrete" ] && [ ! -L "$pkg_dependency_provider_concrete" ] || return 1
  _pkg_facility_file_validate "$pkg_dependency_provider_facility_file" || return 1

  while IFS= read -r pkg_dependency_provider_line
  do
    _pkg_facility_line_parse "$pkg_dependency_provider_line" || return 1
    [ "$pkg_facility_name" = "$pkg_dependency_required_facility" ] || continue
    _pkg_dependency_constraints_satisfied "$pkg_facility_compatibility" "$pkg_dependency_required_constraints" || return 1
    return 0
  done < "$pkg_dependency_provider_facility_file"

  return 1
}

_pkg_dependency_consumer_osarch_resolve()
{
  [ "$#" -eq 1 ] || return 2
  pkg_dependency_effective_osarch=$1

  if [ -z "$pkg_dependency_effective_osarch" ]
  then
    pkg_dependency_effective_osarch=${m_OSARCH-}
  fi

  _pkg_provider_osarch_valid "$pkg_dependency_effective_osarch"
}

_pkg_dependency_resolve_one()
{
  [ "$#" -eq 4 ] || return 2
  pkg_dependency_facility=$1
  pkg_dependency_constraints=$2
  pkg_dependency_consumer=$3
  _pkg_dependency_consumer_osarch_resolve "$4" || return 1
  pkg_dependency_consumer_osarch=$pkg_dependency_effective_osarch

  pkg_dependency_selector="$(pkg_provider_effective_selector "$pkg_dependency_consumer" "$pkg_dependency_facility")" || return 1
  pkg_dependency_resolved_provider="$(pkg_provider_selector_resolve "$pkg_dependency_selector" "$pkg_dependency_consumer_osarch")" || return 1
  _pkg_dependency_provider_satisfies "$pkg_dependency_resolved_provider" "$pkg_dependency_facility" "$pkg_dependency_constraints"
}

_pkg_dependency_resolve()
{
  [ "$#" -eq 3 ] || return 2
  pkg_dependency_source=$1
  pkg_dependency_consumer=$2
  pkg_dependency_consumer_osarch=$3
  pkg_dependency_resolved=
  pkg_dependency_tab="$(printf '\t')"

  if [ ! -e "$pkg_dependency_source" ] && [ ! -L "$pkg_dependency_source" ]
  then
    return 0
  fi

  _pkg_dependency_file_validate "$pkg_dependency_source" || return 1

  while IFS= read -r pkg_dependency_line
  do
    _pkg_dependency_line_parse "$pkg_dependency_line" || return 1
    _pkg_dependency_resolve_one "$pkg_dependency_facility" "$pkg_dependency_constraints" "$pkg_dependency_consumer" "$pkg_dependency_consumer_osarch" || return 1
    if [ -n "$pkg_dependency_resolved" ]
    then
      pkg_dependency_resolved="$pkg_dependency_resolved
$pkg_dependency_facility$pkg_dependency_tab$pkg_dependency_resolved_provider"
    else
      pkg_dependency_resolved="$pkg_dependency_facility$pkg_dependency_tab$pkg_dependency_resolved_provider"
    fi
  done < "$pkg_dependency_source"
}

pkg_dependency_resolve()
(
  [ "$#" -eq 3 ] || return 2
  _pkg_dependency_resolve "$1" "$2" "$3" || return $?
  [ -z "$pkg_dependency_resolved" ] || printf -- '%s\n' "$pkg_dependency_resolved"
)

_pkg_dependency_runtime_access_prepare_concrete()
(
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_access_concrete=$1
  pkg_dependency_access_seen=$2

  case "$pkg_dependency_access_seen" in
    *"|$pkg_dependency_access_concrete|"*) return 0 ;;
  esac
  pkg_dependency_access_seen="$pkg_dependency_access_seen|$pkg_dependency_access_concrete|"

  _pkg_provider_concrete_parse "$pkg_dependency_access_concrete" || return 1
  pkg_dependency_access_consumer=$pkg_provider_concrete_pkg
  pkg_dependency_access_osarch=$pkg_provider_concrete_osarch
  pkg_dependency_access_file="$m_PKG_DIR/$pkg_dependency_access_concrete/dependency"

  if [ ! -e "$pkg_dependency_access_file" ] && [ ! -L "$pkg_dependency_access_file" ]
  then
    return 0
  fi
  _pkg_dependency_file_validate "$pkg_dependency_access_file" || return 1

  while IFS= read -r pkg_dependency_access_line
  do
    _pkg_dependency_line_parse "$pkg_dependency_access_line" || return 1
    pkg_dependency_access_facility=$pkg_dependency_facility
    pkg_dependency_access_constraints=$pkg_dependency_constraints

    pkg_provider_effective_selector_runtime_access_prepare \
      "$pkg_dependency_access_consumer" \
      "$pkg_dependency_access_facility" || return 1

    _pkg_dependency_resolve_one \
      "$pkg_dependency_access_facility" \
      "$pkg_dependency_access_constraints" \
      "$pkg_dependency_access_consumer" \
      "$pkg_dependency_access_osarch" || return 1
    pkg_dependency_access_provider=$pkg_dependency_resolved_provider

    _pkg_dependency_runtime_access_prepare_concrete \
      "$pkg_dependency_access_provider" \
      "$pkg_dependency_access_seen" || return 1
  done < "$pkg_dependency_access_file"
)

pkg_dependency_runtime_access_prepare()
{
  [ "$#" -eq 1 ] || return 2
  _pkg_dependency_runtime_access_prepare_concrete "$1" ""
}

_pkg_dependency_materialize()
{
  [ "$#" -eq 2 ] || return 2
  pkg_dependency_source=$1
  pkg_dependency_concrete=$2

  if [ ! -e "$pkg_dependency_source" ] && [ ! -L "$pkg_dependency_source" ]
  then
    return 0
  fi

  _pkg_dependency_file_validate "$pkg_dependency_source" || return 1
  command -p -- cp -- "$pkg_dependency_source" "$pkg_dependency_concrete/dependency" || return 1
  _pkg_dependency_file_validate "$pkg_dependency_concrete/dependency"
}

_pkg_dependency_provider_unreferenced()
{
  [ "$#" -eq 1 ] || return 2

  pkg_provider_concrete_referenced "$1"
  pkg_dependency_reference_status=$?
  case "$pkg_dependency_reference_status" in
    0) return 1 ;;
    1) return 0 ;;
    *) return 1 ;;
  esac
}
