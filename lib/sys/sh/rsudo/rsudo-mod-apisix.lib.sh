# Compatibility bridge while the new apisix administration module is developed.
# The legacy source is preserved under a separate dispatcher identity.
# Replace individual entrypoints here only when their new semantics and tests are ready.

loadsyslib "rsudo/rsudo-mod-apisixlegacy" || return 1

rsudo_mod_apisix_set_auth_vars()
{
  rsudo_mod_apisixlegacy_set_auth_vars "$@"
}

rsudo_mod_apisix_json_string_or_array()
{
  rsudo_mod_apisixlegacy_json_string_or_array "$@"
}

rsudo_mod_apisix_key()
{
  rsudo_mod_apisixlegacy_key "$@"
}

rsudo_mod_apisix_keyset()
{
  rsudo_mod_apisixlegacy_keyset "$@"
}

rsudo_mod_apisix_api()
{
  rsudo_mod_apisixlegacy_api "$@"
}

rsudo_mod_apisix_get()
{
  rsudo_mod_apisixlegacy_get "$@"
}

rsudo_mod_apisix_put()
{
  rsudo_mod_apisixlegacy_put "$@"
}

rsudo_mod_apisix_post()
{
  rsudo_mod_apisixlegacy_post "$@"
}

rsudo_mod_apisix_del()
{
  rsudo_mod_apisixlegacy_del "$@"
}

rsudo_mod_apisix_delete()
{
  rsudo_mod_apisixlegacy_delete "$@"
}

rsudo_mod_apisix_delete_service()
{
  rsudo_mod_apisixlegacy_delete_service "$@"
}

rsudo_mod_apisix_delete_route()
{
  rsudo_mod_apisixlegacy_delete_route "$@"
}

rsudo_mod_apisix_delete_stream_route()
{
  rsudo_mod_apisixlegacy_delete_stream_route "$@"
}

rsudo_mod_apisix_delete_upstream()
{
  rsudo_mod_apisixlegacy_delete_upstream "$@"
}

rsudo_mod_apisix_delete_consumer()
{
  rsudo_mod_apisixlegacy_delete_consumer "$@"
}

rsudo_mod_apisix_delete_consumer_group()
{
  rsudo_mod_apisixlegacy_delete_consumer_group "$@"
}

rsudo_mod_apisix_delete_ssl()
{
  rsudo_mod_apisixlegacy_delete_ssl "$@"
}

rsudo_mod_apisix_delete_global_rule()
{
  rsudo_mod_apisixlegacy_delete_global_rule "$@"
}

rsudo_mod_apisix_delete_plugin_metadata()
{
  rsudo_mod_apisixlegacy_delete_plugin_metadata "$@"
}

rsudo_mod_apisix_delete_plugin_config()
{
  rsudo_mod_apisixlegacy_delete_plugin_config "$@"
}

rsudo_mod_apisix_delete_secret()
{
  rsudo_mod_apisixlegacy_delete_secret "$@"
}

rsudo_mod_apisix_delete_proto()
{
  rsudo_mod_apisixlegacy_delete_proto "$@"
}

rsudo_mod_apisix_create()
{
  rsudo_mod_apisixlegacy_create "$@"
}

rsudo_mod_apisix_create_generic()
{
  rsudo_mod_apisixlegacy_create_generic "$@"
}

rsudo_mod_apisix_create_upstream()
{
  rsudo_mod_apisixlegacy_create_upstream "$@"
}

rsudo_mod_apisix_create_upstream_simple()
{
  rsudo_mod_apisixlegacy_create_upstream_simple "$@"
}

rsudo_mod_apisix_create_service()
{
  rsudo_mod_apisixlegacy_create_service "$@"
}

rsudo_mod_apisix_create_service_simple()
{
  rsudo_mod_apisixlegacy_create_service_simple "$@"
}

rsudo_mod_apisix_create_service_standard()
{
  rsudo_mod_apisixlegacy_create_service_standard "$@"
}

rsudo_mod_apisix_create_route()
{
  rsudo_mod_apisixlegacy_create_route "$@"
}

rsudo_mod_apisix_create_route_simple()
{
  rsudo_mod_apisixlegacy_create_route_simple "$@"
}

rsudo_mod_apisix_create_route_map()
{
  rsudo_mod_apisixlegacy_create_route_map "$@"
}

rsudo_mod_apisix_create_route_authn()
{
  rsudo_mod_apisixlegacy_create_route_authn "$@"
}

rsudo_mod_apisix_create_route_authn_authz()
{
  rsudo_mod_apisixlegacy_create_route_authn_authz "$@"
}

rsudo_mod_apisix_create_global_rule()
{
  rsudo_mod_apisixlegacy_create_global_rule "$@"
}

