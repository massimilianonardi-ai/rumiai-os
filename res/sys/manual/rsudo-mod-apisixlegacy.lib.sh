NAME
    rsudo-mod-apisixlegacy.lib.sh - retained legacy rsudo apisix administration API

DESCRIPTION
    This is the original administrative module, preserved under an explicit legacy dispatcher identity.
    This interface does not yet provide the new multi-mode administration contract.
    Existing legacy operations use their original input formats and behavior,
    including known limitations in JSON construction, credentials and HTTP errors.
    Do not provide untrusted shell-sensitive values to legacy operations.

LOADING
    loadsyslib "rsudo/rsudo-mod-apisixlegacy"

DISPATCH
    rsudo apisixlegacy <operation> [operands...]

PUBLIC FUNCTIONS
    rsudo_mod_apisixlegacy_set_auth_vars host port keycloak_host keycloak_port realm client_id client_secret [session_secret] — set legacy APISIX/Keycloak state and plugin templates
    rsudo_mod_apisixlegacy_json_string_or_array singular_key plural_key space_separated_values — emit a JSON fragment (legacy splitting rules)
    rsudo_mod_apisixlegacy_key — extract a configured Admin API key from a legacy fixed path
    rsudo_mod_apisixlegacy_keyset variable_name — assign the extracted key to the named shell variable
    rsudo_mod_apisixlegacy_api resource_path [HTTP_method] [JSON_body] — perform legacy Admin API request
    rsudo_mod_apisixlegacy_get resource_path — legacy GET request
    rsudo_mod_apisixlegacy_put resource_path JSON_body — legacy PUT request
    rsudo_mod_apisixlegacy_post resource_path JSON_body — legacy POST request
    rsudo_mod_apisixlegacy_del resource_path — legacy DELETE request
    rsudo_mod_apisixlegacy_delete resource_kind id — dispatch deletion
    rsudo_mod_apisixlegacy_delete_service id — delete service
    rsudo_mod_apisixlegacy_delete_route id — delete route
    rsudo_mod_apisixlegacy_delete_stream_route id — delete stream route
    rsudo_mod_apisixlegacy_delete_upstream id — delete upstream
    rsudo_mod_apisixlegacy_delete_consumer id — delete consumer
    rsudo_mod_apisixlegacy_delete_consumer_group id — delete consumer group
    rsudo_mod_apisixlegacy_delete_ssl id — delete SSL entry
    rsudo_mod_apisixlegacy_delete_global_rule id — delete global rule
    rsudo_mod_apisixlegacy_delete_plugin_metadata id — delete plugin metadata
    rsudo_mod_apisixlegacy_delete_plugin_config id — delete plugin config
    rsudo_mod_apisixlegacy_delete_secret id — delete secret
    rsudo_mod_apisixlegacy_delete_proto id — delete protobuf definition
    rsudo_mod_apisixlegacy_create resource_kind ... — dispatch resource creation
    rsudo_mod_apisixlegacy_create_generic collection id JSON_fragment — generic legacy creation
    rsudo_mod_apisixlegacy_create_upstream id JSON_fragment — create upstream
    rsudo_mod_apisixlegacy_create_upstream_simple id scheme address:port — build a one-node upstream
    rsudo_mod_apisixlegacy_create_service id JSON_fragment — create service
    rsudo_mod_apisixlegacy_create_service_simple id scheme address:port — build service with inline upstream
    rsudo_mod_apisixlegacy_create_service_standard id upstream_id plugins_fragment — build service with named upstream and plugins
    rsudo_mod_apisixlegacy_create_route id uri_or_uris JSON_fragment — create route
    rsudo_mod_apisixlegacy_create_route_simple id uri_or_uris service_id — create a simple route
    rsudo_mod_apisixlegacy_create_route_map id uri_or_uris mapped_uri service_id — create a URI-mapping route
    rsudo_mod_apisixlegacy_create_route_authn id uri_or_uris service_id — create OIDC authentication route
    rsudo_mod_apisixlegacy_create_route_authn_authz id uri_or_uris service_id resource — create OIDC/Keycloak authorization route
    rsudo_mod_apisixlegacy_create_global_rule id plugin_fragment — create global plugin rule

OUTPUT AND STATUS
    Legacy functions either set caller shell state or emit raw text/HTTP output.
    Remote functions require an initialized rsudo context and remote dependencies.
    Their status is the status emitted by the underlying legacy implementation;
    this does not reliably distinguish all HTTP error responses. A non-zero
    shell status does not yet classify failure by APISIX/Keycloak error kind.

SECURITY
    Legacy code may expose secrets in arguments or outputs and uses source
    construction for some requests. Use only with trusted input and protected
    administrative access. New code must not rely on these unsafe conventions.

SEE ALSO
    rsudo.lib.sh
    rsudo-mod-apisix.lib.sh
