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


K04 EARLY IMPLEMENTATION — SECURE SERVICE-ACCOUNT TOKEN STORE

    rsudo [rsudo-options] keycloak auth acquire
        --server HTTPS-BASE-URL --issuer-realm REALM --auth-mode client-credentials
        --client-id ID --client-auth client-secret-basic|client-secret-post
        --client-secret-file ABSOLUTE-REMOTE-PATH
        --token-store ABSOLUTE-REMOTE-NEW-FILE
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    rsudo [rsudo-options] keycloak auth status
        --token-file ABSOLUTE-REMOTE-PATH

    rsudo_mod_keycloak_auth acquire|status [corresponding-options...]

    These new public operations invoke the existing rsudo SSH/sudo execution
    and curl/jq installed on the selected remote target. They require an
    explicitly selected HTTPS Keycloak base and an issuer realm; no endpoint
    is guessed from the SSH host or legacy state. Discovery must advertise
    the exact issuer and token endpoint derived from that verified base.
    Curl validates server TLS and optional approved CA, disables .curlrc,
    external proxy and redirects, and uses bounded timeouts.

    The client secret is a pre-existing, protected remote single-line file.
    The token store is a new path in a directory not writable by group/others.
    No password/token is accepted on argv, written to stdout or emitted in
    diagnostic messages. HTTP Basic is sent through a private curl header
    file; POST client secrets are read by curl from a private file. Stores
    contain the provider's response JSON and have private 0600 permissions.
    Store publication uses a same-directory exclusive hard link: if another
    acquisition has already created the destination, the loser fails without
    overwriting the winning token. This is an append-only new-store path, not
    a concurrent refresh mechanism; no existing store is replaced. Status checks only structural
    readability; server_validated=false does not mean a token is currently
    valid, unexpired, or authorized for a target realm.

    The remote host must provide POSIX sh, curl supporting @file headers,
    jq, mktemp, base64 (for Basic), and standard utilities. A local
    Keycloak installation and remote m runtime are NOT required.

    Only client credentials with client-secret-basic/client-secret-post and
    protected token-store inspection are implemented here. Other grants
    (browser code, device, password, CIBA, JWT, exchange), client auth
    (JWT signing, X509), refresh, revocation, introspection and Admin REST
    permission checks remain pending K04. They fail closed with status 73.
    A service-account token's existence is NOT proof of Admin REST privileges.
    New general request and convenience APIs are pending K05/K06.

    On these new operations, 0 means the documented local action succeeded.
    Relevant failures include 64 invalid invocation, 65 invalid HTTPS
    selection, 67 mismatched realm/issuer/discovery, 70 unsafe credential
    path, 71 client authentication rejected, 72 OAuth grant denied,
    73 unimplemented/unsupported mode, 75 CA failure, 76 transport failure,
    80 forbidden, 83 throttled, 85 server error, 86 invalid protocol data,
    87 unsafe store/output, 89 missing remote prerequisite, 90 internal
    failure. Remote rsudo execution errors may retain their own status
    until the remaining K04 transport classification is implemented.

    This new auth interface does not replace any of the 16 legacy forwarding
    functions documented above. Calling their legacy forms still carries
    their original unsafe-input and error-model limitations.