# Read-only mode discovery from APISIX's own YAML parser and shipped defaults.
# The result describes the selected on-disk configuration, NOT a verified
# live process. A custom -c or APISIX_PROFILE deployment must be selected
# explicitly until active runtime configuration can be proved.
#
# Public invocation:
#   rsudo apisix mode [remote-apisix-home [remote-config.yaml]]
#
# Returns one of:
#   traditional-admin | standalone-api | standalone-file-yaml |
#   standalone-file-json | no-admin-data-plane | unsupported
_rsudo_mod_apisix_backend()
(
  if [ "$#" -gt 2 ]
  then
    log error apisix mode-invalid-arguments count "$#"
    exit 1
  fi

  case "${1-}" in
    "" | /*) :;;
    *)
      log error apisix mode-invalid-home path "$1"
      exit 2
    ;;
  esac
  case "${2-}" in
    "" | /*) :;;
    *)
      log error apisix mode-invalid-config path "$2"
      exit 3
    ;;
  esac

  log debug apisix mode-discovery-start home "${1:-automatic}" config "${2:-automatic}"

  # rsudo's interactive mode is reusable state. This is deliberately a
  # non-interactive, read-only shell program sent over the target's stdin.
  RSUDO_INTERACTIVE=
  rsudo sh -s -- "$@" <<'RSUDO_APISIX_MODE_REMOTE'
home=${1-}
config=${2-}

mode_error()
{
  printf 'apisix.mode.%s\n' "$1" >&2
}

# APISIX_HOME is not guaranteed to survive sudo. Prefer the actual
# executable's installation root when it can be resolved without guessing.
if [ -z "$home" ]
then
  apisix_cmd=$(command -v apisix 2>/dev/null) || apisix_cmd=
  if [ -n "$apisix_cmd" ]
  then
    case "$apisix_cmd" in
      /*) :;;
      *) apisix_cmd=;;
    esac
  fi

  if [ -n "$apisix_cmd" ]
  then
    # readlink is a declared optional remote capability for symlinked launchers.
    # An unresolved launcher does not justify inventing an installation root.
    hops=0
    while [ -L "$apisix_cmd" ]
    do
      command -v readlink >/dev/null 2>&1 || {
        mode_error launcher-symlink-unresolvable
        exit 4
      }
      hops=$((hops + 1))
      [ "$hops" -le 16 ] || {
        mode_error launcher-symlink-cycle
        exit 5
      }
      link=$(readlink "$apisix_cmd") || {
        mode_error launcher-symlink-unreadable
        exit 6
      }
      case "$link" in
        /*) apisix_cmd=$link;;
        *) apisix_cmd=${apisix_cmd%/*}/$link;;
      esac
    done
    home=$(CDPATH= cd -- "${apisix_cmd%/*}/.." 2>/dev/null && pwd -P) || home=
    # A detected executable with an unresolved home must not silently fall
    # back to a possibly unrelated installation.
    if [ -z "$home" ] || [ ! -r "$home/conf/config.yaml" ]
    then
      mode_error launcher-installation-unresolved
      exit 7
    fi
  fi
fi

if [ -z "$home" ]
then
  # This is APISIX's conventional packaged location, accepted only when
  # there is real installation evidence, never solely by convention.
  if [ -r /usr/local/apisix/conf/config.yaml ]
  then
    home=/usr/local/apisix
  else
    mode_error installation-unresolved
    exit 7
  fi
fi

[ -d "$home" ] && [ -r "$home/conf/config.yaml" ] || {
  mode_error installation-config-unreadable
  exit 8
}

if [ -z "$config" ]
then
  # A custom -c or profile cannot safely be inferred from the default file.
  # APISIX deletes its temporary .customized_config_path during CLI cleanup.
  if [ -e "$home/conf/.customized_config_path" ]
  then
    mode_error custom-config-ambiguous
    exit 9
  fi
  for candidate in "$home"/conf/config-*.yaml
  do
    if [ -e "$candidate" ]
    then
      mode_error profile-config-ambiguous
      exit 10
    fi
  done
  config=$home/conf/config.yaml
fi

[ -r "$config" ] && [ -f "$config" ] || {
  mode_error selected-config-unreadable
  exit 11
}

if command -v luajit >/dev/null 2>&1
then
  interpreter=$(command -v luajit)
elif [ -x "$home/deps/bin/luajit" ]
then
  interpreter=$home/deps/bin/luajit
elif [ -x /usr/local/openresty/luajit/bin/luajit ]
then
  interpreter=/usr/local/openresty/luajit/bin/luajit
else
  mode_error apisix-luajit-unavailable
  exit 12
fi

# Only the installer root and config path (never secret content) reach argv.
# Loading APISIX's own Lua dependency tree permits the same YAML parser and
# the deployment defaults shipped with the installed APISIX revision.
LUA_PATH="$home/?.lua;$home/deps/share/lua/5.1/?.lua;$home/deps/share/lua/5.1/?/init.lua;;"
LUA_CPATH="$home/deps/lib64/lua/5.1/?.so;$home/deps/lib/lua/5.1/?.so;;"
m_APISIX_CONFIG_PATH=$config
export LUA_PATH LUA_CPATH m_APISIX_CONFIG_PATH

"$interpreter" -e '
local ok_yaml, yaml = pcall(require, "lyaml")
local ok_defaults, defaults = pcall(require, "apisix.cli.config")
if not ok_yaml or not ok_defaults then
  io.stderr:write("apisix.mode.parser-unavailable\n")
  os.exit(13)
end

local path = os.getenv("m_APISIX_CONFIG_PATH")
local file = io.open(path, "rb")
if not file then
  io.stderr:write("apisix.mode.selected-config-unreadable\n")
  os.exit(14)
end
local source = file:read("*a")
file:close()
local ok_parse, document = pcall(yaml.load, source)
if not ok_parse or (document ~= nil and type(document) ~= "table") then
  io.stderr:write("apisix.mode.config-yaml-invalid\n")
  os.exit(15)
end
document = document or {}

local deployment = document.deployment or {}
local apisix = document.apisix or {}
if type(deployment) ~= "table" or type(apisix) ~= "table" then
  io.stderr:write("apisix.mode.config-structure-invalid\n")
  os.exit(16)
end

local role = deployment.role or defaults.deployment.role
local provider
if role == "traditional" then
  local detail = deployment.role_traditional or {}
  if type(detail) ~= "table" then
    io.stderr:write("apisix.mode.provider-structure-invalid\n")
    os.exit(17)
  end
  provider = detail.config_provider or defaults.deployment.role_traditional.config_provider
elseif role == "control_plane" then
  provider = "etcd"
elseif role == "data_plane" then
  local detail = deployment.role_data_plane or {}
  if type(detail) ~= "table" then
    io.stderr:write("apisix.mode.provider-structure-invalid\n")
    os.exit(17)
  end
  provider = detail.config_provider
else
  io.stderr:write("apisix.mode.role-unsupported\n")
  os.exit(18)
end

if type(provider) ~= "string" or provider:find("%$%{%{") or
    (type(role) == "string" and role:find("%$%{%{")) then
  io.stderr:write("apisix.mode.unresolved-provider-or-role\n")
  os.exit(19)
end

local enable_admin = apisix.enable_admin
if enable_admin == nil then
  enable_admin = defaults.apisix.enable_admin
end
if type(enable_admin) ~= "boolean" then
  io.stderr:write("apisix.mode.admin-enable-invalid\n")
  os.exit(21)
end

if role == "traditional" and provider == "etcd" and enable_admin ~= false then
  print("traditional-admin")
elseif role == "control_plane" and enable_admin ~= false then
  print("traditional-admin")
elseif role == "traditional" and provider == "yaml" and enable_admin ~= false then
  print("standalone-api")
elseif role == "data_plane" and provider == "yaml" then
  print("standalone-file-yaml")
elseif role == "data_plane" and provider == "json" then
  print("standalone-file-json")
elseif role == "data_plane" and provider == "etcd" then
  print("no-admin-data-plane")
else
  io.stderr:write("apisix.mode.backend-unsupported\n")
  os.exit(20)
end
'
RSUDO_APISIX_MODE_REMOTE
)

# The public read-only mode operation uses the same internal backend selector
# intended for later mode-aware resource routing.
rsudo_mod_apisix_mode()
{
  _rsudo_mod_apisix_backend "$@"
}

# Reports exactly what has been established by the configured-mode resolver.
# In particular, a successful on-disk classification must never be presented
# as proof of the selected running process or write authorization.
rsudo_mod_apisix_inspect()
(
  _rsudo_mod_apisix_selected=$(_rsudo_mod_apisix_backend "$@")
  _rsudo_mod_apisix_status=$?
  [ "$_rsudo_mod_apisix_status" -eq 0 ] || exit "$_rsudo_mod_apisix_status"

  case "$_rsudo_mod_apisix_selected" in
    traditional-admin|standalone-api|standalone-file-yaml|standalone-file-json|no-admin-data-plane) :;;
    *)
      log error apisix inspect-unrecognized-backend backend "$_rsudo_mod_apisix_selected"
      exit 22
    ;;
  esac

  printf 'configured_mode=%s\nconfiguration_evidence=on-disk\nruntime_identity=unverified\nmutation_readiness=not-established\n' "$_rsudo_mod_apisix_selected"
)

# The remote program is constant data and is streamed without interpolating
# caller-selected paths or Docker IDs into executable shell source.
_rsudo_mod_apisix_runtime_remote_source()
{
  cat <<'RSUDO_APISIX_RUNTIME_REMOTE'
home=$1
observation_scope=${2:-docker}

runtime_error()
{
  printf 'apisix.runtime.%s\n' "$1" >&2
}

while [ "$home" != / ] && [ "${home%/}" != "$home" ]
do
  home=${home%/}
done

[ "$home" != / ] && [ -d "$home" ] &&
  [ -f "$home/conf/nginx.conf" ] && [ -r "$home/conf/nginx.conf" ] || {
  runtime_error generated-config-unavailable
  exit 32
}

pidfile=$home/logs/nginx.pid
if [ ! -e "$pidfile" ] && [ ! -L "$pidfile" ]
then
  printf 'runtime_evidence=pidfile-missing\nruntime_identity=unverified\nmutation_readiness=not-established\n'
  exit 0
fi
[ -f "$pidfile" ] && [ -r "$pidfile" ] && [ ! -L "$pidfile" ] || {
  runtime_error pidfile-unsafe-or-unreadable
  exit 33
}
pid=$(cat "$pidfile") || {
  runtime_error pidfile-read-failed
  exit 34
}
case "$pid" in
  ''|*[!0-9]*) runtime_error pidfile-invalid; exit 35 ;;
esac
# A container master can legitimately be namespace PID 1.
[ "$pid" -ge 1 ] 2>/dev/null || {
  runtime_error pidfile-invalid
  exit 35
}

# POSIX ps is preferred. Minimal Linux APISIX images can omit ps;
# /proc/<pid>/cmdline is a guarded host-specific fallback.
# Raw process arguments remain private to this shell, never logged.
if command -v ps >/dev/null 2>&1
then
  process_title=$(LC_ALL=C ps -p "$pid" -o args= 2>/dev/null) || {
    runtime_error process-unobservable
    exit 37
  }
elif [ -r "/proc/$pid/cmdline" ]
then
  command -v tr >/dev/null 2>&1 || {
    runtime_error process-cmdline-tool-unavailable
    exit 40
  }
  process_title=$(LC_ALL=C tr '\000' ' ' < "/proc/$pid/cmdline") || {
    runtime_error process-cmdline-read-failed
    exit 41
  }
  while [ "$process_title" != "${process_title% }" ]
  do
    process_title=${process_title% }
  done
  [ -n "$process_title" ] || {
    runtime_error process-cmdline-empty
    exit 42
  }
elif [ -d "/proc/$pid" ]
then
  runtime_error process-cmdline-unreadable
  exit 43
elif [ -r /proc/self/cmdline ]
then
  runtime_error process-unobservable
  exit 37
else
  runtime_error process-inspector-unavailable
  exit 36
fi
case "$process_title" in
  'nginx: master process '*|'openresty: master process '*) : ;;
  *) runtime_error pid-not-nginx-master; exit 38 ;;
esac
case "$process_title" in
  *" -p $home -c $home/conf/nginx.conf"*|*" -p $home/ -c $home/conf/nginx.conf"*)
    : ;;
  *" -p $home -g daemon off;"|*" -p $home/ -g daemon off;"|\
  *" -p $home -g 'daemon off;'"|*" -p $home/ -g 'daemon off;'")
    # The official APISIX Docker entrypoint uses the default generated
    # conf/nginx.conf under -p and stays foreground using -g daemon off;.
    : ;;
  *) runtime_error master-prefix-mismatch; exit 39 ;;
esac

# Optional independent evidence from the host's actual systemd manager.
# Derive a unit only from kernel cgroup v2 membership, then cross-check it
# against active manager state and its independently reported main PID.
# This does not identify loaded APISIX source, Admin listener or write access.
# A Docker observer never queries a potentially host-mounted systemd manager.
service_unit=
if [ "$observation_scope" = host ] &&
   [ -r "/proc/$pid/cgroup" ] &&
   command -v sed >/dev/null 2>&1 &&
   command -v systemctl >/dev/null 2>&1
then
  process_group=$(LC_ALL=C sed -n 's/^0:://p' "/proc/$pid/cgroup") || process_group=
  case "$process_group" in
    /*) : ;;
    *) process_group= ;;
  esac
  if [ -n "$process_group" ]
  then
    service_unit=$(printf '%s\n' "$process_group" |
      LC_ALL=C sed -n 's@^.*/\([^/]*\.service\)\(/.*\)\{0,1\}$@\1@p') || service_unit=
    case "$service_unit" in
      ''|*[!a-zA-Z0-9_.@-]*) service_unit= ;;
    esac
  fi
  if [ -n "$service_unit" ]
  then
    properties=$(LC_ALL=C systemctl --no-pager show \
      --property=Id,MainPID,ControlGroup,ActiveState -- "$service_unit" 2>/dev/null) ||
      properties=
    match_id=0
    match_pid=0
    match_group=0
    match_active=0
    while IFS= read -r property
    do
      case "$property" in
        "Id=$service_unit") match_id=1 ;;
        "MainPID=$pid") match_pid=1 ;;
        "ActiveState=active") match_active=1 ;;
        ControlGroup=*)
          unit_group=${property#ControlGroup=}
          case "$unit_group" in
            ''|/) : ;;
            *) case "$process_group" in
                 "$unit_group"|"$unit_group"/*) match_group=1 ;;
               esac ;;
          esac
        ;;
      esac
    done <<RSUDO_APISIX_SYSTEMD_PROPERTIES
$properties
RSUDO_APISIX_SYSTEMD_PROPERTIES
    [ "$match_id" -eq 1 ] && [ "$match_pid" -eq 1 ] &&
      [ "$match_group" -eq 1 ] && [ "$match_active" -eq 1 ] ||
      service_unit=
  fi
fi

# Optional Linux kernel proof for the conventional loopback TCP endpoint.
# Use the observed master's OWN network namespace and FD table; seeing port
# 9180 elsewhere in the namespace is NOT evidence that this master owns it.
# One unique listening socket inode is required. Missing tools, permissions,
# IPv6-only listeners or multiple inodes simply leave the field absent.
# This is a TCP ownership observation, NOT an Admin HTTP identity check.
listener_socket=
if [ -r "/proc/$pid/net/tcp" ] && [ -d "/proc/$pid/fd" ] &&
   command -v awk >/dev/null 2>&1 &&
   command -v readlink >/dev/null 2>&1
then
  listener_inode=$(LC_ALL=C awk '$2=="0100007F:23DC" && $4=="0A" {print $10}' \
    "/proc/$pid/net/tcp" 2>/dev/null) || listener_inode=
  case "$listener_inode" in
    ''|*[!0-9]*) : ;;
    *)
      for fd in "/proc/$pid/fd/"*
      do
        [ -L "$fd" ] || continue
        fd_target=$(readlink "$fd" 2>/dev/null) || continue
        if [ "$fd_target" = "socket:[$listener_inode]" ]
        then
          listener_socket=127.0.0.1:9180
          break
        fi
      done
    ;;
  esac
fi

printf 'runtime_evidence=pidfile-and-master-args\nprocess_pid=%s\n' "$pid"
if [ -n "$service_unit" ]
then
  printf 'service_manager_evidence=systemd-mainpid-and-cgroup\nservice_unit=%s\n' "$service_unit"
fi
if [ -n "$listener_socket" ]
then
  printf 'listener_socket_evidence=master-fd-loopback-tcp\nlistener_socket=%s\n' "$listener_socket"
fi
printf 'runtime_identity=process-consistent-config-unverified\nmutation_readiness=not-established\n'
RSUDO_APISIX_RUNTIME_REMOTE
}

# Read-only, best-effort discovery of APISIX's conventional installation.
# Only observed generated-config candidates are considered. This cannot
# enumerate arbitrary installation roots, container images or service managers.
# All selection and ambiguity decisions happen on the remote host.
_rsudo_mod_apisix_runtime_discover()
(
  RSUDO_INTERACTIVE=
  rsudo sh -s <<'RSUDO_APISIX_RUNTIME_DISCOVER'
discovery_error()
{
  printf 'apisix.runtime.%s\n' "$1" >&2
}

home=/usr/local/apisix
candidate_count=0
selected=
if [ -f "$home/conf/nginx.conf" ] && [ -r "$home/conf/nginx.conf" ] &&
   [ ! -L "$home/conf/nginx.conf" ]
then
  candidate_count=1
  selected=host
elif [ -e "$home/conf/nginx.conf" ] || [ -L "$home/conf/nginx.conf" ]
then
  discovery_error host-generated-config-unsafe
  exit 55
fi

# Best-effort Linux host-namespace master discovery. Only same PID and mount
# namespace processes qualify; Docker/private service namespaces must not be
# mistaken for the remote host. This does not authenticate loaded APISIX source.
# Absence of procfs or readlink preserves the conventional host-only behavior.
if [ -r /proc/self/cmdline ] &&
   command -v tr >/dev/null 2>&1 &&
   command -v readlink >/dev/null 2>&1
then
  host_pid_ns=$(readlink /proc/self/ns/pid 2>/dev/null) || {
    discovery_error host-namespace-unobservable
    exit 66
  }
  host_mnt_ns=$(readlink /proc/self/ns/mnt 2>/dev/null) || {
    discovery_error host-namespace-unobservable
    exit 66
  }
  host_master_count=0
  host_master_home=
  for cmdline in /proc/[0-9]*/cmdline
  do
    [ -r "$cmdline" ] || continue
    process_dir=${cmdline%/cmdline}
    process_pid_ns=$(readlink "$process_dir/ns/pid" 2>/dev/null) || continue
    [ "$process_pid_ns" = "$host_pid_ns" ] || continue
    process_mnt_ns=$(readlink "$process_dir/ns/mnt" 2>/dev/null) || continue
    [ "$process_mnt_ns" = "$host_mnt_ns" ] || continue
    title=$(LC_ALL=C tr '\000' ' ' < "$cmdline") || {
      discovery_error host-process-scan-failed
      exit 65
    }
    case "$title" in
      'nginx: master process '*|'openresty: master process '*)
        host_master_count=$((host_master_count + 1))
        [ "$host_master_count" -eq 1 ] || {
          discovery_error host-multiple-masters
          exit 64
        }
        set -f
        set -- $title
        host_master_home=
        while [ "$#" -ge 2 ]
        do
          if [ "$1" = -p ]
          then
            host_master_home=$2
            break
          fi
          shift
        done
        [ -n "$host_master_home" ] || {
          discovery_error host-master-prefix-unresolved
          exit 61
        }
      ;;
    esac
  done

  if [ "$host_master_count" -eq 1 ]
  then
    case "$host_master_home" in
      /*) : ;;
      *) discovery_error host-master-prefix-invalid; exit 61 ;;
    esac
    case "$host_master_home" in
      /|*[!a-zA-Z0-9._/-]*|*/../*|*/./*|*/..|*/.)
        discovery_error host-master-prefix-invalid
        exit 61
      ;;
    esac
    while [ "$host_master_home" != / ] &&
          [ "${host_master_home%/}" != "$host_master_home" ]
    do
      host_master_home=${host_master_home%/}
    done
    generated=$host_master_home/conf/nginx.conf
    if [ ! -e "$generated" ] && [ ! -L "$generated" ]
    then
      discovery_error host-master-generated-config-missing
      exit 62
    fi
    [ -f "$generated" ] && [ -r "$generated" ] &&
      [ ! -L "$generated" ] || {
      discovery_error host-master-generated-config-unsafe
      exit 63
    }
    candidate_count=1
    if [ "$host_master_home" = /usr/local/apisix ]
    then
      selected=host
    else
      selected="host $host_master_home"
    fi
  fi
