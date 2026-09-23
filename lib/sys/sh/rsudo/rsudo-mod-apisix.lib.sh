#!/bin/sh

. log.lib.sh

#------------------------------------------------------------------------------

APISIX_GLOBAL_RULE_CONF_RESPONSE_REWRITE_FLUSH_COOKIES='
"response-rewrite":
{
  "headers":
  {
    "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax"
  },
  "vars":
  [
    [
      "status",
      "~=",
      404
    ],
    [
      "status",
      ">=",
      400
    ],
    [
      "status",
      "<",
      500
    ]
  ]
}
'

#------------------------------------------------------------------------------

APISIX_PLUGIN_CONF_RESPONSE_REWRITE_USERINFO='
"response-rewrite":
{
  "headers":
  {
    "X-Userinfo": "$http_x_userinfo"
  }
}
'

#------------------------------------------------------------------------------

APISIX_PLUGIN_CONF_CORS_USERINFO_TEMPLATE='
"cors":
{
  "allow_headers": "**",
  "allow_origins": "${1}",
  "expose_headers": "X-Userinfo",
  "allow_methods": "GET,POST,PUT,DELETE,OPTIONS",
  "allow_credential": true
}
'

#------------------------------------------------------------------------------

APISIX_PLUGIN_CONF_PROXY_REWRITE_TEMPLATE='
"proxy-rewrite":
{
  "headers":
  {
    "remove":
    [
      "Cookie"
    ]
  },
  "regex_uri": ["^/${1}/(.*)", "/\$1"]
}
'

#------------------------------------------------------------------------------

