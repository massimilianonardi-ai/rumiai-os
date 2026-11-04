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
    if [ -n "$home" ] && [ ! -r "$home/conf/config.yaml" ]
    then
      home=
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