fi

# A present but inaccessible Docker manager prevents claims of uniqueness.
# Absence of Docker is acceptable for an observed host candidate only.
if command -v docker >/dev/null 2>&1
then
  ids=$(docker ps --quiet --no-trunc) || {
    discovery_error docker-list-failed
    exit 46
  }
  while IFS= read -r id
  do
    [ -n "$id" ] || continue
    case "$id" in
      *[!0123456789abcdef]*)
        discovery_error docker-list-invalid-id
        exit 47
      ;;
    esac
    [ "${#id}" -eq 64 ] || {
      discovery_error docker-list-invalid-id
      exit 47
    }

    # Inspect a concrete running container. An observed master, including
    # a background master under a different namespace PID, advertises its -p
    # prefix; a stale conventional nginx.conf must not override that prefix.
    # This is process evidence, NOT loaded-source or listener attribution.
    # Only the static shell program below executes; the process title is
    # parsed as data and never interpolated into executable shell source.
    observed_home=$(docker exec "$id" sh -c '
      home=/usr/local/apisix
      from_master_prefix=0
      # Inspect all observable container processes, not only PID 1. A
      # background nginx/OpenResty master may run under a shell or supervisor.
      # This is a Linux procfs best-effort observation, never loaded-source
      # evidence; process arguments remain data rather than executable source.
      if [ -r /proc/1/cmdline ] && command -v tr >/dev/null 2>&1
      then
        master_count=0
        for cmdline in /proc/[0-9]*/cmdline
        do
          [ -r "$cmdline" ] || continue
          title=$(LC_ALL=C tr "\000" " " < "$cmdline") || exit 65
          case "$title" in
            "nginx: master process "*|"openresty: master process "*)
              master_count=$((master_count + 1))
              [ "$master_count" -eq 1 ] || exit 64
              set -f
              set -- $title
              prefix_found=0
              while [ "$#" -ge 2 ]
              do
                if [ "$1" = -p ]
                then
                  home=$2
                  from_master_prefix=1
                  prefix_found=1
                  break
                fi
                shift
              done
              [ "$prefix_found" -eq 1 ] || exit 62
            ;;
          esac
        done
      fi
      # Only safe absolute no-whitespace roots can be automatically selected.
      # Operators can still target other roots through the explicit API.
      case "$home" in
        /*) : ;;
        *) exit 62 ;;
      esac
      case "$home" in
        /|*[!a-zA-Z0-9._/-]*|*/../*|*/./*|*/..|*/.)
          exit 62
        ;;
      esac
      while [ "$home" != / ] && [ "${home%/}" != "$home" ]
      do
        home=${home%/}
      done
      file=$home/conf/nginx.conf
      if [ ! -e "$file" ] && [ ! -L "$file" ]
      then
        [ "$from_master_prefix" -eq 0 ] || exit 63
        exit 60
      fi
      if [ -f "$file" ] && [ -r "$file" ] && [ ! -L "$file" ]
      then
        printf "%s\n" "$home"
        exit 0
      fi
      exit 61
    ' 2>/dev/null)
    probe_status=$?
    case "$probe_status" in
      0)
        case "$observed_home" in
          /*) : ;;
          *) discovery_error docker-probe-result-invalid; exit 57 ;;
        esac
        candidate_count=$((candidate_count + 1))
        selected="docker $id $observed_home"
      ;;
      60) : ;;
      61)
        discovery_error docker-generated-config-unsafe
        exit 53
      ;;
      62)
        discovery_error docker-process-prefix-invalid
        exit 56
      ;;
      63)
        discovery_error docker-master-generated-config-missing
        exit 58
      ;;
      64)
        discovery_error docker-multiple-masters
        exit 59
      ;;
      65)
        discovery_error docker-process-scan-failed
        exit 60
      ;;
      *)
        discovery_error docker-probe-failed
        exit 52
      ;;
    esac
  done <<RSUDO_APISIX_RUNNING_IDS
$ids
RSUDO_APISIX_RUNNING_IDS
else
  [ "$candidate_count" -gt 0 ] || {
    discovery_error docker-unavailable
    exit 45
  }
fi

[ "$candidate_count" -gt 0 ] || {
  discovery_error candidate-unresolved
  exit 48
}
[ "$candidate_count" -eq 1 ] || {
  discovery_error candidates-ambiguous
  exit 49
}
printf '%s\n' "$selected"
RSUDO_APISIX_RUNTIME_DISCOVER
)

# Read-only APISIX master evidence. The optional immutable Docker ID targets
# one explicitly selected container namespace through the remote manager.
# This does not identify the source config or authorize any API mutation.
rsudo_mod_apisix_runtime()
(
  [ "$#" -le 2 ] || {
    log error apisix runtime-invalid-arguments count "$#"
    exit 30
  }
  RSUDO_INTERACTIVE=

  # Zero-argument normal path: discover a unique conventional installation
  # candidate, recheck the real master in its selected namespace, and emit
  # discovery provenance only after successful process observation.
  if [ "$#" -eq 0 ]
  then
    selected=$(_rsudo_mod_apisix_runtime_discover)
    status=$?
    [ "$status" -eq 0 ] || exit "$status"
    case "$selected" in
      host)
        observation=$(_rsudo_mod_apisix_runtime_remote_source |
          rsudo sh -s -- /usr/local/apisix host)
        status=$?
        [ "$status" -eq 0 ] || exit "$status"
        scope=host
      ;;
      'host '*)
        selected_home=${selected#host }
        case "$selected_home" in
          /*) : ;;
          *) log error apisix runtime-discovery-host-home-invalid; exit 67 ;;
        esac
        case "$selected_home" in
          /|*[!a-zA-Z0-9._/-]*|*/../*|*/./*|*/..|*/.)
            log error apisix runtime-discovery-host-home-invalid
            exit 67
          ;;
        esac
        observation=$(_rsudo_mod_apisix_runtime_remote_source |
          rsudo sh -s -- "$selected_home" host)
        status=$?
        [ "$status" -eq 0 ] || exit "$status"
        scope=host
      ;;
      'docker '*)
        selected_detail=${selected#docker }
        container=${selected_detail%% *}
        selected_home=${selected_detail#* }
        case "$container" in
          *[!0123456789abcdef]*)
            log error apisix runtime-discovery-result-invalid
            exit 50
          ;;
        esac
        [ "${#container}" -eq 64 ] || {
          log error apisix runtime-discovery-result-invalid
          exit 50
        }
        case "$selected_home" in
          /*) : ;;
          *) log error apisix runtime-discovery-home-invalid; exit 57 ;;
        esac
        case "$selected_home" in
          /|*[!a-zA-Z0-9._/-]*|*/../*|*/./*|*/..|*/.)
            log error apisix runtime-discovery-home-invalid
            exit 57
          ;;
        esac
        observation=$(_rsudo_mod_apisix_runtime_remote_source |
          rsudo docker exec -i "$container" sh -s -- "$selected_home")
        status=$?
        [ "$status" -eq 0 ] || exit "$status"
        scope=docker
      ;;
      *)
        log error apisix runtime-discovery-result-invalid
        exit 50
      ;;
    esac

    # A discovered configuration file is not evidence of a running master.
    # The explicit selector intentionally retains its pidfile-missing result;
    # zero-operand discovery must not turn that into a successful instance.
    case "$observation" in
      *'runtime_evidence=pidfile-and-master-args'*'runtime_identity=process-consistent-config-unverified'*) : ;;
      *'runtime_evidence=pidfile-missing'*)
        log error apisix runtime-discovered-master-unverified scope "$scope"
        exit 51
      ;;
      *)
        log error apisix runtime-discovery-observation-invalid scope "$scope"
        exit 54
      ;;
    esac
    if [ -n "${selected_home:-}" ] &&
       [ "$selected_home" != /usr/local/apisix ]
    then
      printf 'discovery_evidence=unique-process-prefix-candidate\ndiscovered_scope=%s\n' "$scope"
      [ "$scope" != docker ] || printf 'container_id=%s\n' "$container"
      printf 'installation_root=%s\n' "$selected_home"
    else
      printf 'discovery_evidence=unique-conventional-candidate\ndiscovered_scope=%s\n' "$scope"
      [ "$scope" != docker ] || printf 'container_id=%s\n' "$container"
    fi
    printf '%s\n' "$observation"
    exit 0
  fi

  case "$1" in
    /*) : ;;
    *) log error apisix runtime-invalid-home; exit 31 ;;
  esac

  if [ "$#" -eq 1 ]
  then
    _rsudo_mod_apisix_runtime_remote_source | rsudo sh -s -- "$1" host
  else
    # Never let a user-supplied Docker option, mutable name or abbreviated
    # ID choose the target. Docker's full 64-hex identity is immutable.
    container=$2
    case "$container" in
      *[!0123456789abcdef]*)
        log error apisix runtime-invalid-container-id
        exit 44
      ;;
    esac
    [ "${#container}" -eq 64 ] || {
      log error apisix runtime-invalid-container-id
      exit 44
    }

    # docker exec -i carries the static source on stdin. Its container ID
    # resolves the process and mount namespaces; the program still checks
    # the expected APISIX home, pidfile and master arguments inside them.
    _rsudo_mod_apisix_runtime_remote_source |
      rsudo docker exec -i "$container" sh -s -- "$1"
  fi
)

# Advanced read-only Admin API request over the existing rsudo transport.
# The credential is an existing protected file on the remote host containing
# exactly "X-API-KEY: <key>\n". Curl reads it using -H @file: the key never
# appears in shell source, command argv, normal diagnostics or local state.
# This does not infer the active backend; /configs is standalone API-driven,
# whereas collection GETs are available on traditional/control-plane modes.
rsudo_mod_apisix_admin_read()
(
  [ "$#" -ge 2 ] && [ "$#" -le 3 ] || {
    log error apisix admin-read-invalid-arguments count "$#"
    exit 44
  }
  case "$1" in
    configs|routes|services|upstreams) : ;;
    *) log error apisix admin-read-unsupported-resource; exit 45 ;;
  esac
  case "$2" in
    /*) : ;;
    *) log error apisix admin-read-invalid-credential-path; exit 46 ;;
  esac
  case "${3:-9180}" in
    ''|*[!0-9]*) log error apisix admin-read-invalid-port; exit 50 ;;
  esac
  [ "${3:-9180}" -ge 1 ] 2>/dev/null && [ "${3:-9180}" -le 65535 ] 2>/dev/null || {
    log error apisix admin-read-invalid-port
    exit 50
  }

  RSUDO_INTERACTIVE=
  rsudo sh -s -- "$1" "$2" "${3:-9180}" <<'RSUDO_APISIX_ADMIN_READ_REMOTE'
resource=$1
credential_file=$2
port=$3

admin_read_error()
{
  printf 'apisix.admin-read.%s\n' "$1" >&2
}

# Validate again in the privileged remote execution context.
case "$resource" in
  configs|routes|services|upstreams) : ;;
  *) admin_read_error unsupported-resource; exit 45 ;;
esac
case "$credential_file" in
  /*) : ;;
  *) admin_read_error invalid-credential-path; exit 46 ;;
esac
case "$port" in
  ''|*[!0-9]*) admin_read_error invalid-port; exit 50 ;;
esac
[ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null || {
  admin_read_error invalid-port
  exit 50
}

# A caller must explicitly provision and protect a single-header file.
# Never follow a symbolic link or accept group/world-readable credentials.
[ -f "$credential_file" ] && [ -r "$credential_file" ] &&
  [ ! -L "$credential_file" ] || {
  admin_read_error credential-file-unavailable
  exit 47
}
file_mode=$(LC_ALL=C ls -ld "$credential_file" 2>/dev/null) || {
  admin_read_error credential-permissions-unavailable
  exit 48
}
file_mode=${file_mode%% *}
case "$file_mode" in
  ????------) : ;;
  *) admin_read_error credential-permissions-insecure; exit 48 ;;
esac

# Only one newline-terminated header is permitted. Reading into a private
# shell variable is solely for validation; no secret is passed to a command
# or printed. The file itself is passed to curl via the @file syntax.
[ "$(wc -l < "$credential_file")" -eq 1 ] 2>/dev/null || {
  admin_read_error credential-header-invalid
  exit 49
}
IFS= read -r credential_header < "$credential_file" || {
  admin_read_error credential-header-invalid
  exit 49
}
case "$credential_header" in
  'X-API-KEY: '?*) : ;;
  *) admin_read_error credential-header-invalid; exit 49 ;;
esac
# Reject embedded NUL/control bytes skipped by some POSIX read variants:
# curl must read exactly the one validated header plus its final newline.
expected_bytes=$(printf '%s\n' "$credential_header" | wc -c) || exit 49
actual_bytes=$(wc -c < "$credential_file") || exit 49
[ "$expected_bytes" -eq "$actual_bytes" ] 2>/dev/null || {
  admin_read_error credential-header-bytes-invalid
  exit 49
}
credential_value=${credential_header#X-API-KEY: }
case "$credential_value" in
  ''|*[![:graph:]]*) admin_read_error credential-header-invalid; exit 49 ;;
esac
unset credential_header credential_value file_mode

command -v curl >/dev/null 2>&1 || {
  admin_read_error curl-unavailable
  exit 51
}

# Only loopback HTTP is allowed; -q disables .curlrc, --noproxy / --proxy
# prevent environment proxy settings, and redirects are never followed.
# Curl's HTTP failure status is preserved (22), with no error-body leak.
url=http://127.0.0.1:$port/apisix/admin/$resource
curl -q --silent --show-error --fail --noproxy '*' --proxy '' \
  --proto '=http' --max-redirs 0 --connect-timeout 3 --max-time 15 \
  --header "@$credential_file" --header 'Accept: application/json' \
  --url "$url"
RSUDO_APISIX_ADMIN_READ_REMOTE
)

# Operator-facing, read-only inventory. This first increment covers the host
# filesystem and process list, without selecting an APISIX instance.
_rsudo_mod_apisix_discovery_host_source()
{
  cat <<'RSUDO_APISIX_DISCOVERY_HOST_REMOTE'
scan_root=$1
case "$scan_root" in
  /*) : ;;
  *) printf '%s\n' 'apisix.discovery.invalid-scan-root' >&2; exit 1 ;;
esac
[ -d "$scan_root" ] && [ -r "$scan_root" ] || {
  printf '%s\n' 'apisix.discovery.scan-root-unavailable' >&2
  exit 2
}
command -v find >/dev/null 2>&1 || {
  printf '%s\n' 'apisix.discovery.find-unavailable' >&2
  exit 3
}

# Process observations are optional, and never printed as raw command lines.
ps_snapshot=
if command -v ps >/dev/null 2>&1
then
  ps_snapshot=$(ps -eo pid=,args= 2>/dev/null) || ps_snapshot=
fi
printf 'kind\tscope\tstate\tidentifier\tevidence\n'
printf '%s\n' "$ps_snapshot" | awk '
  /^[[:space:]]*[0-9]+[[:space:]]+nginx: master process/ && /apisix/ {
    pid=$1
    if (pid ~ /^[0-9]+$/)
      printf "process\thost\tprocess-candidate\t%s\tps-master-args\n", pid
  }
'

# systemd is optional. Unit names and states are evidence only; descriptions
# are inspected for matching but never copied to discovery output.
if command -v systemctl >/dev/null 2>&1
then
  systemd_units=$(systemctl list-units --all --type=service --no-legend \
    --no-pager --plain 2>/dev/null)
  systemd_status=$?
  if [ "$systemd_status" -eq 0 ]
  then
    printf '%s\n' "$systemd_units" | awk '
      tolower($0) ~ /apisix/ && NF >= 4 {
        state=$3
        if (state !~ /^(active|inactive|failed|activating|deactivating)$/)
          state="unknown"
        printf "service\thost\t%s\t%s\tsystemd-loaded-unit\n", state, $1
      }
    '
    loaded_apisix_units=$(printf '%s\n' "$systemd_units" | awk '
      tolower($0) ~ /apisix/ && NF >= 4 { print $1 }
    ')
    while IFS= read -r unit
    do
      [ -n "$unit" ] || continue
      unit_properties=$(systemctl show --property=Id,MainPID,ControlGroup,ActiveState \
        -- "$unit" 2>/dev/null) || continue
      unit_id=$(printf '%s\n' "$unit_properties" | awk -F= '$1=="Id" {print $2}')
      unit_pid=$(printf '%s\n' "$unit_properties" | awk -F= '$1=="MainPID" {print $2}')
      unit_group=$(printf '%s\n' "$unit_properties" | awk -F= '$1=="ControlGroup" {print $2}')
      unit_active=$(printf '%s\n' "$unit_properties" | awk -F= '$1=="ActiveState" {print $2}')
      [ "$unit_id" = "$unit" ] && [ "$unit_active" = active ] || continue
      case "$unit_pid" in ''|*[!0123456789]*) continue ;; esac
      [ "$unit_pid" -gt 0 ] 2>/dev/null || continue
      printf '%s\n' "$ps_snapshot" | awk -v wanted="$unit_pid" '
        $1 == wanted && /nginx: master process/ && /apisix/ {found=1}
        END {exit !found}
      ' || continue
      service_evidence=systemd-mainpid-and-ps
      if [ -r "/proc/$unit_pid/cgroup" ] && [ -n "$unit_group" ]
      then
        process_group=$(awk -F: '$1=="0" {print $3; exit}' \
          "/proc/$unit_pid/cgroup" 2>/dev/null)
        [ "$process_group" = "$unit_group" ] && \
          service_evidence=systemd-mainpid-cgroup-and-ps
      fi
      printf 'service\thost\tactive-mainpid-match\t%s\t%s-pid-%s\n' \
        "$unit" "$service_evidence" "$unit_pid"
    done <<RSUDO_APISIX_LOADED_APISIX_UNITS
$loaded_apisix_units
RSUDO_APISIX_LOADED_APISIX_UNITS
  else
    printf 'service-manager\thost\tunavailable\tsystemd\tunit-list-failed\n'
  fi
  systemd_files=$(systemctl list-unit-files --type=service --no-legend \
    --no-pager 2>/dev/null)
  systemd_files_status=$?
  if [ "$systemd_files_status" -eq 0 ]
  then
    printf '%s\n' "$systemd_files" | awk '
      tolower($1) ~ /apisix/ && NF >= 2 {
        printf "service\thost\t%s\t%s\tsystemd-unit-file\n", $2, $1
      }
    '
  else
    printf 'service-manager\thost\tpartial\tsystemd\tunit-file-list-failed\n'
  fi
fi

# Extract only numeric ports nested beneath the YAML admin_listen mapping.
# This deliberately avoids generic "port:" matches (for example etcd).
admin_listen_ports()
{
  awk '
    function indent(s, t) {
      t=s
      sub(/[^ ].*$/, "", t)
      return length(t)
    }
    function emit() {
      if (ip ~ /^[0-9.]+$/ && port ~ /^[0-9]+$/)
        print ip "|" port
      ip=""
      port=""
    }
    /^[[:space:]]*#/ { next }
    {
      line=$0
      if (line ~ /^[[:space:]]*admin_listen:[[:space:]]*$/) {
        if (active) emit()
        active=1
        base=indent(line)
        ip=""
        port=""
        next
      }
      if (active) {
        level=indent(line)
        if (level <= base) {
          emit()
          active=0
        } else {
          item=line
          sub(/^[[:space:]]*/, "", item)
          if (item ~ /^ip:[[:space:]]*[0-9.]+([[:space:]#]|$)/) {
            sub(/^ip:[[:space:]]*/, "", item)
            sub(/[[:space:]#].*$/, "", item)
            ip=item
          }
          if (item ~ /^port:[[:space:]]*[0-9]+([[:space:]#]|$)/) {
            sub(/^port:[[:space:]]*/, "", item)
            sub(/[[:space:]#].*$/, "", item)
            port=item
          }
          next
        }
      }
    }
    END { if (active) emit() }
  ' "$1" 2>/dev/null
}

# Use the RumiAI json utility when it is installed on the remote target. Never
# copy configuration contents back across rsudo merely to parse them locally.
admin_listen_json_ports()
{
  command -v json >/dev/null 2>&1 || return 4
  json --check "$1" >/dev/null 2>&1 || return 5
  values=$(json -r '.deployment?.admin?.admin_listen?.ip?, .deployment?.admin?.admin_listen?.port?' "$1" 2>/dev/null) || return 5
  bind_ip=$(printf '%s\n' "$values" | sed -n '1p')
  port=$(printf '%s\n' "$values" | sed -n '2p')
  case "$bind_ip:$port" in null:null|:) return 0 ;; esac
  case "$bind_ip" in ''|*[!0123456789.]*|.*|*..*|*.) return 5 ;; esac
  case "$port" in ''|*[!0123456789]*) return 5 ;; esac
  [ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null || return 5
  printf '%s|%s\n' "$bind_ip" "$port"
}

probe_admin_listener()
{
  config_file=$1
  bind_ip=$2
  port=$3
  case "$port" in ''|*[!0123456789]*) return ;; esac
  [ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null || return
  probe_ip=
  evidence=config-admin-listen
  case "$bind_ip" in
    127.*) probe_ip=$bind_ip ;;
    0.0.0.0) probe_ip=127.0.0.1; evidence=config-admin-listen-wildcard-bind ;;
    *)
      if command -v ip >/dev/null 2>&1 &&
         ip -o -4 address show 2>/dev/null |
           awk -v wanted="$bind_ip" '{address=$4; sub(/\/.*/, "", address); if (address == wanted) found=1} END {exit !found}'
      then
        probe_ip=$bind_ip
      else
        printf 'listener\thost\tconfigured-unprobed\t%s:%s\tconfig-admin-listen-nonlocal:%s\n' \
          "$bind_ip" "$port" "$config_file"
        return
      fi
    ;;
  esac
  if command -v nc >/dev/null 2>&1
  then
    if nc -z -w 1 "$probe_ip" "$port" >/dev/null 2>&1
    then
      printf 'listener\thost\topen\t%s:%s\t%s-nc:%s\n' \
        "$probe_ip" "$port" "$evidence" "$config_file"
    else
      printf 'listener\thost\tnot-open\t%s:%s\t%s-nc:%s\n' \
        "$probe_ip" "$port" "$evidence" "$config_file"
    fi
  else
    printf 'listener\thost\tprobe-unavailable\t%s:%s\t%s-nc-missing:%s\n' \
      "$probe_ip" "$port" "$evidence" "$config_file"
  fi
}

