# POSIX-sh terminal-menu engine with pluggable list providers and optional multi-selection.
#
# Dependencies:
#   term.lib.sh   terminal/TTY/terminfo lifecycle and key decoding
#   array.lib.sh  array-backed provider/result support
#   map.lib.sh    custom-key and selection sets
#   core.lib.sh   quote(), loaded by the m runtime
#
# Public configuration variables:
#   menu_header
#   menu_footer
#   menu_bottom_footer
#   menu_array_values    array name used by menu_array_provider
#   menu_array_labels    array name used by menu_array_provider
#
# Public result state set by menu_run_provider:
#   menu_result_key
#   menu_result_value    first returned value, for single-result convenience
#   menu_result_values   array containing every returned value in provider order
#   menu_error
#
# Public functions:
#   menu_reset
#   menu_key_clear
#   menu_key_add KEY
#   menu_multiselect_enable
#   menu_multiselect_disable
#   menu_toggle_key_set KEY
#   menu_run_provider PROVIDER
#   menu_array_provider
#
# Provider contract
# -----------------
# PROVIDER is a shell function called with one of:
#
#   PROVIDER count
#     Set menu_provider_count to a positive integer.
#
#   PROVIDER item INDEX
#     Set menu_provider_value and menu_provider_label.
#     Values may contain embedded or trailing newlines. Labels are single-line
#     because the renderer uses one terminal row per item.
#
#   PROVIDER event KEY INDEX VALUE LABEL
#     The engine sets menu_provider_action=return before the call. The provider
#     may leave it unchanged or set it to:
#
#       return  finish and return the action key plus the marked values; when
#               nothing is marked, return the current item
#       reload  query the provider again, preserving/clamping cursor and valid
#               marked indices
#       reset   query the provider again and reset cursor and marked indices
#       ignore  continue without redrawing
#       cancel  finish as a user cancellation
#
# Enter is always delivered as an event. Escape and up/down/pageup/pagedown/
# home/end are owned by the engine and cannot be configured. When multi-selection
# is enabled, its configured toggle key is also reserved. Other named keys
# returned by term_read_key and one text key can be configured with menu_key_add.
#
# Multi-selection is disabled by default. When enabled, the toggle key is
# handled by the engine and is not delivered as an event. Marks are index-based
# within the current provider view. reload preserves marks whose indices remain
# valid; reset clears all marks.
#
# Array-backed provider
# ---------------------
# menu_array_provider exposes two parallel arrays:
#
#   menu_array_values=VALUES_ARRAY_NAME
#   menu_array_labels=LABELS_ARRAY_NAME
#
# Both arrays must have the same size. Values are copied directly, preserving
# embedded and trailing newlines. POSIX shell variables cannot represent NUL.
#
# Terminal ownership
# ------------------
# menu_run_provider uses the terminal currently selected by term_tty_device.
# Call term_tty_use DEVICE before menu_run_provider to select another TTY.
# Each menu session saves/restores the exact TTY state and uses term.lib.sh for
# alternate-screen, keypad, cursor, size and key operations. The session owns
# its signal traps; term.lib.sh itself installs none.
#
# Status convention:
#   0  provider returned a selection/event result
#   1  user/provider cancellation
#   2  invalid API usage or menu/provider/terminal failure
#   signal-derived statuses are propagated by the session

. "$m_LIB_DIR/sys/sh/array.lib.sh"
. "$m_LIB_DIR/sys/sh/map.lib.sh"
. "$m_LIB_DIR/sys/sh/term.lib.sh"

#-------------------------------------------------------------------------------

menu_reset()
{
  menu_header=
  menu_footer=
  menu_bottom_footer=
  _menu_multiselect=0
  _menu_toggle_key=' '
  menu_array_values=
  menu_array_labels=
  menu_result_key=
  menu_result_value=
  menu_error=

  map _menu_custom_keys || return 1
  map _menu_selected_indices || return 1
  array menu_result_values || return 1
}

menu_key_clear()
{
  map _menu_custom_keys
}

