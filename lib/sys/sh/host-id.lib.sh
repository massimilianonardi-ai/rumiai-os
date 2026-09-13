host_id_get()
(
  [ "$#" -eq 0 ] || return 2

  case "${m_OSARCH_OS-}" in
    linux)
      [ -f /etc/machine-id ] && [ -r /etc/machine-id ] || return 1
      host_id_value="$(LC_ALL=C command -p -- awk 'NR == 1 { value=$0; gsub(/-/, "", value); print tolower(value); exit }' /etc/machine-id 2>/dev/null)" || return 1
      ;;
    macos)
      [ -x /usr/sbin/ioreg ] || return 1
      host_id_value="$(
        /usr/sbin/ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null |
          LC_ALL=C command -p -- awk -F '"' '/IOPlatformUUID/ { value=$(NF-1); gsub(/-/, "", value); print tolower(value); exit }'
      )" || return 1
      ;;
    *)
      return 1
      ;;
  esac

  [ "${#host_id_value}" -eq 32 ] || return 1
  case "$host_id_value" in
    *[!0-9a-f]*) return 1 ;;
  esac

  printf -- '%s\n' "$host_id_value"
)
