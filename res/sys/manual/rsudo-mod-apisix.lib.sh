NAME
    rsudo-mod-apisix.lib.sh - transitional rsudo apisix administration API

DESCRIPTION
    This module retains compatibility forwarding for old operation-specific
    function names. The generic list/get entrypoints route internally to the
    explicit traditional REST, standalone API snapshot, standalone JSON-file
    or standalone YAML-file adapter. REST and standalone API snapshot
    create/update/delete mutations are host-scoped; standalone-file-json also
    supports these mutations for routes, services and upstreams. YAML resource
    mutations and other unsupported backends fail without legacy fallback.
    apply publishes a complete JSON/YAML document to an explicitly selected
    standalone file target, or a complete JSON snapshot to an explicitly selected
    standalone API endpoint. Generic request is implemented only for the
    explicit host traditional REST adapter. Host discovery and operator
    context inspection are read-only.
    Existing legacy operations use their original input formats and behavior,
    including known limitations in JSON construction, credentials and HTTP errors.
    Do not provide untrusted shell-sensitive values to legacy operations.

LOADING
    loadsyslib "rsudo/rsudo-mod-apisix"

DISPATCH
    rsudo apisix <operation> [operands...]
    rsudo apisix discovery [absolute-remote-scan-root]
    rsudo apisix context
    rsudo apisix list routes|services|upstreams
    rsudo apisix get routes|services|upstreams resource-id
    rsudo apisix create routes|services|upstreams < resource.json
    rsudo apisix update routes|services|upstreams id < resource.json
    rsudo apisix delete routes|services|upstreams id
    rsudo apisix apply < complete-config.json|complete-config.yaml
    rsudo apisix apply digest-token < complete-standalone-api-snapshot.json
    rsudo apisix request relative-admin-path [GET|POST|PUT|DELETE]
    rsudo apisix mode [remote-apisix-home [remote-config.yaml]]
    rsudo apisix inspect [remote-apisix-home [remote-config.yaml]]
    rsudo apisix runtime [absolute-remote-apisix-home [full-docker-container-id]]
    rsudo apisix admin-read resource absolute-remote-header-file [remote-port]

