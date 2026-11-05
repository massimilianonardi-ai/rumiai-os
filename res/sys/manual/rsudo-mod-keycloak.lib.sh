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


K04 IMPLEMENTED AUTHENTICATION AND SESSION SUBSET

    rsudo [rsudo-options] keycloak auth acquire
        --server HTTPS-BASE-URL --issuer-realm REALM --auth-mode client-credentials
        --client-id ID --client-auth client-secret-basic|client-secret-post|client-secret-jwt
        --client-secret-file ABSOLUTE-REMOTE-PATH
        [--client-jwt-alg HS256|HS384|HS512]
        --token-store ABSOLUTE-REMOTE-NEW-FILE
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    rsudo [rsudo-options] keycloak auth acquire
        --server HTTPS-BASE-URL --issuer-realm REALM --auth-mode password
        --username USERNAME --password-file ABSOLUTE-REMOTE-PATH
        --client-id ID --client-auth client-secret-basic|client-secret-post|client-secret-jwt
        --client-secret-file ABSOLUTE-REMOTE-PATH
        [--client-jwt-alg HS256|HS384|HS512]
        --token-store ABSOLUTE-REMOTE-NEW-FILE
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    The password flow requires an explicitly configured Direct Access Grant
    on the confidential Keycloak client. User password and client secret must
    be separate protected remote single-line files ending in one newline.
    Password text may contain spaces; no password value is passed through
    shell/curl arguments or printed. Invalid user credentials return OAuth
    grant status 72. This flow is never an implicit fallback.

    rsudo [rsudo-options] keycloak auth status
        --token-file ABSOLUTE-REMOTE-PATH

    rsudo [rsudo-options] keycloak auth status
        --token-file ABSOLUTE-REMOTE-PATH
        --server HTTPS-BASE-URL --issuer-realm REALM
        --client-id ID --client-auth client-secret-basic|client-secret-post|client-secret-jwt
        --client-secret-file ABSOLUTE-REMOTE-PATH
        [--client-jwt-alg HS256|HS384|HS512]
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    Without the complete remote server/client context, status is an offline
    structural protected-file check and responds with stored=true and
    server_validated=false. With that complete explicit context, status
    requests the issuer's OIDC introspection_endpoint through verified HTTPS.
    The stored access_token is sent via a private curl form-data file, and
    confidential-client Basic/Post authentication uses the protected remote
    secret file. An incomplete context is rejected, not silently downgraded.
    Introspection emits only stored=true, server_validated=true and
    active=true|false. No token, provider claims, credentials or response
    body is echoed. active=false is a valid response, not a transport failure.
    Active introspection proves only issuer-side state at observation time:
    it does not confer realm administrator permission or attest every
    downstream JWT cache. No implicit remote verification occurs.

    rsudo [rsudo-options] keycloak auth revoke
        --server HTTPS-BASE-URL --issuer-realm REALM
        --client-id ID --client-auth client-secret-basic|client-secret-post|client-secret-jwt
        --client-secret-file ABSOLUTE-REMOTE-PATH
        [--client-jwt-alg HS256|HS384|HS512]
        --token-file ABSOLUTE-REMOTE-EXISTING-STORE
        --token-type-hint access_token|refresh_token
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    rsudo [rsudo-options] keycloak auth refresh
        --server HTTPS-BASE-URL --issuer-realm REALM
        --client-id ID --client-auth client-secret-basic|client-secret-post|client-secret-jwt
        --client-secret-file ABSOLUTE-REMOTE-PATH
        [--client-jwt-alg HS256|HS384|HS512]
        --token-file ABSOLUTE-REMOTE-EXISTING-STORE
        --token-store SAME-ABSOLUTE-REMOTE-STORE
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    rsudo_mod_keycloak_auth acquire|refresh|status|revoke [corresponding-options...]

    Revoke uses the OIDC discovery revocation endpoint at the exact selected
    HTTPS issuer; a mismatched, absent, or redirected endpoint fails closed.
    The token to revoke is selected explicitly from the protected JSON store
    using --token-type-hint; its value never appears in curl argv, stdout,
    or diagnostics. The confidential-client secret is read from a protected
    remote file. An absent selected token fails status 73 without contacting
    the revocation endpoint. Revoking a refresh token can also invalidate
    client consent for that client; this is an explicit operator action.
    On accepted HTTP 200, output is a nonsecret JSON acknowledgement with
    revocation_requested=true and invalidity_verified=false. OAuth revocation
    responses do not certify that the token existed or that every downstream
    JWT resource server has stopped accepting it. The existing token store
    is deliberately not removed or changed; offline auth status remains
    structural, while explicitly authorized online status introspects the
    access token. Use an appropriately protected
    caller-side process to retire any locally held token references.

    These new public operations invoke existing rsudo SSH/sudo execution
    and curl/jq on the selected remote target. Networked operations require
    an explicitly selected HTTPS Keycloak base and issuer realm; the offline
    structural status requires only its protected remote token file. No
    endpoint is guessed from the SSH host or legacy state. Discovery must advertise
    the exact issuer and token endpoint derived from that verified base.
    Curl validates server TLS and optional approved CA, disables .curlrc,
    external proxy and redirects, and uses bounded timeouts.

    The client secret is a pre-existing, protected remote single-line file.
    The secret file and its immediate parent directory must be owned by the
    effective remote sudo identity. Selected remote credential/CA paths must
    be absolute, contain no dot/dotdot or empty segments, and traverse no
    symbolic links. The CA file may be public. The token store is a new
    path in a private directory owned by that sudo identity.
    No password/token is accepted on argv, written to stdout or emitted in
    diagnostic messages. HTTP Basic is sent through a private curl header
    file; POST client secrets are read by curl from a private file. Stores
    contain the provider's response JSON and have private 0600 permissions.
    Acquisition publishes a new store using an exclusive same-directory
    hard link: an existing destination is never overwritten by acquisition.
    Refresh requires token-file and token-store to name the same existing
    private store. It holds an exclusive per-store private directory lock
    across protected input, HTTP refresh and same-directory atomic replacement.
    It requires a returned successor refresh token and never prints tokens.
    A pre-existing lock fails closed; stale locks need investigated operator
    recovery. Cooperative callers serialize, but uncoordinated external
    writers are not covered by a universal compare-and-swap guarantee.
    A failure may leave an expired remote token and require manual re-login.
    Offline status checks structural readability only; server_validated=false
    is not evidence of validity, expiry or administrator permission.

    The remote host must provide POSIX sh, curl supporting @file headers,
    jq, mktemp, base64 (for Basic), and standard utilities. The
    client-secret-jwt method additionally requires Python 3 with standard
    hashlib/hmac/secrets support on the selected remote sudo target. A local
    Keycloak installation and remote m runtime are NOT required.

    client-secret-jwt requires the selected Keycloak client to use HS256,
    HS384 or HS512. The optional --client-jwt-alg explicitly selects the
    matching algorithm; omission preserves HS256 for existing invocations.
    Basic/Post cannot accept this option. Unsupported values are rejected
    without network access and authentication failure never causes fallback.
    For each request, it creates a fresh JWT with iss/sub equal
    to the selected client ID, aud equal to the verified issuing realm URL,
    a random jti and a 30-second expiry. It signs using the protected
    remote single-line client secret file and transfers the assertion to
    curl through a private 0600 temporary file, not through arguments or
    stdout. There is no Basic/Post fallback. Server policy may reject
    a JWT authenticator or expired assertion; that does not justify
    retrying with weaker authentication. Private-key JWT, federated JWT
    and sender-constrained authentication remain pending.
    Python or cryptographic prerequisites missing for an explicitly chosen
    JWT method result in a nonzero error; no implicit fallback occurs.

    Client credentials and explicitly enabled Direct Access Grant/password,
    refresh, explicit token revocation, protected structural status and
    authenticated access-token introspection currently support Basic/Post
    and explicit HS256/HS384/HS512 client-secret-jwt confidential-client
    authentication. Other grants (browser code, device, CIBA, JWT
    authorization grant, token exchange) and other client authenticators
    (private-key JWT, federated JWT, X509) remain pending
    K04. The existing private Admin REST Bearer transport probe is a
    fixed-route read-only proof, not the public K05 request interface.
    Unimplemented modes fail closed with status 73.
    A service-account token's existence is NOT proof of Admin REST privileges.
    New general request and convenience APIs are pending K05/K06.

    On these new operations, 0 means the documented local action succeeded.
    Relevant failures include 64 invalid invocation, 65 invalid HTTPS
    selection, 67 mismatched realm/issuer/discovery, 70 unsafe credential
    path, 71 client authentication rejected, 72 OAuth grant denied,
    73 unimplemented/unsupported grant or client policy, 75 CA failure,
    76 transport failure,
    80 forbidden, 83 throttled, 85 server error, 86 invalid protocol data,
    87 unsafe store/output, 89 missing remote prerequisite, 90 internal
    failure. Remote rsudo execution errors may retain their own status
    until the remaining K04 transport classification is implemented.

    This new auth interface does not replace any of the 16 legacy forwarding
    functions documented above. Calling their legacy forms still carries
    their original unsafe-input and error-model limitations.


