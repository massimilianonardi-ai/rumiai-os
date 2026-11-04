NAME
    rsudo-mod-keycloak.lib.sh - transitional rsudo keycloak administration API

DESCRIPTION
    This module currently forwards its former public operations to the preserved legacy implementation. The forwarding is temporary; the new backend architecture is under development.
    This interface does not yet provide the new multi-mode administration contract.
    Existing legacy operations use their original input formats and behavior,
    including known limitations in JSON construction, credentials and HTTP errors.
    Do not provide untrusted shell-sensitive values to legacy operations.

LOADING
    loadsyslib "rsudo/rsudo-mod-keycloak"

DISPATCH
    rsudo keycloak <operation> [operands...]

PUBLIC FUNCTIONS
    rsudo_mod_keycloak_set_auth_vars host port realm — configure legacy realm URLs
    rsudo_mod_keycloak_access_token [username] [password] — obtain an access token
    rsudo_mod_keycloak_access_token_set variable_name [username] [password] — assign token to a shell variable
    rsudo_mod_keycloak_api___ resource_path [HTTP_method] [JSON_body] — older legacy API variant
    rsudo_mod_keycloak_api resource_path [HTTP_method] [JSON_body] — perform legacy Admin API request
    rsudo_mod_keycloak_method_get resource_path — legacy GET
    rsudo_mod_keycloak_method_put resource_path JSON_body — legacy PUT
    rsudo_mod_keycloak_method_post resource_path JSON_body — legacy POST
    rsudo_mod_keycloak_method_delete resource_path — legacy DELETE
    rsudo_mod_keycloak_delete resource_kind ... — dispatch deletion
    rsudo_mod_keycloak_delete_client client_id — look up then delete client
    rsudo_mod_keycloak_create resource_kind ... — dispatch creation
    rsudo_mod_keycloak_create_client JSON_body — create client
    rsudo_mod_keycloak_get resource_kind ... — dispatch retrieval
    rsudo_mod_keycloak_get_client client_id — retrieve matching client
    rsudo_mod_keycloak_update resource_kind ... — dispatch update

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
    rsudo-mod-keycloaklegacy.lib.sh
