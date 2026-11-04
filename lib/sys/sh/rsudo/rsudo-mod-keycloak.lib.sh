# Compatibility bridge while the new keycloak administration module is developed.
# The legacy source is preserved under a separate dispatcher identity.
# Replace individual entrypoints here only when their new semantics and tests are ready.

loadsyslib "rsudo/rsudo-mod-keycloaklegacy" || return 1

rsudo_mod_keycloak_set_auth_vars()
{
  rsudo_mod_keycloaklegacy_set_auth_vars "$@"
}

rsudo_mod_keycloak_access_token()
{
  rsudo_mod_keycloaklegacy_access_token "$@"
}

rsudo_mod_keycloak_access_token_set()
{
  rsudo_mod_keycloaklegacy_access_token_set "$@"
}

rsudo_mod_keycloak_api___()
{
  rsudo_mod_keycloaklegacy_api___ "$@"
}

rsudo_mod_keycloak_api()
{
  rsudo_mod_keycloaklegacy_api "$@"
}

rsudo_mod_keycloak_method_get()
{
  rsudo_mod_keycloaklegacy_method_get "$@"
}

rsudo_mod_keycloak_method_put()
{
  rsudo_mod_keycloaklegacy_method_put "$@"
}

rsudo_mod_keycloak_method_post()
{
  rsudo_mod_keycloaklegacy_method_post "$@"
}

rsudo_mod_keycloak_method_delete()
{
  rsudo_mod_keycloaklegacy_method_delete "$@"
}

rsudo_mod_keycloak_delete()
{
  rsudo_mod_keycloaklegacy_delete "$@"
}

rsudo_mod_keycloak_delete_client()
{
  rsudo_mod_keycloaklegacy_delete_client "$@"
}

rsudo_mod_keycloak_create()
{
  rsudo_mod_keycloaklegacy_create "$@"
}

rsudo_mod_keycloak_create_client()
{
  rsudo_mod_keycloaklegacy_create_client "$@"
}

rsudo_mod_keycloak_get()
{
  rsudo_mod_keycloaklegacy_get "$@"
}

rsudo_mod_keycloak_get_client()
{
  rsudo_mod_keycloaklegacy_get_client "$@"
}

rsudo_mod_keycloak_update()
{
  rsudo_mod_keycloaklegacy_update "$@"
}

# K04: credential-safe administrative token acquisition and store inspection.
# SSH/sudo transport is owned by rsudo. The remote program below is static
# shell source; only non-secret selectors and protected remote file names
# cross in argv. Token/secret bytes remain on the selected remote system.
_rsudo_mod_keycloak_auth_invalid()
{
  log error keycloak auth-invalid-option
  return 64
}

rsudo_mod_keycloak_auth()
(
  [ "$#" -gt 0 ] || {
    log error keycloak auth-missing-action
    exit 64
  }
  action=$1
  shift
  case "$action" in
    acquire|status) : ;;
    refresh|revoke)
      log error keycloak auth-lifecycle-not-implemented action "$action"
      exit 73
      ;;
    *)
      log error keycloak auth-unknown-action action "$action"
      exit 64
      ;;
  esac

  server= issuer= client= method= secret_file= token_store= token_file= ca_file=
  auth_mode=
  while [ "$#" -gt 0 ]
  do
    [ "$#" -ge 2 ] || {
      log error keycloak auth-option-missing-value option "$1"
      exit 64
    }
    option=$1
    value=$2
    shift 2
    case "$option" in
      --server) server=$value ;;
      --issuer-realm) issuer=$value ;;
      --client-id) client=$value ;;
      --client-auth) method=$value ;;
      --auth-mode) auth_mode=$value ;;
      --client-secret-file) secret_file=$value ;;
      --token-store) token_store=$value ;;
      --token-file) token_file=$value ;;
      --ca-file) ca_file=$value ;;
      *)
        _rsudo_mod_keycloak_auth_invalid "$option"
        exit 64
        ;;
    esac
  done

  case "$action" in
    acquire)
      [ "$auth_mode" = client-credentials ] || {
        log error keycloak auth-grant-unimplemented
        exit 73
      }
      case "$method" in
        client-secret-basic|client-secret-post) : ;;
        *) log error keycloak auth-client-method-unimplemented; exit 73 ;;
      esac
      [ -n "$issuer" ] && [ -n "$client" ] || {
        log error keycloak auth-missing-client-or-issuer
        exit 64
      }
      [ -n "$secret_file" ] && [ -n "$token_store" ] || {
        log error keycloak auth-missing-protected-files
        exit 70
      }
      ;;
    status)
      [ -n "$token_file" ] || {
        log error keycloak auth-missing-token-file
        exit 70
      }
      [ -z "$auth_mode" ] && [ -z "$method" ] &&
        [ -z "$secret_file" ] && [ -z "$token_store" ] || {
        log error keycloak auth-status-incompatible-options
        exit 64
      }
      ;;
  esac

  for selected in "$secret_file" "$token_store" "$token_file" "$ca_file"
  do
    [ -z "$selected" ] && continue
    case "$selected" in
      /*) : ;;
      *) log error keycloak auth-nonabsolute-remote-file; exit 70 ;;
    esac
  done
  if [ "$action" = acquire ]
  then
    case "$server" in
      https://?*) : ;;
      *) log error keycloak auth-untrusted-server; exit 65 ;;
    esac
    case "$server" in
      *'?'*|*'#'*|*'@'*|*' '*|*'\\'*)
        log error keycloak auth-invalid-server-url
        exit 65
        ;;
    esac
    case "$server" in
      */) server=${server%/} ;;
    esac
  fi

  # Inherited interactive rsudo mode consumes piped stdin as shell source;
  # this operation requires normal non-interactive source delivery instead.
  RSUDO_INTERACTIVE=
  rsudo -- sh -s -- "$action" "$server" "$issuer" "$client" "$method" \
    "$secret_file" "$token_store" "$token_file" "$ca_file" <<'KEYCLOAK_AUTH_REMOTE'