K04 PRIVATE ADMIN REST BEARER TRANSPORT PROBE

    _rsudo_mod_keycloak_admin_transport_probe
        --server HTTPS-BASE-URL --issuer-realm ISSUING-REALM
        --target-realm TARGET-REALM
        --token-file ABSOLUTE-REMOTE-EXISTING-STORE
        [--ca-file ABSOLUTE-REMOTE-CA-PATH]

    This underscore-prefixed internal function is a K04 transport and
    authorization boundary test, not a new public administrative command.
    The regular rsudo keycloak request public interface belongs to K05
    and is NOT implemented here. This private probe performs exactly one
    GET of BASE/admin/realms/{URL-encoded-target-realm}, never an arbitrary
    URL/method/body/query or a modification. It uses existing rsudo SSH/sudo
    transport, reads the existing access_token from a private remote file,
    validates RFC 6750 bearer syntax, and creates a private curl header file.
    Tokens do not appear in command arguments, stdout or diagnostics.

    The selected HTTPS Keycloak base and issuing realm are explicit. The
    issuer is compared with trusted OIDC discovery. Remote CA verification,
    redirects/proxies, timeouts, token-file ancestry/owner/mode checks and
    exact selected-realm JSON response identity are enforced. Successful
    output is intentionally ONLY:
        {"http_status":200,"authorized":true,"body_suppressed":true}
    The Admin REST body can contain private realm configuration and is
    never forwarded or logged by this K04 probe. A 401 (invalid/expired
    token) exits 79, 403 (insufficient rights) exits 80, 404 (unavailable
    or absent resource) exits 81. TLS, timeout, trust, malformed response,
    and other HTTP failures use the corresponding existing public failure
    categories. A successful GET proves only the selected realm permission
    observed by that request, not broader administrative capability.

    This read-only proof has no caller-facing generic request contract.
    K05 must separately implement the complete method/path/query/body and
    byte-preserving response semantics, version/capability gating and safe
    handling of known secret-bearing resources before any general public
    Admin REST request is exposed. Other K04 authentication and sender-
    constrained token modes remain pending. Do not use this probe as an
    unsupported backdoor for arbitrary administration.