rsudo_mod_apisix_set_auth_vars()
{
  [ -z "$1" ] && return 1; APISIX_HOST="$1"; shift
  [ -z "$1" ] && return 1; APISIX_PORT="$1"; shift

  [ -z "$1" ] && return 1; APISIX_KEYCLOAK_HOST="$1"; shift
  [ -z "$1" ] && return 1; APISIX_KEYCLOAK_PORT="$1"; shift
  [ -z "$1" ] && return 1; APISIX_KEYCLOAK_REALM="$1"; shift

  [ -z "$1" ] && return 1; APISIX_KEYCLOAK_CLIENT_ID="$1"; shift
  [ -z "$1" ] && return 1; APISIX_KEYCLOAK_CLIENT_SECRET="$1"; shift

  if [ -z "$1" ]
  then
    APISIX_KEYCLOAK_CLIENT_SESSION_SECRET="apisix_openid_connect_session_secret"
  else
    APISIX_KEYCLOAK_CLIENT_SESSION_SECRET="$1"
  fi

  if [ "$APISIX_PORT" = "443" ]
  then
    APISIX_BASE_URL="https://${APISIX_HOST}"
  else
    APISIX_BASE_URL="https://${APISIX_HOST}:${APISIX_PORT}"
  fi

  if [ "$APISIX_KEYCLOAK_PORT" = "443" ]
  then
    APISIX_KEYCLOAK_REALM_URL="https://${APISIX_KEYCLOAK_HOST}/realms/${APISIX_KEYCLOAK_REALM}"
  else
    APISIX_KEYCLOAK_REALM_URL="https://${APISIX_KEYCLOAK_HOST}:${APISIX_KEYCLOAK_PORT}/realms/${APISIX_KEYCLOAK_REALM}"
  fi

  APISIX_KEYCLOAK_AUTHN_DISCOVERY_URL="${APISIX_KEYCLOAK_REALM_URL}/.well-known/openid-configuration"
  APISIX_KEYCLOAK_AUTHZ_DISCOVERY_URL="${APISIX_KEYCLOAK_REALM_URL}/.well-known/uma2-configuration"



  APISIX_PLUGIN_CONF_KEYCLOAK_AUTHN_TEMPLATE='
"openid-connect":
{
  "client_id": "'"${APISIX_KEYCLOAK_CLIENT_ID}"'",
  "client_secret": "'"${APISIX_KEYCLOAK_CLIENT_SECRET}"'",
  "discovery": "'"${APISIX_KEYCLOAK_AUTHN_DISCOVERY_URL}"'",
  "redirect_uri": "'"${APISIX_BASE_URL}"'/${1}/callback",
  "scope": "openid email profile",
  "use_pkce": true,
  "bearer_only": false,
  "access_token_in_authorization_header": true,
  "set_userinfo_header": true,
  "session":
  {
    "redis": {},
    "secret": "'"${APISIX_KEYCLOAK_CLIENT_SESSION_SECRET}"'"
  }
}
'

  APISIX_PLUGIN_CONF_KEYCLOAK_AUTHZ_TEMPLATE='
"authz-keycloak":
{
  "client_id": "'"${APISIX_KEYCLOAK_CLIENT_ID}"'",
  "client_secret": "'"${APISIX_KEYCLOAK_CLIENT_SECRET}"'",
  "discovery": "'"${APISIX_KEYCLOAK_AUTHZ_DISCOVERY_URL}"'",
  "policy_enforcement_mode": "ENFORCING",
  "lazy_load_paths": false,
  "http_method_as_scope": false,
  "permissions": ["${1}"],
  "ssl_verify": true
}
'
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_json_string_or_array()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  JSON_KEY="$1"
  shift

  JSON_KEY_ARRAY="$1"
  shift

  set -- $1
  if [ "$#" = "1" ]
  then
    echo "\"$JSON_KEY\": \"$1\""
  else
    JSON_ARRAY="\"$1\""
    shift
    while [ "$#" -gt "0" ]
    do
      JSON_ARRAY="${JSON_ARRAY}, \"$1\""
      shift
    done
    echo "\"$JSON_KEY_ARRAY\": [$JSON_ARRAY]"
  fi
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_key()
{
  rsudo << 'EOF'
ADMIN_KEY_PREFIX="$(cat "/usr/local/apisix/conf/config.yaml" | sed -n "s/admin_key:.*//p")"
ADMIN_KEY="$(cat "/usr/local/apisix/conf/config.yaml" | sed "s/$ADMIN_KEY_PREFIX//" | sed -n '/admin_key:/,/^[[:lower:]]/{//!p;}' | tr '\n' '|' | sed -e 's/ //g' -e 's/.*admin|//' -e 's/|.*//' -e 's/key://')"
echo "$ADMIN_KEY"
EOF
}

rsudo_mod_apisix_keyset()
{
  if [ -z "$1" ]
  then
    log_debug "apisix_key_set: empty arg"
    return 1
  fi

  eval "$1=\"\$(rsudo_mod_apisix_key)\""
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_api()
{

  if [ -z "$APISIX_KEY" ]
  then
    APISIX_KEY="$(rsudo_mod_apisix_key)"
  fi

(
  if [ -z "$1" ]
  then
    exit 1
  fi

  if [ -z "$APISIX_ADMIN_URL" ]
  then
    APISIX_ADMIN_URL="http://127.0.0.1:9180/apisix/admin"
  fi

  if [ -z "$2" ]
  then
    HTTP_METHOD="GET"
  else
    HTTP_METHOD="$2"
  fi

  if [ -z "$3" ]
  then
    rsudo << EOF
curl -i "${APISIX_ADMIN_URL}/${1}" -H "X-API-KEY: ${APISIX_KEY}" -X ${HTTP_METHOD}
EOF
  else
    rsudo << EOF
curl -i "${APISIX_ADMIN_URL}/${1}" -H "X-API-KEY: ${APISIX_KEY}" -X ${HTTP_METHOD} -d '${3}'
EOF
  fi
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_get()
{
  rsudo_mod_apisix_api "$1" "GET"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_put()
{
  rsudo_mod_apisix_api "$1" "PUT" "$2"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_post()
{
  rsudo_mod_apisix_api "$1" "POST" "$2"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_del()
{
  rsudo_mod_apisix_api "$1" "DELETE"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete()
{
  rsudo_mod_apisix_delete_"$@"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_service()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "services/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_route()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "routes/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_stream_route()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "stream_routes/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_upstream()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "upstreams/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_consumer()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "consumers/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_consumer_group()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "consumer_groups/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_ssl()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "ssls/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_global_rule()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "global_rules/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_plugin_metadata()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "plugin_metadata/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_plugin_config()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "plugin_configs/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_secret()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "secrets/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_delete_proto()
{
(
  if [ -z "$1" ]
  then
    exit 1
  fi

  ID="$1"

  rsudo_mod_apisix_del "protos/${ID}"
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create()
{
  rsudo_mod_apisix_create_"$@"
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_generic()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  URL="$1"
  ID="$2"
  PARAMS="$3"

  rsudo_mod_apisix_put "$URL" '
  {
    "id": "'"${ID}"'",
    '"${PARAMS}"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_upstream()
{
(
  if [ -z "$1" ] || [ -z "$2" ]
  then
    exit 1
  fi

  ID="$1"
  PARAMS="$2"

  rsudo_mod_apisix_put "upstreams" '
  {
    "id": "'"${ID}"'",
    "name": "'"${ID}"'",
    '"${PARAMS}"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_upstream_simple()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  SCHEME="$2"
  ADDRESS_PORT="$3"

  rsudo_mod_apisix_create_upstream "${ID}" '
  "scheme": "'"${SCHEME}"'",
  "retries": 1,
  "type": "roundrobin",
  "nodes":
  {
    "'"${ADDRESS_PORT}"'": 1
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_service()
{
(
  if [ -z "$1" ] || [ -z "$2" ]
  then
    exit 1
  fi

  ID="$1"
  PARAMS="$2"

  rsudo_mod_apisix_put "services" '
  {
    "id": "'"${ID}"'",
    "name": "'"${ID}"'",
    '"${PARAMS}"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_service_simple()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  SCHEME="$2"
  ADDRESS_PORT="$3"

  rsudo_mod_apisix_create_service "${ID}" '
  "upstream":
  {
    "scheme": "'"${SCHEME}"'",
    "retries": 1,
    "type": "roundrobin",
    "nodes":
    {
      "'"${ADDRESS_PORT}"'": 1
    }
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_service_standard()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  UPSTREAM_ID="$2"
  PLUGINS="$3"

  rsudo_mod_apisix_create_service "${ID}" '
  "upstream_id": "'"${UPSTREAM_ID}"'",
  "plugins":
  {
    '"${PLUGINS}"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_route()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  URI_OR_URIS="$(rsudo_mod_apisix_json_string_or_array "uri" "uris" "$2")"
  PARAMS="$3"

  rsudo_mod_apisix_put "routes" '
  {
    "id": "'"${ID}"'",
    "name": "'"${ID}"'",
    '"${URI_OR_URIS}"',
    '"${PARAMS}"'
  }'
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_route_simple()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  URI_OR_URIS="$2"
  SERVICE_ID="$3"

  rsudo_mod_apisix_create_route "${ID}" "${URI_OR_URIS}" '"service_id": "'"${SERVICE_ID}"'"'
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_route_map()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]
  then
    exit 1
  fi

  ID="$1"
  URI_OR_URIS="$2"
  URI_MAPPED="$3"
  SERVICE_ID="$4"

  CALLBACK_URI="$URI_OR_URIS"
  URI_OR_URIS="/$URI_OR_URIS /$URI_OR_URIS/*"

log fatal '--->       "regex_uri": ["^/'"${2}"'/(.*)", "/'"${URI_MAPPED}"'\$1"]'

  rsudo_mod_apisix_create_route "${ID}" "${URI_OR_URIS}" '
  "service_id": "'"${SERVICE_ID}"'",
  "plugins":
  {
    "proxy-rewrite":
    {
      "headers":
      {
        "remove":
        [
          "Cookie"
        ]
      },
      "regex_uri": ["^/'"${2}"'/(.*)", "/'"${URI_MAPPED}"'/$1"]
    }
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_route_authn()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
  then
    exit 1
  fi

  ID="$1"
  URI_OR_URIS="$2"
  SERVICE_ID="$3"

  CALLBACK_URI="authz/$URI_OR_URIS"
  URI_OR_URIS="/authz/$URI_OR_URIS /authz/$URI_OR_URIS/*"

  rsudo_mod_apisix_create_route "${ID}" "${URI_OR_URIS}" '
  "service_id": "'"${SERVICE_ID}"'",
  "plugins":
  {
    '"$(env_eval "$APISIX_PLUGIN_CONF_KEYCLOAK_AUTHN_TEMPLATE" "${CALLBACK_URI}")"',
    '"$(env_eval "$APISIX_PLUGIN_CONF_PROXY_REWRITE_TEMPLATE" "authz")"',
    '"$(env_eval "$APISIX_PLUGIN_CONF_CORS_USERINFO_TEMPLATE" "${APISIX_BASE_URL}")"',
    '"$APISIX_PLUGIN_CONF_RESPONSE_REWRITE_USERINFO"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_route_authn_authz()
{
(
  if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]
  then
    exit 1
  fi

  ID="$1"
  URI_OR_URIS="$2"
  SERVICE_ID="$3"
  RESOURCE="$4"

  CALLBACK_URI="authz/$URI_OR_URIS"
  URI_OR_URIS="/authz/$URI_OR_URIS /authz/$URI_OR_URIS/*"

  rsudo_mod_apisix_create_route "${ID}" "${URI_OR_URIS}" '
  "service_id": "'"${SERVICE_ID}"'",
  "plugins":
  {
    '"$(env_eval "$APISIX_PLUGIN_CONF_KEYCLOAK_AUTHN_TEMPLATE" "${CALLBACK_URI}")"',
    '"$(env_eval "$APISIX_PLUGIN_CONF_KEYCLOAK_AUTHZ_TEMPLATE" "${RESOURCE}")"',
    '"$(env_eval "$APISIX_PLUGIN_CONF_PROXY_REWRITE_TEMPLATE" "authz")"',
    '"$(env_eval "$APISIX_PLUGIN_CONF_CORS_USERINFO_TEMPLATE" "${APISIX_BASE_URL}")"',
    '"$APISIX_PLUGIN_CONF_RESPONSE_REWRITE_USERINFO"'
  }
  '
)
}

#-------------------------------------------------------------------------------

rsudo_mod_apisix_create_global_rule()
{
(
  if [ -z "$1" ] || [ -z "$2" ]
  then
    exit 1
  fi

  ID="$1"
  PLUGINS="$2"

  rsudo_mod_apisix_put "global_rules" '
  {
    "id": "'"${ID}"'",
    "plugins":
    {
      '"${PLUGINS}"'
    }
  }
  '
)
}

#-------------------------------------------------------------------------------