PUBLIC FUNCTIONS
    rsudo_mod_apisix_list resource
        List routes, services or upstreams through the explicitly selected
        traditional-admin REST, standalone API snapshot, standalone-file-json
        or standalone-file-yaml
        adapter. REST requires
        RSUDO_APISIX_SCOPE=host, RSUDO_APISIX_DEPLOYMENT=traditional-admin,
        RSUDO_APISIX_ADMIN_URL (an http(s) origin without a path) and
        RSUDO_APISIX_HEADER_FILE (an absolute path on the remote target).
        The remote header file must be a regular, readable, non-symlink file
        with mode 0600 and exactly one newline-terminated X-API-KEY header.
        Curl verifies HTTPS using its configured trust and does not follow
        redirects or use proxy settings. The raw successful JSON response is
        written to stdout. For standalone-api, select
        RSUDO_APISIX_DEPLOYMENT=standalone-api and the same Admin URL/header
        variables. This host-scoped adapter performs the protected GET on
        `/apisix/admin/configs`, stages the full response under a private
        local temporary directory (umask 077), validates it with RumiAI json
        and returns only the requested top-level resource array. `get` returns
        exactly one matching `id`; missing and duplicate IDs fail distinctly.
        list/get snapshot reads are read-only. `apply digest-token` sends a
        complete JSON snapshot via PUT /apisix/admin/configs, with the supplied
        token sent as X-Digest. Set RSUDO_APISIX_WAIT_MS to an integer from 0
        through 60000; default is 0. The snapshot must contain caller-managed
        *_conf_version fields. The module does not calculate versions. HTTP
        202 means accepted but not confirmed applied; a positive wait may return
        200 after worker confirmation or 202 on timeout. This is not per-resource
        editing. The API
        response does not certify that this endpoint belongs to a selected
        process.
        For standalone-file-json, select
        RSUDO_APISIX_DEPLOYMENT=standalone-file-json and an absolute
        RSUDO_APISIX_DATA_FILE; host, Docker and Podman scopes are supported
        when explicitly selected. The remote file must be an ordinary
        readable non-symlink file. It is streamed through rsudo into a private
        local temporary directory (umask 077), validated and filtered by the
        standalone RumiAI json command. Only the selected resource records
        reach stdout; the temporary document is removed on exit. This read
        does not resolve APISIX environment substitutions or prove that the
        selected file is the one loaded by a running process. For
        standalone-file-yaml, also set RSUDO_APISIX_HOME to the absolute
        selected APISIX installation root. Its LuaJIT, lyaml and cjson.safe
        parse the remote YAML and serialize only selected records as JSON
        Lines, which RumiAI json validates locally. The source is never
        modified; APISIX substitutions and loaded-process identity are not
        resolved. Other resources fail.

    rsudo_mod_apisix_get resource resource-id
        Read one routes, services or upstreams item through the same selected
        traditional-admin REST, standalone snapshot, standalone-file-json
        or standalone-file-yaml adapter as list. YAML mode also requires the
        explicitly selected absolute RSUDO_APISIX_HOME and parses with that
        installation's LuaJIT/lyaml/cjson.safe.
        Resource IDs are currently restricted to URI-safe ASCII letters,
        digits, dot, underscore, tilde and hyphen. Successful output is raw
        server or selected file resource JSON; JSON-file get requires exactly
        one matching `id`, otherwise it returns not-found or ambiguous status.
        Invalid argument shape is 1, unsupported resource 2,
        unsupported adapter 3, unsupported scope 4 and invalid Admin URL or
        authority 5; remote validation
        has distinct statuses 84-92. Curl HTTP failures retain curl status 22.
        The JSON-file adapter uses statuses 1-15: invalid arguments 1,
        unsupported resource 2, invalid ID 3, unsupported adapter 4, invalid
        data path 5, invalid container 6, unsupported scope 7, missing local
        json command 8, temporary storage failure 9, remote read failure 10,
        malformed JSON 11, resource query failure 12, temporary result write
        failure 13, missing resource 14 and duplicate matching IDs 15. No
        implicit adapter or legacy fallback is attempted.
        The snapshot adapter requires scope=host. Its local statuses are
        invalid arguments 1, unsupported resource 2, invalid ID 3, unsupported
        adapter 4, unsupported scope 5, invalid Admin URL/authority 6, missing
        json command 8, temp storage failure 9 and remote HTTP/read failure 10;
        malformed snapshot JSON is 11, query/result staging failure 12,
        missing ID 13 and duplicate matching IDs 14. Remote curl preserves its
        HTTP/transport status.
        The YAML-file adapter requires RSUDO_APISIX_HOME and uses statuses
        1-9 for arguments, resource, ID, adapter, installation home, data
        path, container, scope and private temporary storage; 10 is remote
        parser/read failure, 11-12 result staging/JSON validation, 13 missing
        ID and 14 duplicate matching IDs. The remote source must be an
        ordinary readable non-symlink file. No legacy fallback is attempted.

    rsudo_mod_apisix_create resource   (reads JSON request body from stdin)
    rsudo_mod_apisix_update resource id (reads JSON request body from stdin)
    rsudo_mod_apisix_delete resource id
        For traditional REST, mutate routes, services or upstreams only when
        RSUDO_APISIX_SCOPE=host and RSUDO_APISIX_DEPLOYMENT=traditional-admin
        are explicitly selected. REST also requires RSUDO_APISIX_ADMIN_URL
        (an http(s) origin) and RSUDO_APISIX_HEADER_FILE (an absolute remote
        pathname containing exactly one newline-terminated X-API-KEY header
        in a readable, ordinary non-symlink file with mode 0600). create uses
        POST on the collection; update uses PUT on the resource ID; delete
        uses DELETE on the resource ID. APISIX may assign an ID for POST.
        create/update read the JSON body from stdin and pass it to curl via
        --data-binary @-, never placing the body in command arguments or
        diagnostics. No remote body file is required. APISIX validates JSON
        and schema. Supply the complete intended resource to update; partial
        PATCH is not implemented. Successful response
        bodies are written to stdout. Delete is not forced: APISIX may reject
        a resource still in use. HTTPS verification remains enabled; proxy
        and redirect use are disabled. HTTP failures retain curl's non-zero
        status, normally 22. Local REST statuses 1-9 cover invalid arguments,
        resource, ID, adapter, scope, Admin URL, authority, invalid operator
        context and static remote-source creation. Remote precondition failures
        use 84-94.
        For standalone JSON files, select
        RSUDO_APISIX_DEPLOYMENT=standalone-file-json and set absolute
        RSUDO_APISIX_HOME and RSUDO_APISIX_DATA_FILE. Host, Docker and Podman
        scopes are supported with explicit container IDs. create reads one
        complete resource object with a string or numeric `id`; update reads
        a complete replacement object whose `id` must equal the selected ID;
        delete takes only the ID. The implementation uses the selected
        APISIX installation's LuaJIT/cjson.safe, preserves unrelated top-level
        values and resource arrays, rejects invalid/ambiguous arrays or IDs,
        and publishes through the same per-file lock and atomic replacement
        used by `apply`. JSON whitespace and object-key order are normalized;
        numeric values round-trip through APISIX cjson's Lua number model, so
        original number lexemes are not byte-preserved. It does not validate
        APISIX resource schema or prove reload; APISIX may reject the new file
        while retaining its previous configuration. YAML-file resource-level
        mutations remain unsupported and never fall back to legacy.
        For standalone API snapshots, the same CRUD verbs support an explicit
        host target or selected Docker/Podman container ID. In container scope,
        RSUDO_APISIX_ADMIN_URL, RSUDO_APISIX_HEADER_FILE and absolute
        RSUDO_APISIX_HOME refer to paths and loopback inside that container.
        The selected installation must provide LuaJIT,
        cjson.safe with array metatables, curl and OpenSSL. The adapter GETs
        the complete `/apisix/admin/configs` snapshot, edits only the selected
        routes/services/upstreams array, increments that collection's
        `*_conf_version`, sets the changed record's `modifiedIndex`, computes
        a SHA-256 X-Digest and PUTs the full document. It then GETs the snapshot
        again and verifies the new version and resource state. Set
        RSUDO_APISIX_WAIT_MS from 0 through 60000 (default 0); HTTP 202 returns
        status 97 to mean accepted but not confirmed. This API has no
        compare-and-swap against the prior digest: use one writer for the
        endpoint. A detected read-back mismatch fails without retry; a
        concurrent writer can still race between GET and PUT. cjson may
        normalize JSON number lexemes and object ordering in the snapshot.
        APISIX remains responsible for schema validation. Create/update need
        one complete JSON object with a string or numeric id; update requires
        that id to match the selected operand. Snapshot local statuses 1-12
        cover arguments, resource, ID, context, adapter, scope, home, wait,
        json, temporary storage, input and JSON validation. Remote statuses
        84-101 distinguish URL/path/operation/ID/wait/credential/runtime and
        staging failures, non-success GET/PUT, accepted HTTP 202 (97), and
        digest staging and read-back verification failures; curl transport
        statuses are preserved.
        Router status 2 wraps invalid context and status 3 reports an adapter
        without CRUD support; adapter-specific functions then return their
        documented local statuses. File-JSON local statuses 1-13 identify
        argument/resource/ID/context,
        adapter/path/home/scope, json or temporary-storage availability,
        input, JSON validation and static remote-source failures. Shared
        remote publication failures use 80-91; parser/mutation preconditions
        use 99-102, Lua mutation branches 103-120, YAML mutation status 121,
        remote staging failure 122 and interpreter execution/unknown-status
        failures 123-125. No resource
        body is placed in a command argument or diagnostic.

    rsudo_mod_apisix_apply (reads a complete selected JSON or YAML configuration from stdin; standalone-api requires the X-Digest token operand)
        Publish one complete document to the explicitly selected standalone
        file adapter or full API snapshot adapter. For JSON files, select
        RSUDO_APISIX_DEPLOYMENT=standalone-file-json. The local RumiAI json
        command validates exactly one complete JSON value before transport.
        For YAML, select standalone-file-yaml and set absolute
        RSUDO_APISIX_HOME; the selected installation's LuaJIT/lyaml parses the
        complete staged document before publication, and the final line must
        be APISIX's required #END marker. This checks YAML syntax and a table
        document, not APISIX resource schema. Host, Docker and Podman scopes
        are supported when explicitly selected; container scope requires the
        full lowercase 64-hex ID. The selected source must already exist as
        a readable regular non-symlink file.
        The caller supplies the whole intended configuration, not a resource
        fragment. On the target, a per-file lock serializes apply calls
        through this adapter, a baseline copy detects content/metadata changes
        while staging, and `mv` atomically publishes a same-directory staged
        file. `cp -p` preserves source ownership and mode where permitted.
        Success means the file was atomically replaced; it does not prove
        APISIX accepted the schema, resolved substitutions or reloaded it, or
        that the selected file is loaded by a running instance. REST apply is
        unsupported and never falls back to legacy.
        Router status 2 wraps invalid operator context and status 3 reports
        an unsupported adapter. The JSON adapter uses statuses 1-10 for
        arguments/context, adapter, path, scope/container, missing json,
        temporary storage, input read, invalid JSON and remote-source
        creation. The YAML adapter uses statuses 1-7 for arguments/context,
        adapter, installation home, data path, scope and remote-source
        creation. Context failures include their original status in the
        diagnostic. Remote status 92 reports an
        invalid publisher format, status 98 an invalid internal publisher
        mode; statuses 80-91 identify
        shared path/source/lock/staging/metadata/concurrency/publication
        failures; YAML additionally uses 93-97 for home, marker read, missing
        #END, parser unavailability or invalid YAML. A stale lock left after
        an uncatchable interruption is not removed automatically; inspect it
        and confirm no writer is active before removing it.
        For standalone API mode, select RSUDO_APISIX_DEPLOYMENT=standalone-api,
        host scope, Admin URL and protected header file. Supply a digest token
        operand and the complete JSON snapshot on stdin. The caller controls
        all *_conf_version fields; no automatic version calculation occurs.
        RSUDO_APISIX_WAIT_MS defaults to 0 and is limited to 60000. HTTP 202
        means accepted but not confirmed applied; positive wait can return 200
        after worker confirmation or 202 at timeout. HTTP 202 preserves its
        response body and returns distinct status 97 (accepted, not confirmed);
        HTTP 200/204 return zero. Remote status 96 means the private response
        staging file could not be created; 98 reports response-file or
        unexpected HTTP status failure. Snapshot statuses
        1-12 cover arguments, digest, wait, context, adapter, scope, json,
        temp storage, input, JSON validity, Admin URL and static-source setup;
        remote transport/precondition statuses are 84-95; 96 is private
        response staging failure, 97 is accepted but not confirmed, and 98 is
        response-file or unexpected HTTP status failure.

    rsudo_mod_apisix_request relative-admin-path [method]
        Advanced request through the selected host-scoped traditional Admin
        REST adapter. The path is relative to /apisix/admin, uses nonempty
        slash-separated ASCII alphanumeric/dot/underscore/tilde/hyphen
        segments, and cannot contain dot or dot-dot segments, query strings,
        fragments, or a leading/trailing slash. Method defaults to GET; only
        GET, POST, PUT and DELETE are accepted. POST/PUT read a JSON request
        body from stdin; DELETE and GET send no body. It uses the same
        protected header file and curl TLS/proxy/redirect controls as typed
        REST operations. This intentionally exposes other Admin API endpoints
        selected by the operator; APISIX enforces endpoint permissions and
        schema. Local statuses 1-9 identify invalid arguments, path, method,
        adapter, scope, Admin URL, authority, operator context and remote
        source creation. No non-REST or legacy fallback is attempted.

    rsudo_mod_apisix_context
        Read-only, local inspection of the caller's EXPLICIT environment
        selection; it performs no discovery, connection, authentication or
        APISIX action. Current required variables:
          RSUDO_APISIX_SCOPE = host | docker | podman
          RSUDO_APISIX_DEPLOYMENT = traditional-admin | standalone-api |
              standalone-file-yaml | standalone-file-json | no-admin-data-plane
        For Docker/Podman, RSUDO_APISIX_CONTAINER_ID must be a complete
        lowercase 64-hex container ID; it must be absent for host scope.
        RSUDO_APISIX_HOME, when present, must be absolute.
        For file-driven modes, RSUDO_APISIX_DATA_FILE must be absolute.
        For traditional-admin and standalone-api, both
        RSUDO_APISIX_ADMIN_URL (http(s) absolute URL) and
        RSUDO_APISIX_HEADER_FILE (absolute protected remote-header pathname)
        are required. These are operator declarations, not endpoint or
        credential provenance proofs. The context returns
        selection=operator-supplied-unverified, scope, deployment, adapter
        (rest, snapshot, file-yaml, file-json, none), optional supplied
        paths/IDs, plus Admin-URL and credential-file configured/not-configured statuses; the URL itself is not printed.
        It NEVER outputs the credential contents.
        Invalid arguments 1, scope 2, unsupported deployment 3,
        home 4, container on host 5, container ID characters 6,
        container ID length 7, missing data path 8, Admin URL 9,
        credential-header path 10, embedded field delimiters 11.
        The mapping is only a first adapter selector. Generic modern
        context itself performs no list/get/create/update/delete operation.

    rsudo_mod_apisix_discovery [absolute-remote-scan-root]
        Read-only best-effort host inventory. The scan root defaults to / and
        must be an existing readable absolute directory. Its five-column
        tab-separated stdout is: kind, scope, state, identifier, evidence.
        Each candidate configuration is one row; multiple installations or
        profiles are returned rather than rejected. The initial host phase
        uses find to discover conf/config.yaml, conf/config-*.yaml,
        conf/apisix.yaml and conf/apisix.json under plausible APISIX roots;
        it also emits candidate nginx master PIDs seen through ps and may
        correlate a configuration path to a matching process prefix. If
        systemctl is available, loaded APISIX-matching units and APISIX-named
        service unit files are returned with manager state. For an active
        loaded unit, MainPID is compared with the observed APISIX nginx master
        PID; matching cgroup evidence is added when readable. This is process
        correlation only, not proof of loaded APISIX configuration. For YAML
        files, only numeric ports nested beneath admin_listen are considered.
        JSON files are validated and queried with the standalone RumiAI json
        command for deployment.admin.admin_listen.ip and .port. No jq/Python
        dependency is introduced; if json is unavailable on the remote target
        or parsing fails, an uncertainty row is returned. JSON snapshots that
        lack deployment/admin listener settings yield no endpoint. A TCP probe
        is attempted with nc only for loopback/wildcard binds or an address
        confirmed local by ip; remote bind addresses are reported without
        probing. For container YAML or JSON, the same targeted probe runs inside
        that container's network namespace; JSON requires the json command in
        the container. Its result is scoped by manager
        and full ID. Results are open/not-open/unavailable evidence, not
        APISIX identity. It skips
        /proc, /sys, /dev, /run and common container storage on an unrestricted
        root scan. These are process/configuration *candidates*, not proof of
        runtime identity, loaded source or write readiness.
        An unreadable subtree may be omitted. When Docker or Podman is
        available, discovery lists all containers and probes each running
        container through a static read-only sh/find program. For each
        discovered running-container config path, manager mount metadata is
        matched by path prefix and may report the corresponding host-side bind
        source. This establishes only declared path mapping, not loaded or
        served configuration. Stopped
        containers are reported from manager image/name evidence or inspected
        config-mount source/destination paths; environment data is never
        inspected. Matching
        running containers with an unavailable probe remain visible. Rows
        identify manager scope and full container ID, with config paths
        qualified by that ID. Failed manager listings and incomplete probes
        produce uncertainty rows. This is best-effort: a stopped container
        whose image and name do not identify APISIX cannot be classified from
        its filesystem. Service correlation is limited to systemd MainPID/
        process evidence. JSON output and guaranteed exhaustive detection
        are NOT implemented. Discovery
        never chooses an instance or modifies the user's environment.
        Local argument count 1, relative root 2; in the remote scan,
        invalid root 1, unavailable root 2, missing find 3. Remote rsudo
        execution status is preserved as a transparent transport result.

    rsudo_mod_apisix_admin_read resource absolute-remote-header-file [remote-port]
        Advanced, read-only Admin API request to remote 127.0.0.1 on the
        selected port (default 9180). Supported resource collections:
        configs, routes, services, upstreams. Outputs the server's raw JSON
        on stdout for HTTP 2xx; curl HTTP failures propagate status 22,
        with error diagnostics on stderr. No writes or redirects.
        A protected regular, non-symlink credential file must already exist
        on the remote machine, be readable by rsudo's target user, have no
        group/other permissions, and contain one newline-terminated line:
        X-API-KEY: <non-whitespace-key>
        This is a deliberately explicit intermediate interface, not
        automatic authentication discovery. The key is never passed as
        curl/rsudo command-line text: curl loads the existing header file
        via -H @file. Curl >= 7.55 with -H @file and shell sh are remote
        prerequisites; the normal selected target must provide curl.
        Only the loopback Admin listener may be addressed. Port and resource
        are strictly checked and no HTTP proxy or redirect is used.
        The resource name selects an endpoint; the operation does NOT
        establish the active APISIX backend or assert that a response from
        another service belongs to the selected APISIX instance.
        Explicit backend verification and low-operand routing for other
        adapters remain under development. Do not expose this interface
        to untrusted values or treat a successful GET as write readiness.
        Invalid arguments, credential paths/permissions/format, unsupported
        resource, port and curl availability have distinct status 44-51.

    rsudo_mod_apisix_runtime [absolute-remote-apisix-home [full-docker-container-id]]
        Read-only process evidence for an automatically or explicitly selected
        APISIX installation. With no arguments, the resolver examines the
        conventional /usr/local/apisix/conf/nginx.conf location on the remote
        host and inside every running Docker container accessible through
        the remote manager. It accepts exactly one ordinary, readable,
        non-symlink generated-config candidate; the real master must then
        be observable, not merely have a configuration file on disk.
        An inaccessible Docker listing, invalid manager records, no candidate
        or multiple candidates fail closed (statuses 45-49). A failed
        container probe, missing container shell or container disappearing
        during the scan is an error (52), not proof of no APISIX candidate.
        An unsafe/unreadable Docker generated configuration fails with 53;
        the corresponding unsafe host configuration fails with 55.
        A discovered candidate lacking a verified master fails with 51;
        unexpected observation output fails with 54. These status codes
        apply to no-operand discovery; explicit runtime still preserves its
        documented pidfile-missing observation. If Docker is absent, an
        observed conventional host candidate may still be checked.
        On Linux the host probe also scans readable procfs command lines
        whose processes share the observer's PID and mount namespaces.
        An observed master with one safe absolute -p root and an ordinary
        generated nginx.conf can select a nonconventional host installation.
        More than one host master fails status 64, invalid/unresolved
        prefixes fail 61, missing generated config fails 62, unsafe
        generated config fails 63, failed scan fails 65, and unreadable
        observer namespaces fail 66. A malformed reselected host path
        fails status 67. If procfs, tr or readlink is unavailable, host
        discovery remains limited to the conventional path. The new
        result prefixes host runtime evidence with:
        discovery_evidence=unique-process-prefix-candidate
        discovered_scope=host
        installation_root=<absolute-process-prefix>
        This is a best-effort process observation, not a verified
        service-manager unit or effective configuration identity.
        On Linux the Docker probe scans readable procfs command lines for
        nginx/OpenResty masters, including daemonized masters with PID != 1.
        One observed master can advertise a safe absolute -p prefix.
        This permits automatic observation
        of one nonconventional Docker root when its generated nginx.conf and
        actual master/pidfile can be checked there. The process title is
        never printed. A malformed/unsafe discovered prefix fails status 56;
        an invalid rechecked selection fails status 57. If the visible
        master advertises -p but its generated nginx.conf is missing,
        discovery fails status 58, not as an absent container candidate.
        Multiple observed masters inside one container fail status 59
        rather than selecting an arbitrary process. A failed procfs
        command-line read during the scan fails status 60.
        For a nonconventional Docker root the success prefix is:
        discovery_evidence=unique-process-prefix-candidate
        discovered_scope=docker
        container_id=<full-id>
        installation_root=<absolute-process-prefix>
        Otherwise the prefix remains discovery_evidence=unique-conventional-candidate
        with discovered_scope=host|docker and a Docker container_id as before.
        A nonconventional host root uses process-prefix provenance without
        a container_id.
        This is best-effort discovery, not a proof that arbitrary hosts,
        service managers, unobservable processes or external namespaces
        do not exist. Host process filtering deliberately excludes
        nonmatching PID/mount namespaces and is not comprehensive service
        discovery. Docker candidates require docker exec/sh;
        process-selected roots require readable Linux procfs master
        command-line evidence. Scanning is not a complete process census.
        No files or HTTP resources are changed.
        Checks generated conf/nginx.conf and logs/nginx.pid, then observes
        the PID through POSIX ps or guarded Linux /proc/<pid>/cmdline where
        minimal containers lack ps. A namespaced master may have PID 1.
        Both paths require an nginx/OpenResty master process title.
        Supports both the APISIX CLI -p/-c invocation and the official
        Docker foreground -p/-g invocation for the generated default config.
        An optional explicit full lowercase 64-hex Docker container ID
        selects the remote container's process/filesystem namespace through
        the remote Docker manager (docker exec -i sh). This requires an
        authorized, running container, accessible remote Docker CLI and sh
        inside that container; abbreviated IDs, names and Docker options
        are rejected locally with status 44. Omitting the container ID
        preserves host-scoped process observation. The selected installation
        prefix must match the master in the observed namespace.
        Raw process arguments are never printed or logged. Missing PID file reports
        runtime_evidence=pidfile-missing, runtime_identity=unverified and
        mutation_readiness=not-established, without claiming stopped state.
        A matching master reports runtime_evidence=pidfile-and-master-args,
        process_pid=<pid>, runtime_identity=process-consistent-config-unverified,
        mutation_readiness=not-established. On Linux host-scoped inspection,
        an additional read-only systemd attribution is printed only when
        the master's kernel cgroup v2 membership identifies a valid service
        unit and systemctl independently confirms matching Id, MainPID,
        ControlGroup and ActiveState=active. The optional records between
        process_pid and runtime_identity are:
        service_manager_evidence=systemd-mainpid-and-cgroup
        service_unit=<systemd-service-unit>
        On Linux, a separate optional socket-ownership observation is
        emitted only when procfs and awk/readlink can independently match
        a unique LISTEN 127.0.0.1:9180 TCP socket inode from the selected
        master's own network namespace to one of that master's FDs:
        listener_socket_evidence=master-fd-loopback-tcp
        listener_socket=127.0.0.1:9180
        It applies to either host or selected Docker namespace; a foreign
        listener on the same port does not qualify. Missing/ambiguous/
        unreadable socket evidence leaves these two fields absent, not an
        error. The records are placed after any optional service fields
        and before runtime_identity. This is kernel TCP ownership only:
        it does not establish an Admin HTTP handler, its credentials or
        whether the active source/profile matches an on-disk YAML file.
        If procfs/cgroup v2/systemctl is unavailable or the records do not
        agree, these fields are omitted rather than claiming service
        identity. Docker observation never queries a possibly host-mounted
        service manager. No unit execution arguments or config are printed;
        even positive unit matching does not establish effective APISIX
        source/profile, Admin listener or mutation readiness.
        Invalid/unsafe/mismatching
        evidence fails non-zero with branch-specific diagnostics (status 30-43).
        A PID file and process title are insufficient to prove the running
        config.yaml, custom -c, APISIX_PROFILE or effective Admin listener.
        The optional Docker selector scopes observation through the remote
        manager; automatic conventional-root discovery does not establish
        what the gateway actually loaded or which Admin listener it owns.
        The observable runtime identity remains config-unverified.
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
    rsudo_mod_apisix_get resource resource-id — selected REST GET
    rsudo_mod_apisix_put resource_path JSON_body — legacy PUT request
    rsudo_mod_apisix_post resource_path JSON_body — legacy POST request
    rsudo_mod_apisix_del resource_path — legacy DELETE request
    rsudo_mod_apisix_delete resource_kind id — status 1 until a safe backend is implemented; no legacy fallback
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
    rsudo_mod_apisix_create resource_kind ... — status 1 until a safe backend is implemented; no legacy fallback
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