# Best-effort filesystem scan; separate container discovery is a later phase.
find "$scan_root" \
  \( -type d \( -path /proc -o -path /sys -o -path /dev \
       -o -path /run -o -path /var/lib/docker \
       -o -path /var/lib/containers \) -prune \) -o \
  \( -type f \( -name config.yaml -o -name 'config-*.yaml' \
       -o -name apisix.yaml -o -name apisix.json \) -print \) \
  2>/dev/null |
while IFS= read -r file
do
  case "$file" in
    */conf/config.yaml|*/conf/config-*.yaml|*/conf/apisix.yaml|*/conf/apisix.json) : ;;
    *) continue ;;
  esac
  newline='
'
  tab=$(printf '\t')
  case "$file" in *"$tab"*|*"$newline"*) continue ;; esac
  home=${file%/conf/*}
  [ "$home" != "$file" ] || continue
  # Ignore unrelated config.yaml files unless installation evidence exists.
  if [ ! -f "$home/bin/apisix" ] &&
     [ ! -f "$home/conf/config-default.yaml" ] &&
     [ ! -f "$home/conf/nginx.conf" ]
  then
    case "$home" in */apisix|*/apache-apisix) : ;; *) continue ;; esac
  fi
  state=configured-only
  evidence=find-apisix-config
  if [ -n "$ps_snapshot" ] &&
     printf '%s\n' "$ps_snapshot" |
       grep -E '^[[:space:]]*[0-9]+[[:space:]]+nginx: master process' |
       grep -F -e "$home" >/dev/null 2>&1
  then
    state=process-prefix-candidate
    evidence=find-and-ps-prefix
  fi
  printf 'config\thost\t%s\t%s\t%s\n' "$state" "$file" "$evidence"
  case "$file" in *.yaml|*.json)
    case "$file" in
      *.yaml) admin_endpoints=$(admin_listen_ports "$file") ;;
      *.json)
        admin_endpoints=$(admin_listen_json_ports "$file")
        json_status=$?
        if [ "$json_status" -eq 4 ]; then
          printf 'listener\thost\tparser-unavailable\t%s\tjson-command-missing\n' "$file"
        elif [ "$json_status" -ne 0 ]; then
          printf 'listener\thost\tparse-failed\t%s\tjson-invalid-or-unsupported\n' "$file"
        fi
      ;;
    esac
    while IFS='|' read -r bind_ip admin_port
    do
      [ -n "$bind_ip" ] && [ -n "$admin_port" ] || continue
      probe_admin_listener "$file" "$bind_ip" "$admin_port"
    done <<RSUDO_APISIX_ADMIN_ENDPOINTS
