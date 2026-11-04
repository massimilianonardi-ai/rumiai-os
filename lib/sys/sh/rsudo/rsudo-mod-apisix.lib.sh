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

printf 'runtime_evidence=pidfile-and-master-args\nprocess_pid=%s\nruntime_identity=process-consistent-config-unverified\nmutation_readiness=not-established\n' "$pid"
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

    # A real negative result is different from a failed inspection.
    # Docker exit failures, an absent shell and disappearing containers
    # must never be interpreted as proof of an absent APISIX candidate.
    docker exec "$id" sh -c '
      file=/usr/local/apisix/conf/nginx.conf
      if [ ! -e "$file" ] && [ ! -L "$file" ]; then exit 60; fi
      if [ -f "$file" ] && [ -r "$file" ] && [ ! -L "$file" ]; then exit 0; fi
      exit 61
    ' >/dev/null 2>&1
    probe_status=$?
    case "$probe_status" in
      0)
        candidate_count=$((candidate_count + 1))
        selected="docker $id"
      ;;
      60) : ;;
      61)
        discovery_error docker-generated-config-unsafe
        exit 53
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
          rsudo sh -s -- /usr/local/apisix)
        status=$?
        [ "$status" -eq 0 ] || exit "$status"
        scope=host
      ;;
      'docker '*)
        container=${selected#docker }
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
        observation=$(_rsudo_mod_apisix_runtime_remote_source |
          rsudo docker exec -i "$container" sh -s -- /usr/local/apisix)
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
    printf 'discovery_evidence=unique-conventional-candidate\ndiscovered_scope=%s\n' "$scope"
    [ "$scope" != docker ] || printf 'container_id=%s\n' "$container"
    printf '%s\n' "$observation"
    exit 0
  fi

  case "$1" in
    /*) : ;;
    *) log error apisix runtime-invalid-home; exit 31 ;;
  esac

  if [ "$#" -eq 1 ]
  then
    _rsudo_mod_apisix_runtime_remote_source | rsudo sh -s -- "$1"
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