menu_array_provider()
{
  case "$1" in
    count)
      [ "$#" -eq 1 ] || return 2
      [ -n "$menu_array_values" ] || return 2
      [ -n "$menu_array_labels" ] || return 2

      array "$menu_array_values" size _menu_array_values_size || return "$?"
      array "$menu_array_labels" size _menu_array_labels_size || return "$?"

      [ "$_menu_array_values_size" = "$_menu_array_labels_size" ] || return 1
      menu_provider_count=$_menu_array_values_size
      ;;
    item)
      [ "$#" -eq 2 ] || return 2

      array "$menu_array_values" get "$2" menu_provider_value || return "$?"
      array "$menu_array_labels" get "$2" menu_provider_label || return "$?"
      ;;
    event)
      [ "$#" -eq 5 ] || return 2
      ;;
    *)
      return 2
      ;;
  esac

  return 0
}

_menu_key_is_engine_reserved()
{
  [ "$#" -eq 1 ] || return 2

  case "$1" in
    escape|enter|up|down|pageup|pagedown|home|end)
      return 0
      ;;
  esac

  return 1
}

_menu_key_is_named_custom()
{
  [ "$#" -eq 1 ] || return 2

  case "$1" in
    nul|backspace|tab|backtab|left|right|insert|delete|f1|f2|f3|f4|f5|f6|f7|f8|f9|f10|f11|f12|f13|f14|f15|f16|f17|f18|f19|f20)
      return 0
      ;;
  esac

  return 1
}

_menu_key_valid_configurable()
{
  [ "$#" -eq 1 ] || return 2
  [ -n "$1" ] || return 1

  _menu_key_is_named_custom "$1" && return 0
  term_key_is_text "$1"
}

_menu_key_is_configured()
{
  [ "$#" -eq 1 ] || return 2

  if map _menu_custom_keys get "$1" _menu_configured_value >/dev/null 2>&1
  then
    unset _menu_configured_value
    return 0
  fi

  unset _menu_configured_value
  return 1
}

menu_key_add()
{
  if [ "$#" -ne 1 ] || [ -z "$1" ]
  then
    menu_error="menu_key_add requires one non-empty key"
    return 2
  fi

  if _menu_key_is_engine_reserved "$1"
  then
    menu_error="key is reserved: $1"
    return 2
  fi

  if [ "$_menu_multiselect" -eq 1 ] && [ "$1" = "$_menu_toggle_key" ]
  then
    menu_error="key is reserved by multi-selection"
    return 2
  fi

  if ! _menu_key_valid_configurable "$1"
  then
    menu_error="invalid custom key: $1"
    return 2
  fi

  if _menu_key_is_configured "$1"
  then
    menu_error="duplicate custom key: $1"
    return 2
  fi

  map _menu_custom_keys put "$1" "1" || {
    menu_error="cannot store custom key"
    return 1
  }

  menu_error=
  return 0
}

menu_multiselect_enable()
{
  if [ "$#" -ne 0 ]
  then
    menu_error="menu_multiselect_enable takes no arguments"
    return 2
  fi

  if _menu_key_is_configured "$_menu_toggle_key"
  then
    menu_error="multi-selection key is already configured as an action: $_menu_toggle_key"
    return 2
  fi

  map _menu_selected_indices || {
    menu_error="cannot reset multi-selection state"
    return 1
  }

  _menu_multiselect=1
  menu_error=
  return 0
}

menu_multiselect_disable()
{
  if [ "$#" -ne 0 ]
  then
    menu_error="menu_multiselect_disable takes no arguments"
    return 2
  fi

  map _menu_selected_indices || {
    menu_error="cannot reset multi-selection state"
    return 1
  }

  _menu_multiselect=0
  menu_error=
  return 0
}