$admin_endpoints
RSUDO_APISIX_ADMIN_ENDPOINTS
  ;; esac
done

# Probe configured admin_listen ports in the selected container's own network
# namespace. Both the container ID and path are positional data; the program
# sent to the container remains static shell source.
probe_container_admin_listeners()
(
  manager=$1
  container_id=$2
  config_file=$3
  case "$config_file" in /*) : ;; *) exit 1 ;; esac
  case "$config_file" in *[[:space:]\|]*) exit 1 ;; esac
  "$manager" exec -i "$container_id" sh -s -- "$config_file" 2>/dev/null <<'RSUDO_APISIX_CONTAINER_LISTENER_PROBE'
config_file=$1
[ -f "$config_file" ] && [ -r "$config_file" ] && [ ! -L "$config_file" ] || exit 2
case "$config_file" in
  *.json)
    command -v json >/dev/null 2>&1 || { printf '%s\n' 'parser-unavailable|||'; exit 0; }
    json --check "$config_file" >/dev/null 2>&1 || { printf '%s\n' 'parse-failed|||'; exit 0; }
    values=$(json -r '.deployment?.admin?.admin_listen?.ip?, .deployment?.admin?.admin_listen?.port?' "$config_file" 2>/dev/null) || { printf '%s\n' 'parse-failed|||'; exit 0; }
    bind_ip=$(printf '%s\n' "$values" | sed -n '1p')
    port=$(printf '%s\n' "$values" | sed -n '2p')
    case "$bind_ip:$port" in null:null|:) exit 0 ;; esac
    case "$bind_ip" in ''|*[!0123456789.]*|.*|*..*|*.) printf '%s\n' 'parse-failed|||'; exit 0 ;; esac
    case "$port" in ''|*[!0123456789]*) printf '%s\n' 'parse-failed|||'; exit 0 ;; esac
    [ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null || { printf '%s\n' 'parse-failed|||'; exit 0; }
    endpoints=$(printf '%s|%s\n' "$bind_ip" "$port")
  ;;
  *) endpoints=$(awk '
  function indent(s,t) { t=s; sub(/[^ ].*$/, "", t); return length(t) }
  function emit() { if (ip ~ /^[0-9.]+$/ && port ~ /^[0-9]+$/) print ip "|" port; ip=""; port="" }
  /^[[:space:]]*#/ { next }
  {
    line=$0
    if (line ~ /^[[:space:]]*admin_listen:[[:space:]]*$/) {
      if (active) emit()
      active=1; base=indent(line); ip=""; port=""; next
    }
    if (active) {
      level=indent(line)
      if (level <= base) { emit(); active=0 }
      else {
        item=line; sub(/^[[:space:]]*/, "", item)
        if (item ~ /^ip:[[:space:]]*[0-9.]+([[:space:]#]|$)/) { sub(/^ip:[[:space:]]*/, "", item); sub(/[[:space:]#].*$/, "", item); ip=item }
        if (item ~ /^port:[[:space:]]*[0-9]+([[:space:]#]|$)/) { sub(/^port:[[:space:]]*/, "", item); sub(/[[:space:]#].*$/, "", item); port=item }
        next
      }
    }
  }
  END { if (active) emit() }
' "$config_file" 2>/dev/null) || exit 3
  ;;
esac
while IFS='|' read -r bind_ip port
do
  case "$bind_ip" in parser-unavailable|parse-failed)
    printf '%s|||\n' "$bind_ip"
    continue
  ;; esac
  [ -n "$bind_ip" ] && [ -n "$port" ] || continue
  case "$port" in ''|*[!0123456789]*) continue ;; esac
  [ "$port" -ge 1 ] 2>/dev/null && [ "$port" -le 65535 ] 2>/dev/null || continue
  probe_ip=
  case "$bind_ip" in
    127.*) probe_ip=$bind_ip ;;
    0.0.0.0) probe_ip=127.0.0.1 ;;
    *)
      if command -v ip >/dev/null 2>&1 && ip -o -4 address show 2>/dev/null |
         awk -v wanted="$bind_ip" '{address=$4; sub(/\/.*/, "", address); if (address == wanted) found=1} END {exit !found}'
      then probe_ip=$bind_ip
      else printf 'configured-unprobed|%s|%s|%s\n' "$bind_ip" "$port" "$bind_ip"; continue
      fi
    ;;
  esac
  if command -v nc >/dev/null 2>&1
  then nc -z -w 1 "$probe_ip" "$port" >/dev/null 2>&1 && state=open || state=not-open
  else state=probe-unavailable
  fi
  printf '%s|%s|%s|%s\n' "$state" "$probe_ip" "$port" "$bind_ip"