action=$1
server=$2
issuer=$3
client=$4
method=$5
secret_file=$6
token_store=$7
token_file=$8
ca_file=$9

umask 077
auth_error()
{
  printf 'keycloak.auth.%s\n' "$1" >&2
}
private_directory()
{
  directory=$1
  [ -d "$directory" ] && [ ! -L "$directory" ] || return 1
  mode=$(LC_ALL=C ls -ld "$directory" 2>/dev/null) || return 1
  mode=${mode%% *}
  case "$mode" in
    d?????????) : ;;
    *) return 1 ;;
  esac
  # Group/other may read a CA directory but may never replace a secret file.
  [ "$(printf '%s' "$mode" | cut -c 6)" = '-' ] &&
    [ "$(printf '%s' "$mode" | cut -c 9)" = '-' ]
}
private_file()
{
  file=$1
  [ -f "$file" ] && [ -r "$file" ] && [ ! -L "$file" ] || return 1
  parent=${file%/*}
  [ -n "$parent" ] || parent=/
  private_directory "$parent" || return 1
  mode=$(LC_ALL=C ls -ld "$file" 2>/dev/null) || return 1
  mode=${mode%% *}
  case "$mode" in
    ????------) : ;;
    *) return 1 ;;
  esac
}
safe_curl()
{
  if [ -n "$ca_file" ]
  then
    curl -q --silent --show-error --noproxy '*' --proxy '' \
      --proto '=https' --proto-redir '=https' --max-redirs 0 \
      --connect-timeout 5 --max-time 25 --cacert "$ca_file" "$@"
  else
    curl -q --silent --show-error --noproxy '*' --proxy '' \
      --proto '=https' --proto-redir '=https' --max-redirs 0 \
      --connect-timeout 5 --max-time 25 "$@"
  fi
}

curl_failure()
{
  stage=$1
  code=$2
  case "$code" in
    28) auth_error "$stage-timeout"; exit 77 ;;
    35|51|58|60|77|83|90) auth_error "$stage-tls-failed"; exit 75 ;;
    *) auth_error "$stage-transport-failed"; exit 76 ;;
  esac
}

command -v curl >/dev/null 2>&1 || {
  auth_error curl-unavailable
  exit 89
}
command -v jq >/dev/null 2>&1 || {
  auth_error jq-unavailable
  exit 89
}
[ -z "$ca_file" ] || {
  [ -f "$ca_file" ] && [ -r "$ca_file" ] && [ ! -L "$ca_file" ] || {
    auth_error ca-file-unavailable
    exit 75
  }
}

if [ "$action" = status ]
then
  private_file "$token_file" || {
    auth_error token-file-unavailable-or-insecure
    exit 70
  }
  jq -e '(.access_token | type == "string" and length > 0)' \
    "$token_file" >/dev/null 2>&1 || {
    auth_error token-store-invalid
    exit 86
  }
  # Does not assert expiry, revocation, issuer or Admin REST authorization.
  printf '{"stored":true,"server_validated":false}\n'
  exit 0
fi

private_file "$secret_file" || {
  auth_error client-secret-file-unavailable-or-insecure
  exit 70
}
parent=${token_store%/*}
[ -n "$parent" ] || parent=/
private_directory "$parent" || {
  auth_error token-store-directory-untrusted
  exit 87
}
[ ! -e "$token_store" ] && [ ! -L "$token_store" ] || {
  auth_error token-store-already-exists
  exit 87
}
command -v mktemp >/dev/null 2>&1 || {
  auth_error mktemp-unavailable
  exit 89
}

tmp=$(mktemp -d "${TMPDIR:-/tmp}/keycloak-auth.XXXXXXXX") || {
  auth_error temporary-directory-unavailable
  exit 87
}
cleanup()
{
  rm -rf -- "$tmp"
}
trap cleanup 0
trap 'exit 88' 1 2 3 15

encoded_issuer=$(jq -rn --arg realm "$issuer" '$realm | @uri') || {
  auth_error invalid-issuer
  exit 67
}
expected_issuer="$server/realms/$encoded_issuer"
discovery="$expected_issuer/.well-known/openid-configuration"
expected_token_endpoint="$expected_issuer/protocol/openid-connect/token"

# No automatic redirect, proxy or origin change is permitted for credentials.
discovery_code=$(safe_curl --output "$tmp/discovery" \
  --write-out '%{http_code}' --url "$discovery") || {
  curl_failure discovery "$?"
}
[ "$discovery_code" = 200 ] || {
  auth_error discovery-http-failed
  exit 67
}
jq -e --arg expected "$expected_issuer" '.issuer == $expected' \
  "$tmp/discovery" >/dev/null 2>&1 || {
  auth_error issuer-mismatch
  exit 67
}
jq -e --arg expected "$expected_token_endpoint" \
  '.token_endpoint == $expected' "$tmp/discovery" >/dev/null 2>&1 || {
  auth_error token-endpoint-mismatch
  exit 67
}

# Only a single newline-terminated graphic secret is accepted. This also
# detects embedded NUL and control-byte tricks that shell read might discard.
[ "$(wc -l < "$secret_file")" -eq 1 ] 2>/dev/null || {
  auth_error secret-file-format-invalid
  exit 70
}
secret=$(cat "$secret_file") || {
  auth_error secret-file-read-failed
  exit 70
}
case "$secret" in
  ''|*[![:graph:]]*)
    auth_error secret-file-format-invalid
    exit 70
    ;;
esac
[ "$(printf '%s\n' "$secret" | wc -c)" -eq \
  "$(wc -c < "$secret_file")" ] 2>/dev/null || {
  auth_error secret-file-bytes-invalid
  exit 70
}

set -- --output "$tmp/response" --write-out '%{http_code}' \
  --header 'Accept: application/json' \
  --data-urlencode 'grant_type=client_credentials'
case "$method" in
  client-secret-basic)
    case "$client" in
      *:*) auth_error client-basic-id-invalid; exit 64 ;;
    esac
    command -v base64 >/dev/null 2>&1 || {
      auth_error base64-unavailable
      exit 89
    }
    basic=$(printf '%s:%s' "$client" "$secret" | base64 | tr -d '\r\n') || {
      auth_error basic-encoding-failed
      exit 90
    }
    printf 'Authorization: Basic %s\n' "$basic" > "$tmp/basic-header" || exit 87
    unset basic secret
    set -- "$@" --header "@$tmp/basic-header"
    ;;
  client-secret-post)
    printf '%s' "$secret" > "$tmp/secret-data" || exit 87
    unset secret
    set -- "$@" --data-urlencode "client_id=$client" \
      --data-urlencode "client_secret@$tmp/secret-data"
    ;;
esac

http_code=$(safe_curl "$@" --url "$expected_token_endpoint") || {
  curl_failure token "$?"
}
case "$http_code" in
  200) : ;;
  400|401)
    if jq -e '.error == "invalid_client"' "$tmp/response" >/dev/null 2>&1
    then
      auth_error client-authentication-denied
      exit 71
    fi
    auth_error oauth-grant-denied
    exit 72
    ;;
  403) auth_error token-http-forbidden; exit 80 ;;
  429) auth_error token-rate-limited; exit 83 ;;
  5??) auth_error token-server-error; exit 85 ;;
  *) auth_error token-unexpected-http; exit 86 ;;
esac
jq -e '(.access_token | type == "string" and length > 0) and
  (.token_type == "Bearer") and
  (.expires_in | type == "number" and . > 0)' \
  "$tmp/response" >/dev/null 2>&1 || {
  auth_error token-response-invalid
  exit 86
}

# Exclusive-new-store baseline. Existing stores require explicit lifecycle
# handling; do not silently replace a concurrent writer or follow symlinks.
[ ! -e "$token_store" ] && [ ! -L "$token_store" ] || {
  auth_error token-store-race
  exit 87
}
staged=$(mktemp "$parent/.keycloak-token.XXXXXXXX") || {
  auth_error token-stage-failed
  exit 87
}
chmod 600 "$staged" || { rm -f -- "$staged"; exit 87; }
cp "$tmp/response" "$staged" || { rm -f -- "$staged"; exit 87; }
if [ -e "$token_store" ] || [ -L "$token_store" ]
then
  rm -f -- "$staged"
  auth_error token-store-race
  exit 87
fi
# This parent-directory check prevents untrusted local rename races for the
# ordinary case; K04 still needs an authentic same-host concurrency audit.
mv -- "$staged" "$token_store" || {
  rm -f -- "$staged"
  auth_error token-store-publish-failed
  exit 87
}
printf '{"stored":true,"grant":"client_credentials","server_validated":false}\n'
KEYCLOAK_AUTH_REMOTE
)