menu_toggle_key_set()
{
  if [ "$#" -ne 1 ] || [ -z "$1" ]
  then
    menu_error="menu_toggle_key_set requires one non-empty key"
    return 2
  fi

  if _menu_key_is_engine_reserved "$1"
  then
    menu_error="key is reserved by menu navigation: $1"
    return 2
  fi

  if ! _menu_key_valid_configurable "$1"
  then
    menu_error="invalid multi-selection key: $1"
    return 2
  fi

  if [ "$_menu_multiselect" -eq 1 ] && _menu_key_is_configured "$1"
  then
    menu_error="key is already configured as an action: $1"
    return 2
  fi

  _menu_toggle_key=$1
  menu_error=
  return 0
}

#-------------------------------------------------------------------------------

_menu_fail()
{
  _menu_session_error=$1
  return 2
}

_menu_read_key()
{
  [ "$#" -eq 1 ] || return 2

  case "$1" in
    blocking)
      term_tty_blocking || return 1
      ;;
    nowait)
      term_tty_nowait || return 1
      ;;
    *)
      return 2
      ;;
  esac

  term_read_key
  _menu_read_term_status=$?

  case "$_menu_read_term_status" in
    0) ;;
    3)
      unset _menu_read_term_status
      return 3
      ;;
    *)
      unset _menu_read_term_status
      return 1
      ;;
  esac

  case "$term_key" in
    text)
      _menu_key=$term_key_text
      ;;
    unknown|control)
      unset _menu_read_term_status
      return 2
      ;;
    *)
      _menu_key=$term_key
      ;;
  esac

  unset _menu_read_term_status
  return 0
}

_menu_line_count()
{
  [ "$#" -eq 1 ] || return 2

  if [ -z "$1" ]
  then
    printf '%s\n' "0"
  else
    printf '%s\n' "$1" | command -p awk 'END { print NR }'
  fi
}

_menu_print_block()
{
  [ "$#" -eq 3 ] || return 2

  printf '%s\n' "$1" |
    command -p awk -v width="$2" -v trailing_newline="$3" '
      NR > 1 { printf "\n" }
      {
        gsub(/[[:cntrl:]]/, "?")
        printf "%s", substr($0, 1, width)
      }
      END {
        if (trailing_newline == "1") {
          printf "\n"
        }
      }
    ' > "$term_tty_device"
}

_menu_safe_item_text()
{
  [ "$#" -eq 2 ] || return 2

  printf '%s\n' "$1" |
    command -p awk -v width="$2" '
      {
        gsub(/[[:cntrl:]]/, "?")
        printf "%s", substr($0, 1, width)
        exit
      }
    '
}

#-------------------------------------------------------------------------------

_menu_provider_count_get()
{
  menu_provider_count=

  "$_menu_provider" count >/dev/null || {
    _menu_fail "provider count operation failed"
    return 2
  }

  case "$menu_provider_count" in
    ''|*[!0-9]*)
      _menu_fail "provider returned an invalid count"
      return 2
      ;;
  esac

  if [ "$menu_provider_count" -lt 1 ] 2>/dev/null
  then
    _menu_fail "provider returned an empty list"
    return 2
  fi

  _menu_item_count=$menu_provider_count
  return 0
}

_menu_provider_item_get()
{
  [ "$#" -eq 1 ] || return 2

  menu_provider_value=
  menu_provider_label=

  "$_menu_provider" item "$1" >/dev/null || {
    _menu_fail "provider item operation failed at index $1"
    return 2
  }

  case "$menu_provider_label" in
    *"$_menu_newline"*)
      _menu_fail "provider label contains a newline at index $1"
      return 2
      ;;
  esac

  return 0
}

_menu_selection_clear()
{
  map _menu_selected_indices || {
    _menu_fail "cannot reset multi-selection state"
    return 2
  }
}

_menu_selection_is_marked()
{
  [ "$#" -eq 1 ] || return 2
  map _menu_selected_indices get "$1" _menu_selected_marker >/dev/null 2>&1
}

_menu_selection_toggle()
{
  [ "$#" -eq 1 ] || return 2

  if _menu_selection_is_marked "$1"
  then
    map _menu_selected_indices rem "$1" || {
      _menu_fail "cannot remove multi-selection mark"
      return 2
    }
  else
    map _menu_selected_indices put "$1" "1" || {
      _menu_fail "cannot store multi-selection mark"
      return 2
    }
  fi

  return 0
}