done <<RSUDO_APISIX_CONTAINER_LISTENER_ENDPOINTS
$endpoints
RSUDO_APISIX_CONTAINER_LISTENER_ENDPOINTS
RSUDO_APISIX_CONTAINER_LISTENER_PROBE
)

# Container managers are optional. Inventory all known states, including
# stopped containers; inspect running containers through a fixed read-only
# shell program. Container IDs are validated before being used as operands.
for manager in docker podman
do
  command -v "$manager" >/dev/null 2>&1 || continue
  manager_scope=$manager
  container_snapshot=$("$manager" ps -a --no-trunc \
    --format '{{.ID}}|{{.Names}}|{{.State}}|{{.Image}}' 2>/dev/null)
  manager_status=$?
  if [ "$manager_status" -ne 0 ]
  then
    printf 'manager\t%s\tunavailable\t%s\tcontainer-list-failed\n' \
      "$manager_scope" "$manager"
    continue
  fi
  manager_incomplete=0
  while IFS='|' read -r container_id container_name container_state container_image
  do
    [ -n "$container_id" ] || continue
    case "$container_id" in
      *[!0123456789abcdef]*|'')
        manager_incomplete=1
        continue
      ;;
    esac
    [ "${#container_id}" -eq 64 ] || {
      manager_incomplete=1
      continue
    }
    candidate_hint=0
    hint=$(printf '%s %s\n' "$container_name" "$container_image" |
      LC_ALL=C tr '[:upper:]' '[:lower:]' 2>/dev/null)
    case "$hint" in *apisix*) candidate_hint=1 ;; esac
    case "$container_state" in
      running) : ;;
      *)
        if [ "$candidate_hint" -eq 1 ]
        then
          printf 'container\t%s\t%s\t%s\tmanager-image-name-candidate\n' \
            "$manager_scope" "$container_state" "$container_id"
        fi
        mount_snapshot=$("$manager" inspect --format \
          '{{range .Mounts}}{{printf "%s|%s\n" .Source .Destination}}{{end}}' \
          "$container_id" 2>/dev/null)
        mount_status=$?
        if [ "$mount_status" -ne 0 ]
        then
          manager_incomplete=1
          printf 'container\t%s\tprobe-unavailable\t%s\tmanager-mount-inspect-failed\n' \
            "$manager_scope" "$container_id"
          continue
        fi
        while IFS='|' read -r mount_source mount_destination
        do
          [ -n "$mount_source" ] && [ -n "$mount_destination" ] || continue
          mount_tab=$(printf '\t')
          mount_newline='
'
          case "$mount_source:$mount_destination" in
            *"$mount_tab"*|*"$mount_newline"*|*'|'*) manager_incomplete=1; continue ;;
          esac
          case "$mount_source:$mount_destination" in
            */conf/config.yaml:*|*/conf/config-*.yaml:*|*/conf/apisix.yaml:*|*/conf/apisix.json:*|\
            *:*apisix/conf|*:*apisix/conf/|*:/conf/config.yaml|*:/conf/config-*.yaml|*:/conf/apisix.yaml|*:/conf/apisix.json)
              printf 'container\t%s\t%s\t%s:%s\tmanager-inspect-config-mount-candidate:source=%s\n' \
                "$manager_scope" "$container_state" "$container_id" "$mount_destination" "$mount_source"
            ;;
          esac
        done <<RSUDO_APISIX_STOPPED_MOUNTS
$mount_snapshot
RSUDO_APISIX_STOPPED_MOUNTS
        continue
      ;;
    esac

    container_configs=$("$manager" exec -i "$container_id" sh -s 2>/dev/null <<'RSUDO_APISIX_CONTAINER_FIND'
find / \( -path /proc -o -path /sys -o -path /dev -o -path /run \
    -o -path /var/lib/docker -o -path /var/lib/containers \) -prune -o \
  -type f \( -name config.yaml -o -name 'config-*.yaml' \
    -o -name apisix.yaml -o -name apisix.json \) -print 2>/dev/null |
while IFS= read -r path
do
  case "$path" in
    */conf/config.yaml|*/conf/config-*.yaml|*/conf/apisix.yaml|*/conf/apisix.json)
      printf '%s\n' "$path"
    ;;
  esac
done
RSUDO_APISIX_CONTAINER_FIND
    )
    container_status=$?
    if [ "$container_status" -ne 0 ]
    then
      manager_incomplete=1
      if [ "$candidate_hint" -eq 1 ]
      then
        printf 'container\t%s\tprobe-unavailable\t%s\tmanager-image-name-candidate\n' \
          "$manager_scope" "$container_id"
      fi
      continue
    fi
    if [ -n "$container_configs" ]
    then
      printf 'container\t%s\trunning\t%s\tcontainer-config-candidate\n' \
        "$manager_scope" "$container_id"
      while IFS= read -r container_file
      do
        case "$container_file" in
          *[[:space:]\|]*) manager_incomplete=1; continue ;;
        esac
        printf 'config\t%s\tconfigured-only\t%s:%s\t%s-exec-find\n' \
          "$manager_scope" "$container_id" "$container_file" "$manager_scope"
        case "$container_file" in *.yaml|*.json)
          listener_results=$(probe_container_admin_listeners \
            "$manager" "$container_id" "$container_file")
          listener_status=$?
          if [ "$listener_status" -ne 0 ]
          then
            manager_incomplete=1
            printf 'listener\t%s\tprobe-unavailable\t%s:%s\t%s-container-probe-failed\n' \
              "$manager_scope" "$container_id" "$container_file" "$manager_scope"
          else
            while IFS='|' read -r probe_state probe_ip admin_port bind_ip
            do
              [ -n "$probe_state" ] || continue
              case "$probe_state" in parser-unavailable|parse-failed)
                manager_incomplete=1
                printf 'listener\t%s\t%s\t%s:%s\t%s-json-parser-evidence\n' \
                  "$manager_scope" "$probe_state" "$container_id" "$container_file" "$manager_scope"
                continue
              ;; esac
              printf 'listener\t%s\t%s\t%s:%s:%s\t%s-container-admin-listen-bind-%s-config:%s\n' \
                "$manager_scope" "$probe_state" "$container_id" "$probe_ip" "$admin_port" \
                "$manager_scope" "$bind_ip" "$container_file"
            done <<RSUDO_APISIX_CONTAINER_LISTENER_RESULTS
$listener_results
RSUDO_APISIX_CONTAINER_LISTENER_RESULTS
          fi
        ;; esac
      done <<RSUDO_APISIX_CONTAINER_CONFIGS
$container_configs
RSUDO_APISIX_CONTAINER_CONFIGS
    elif [ "$candidate_hint" -eq 1 ]
    then
      printf 'container\t%s\trunning-unverified\t%s\tmanager-image-name-candidate\n' \
        "$manager_scope" "$container_id"
    fi
  done <<RSUDO_APISIX_CONTAINER_LIST
