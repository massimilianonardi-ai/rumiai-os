NAME
    rsudo-mod-apisix.lib.sh - transitional rsudo apisix administration API

DESCRIPTION
    This module currently forwards its former public operations to the preserved legacy implementation. The forwarding is temporary; the new backend architecture is under development.
    Most operations still use the legacy API. A new read-only configured-mode
    discovery operation is available, but resource routing and standalone
    mutation are not yet implemented.
    Existing legacy operations use their original input formats and behavior,
    including known limitations in JSON construction, credentials and HTTP errors.
    Do not provide untrusted shell-sensitive values to legacy operations.

LOADING
    loadsyslib "rsudo/rsudo-mod-apisix"

DISPATCH
    rsudo apisix <operation> [operands...]
    rsudo apisix mode [remote-apisix-home [remote-config.yaml]]
    rsudo apisix inspect [remote-apisix-home [remote-config.yaml]]
    rsudo apisix runtime absolute-remote-apisix-home

PUBLIC FUNCTIONS
    rsudo_mod_apisix_runtime absolute-remote-apisix-home
        Read-only evidence for an explicitly selected APISIX installation.
        Checks the generated conf/nginx.conf and logs/nginx.pid, then uses
        remote ps to verify that the PID is an nginx/OpenResty master whose
        visible -p/-c arguments match this installation. Never logs or emits
        raw process arguments. Missing PID file reports
        runtime_evidence=pidfile-missing, runtime_identity=unverified and
        mutation_readiness=not-established, without claiming stopped state.
        A matching master reports runtime_evidence=pidfile-and-master-args,
        process_pid=<pid>, runtime_identity=process-consistent-config-unverified,
        mutation_readiness=not-established. Invalid/unsafe/mismatching
        evidence fails non-zero with diagnostics (status 30-39).
        A PID file and process title are insufficient to prove the running
        config.yaml, custom -c, APISIX_PROFILE or container ownership.
        This operation never authorizes writes.

    rsudo_mod_apisix_inspect [remote-apisix-home [remote-config.yaml]]
        Calls the configured-mode resolver without attempting a mutation.
        Prints four stable key=value fields: configured_mode,
        configuration_evidence=on-disk, runtime_identity=unverified,
        mutation_readiness=not-established. A successful result must not be
        interpreted as confirmation of a running APISIX instance, an active
        configuration, or safe authorization to modify resources. The same
        path selection, non-zero failures and prerequisites as mode apply.

    rsudo_mod_apisix_mode [remote-apisix-home [remote-config.yaml]]
        Resolve the selected on-disk APISIX deployment configuration through
        the remote APISIX LuaJIT/YAML parser and installed defaults. This is a
        read-only operation. Prints exactly one configured backend:
        traditional-admin, standalone-api, standalone-file-yaml,
        standalone-file-json, or no-admin-data-plane.
        The remote configuration is not proof of a running process's active
        configuration. For custom -c or APISIX_PROFILE deployments, specify
        the exact remote installation home and selected configuration path.
        With no operands, the remote module attempts to identify an APISIX
        installation using the installed apisix launcher, then a verified
        conventional package location. Unresolvable or ambiguous cases fail.
        Both optional path arguments, when present, must be absolute.
        The operation needs a suitable remote LuaJIT with APISIX's lyaml and
        apisix.cli.config Lua modules available. It does not expose keys or
        print the configuration contents.

    rsudo_mod_apisix_set_auth_vars host port keycloak_host keycloak_port realm client_id client_secret [session_secret] — set legacy APISIX/Keycloak state and plugin templates
    rsudo_mod_apisix_json_string_or_array singular_key plural_key space_separated_values — emit a JSON fragment (legacy splitting rules)
    rsudo_mod_apisix_key — extract a configured Admin API key from a legacy fixed path
    rsudo_mod_apisix_keyset variable_name — assign the extracted key to the named shell variable
    rsudo_mod_apisix_api resource_path [HTTP_method] [JSON_body] — perform legacy Admin API request
    rsudo_mod_apisix_get resource_path — legacy GET request
    rsudo_mod_apisix_put resource_path JSON_body — legacy PUT request
    rsudo_mod_apisix_post resource_path JSON_body — legacy POST request
    rsudo_mod_apisix_del resource_path — legacy DELETE request
    rsudo_mod_apisix_delete resource_kind id — dispatch deletion
    rsudo_mod_apisix_delete_service id — delete service
    rsudo_mod_apisix_delete_route id — delete route
    rsudo_mod_apisix_delete_stream_route id — delete stream route
    rsudo_mod_apisix_delete_upstream id — delete upstream
    rsudo_mod_apisix_delete_consumer id — delete consumer
    rsudo_mod_apisix_delete_consumer_group id — delete consumer group
    rsudo_mod_apisix_delete_ssl id — delete SSL entry
    rsudo_mod_apisix_delete_global_rule id — delete global rule
    rsudo_mod_apisix_delete_plugin_metadata id — delete plugin metadata
    rsudo_mod_apisix_delete_plugin_config id — delete plugin config
    rsudo_mod_apisix_delete_secret id — delete secret
    rsudo_mod_apisix_delete_proto id — delete protobuf definition
    rsudo_mod_apisix_create resource_kind ... — dispatch resource creation
    rsudo_mod_apisix_create_generic collection id JSON_fragment — generic legacy creation
    rsudo_mod_apisix_create_upstream id JSON_fragment — create upstream
    rsudo_mod_apisix_create_upstream_simple id scheme address:port — build a one-node upstream
    rsudo_mod_apisix_create_service id JSON_fragment — create service
    rsudo_mod_apisix_create_service_simple id scheme address:port — build service with inline upstream
    rsudo_mod_apisix_create_service_standard id upstream_id plugins_fragment — build service with named upstream and plugins
    rsudo_mod_apisix_create_route id uri_or_uris JSON_fragment — create route
    rsudo_mod_apisix_create_route_simple id uri_or_uris service_id — create a simple route
    rsudo_mod_apisix_create_route_map id uri_or_uris mapped_uri service_id — create a URI-mapping route
    rsudo_mod_apisix_create_route_authn id uri_or_uris service_id — create OIDC authentication route
    rsudo_mod_apisix_create_route_authn_authz id uri_or_uris service_id resource — create OIDC/Keycloak authorization route
    rsudo_mod_apisix_create_global_rule id plugin_fragment — create global plugin rule

OUTPUT AND STATUS
    Mode discovery returns status 0 with one configured-backend identifier.
    Inspect returns status 0 with the configured-mode and explicit evidence
    limitations; an unexpected backend identity returns status 22.
    Invalid argument count, non-absolute operands, remote lookup/parse failures
    and unsupported configurations fail non-zero with branch-specific stderr
    markers. The caller may not treat successful discovery as evidence of live
    process state or safe authorization to modify the target.

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
    rsudo-mod-apisixlegacy.lib.sh