_menu_selection_prune()
{
  _menu_selection_keys=$(map _menu_selected_indices keys) || {
    _menu_fail "cannot read multi-selection state"
    return 2
  }

  if [ -n "$_menu_selection_keys" ]
  then
    eval "set -- $_menu_selection_keys" || {
      _menu_fail "cannot decode multi-selection state"
      return 2
    }

    for _menu_selection_index
    do
      case "$_menu_selection_index" in
        ''|*[!0-9]*)
          _menu_fail "invalid multi-selection index"
          return 2
          ;;
      esac

      if [ "$_menu_selection_index" -ge "$_menu_item_count" ]
      then
        map _menu_selected_indices rem "$_menu_selection_index" || {
          _menu_fail "cannot prune multi-selection state"
          return 2
        }
      fi
    done
  fi

  unset _menu_selection_keys _menu_selection_index
  return 0
}

_menu_result_collect()
{
  [ "$#" -eq 1 ] || return 2

  array _menu_session_values || {
    _menu_fail "cannot reset menu result state"
    return 2
  }

  if [ "$_menu_multiselect" -eq 0 ]
  then
    _menu_provider_item_get "$1" || return 2
    array _menu_session_values add "$menu_provider_value" || {
      _menu_fail "cannot store menu result"
      return 2
    }
    return 0
  fi

  map _menu_selected_indices size _menu_selected_count || {
    _menu_fail "cannot read multi-selection size"
    return 2
  }

  if [ "$_menu_selected_count" -eq 0 ]
  then
    _menu_provider_item_get "$1" || return 2
    array _menu_session_values add "$menu_provider_value" || {
      _menu_fail "cannot store menu result"
      return 2
    }
    return 0
  fi

  _menu_result_index=0
  while [ "$_menu_result_index" -lt "$_menu_item_count" ]
  do
    if _menu_selection_is_marked "$_menu_result_index"
    then
      _menu_provider_item_get "$_menu_result_index" || return 2
      array _menu_session_values add "$menu_provider_value" || {
        _menu_fail "cannot store menu result"
        return 2
      }
    fi
    _menu_result_index=$((_menu_result_index + 1))
  done

  unset _menu_result_index _menu_selected_count
  return 0
}

_menu_provider_event()
{
  [ "$#" -eq 2 ] || return 2

  _menu_event_key=$1
  _menu_event_index=$2

  _menu_provider_item_get "$_menu_event_index" || return 2

  _menu_event_value=$menu_provider_value
  _menu_event_label=$menu_provider_label
  menu_provider_action=return

  "$_menu_provider" event "$_menu_event_key" "$_menu_event_index" \
    "$_menu_event_value" "$_menu_event_label" >/dev/null || {
      _menu_fail "provider event operation failed"
      return 2
    }

  case "$menu_provider_action" in
    return|reload|reset|ignore|cancel) ;;
    *)
      _menu_fail "provider returned an invalid event action"
      return 2
      ;;
  esac

  case "$menu_provider_action" in
    return)
      _menu_result_collect "$_menu_event_index" || return 2
      _menu_session_result_key=$_menu_event_key
      return 10
      ;;
    reload)
      _menu_provider_count_get || return 2
      _menu_selection_prune || return 2

      if [ "$_menu_selected" -ge "$_menu_item_count" ]
      then
        _menu_selected=$((_menu_item_count - 1))
      fi

      [ "$_menu_selected" -ge 0 ] || _menu_selected=0
      _menu_render_needed=1
      return 0
      ;;
    reset)
      _menu_provider_count_get || return 2
      _menu_selection_clear || return 2
      _menu_selected=0
      _menu_top=0
      _menu_render_needed=1
      return 0
      ;;
    ignore)
      return 0
      ;;
    cancel)
      return 11
      ;;
  esac
}

#-------------------------------------------------------------------------------