$container_snapshot
RSUDO_APISIX_CONTAINER_LIST
  [ "$manager_incomplete" -eq 0 ] ||
    printf 'manager\t%s\tpartial\t%s\tcontainer-probes-incomplete\n' \
      "$manager_scope" "$manager"
done
RSUDO_APISIX_DISCOVERY_HOST_REMOTE
}

# First milestone: return multiple candidates, never require uniqueness.
# A single optional absolute argument limits the remote filesystem scan.
rsudo_mod_apisix_discovery()
(
  [ "$#" -le 1 ] || {
    log error apisix discovery-invalid-arguments count "$#"
    exit 1
  }
  scan_root=${1:-/}
  case "$scan_root" in
    /*) : ;;
    *) log error apisix discovery-invalid-scan-root; exit 2 ;;
  esac
  RSUDO_INTERACTIVE=
  _rsudo_mod_apisix_discovery_host_source | rsudo sh -s -- "$scan_root"
)

# Operator-selected dispatch identity. No guessing from on-disk files and
# no legacy fallback. Backends still require implementation and validation.
_rsudo_mod_apisix_selected_adapter()
{
  case "$1" in
    traditional-admin) printf '%s\n' rest ;;
    standalone-api) printf '%s\n' snapshot ;;
    standalone-file-yaml) printf '%s\n' file-yaml ;;
    standalone-file-json) printf '%s\n' file-json ;;
    no-admin-data-plane) printf '%s\n' none ;;
    *) return 1 ;;
  esac
}

# Parse the caller's explicit selection without performing discovery, remote
# probes, credential acquisition or modifications. Never print secret values.
rsudo_mod_apisix_context()
(
  [ "$#" -eq 0 ] || { log error apisix context-invalid-arguments; exit 1; }
  scope=${RSUDO_APISIX_SCOPE-}
  deployment=${RSUDO_APISIX_DEPLOYMENT-}
  home=${RSUDO_APISIX_HOME-}
  container=${RSUDO_APISIX_CONTAINER_ID-}
  data_file=${RSUDO_APISIX_DATA_FILE-}
  admin_url=${RSUDO_APISIX_ADMIN_URL-}
  header_file=${RSUDO_APISIX_HEADER_FILE-}
  case "$scope" in
    host|docker|podman) : ;;
    *) log error apisix context-invalid-scope; exit 2 ;;
  esac
  adapter=$(_rsudo_mod_apisix_selected_adapter "$deployment") || {
    log error apisix context-unsupported-deployment
    exit 3
  }
  if [ -n "$home" ]
  then
    case "$home" in
      /*) : ;;
      *) log error apisix context-invalid-home; exit 4 ;;
    esac
  fi
  if [ "$scope" = host ]
  then
    [ -z "$container" ] || {
      log error apisix context-container-on-host
      exit 5
    }
  else
    case "$container" in
      *[!0123456789abcdef]*) log error apisix context-invalid-container-id-characters; exit 6 ;;
    esac
    [ "${#container}" -eq 64 ] || {
      log error apisix context-invalid-container-id-length
      exit 7
    }
  fi
  if [ "$adapter" = file-yaml ] || [ "$adapter" = file-json ]
  then
    case "$data_file" in
      /*) : ;;
      *) log error apisix context-data-file-required; exit 8 ;;
    esac
  fi
  if [ "$adapter" = rest ] || [ "$adapter" = snapshot ]
  then
    case "$admin_url" in
      http://*|https://*) : ;;
      *) log error apisix context-admin-url-required; exit 9 ;;
    esac
    case "$header_file" in
      /*) : ;;
      *) log error apisix context-header-file-required; exit 10 ;;
    esac
  fi
  # Never let a newline or tab in any displayed operator value forge a field.
  newline='
'
  tab=$(printf '\t')
  for value in "$home" "$data_file" "$admin_url" "$header_file"
  do
    case "$value" in
      *"$newline"*|*"$tab"*) log error apisix context-invalid-field; exit 11 ;;
    esac
  done
  printf 'selection=operator-supplied-unverified\nscope=%s\ndeployment=%s\nadapter=%s\n' \
    "$scope" "$deployment" "$adapter"
  [ -z "$home" ] || printf 'installation_root=%s\n' "$home"
  [ -z "$container" ] || printf 'container_id=%s\n' "$container"
  [ -z "$data_file" ] || printf 'data_file=%s\n' "$data_file"
  [ -z "$admin_url" ] || printf 'admin_url=configured-not-verified\n'
  if [ -n "$header_file" ]
  then
    printf 'credential_file=configured-not-verified\n'
  else
    printf 'credential_file=not-configured\n'
  fi
)

# Static remote read transport. Caller values remain positional data; the
# Admin key is read only by curl from a pre-provisioned protected file.
_rsudo_mod_apisix_rest_read_remote_source()
{
  cat <<'RSUDO_APISIX_REST_READ_REMOTE'
admin_url=$1
header_file=$2
resource=$3
resource_id=$4

rest_read_error()
{
  printf 'apisix.rest-read.%s\n' "$1" >&2
}

case "$admin_url" in
  http://*|https://*) : ;;
  *) rest_read_error invalid-admin-url; exit 84 ;;
esac
authority=${admin_url#*://}
case "$authority" in
  ''|*/*|*\?*|*\#*|*@*|*[!a-zA-Z0-9:._-]*)
    rest_read_error invalid-admin-authority
    exit 84
  ;;
esac
case "$resource" in routes|services|upstreams|configs) : ;; *) rest_read_error unsupported-resource; exit 85 ;; esac
case "$resource_id" in
  '') : ;;
  *[!a-zA-Z0-9._~-]*|.|..) rest_read_error invalid-resource-id; exit 86 ;;
esac
case "$header_file" in /*) : ;; *) rest_read_error invalid-header-path; exit 87 ;; esac
[ -f "$header_file" ] && [ -r "$header_file" ] && [ ! -L "$header_file" ] || {
  rest_read_error header-unavailable
  exit 88
}
mode=$(LC_ALL=C ls -ld "$header_file" 2>/dev/null) || {
  rest_read_error header-mode-unavailable
  exit 89
}
mode=${mode%% *}
case "$mode" in ????------) : ;; *) rest_read_error header-mode-insecure; exit 90 ;; esac
[ "$(wc -l < "$header_file")" -eq 1 ] 2>/dev/null || {
  rest_read_error header-invalid
  exit 91
}
IFS= read -r header < "$header_file" || { rest_read_error header-invalid; exit 91; }
case "$header" in 'X-API-KEY: '?*) : ;; *) rest_read_error header-invalid; exit 91 ;; esac
expected=$(printf '%s\n' "$header" | wc -c) || exit 91
actual=$(wc -c < "$header_file") || exit 91
[ "$expected" -eq "$actual" ] 2>/dev/null || { rest_read_error header-invalid; exit 91; }
key=${header#X-API-KEY: }
case "$key" in ''|*[![:graph:]]*) rest_read_error header-invalid; exit 91 ;; esac
unset header key mode
command -v curl >/dev/null 2>&1 || { rest_read_error curl-unavailable; exit 92; }
url=$admin_url/apisix/admin/$resource
[ -z "$resource_id" ] || url=$url/$resource_id
curl -q --silent --show-error --fail --noproxy '*' --proxy '' \
  --proto '=http,https' --max-redirs 0 --connect-timeout 3 --max-time 15 \
  --header "@$header_file" --header 'Accept: application/json' --url "$url"
RSUDO_APISIX_REST_READ_REMOTE
}

_rsudo_mod_apisix_rest_read()
(
  operation=$1
  shift
  case "$operation:$#" in
    list:1) resource=$1; resource_id= ;;
    get:2) resource=$1; resource_id=$2 ;;
    *) log error apisix rest-read-invalid-arguments operation "$operation" count "$#"; exit 1 ;;
  esac
  case "$resource" in routes|services|upstreams) : ;; *) log error apisix rest-read-unsupported-resource resource "$resource"; exit 2 ;; esac
  context=$(rsudo_mod_apisix_context) || exit "$?"
  adapter=$(printf '%s\n' "$context" | sed -n 's/^adapter=//p')
  [ "$adapter" = rest ] || { log error apisix rest-read-adapter-unsupported adapter "$adapter"; exit 3; }
  scope=$(printf '%s\n' "$context" | sed -n 's/^scope=//p')
  [ "$scope" = host ] || { log error apisix rest-read-scope-unsupported scope "$scope"; exit 4; }
  admin_url=${RSUDO_APISIX_ADMIN_URL-}
  header_file=${RSUDO_APISIX_HEADER_FILE-}
  # rsudo may record command arguments. Validate the URL locally before it is
  # passed as positional data so credentials can never hide in URL userinfo.
  case "$admin_url" in
    http://*|https://*) authority=${admin_url#*://} ;;
    *) log error apisix rest-read-invalid-admin-url; exit 5 ;;
  esac
  case "$authority" in
    ''|*/*|*\?*|*\#*|*@*|*[!a-zA-Z0-9:._-]*)
      log error apisix rest-read-invalid-admin-authority
      exit 5
    ;;
  esac
  RSUDO_INTERACTIVE=
  _rsudo_mod_apisix_rest_read_remote_source |
    rsudo sh -s -- "$admin_url" "$header_file" "$resource" "$resource_id"
)