_menu_update_geometry()
{
  term_size_update || {
    _menu_fail "cannot read terminal size"
    return 2
  }

  _menu_term_lines=$term_rows
  _menu_term_cols=$term_cols
  _menu_header_lines=$(_menu_line_count "$menu_header") || return 2
  _menu_footer_lines=$(_menu_line_count "$menu_footer") || return 2
  _menu_bottom_footer_lines=$(_menu_line_count "$menu_bottom_footer") || return 2

  _menu_visible_rows=$((_menu_term_lines - _menu_header_lines - _menu_footer_lines - _menu_bottom_footer_lines))

  if [ "$_menu_visible_rows" -lt 1 ] || [ "$_menu_term_cols" -lt 7 ]
  then
    _menu_fail "terminal is too small"
    return 2
  fi

  return 0
}

_menu_render_row()
{
  [ "$#" -eq 2 ] || return 2

  _menu_render_index=$1
  _menu_render_row_index=$2

  _menu_provider_item_get "$_menu_render_index" || return 2

  if [ "$_menu_multiselect" -eq 1 ]
  then
    _menu_text_width=$((_menu_term_cols - 6))
  else
    _menu_text_width=$((_menu_term_cols - 2))
  fi

  _menu_text=$(_menu_safe_item_text "$menu_provider_label" "$_menu_text_width") || {
    _menu_fail "cannot render menu item"
    return 2
  }

  if [ "$_menu_render_index" -eq "$_menu_selected" ]
  then
    _menu_cursor='>'
  else
    _menu_cursor=' '
  fi

  if [ "$_menu_multiselect" -eq 1 ]
  then
    if _menu_selection_is_marked "$_menu_render_index"
    then
      _menu_mark='[x]'
    else
      _menu_mark='[ ]'
    fi

    _menu_line="$_menu_cursor $_menu_mark $_menu_text"
  else
    _menu_line="$_menu_cursor $_menu_text"
  fi

  _menu_screen_row=$((_menu_header_lines + _menu_render_row_index))

  term_cursor_move "$_menu_screen_row" 0 || {
    _menu_fail "terminal does not support cursor positioning"
    return 2
  }

  printf '%-*s' "$_menu_term_cols" "$_menu_line" > "$term_tty_device" || return 2
  return 0
}

_menu_viewport_adjust()
{
  if [ "$_menu_selected" -lt "$_menu_top" ]
  then
    _menu_top=$_menu_selected
  elif [ "$_menu_selected" -ge "$((_menu_top + _menu_visible_rows))" ]
  then
    _menu_top=$((_menu_selected - _menu_visible_rows + 1))
  fi
}

_menu_render()
{
  term_clear || {
    _menu_fail "terminal does not support clear"
    return 2
  }

  if [ -n "$menu_header" ]
  then
    _menu_print_block "$menu_header" "$_menu_term_cols" "1" || {
      _menu_fail "cannot render menu header"
      return 2
    }
  fi

  _menu_remaining=$((_menu_item_count - _menu_top))

  if [ "$_menu_remaining" -lt "$_menu_visible_rows" ]
  then
    _menu_render_rows=$_menu_remaining
  else
    _menu_render_rows=$_menu_visible_rows
  fi

  _menu_row=0
  _menu_index=$_menu_top

  while [ "$_menu_row" -lt "$_menu_render_rows" ]
  do
    _menu_render_row "$_menu_index" "$_menu_row" || return 2
    _menu_row=$((_menu_row + 1))
    _menu_index=$((_menu_index + 1))
  done

  if [ -n "$menu_footer" ]
  then
    _menu_footer_row=$((_menu_header_lines + _menu_render_rows))
    term_cursor_move "$_menu_footer_row" 0 || {
      _menu_fail "terminal does not support cursor positioning"
      return 2
    }

    _menu_print_block "$menu_footer" "$_menu_term_cols" "0" || {
      _menu_fail "cannot render menu footer"
      return 2
    }
  fi

  if [ -n "$menu_bottom_footer" ]
  then
    _menu_bottom_footer_row=$((_menu_term_lines - _menu_bottom_footer_lines))
    term_cursor_move "$_menu_bottom_footer_row" 0 || {
      _menu_fail "terminal does not support cursor positioning"
      return 2
    }

    _menu_print_block "$menu_bottom_footer" "$_menu_term_cols" "0" || {
      _menu_fail "cannot render bottom footer"
      return 2
    }
  fi

  term_cursor_move 0 0 || {
    _menu_fail "terminal does not support cursor positioning"
    return 2
  }

  return 0
}

_menu_render_partial_row()
{
  [ "$#" -eq 1 ] || return 2

  _menu_partial_old_lines=$_menu_term_lines
  _menu_partial_old_cols=$_menu_term_cols
  _menu_partial_old_top=$_menu_top

  _menu_update_geometry || return 2
  _menu_viewport_adjust

  if [ "$_menu_term_lines" -ne "$_menu_partial_old_lines" ] ||
     [ "$_menu_term_cols" -ne "$_menu_partial_old_cols" ] ||
     [ "$_menu_top" -ne "$_menu_partial_old_top" ]
  then
    _menu_render || return 2
    return 0
  fi

  if [ "$1" -lt "$_menu_top" ] ||
     [ "$1" -ge "$((_menu_top + _menu_visible_rows))" ]
  then
    _menu_render || return 2
    return 0
  fi

  _menu_partial_row=$(($1 - _menu_top))
  _menu_render_row "$1" "$_menu_partial_row" || return 2

  term_cursor_move 0 0 || {
    _menu_fail "terminal does not support cursor positioning"
    return 2
  }

  return 0
}

_menu_render_move()
{
  [ "$#" -eq 1 ] || return 2

  _menu_move_old_selected=$1
  _menu_move_old_lines=$_menu_term_lines
  _menu_move_old_cols=$_menu_term_cols
  _menu_move_old_top=$_menu_top

  _menu_update_geometry || return 2
  _menu_viewport_adjust

  if [ "$_menu_term_lines" -ne "$_menu_move_old_lines" ] ||
     [ "$_menu_term_cols" -ne "$_menu_move_old_cols" ] ||
     [ "$_menu_top" -ne "$_menu_move_old_top" ]
  then
    _menu_render || return 2
    return 0
  fi

  if [ "$_menu_move_old_selected" -eq "$_menu_selected" ]
  then
    return 0
  fi

  _menu_move_old_row=$(($_menu_move_old_selected - _menu_top))
  _menu_move_new_row=$(($_menu_selected - _menu_top))

  _menu_render_row "$_menu_move_old_selected" "$_menu_move_old_row" || return 2
  _menu_render_row "$_menu_selected" "$_menu_move_new_row" || return 2

  term_cursor_move 0 0 || {
    _menu_fail "terminal does not support cursor positioning"
    return 2
  }

  return 0
}

#-------------------------------------------------------------------------------

_menu_apply_key()
{
  _menu_action=ignore

  case "$_menu_key" in
    escape)
      _menu_action=cancel
      ;;
    up)
      if [ "$_menu_selected" -gt 0 ]
      then
        _menu_selected=$((_menu_selected - 1))
        _menu_action=move
      fi
      ;;
    down)
      if [ "$_menu_selected" -lt "$((_menu_item_count - 1))" ]
      then
        _menu_selected=$((_menu_selected + 1))
        _menu_action=move
      fi
      ;;
    pageup)
      if [ "$_menu_selected" -gt 0 ]
      then
        _menu_selected=$((_menu_selected - _menu_visible_rows))
        [ "$_menu_selected" -ge 0 ] || _menu_selected=0
        _menu_action=move
      fi
      ;;
    pagedown)
      if [ "$_menu_selected" -lt "$((_menu_item_count - 1))" ]
      then
        _menu_selected=$((_menu_selected + _menu_visible_rows))
        if [ "$_menu_selected" -ge "$_menu_item_count" ]
        then
          _menu_selected=$((_menu_item_count - 1))
        fi
        _menu_action=move
      fi
      ;;
    home)
      if [ "$_menu_selected" -ne 0 ]
      then
        _menu_selected=0
        _menu_action=move
      fi
      ;;
    end)
      if [ "$_menu_selected" -ne "$((_menu_item_count - 1))" ]
      then
        _menu_selected=$((_menu_item_count - 1))
        _menu_action=move
      fi
      ;;
    enter)
      _menu_action=event
      ;;
    *)
      if [ "$_menu_multiselect" -eq 1 ] && [ "$_menu_key" = "$_menu_toggle_key" ]
      then
        _menu_action=toggle
      elif _menu_key_is_configured "$_menu_key"
      then
        _menu_action=event
      fi
      ;;
  esac
}