# The operator selects a JSON data file explicitly. Its bytes cross the remote
# transport only into a private local staging directory, where the standalone
# RumiAI json utility selects resource records. No remote m/json installation
# is required, and no file is modified.
_rsudo_mod_apisix_json_file_read_remote_source()
{
  cat <<'RSUDO_APISIX_JSON_FILE_READ_REMOTE'
data_file=$1
case "$data_file" in /*) : ;; *) exit 80 ;; esac
[ -f "$data_file" ] && [ -r "$data_file" ] && [ ! -L "$data_file" ] || exit 81
cat "$data_file"
RSUDO_APISIX_JSON_FILE_READ_REMOTE
}

_rsudo_mod_apisix_snapshot_read()
(
  operation=$1
  shift
  case "$operation:$#" in
    list:1) resource=$1; resource_id= ;;
    get:2) resource=$1; resource_id=$2 ;;
    *) log error apisix snapshot-read-invalid-arguments operation "$operation" count "$#"; exit 1 ;;
  esac
  case "$resource" in routes|services|upstreams) : ;; *) log error apisix snapshot-read-unsupported-resource resource "$resource"; exit 2 ;; esac
  if [ -n "$resource_id" ]; then
    case "$resource_id" in *[!a-zA-Z0-9._~-]*|.|..) log error apisix snapshot-read-invalid-resource-id; exit 3 ;; esac
  fi
  context=$(rsudo_mod_apisix_context) || exit "$?"
  adapter=$(printf '%s\n' "$context" | sed -n 's/^adapter=//p')
  [ "$adapter" = snapshot ] || { log error apisix snapshot-read-adapter-unsupported adapter "$adapter"; exit 4; }
  scope=$(printf '%s\n' "$context" | sed -n 's/^scope=//p')
  [ "$scope" = host ] || { log error apisix snapshot-read-scope-unsupported scope "$scope"; exit 5; }
  admin_url=${RSUDO_APISIX_ADMIN_URL-}
  header_file=${RSUDO_APISIX_HEADER_FILE-}
  case "$admin_url" in
    http://*|https://*) authority=${admin_url#*://} ;;
    *) log error apisix snapshot-read-invalid-admin-url; exit 6 ;;
  esac
  case "$authority" in
    ''|*/*|*\?*|*\#*|*@*|*[!a-zA-Z0-9:._-]*)
      log error apisix snapshot-read-invalid-admin-authority
      exit 6
    ;;
  esac
  command -v json >/dev/null 2>&1 || { log error apisix snapshot-read-json-unavailable; exit 8; }
  umask 077
  attempt=0
  temp_dir=
  temp_base=${TMPDIR:-/tmp}
  case "$temp_base" in /*) : ;; *) temp_base=/tmp ;; esac
  while [ "$attempt" -lt 10 ]
  do
    candidate=$temp_base/rsudo-apisix-snapshot-$$-$attempt
    if (umask 077; mkdir "$candidate") 2>/dev/null
    then temp_dir=$candidate; break
    fi
    attempt=$((attempt + 1))
  done
  [ -n "$temp_dir" ] || { log error apisix snapshot-read-temp-unavailable; exit 9; }
  trap 'rm -f "$temp_dir/snapshot.json" "$temp_dir/items.jsonl" "$temp_dir/matches.jsonl"; rmdir "$temp_dir" 2>/dev/null' 0
  _rsudo_mod_apisix_rest_read_remote_source |
    rsudo sh -s -- "$admin_url" "$header_file" configs '' > "$temp_dir/snapshot.json"
  remote_status=$?
  [ "$remote_status" -eq 0 ] || { log error apisix snapshot-read-remote-failed status "$remote_status"; exit 10; }
  json --check "$temp_dir/snapshot.json" >/dev/null 2>&1 || { log error apisix snapshot-read-invalid-json; exit 11; }
  filter=.$resource'[]'
  json -c "$filter" "$temp_dir/snapshot.json" > "$temp_dir/items.jsonl" 2>/dev/null || {
    log error apisix snapshot-read-resource-query-failed resource "$resource"
    exit 12
  }
  if [ -z "$resource_id" ]
  then
    cat "$temp_dir/items.jsonl"
    exit "$?"
  fi
  : > "$temp_dir/matches.jsonl" || { log error apisix snapshot-read-temp-write-failed; exit 12; }
  while IFS= read -r item
  do
    item_id=$(printf '%s\n' "$item" | json -r '.id?' 2>/dev/null) || {
      log error apisix snapshot-read-resource-query-failed resource "$resource"
      exit 12
    }
    [ "$item_id" = "$resource_id" ] && printf '%s\n' "$item" >> "$temp_dir/matches.jsonl"
  done < "$temp_dir/items.jsonl"
  [ -s "$temp_dir/matches.jsonl" ] || { log error apisix snapshot-read-resource-not-found resource "$resource"; exit 13; }
  match_count=$(wc -l < "$temp_dir/matches.jsonl") || { log error apisix snapshot-read-temp-write-failed; exit 12; }
  [ "$match_count" -eq 1 ] 2>/dev/null || { log error apisix snapshot-read-resource-ambiguous resource "$resource"; exit 14; }
  cat "$temp_dir/matches.jsonl"
)

_rsudo_mod_apisix_json_file_read()
(
  operation=$1
  shift
  case "$operation:$#" in
    list:1) resource=$1; resource_id= ;;
    get:2) resource=$1; resource_id=$2 ;;
    *) log error apisix json-file-read-invalid-arguments operation "$operation" count "$#"; exit 1 ;;
  esac
  case "$resource" in routes|services|upstreams) : ;; *) log error apisix json-file-read-unsupported-resource resource "$resource"; exit 2 ;; esac
  if [ -n "$resource_id" ]; then
    case "$resource_id" in *[!a-zA-Z0-9._~-]*|.|..) log error apisix json-file-read-invalid-resource-id; exit 3 ;; esac
  fi

  context=$(rsudo_mod_apisix_context) || exit "$?"
  adapter=$(printf '%s\n' "$context" | sed -n 's/^adapter=//p')
  [ "$adapter" = file-json ] || { log error apisix json-file-read-adapter-unsupported adapter "$adapter"; exit 4; }
  scope=$(printf '%s\n' "$context" | sed -n 's/^scope=//p')
  data_file=${RSUDO_APISIX_DATA_FILE-}
  case "$data_file" in /*) : ;; *) log error apisix json-file-read-invalid-data-path; exit 5 ;; esac
  case "$scope" in host) : ;;
    docker|podman)
      container=${RSUDO_APISIX_CONTAINER_ID-}
      case "$container" in *[!0123456789abcdef]*|'') log error apisix json-file-read-invalid-container-id; exit 6 ;; esac
      [ "${#container}" -eq 64 ] || { log error apisix json-file-read-invalid-container-id; exit 6; }
    ;;
    *) log error apisix json-file-read-unsupported-scope scope "$scope"; exit 7 ;;
  esac
  command -v json >/dev/null 2>&1 || { log error apisix json-file-read-json-unavailable; exit 8; }

  umask 077
  attempt=0
  temp_dir=
  temp_base=${TMPDIR:-/tmp}
  case "$temp_base" in /*) : ;; *) temp_base=/tmp ;; esac
  while [ "$attempt" -lt 10 ]
  do
    candidate=$temp_base/rsudo-apisix-json-$$-$attempt
    if (umask 077; mkdir "$candidate") 2>/dev/null
    then temp_dir=$candidate; break
    fi
    attempt=$((attempt + 1))
  done
  [ -n "$temp_dir" ] || { log error apisix json-file-read-temp-unavailable; exit 9; }
  trap 'rm -f "$temp_dir/document.json" "$temp_dir/items.jsonl" "$temp_dir/matches.jsonl"; rmdir "$temp_dir" 2>/dev/null' 0
  document=$temp_dir/document.json
  if [ "$scope" = host ]
  then
    _rsudo_mod_apisix_json_file_read_remote_source | rsudo sh -s -- "$data_file" > "$document"
  else
    _rsudo_mod_apisix_json_file_read_remote_source |
      rsudo "$scope" exec -i "$container" sh -s -- "$data_file" > "$document"
  fi
  remote_status=$?
  [ "$remote_status" -eq 0 ] || { log error apisix json-file-read-remote-failed status "$remote_status"; exit 10; }
  json --check "$document" >/dev/null 2>&1 || { log error apisix json-file-read-invalid-json; exit 11; }
  filter=.$resource'[]'
  json -c "$filter" "$document" > "$temp_dir/items.jsonl" 2>/dev/null || {
    log error apisix json-file-read-resource-query-failed resource "$resource"
    exit 12
  }
  if [ -z "$resource_id" ]
  then
    cat "$temp_dir/items.jsonl"
    exit "$?"
  fi
  : > "$temp_dir/matches.jsonl" || { log error apisix json-file-read-temp-write-failed; exit 13; }
  while IFS= read -r item
  do
    item_id=$(printf '%s\n' "$item" | json -r '.id?' 2>/dev/null) || {
      log error apisix json-file-read-resource-query-failed resource "$resource"
      exit 12
    }
    [ "$item_id" = "$resource_id" ] && printf '%s\n' "$item" >> "$temp_dir/matches.jsonl"
  done < "$temp_dir/items.jsonl"
  [ -s "$temp_dir/matches.jsonl" ] || { log error apisix json-file-read-resource-not-found resource "$resource"; exit 14; }
  match_count=$(wc -l < "$temp_dir/matches.jsonl") || { log error apisix json-file-read-temp-write-failed; exit 13; }
  [ "$match_count" -eq 1 ] 2>/dev/null || { log error apisix json-file-read-resource-ambiguous resource "$resource"; exit 15; }
  cat "$temp_dir/matches.jsonl"
)

_rsudo_mod_apisix_read_router()
(
  operation=$1
  shift
  context=$(rsudo_mod_apisix_context) || exit "$?"
  adapter=$(printf '%s\n' "$context" | sed -n 's/^adapter=//p')
  case "$adapter" in
    rest) _rsudo_mod_apisix_rest_read "$operation" "$@" ;;
    snapshot) _rsudo_mod_apisix_snapshot_read "$operation" "$@" ;;
    file-json) _rsudo_mod_apisix_json_file_read "$operation" "$@" ;;
    *) log error apisix read-adapter-not-implemented adapter "$adapter"; exit 3 ;;
  esac
)

rsudo_mod_apisix_list() { _rsudo_mod_apisix_read_router list "$@"; }
rsudo_mod_apisix_get() { _rsudo_mod_apisix_read_router get "$@"; }

_rsudo_mod_apisix_unimplemented_operation()
(
  operation=$1
  log error apisix operation-backend-not-implemented operation "$operation"
  exit 1
)

# Generic mutating verbs are reserved for the new router. Until a backend is
# implemented they fail explicitly; they never fall through to legacy.
rsudo_mod_apisix_create() { _rsudo_mod_apisix_unimplemented_operation create; }
rsudo_mod_apisix_update() { _rsudo_mod_apisix_unimplemented_operation update; }
rsudo_mod_apisix_delete() { _rsudo_mod_apisix_unimplemented_operation delete; }
rsudo_mod_apisix_apply() { _rsudo_mod_apisix_unimplemented_operation apply; }
rsudo_mod_apisix_request() { _rsudo_mod_apisix_unimplemented_operation request; }