#-------------------------------------------------------------------------------

_menu_cleanup()
{
  _menu_cleanup_status=$?
  trap - 0 HUP INT QUIT TERM PIPE TSTP

  if [ "$_menu_cursor_hidden" -eq 1 ]
  then
    term_cursor_show || :
    _menu_cursor_hidden=0
  fi

  if [ "$_menu_keypad" -eq 1 ]
  then
    term_keypad_disable || :
    _menu_keypad=0
  fi

  if [ "$_menu_alt_screen" -eq 1 ]
  then
    term_screen_leave || :
    _menu_alt_screen=0
  fi

  if [ "$_menu_tty_saved" -eq 1 ]
  then
    term_tty_restore || :
    _menu_tty_saved=0
  fi

  return "$_menu_cleanup_status"
}

_menu_terminal_init()
{
  term_tty_available || {
    _menu_fail "no usable terminal is available"
    return 2
  }

  term_tty_save || {
    _menu_fail "cannot save terminal settings"
    return 2
  }
  _menu_tty_saved=1

  term_size_update || {
    _menu_fail "cannot read terminal size"
    return 2
  }

  term_tty_blocking || {
    _menu_fail "cannot configure terminal"
    return 2
  }

  term_keymap_init || {
    _menu_fail "cannot build terminal keymap"
    return 2
  }

  if term_keypad_enable
  then
    _menu_keypad=1
  fi

  if term_screen_enter
  then
    _menu_alt_screen=1
  fi

  if term_cursor_hide
  then
    _menu_cursor_hidden=1
  fi

  return 0
}

#-------------------------------------------------------------------------------

_menu_handle_event()
{
  _menu_provider_event "$_menu_key" "$_menu_selected"
  _menu_event_status=$?

  case "$_menu_event_status" in
    0) return 0 ;;
    10) return 10 ;;
    11) return 11 ;;
    *) return 2 ;;
  esac
}

_menu_handle_action()
{
  case "$_menu_action" in
    cancel)
      return 11
      ;;
    event)
      _menu_handle_event
      return "$?"
      ;;
    toggle)
      _menu_selection_toggle "$_menu_selected" || return 2
      _menu_row_render_needed=1
      return 0
      ;;
    move|ignore)
      return 0
      ;;
    *)
      _menu_fail "invalid internal menu action"
      return 2
      ;;
  esac
}

_menu_main_loop()
{
  _menu_provider_count_get || return 2
  _menu_selection_clear || return 2
  _menu_selected=0
  _menu_top=0
  _menu_render_needed=1
  _menu_row_render_needed=0

  while :
  do
    if [ "$_menu_render_needed" -eq 1 ]
    then
      _menu_update_geometry || return 2
      _menu_viewport_adjust
      _menu_render || return 2
      _menu_render_needed=0
      _menu_row_render_needed=0
    elif [ "$_menu_row_render_needed" -eq 1 ]
    then
      _menu_render_partial_row "$_menu_selected" || return 2
      _menu_row_render_needed=0
    fi

    _menu_read_key blocking
    _menu_read_status=$?

    case "$_menu_read_status" in
      0) ;;
      2) continue ;;
      *)
        _menu_fail "cannot read from terminal"
        return 2
        ;;
    esac

    _menu_move_from=$_menu_selected
    _menu_apply_key
    _menu_handle_action
    _menu_action_status=$?

    case "$_menu_action_status" in
      0) ;;
      10) return 0 ;;
      11) return 1 ;;
      *) return 2 ;;
    esac

    if [ "$_menu_action" = "move" ]
    then
      _menu_pending=0

      while [ "$_menu_pending" -lt 64 ]
      do
        _menu_read_key nowait
        _menu_read_status=$?

        case "$_menu_read_status" in
          0) ;;
          2)
            _menu_pending=$((_menu_pending + 1))
            continue
            ;;
          3)
            break
            ;;
          *)
            _menu_fail "cannot read queued terminal input"
            return 2
            ;;
        esac

        _menu_apply_key
        _menu_handle_action
        _menu_action_status=$?

        case "$_menu_action_status" in
          0)
            if { [ "$_menu_render_needed" -eq 1 ] ||
                 [ "$_menu_row_render_needed" -eq 1 ]; } &&
               [ "$_menu_action" != "move" ]
            then
              break
            fi
            ;;
          10) return 0 ;;
          11) return 1 ;;
          *) return 2 ;;
        esac

        _menu_pending=$((_menu_pending + 1))
      done

      if [ "$_menu_render_needed" -eq 0 ]
      then
        _menu_render_move "$_menu_move_from" || return 2
      fi
    fi
  done
}

#-------------------------------------------------------------------------------

_menu_session_emit_result()
{
  set -- "$_menu_session_result_key"

  array _menu_session_values size _menu_session_value_count || return 2
  _menu_session_value_index=0

  while [ "$_menu_session_value_index" -lt "$_menu_session_value_count" ]
  do
    array _menu_session_values get "$_menu_session_value_index" _menu_session_value || return 2
    set -- "$@" "$_menu_session_value"
    _menu_session_value_index=$((_menu_session_value_index + 1))
  done

  quote "$@" || return 2
  printf '\n'
}

_menu_session()
{
  _menu_provider=$1
  _menu_tty_saved=0
  _menu_keypad=0
  _menu_alt_screen=0
  _menu_cursor_hidden=0
  _menu_session_result_key=
  _menu_session_error=

  array _menu_session_values || return 2

  trap '_menu_cleanup' 0
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 131' QUIT
  trap 'exit 141' PIPE
  trap 'exit 143' TERM
  trap 'exit 148' TSTP

  _menu_terminal_init
  _menu_status=$?

  if [ "$_menu_status" -eq 0 ]
  then
    _menu_main_loop
    _menu_status=$?
  fi

  case "$_menu_status" in
    0)
      _menu_session_emit_result || {
        printf '%s\n' "cannot serialize menu result"
        return 2
      }
      ;;
    2)
      printf '%s\n' "$_menu_session_error"
      ;;
  esac

  return "$_menu_status"
}

menu_run_provider()
{
  menu_result_key=
  menu_result_value=
  menu_error=
  array menu_result_values || {
    menu_error="cannot reset public menu result"
    return 1
  }

  if [ "$#" -ne 1 ] || [ -z "$1" ]
  then
    menu_error="menu_run_provider requires one provider function"
    return 2
  fi

  _menu_record=$(_menu_session "$1")
  _menu_status=$?

  case "$_menu_status" in
    0)
      if ! eval "set -- $_menu_record"
      then
        menu_error="invalid internal menu result"
        return 2
      fi

      if [ "$#" -lt 2 ]
      then
        menu_error="invalid internal menu result"
        return 2
      fi

      menu_result_key=$1
      shift
      menu_result_value=$1

      array menu_result_values set "$@" || {
        menu_error="cannot store public menu result"
        return 1
      }
      return 0
      ;;
    1)
      return 1
      ;;
    2)
      menu_error=$_menu_record
      [ -n "$menu_error" ] || menu_error="menu engine failed"
      return 2
      ;;
    *)
      return "$_menu_status"
      ;;
  esac
}

_menu_newline='
'

menu_reset
