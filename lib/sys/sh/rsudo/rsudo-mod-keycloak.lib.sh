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
    acquire|refresh|status|revoke) : ;;
    *)
      log error keycloak auth-unknown-action action "$action"
      exit 64
      ;;
  esac

  server= issuer= client= method= secret_file= token_store= token_file= ca_file=
  private_key_file= certificate_file=
  auth_mode= username= password_file= token_type_hint= client_jwt_alg=
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
      --client-jwt-alg) client_jwt_alg=$value ;;
      --auth-mode) auth_mode=$value ;;
      --client-secret-file) secret_file=$value ;;
      --private-key-file) private_key_file=$value ;;
      --certificate-file) certificate_file=$value ;;
      --username) username=$value ;;
      --password-file) password_file=$value ;;
      --token-store) token_store=$value ;;
      --token-file) token_file=$value ;;
      --token-type-hint) token_type_hint=$value ;;
      --ca-file) ca_file=$value ;;
      *)
        _rsudo_mod_keycloak_auth_invalid "$option"
        exit 64
        ;;
    esac
  done

  case "$action" in
    acquire)
      [ -z "$token_file" ] && [ -z "$token_type_hint" ] || {
        log error keycloak auth-acquire-incompatible-token-selector
        exit 64
      }
      case "$auth_mode" in
        client-credentials|password) : ;;
        *) log error keycloak auth-grant-unimplemented; exit 73 ;;
      esac
      case "$method" in
        client-secret-basic|client-secret-post|client-secret-jwt|private-key-jwt) : ;;
        *) log error keycloak auth-client-method-unimplemented; exit 73 ;;
      esac
      [ -n "$issuer" ] && [ -n "$client" ] || {
        log error keycloak auth-missing-client-or-issuer
        exit 64
      }
      [ -n "$token_store" ] || {
        log error keycloak auth-missing-protected-files
        exit 70
      }
      if [ "$auth_mode" = password ]
      then
        [ -n "$username" ] || {
          log error keycloak auth-password-missing-username
          exit 64
        }
        [ -n "$password_file" ] || {
          log error keycloak auth-password-missing-secret-file
          exit 70
        }
      else
        [ -z "$username" ] && [ -z "$password_file" ] || {
          log error keycloak auth-client-credentials-with-user-parameters
          exit 64
        }
      fi
      ;;
    refresh)
      [ -z "$auth_mode" ] && [ -z "$username" ] &&
        [ -z "$password_file" ] && [ -z "$token_type_hint" ] || {
        log error keycloak auth-refresh-incompatible-options
        exit 64
      }
      case "$method" in
        client-secret-basic|client-secret-post|client-secret-jwt|private-key-jwt) : ;;
        *) log error keycloak auth-refresh-client-method-unsupported; exit 73 ;;
      esac
      [ -n "$issuer" ] && [ -n "$client" ] &&
        [ -n "$token_file" ] &&
        [ -n "$token_store" ] && [ "$token_file" = "$token_store" ] || {
        log error keycloak auth-refresh-requires-same-store
        exit 70
      }
      ;;
    revoke)
      [ -z "$auth_mode" ] && [ -z "$username" ] &&
        [ -z "$password_file" ] && [ -z "$token_store" ] || {
        log error keycloak auth-revoke-incompatible-options
        exit 64
      }
      case "$method" in
        client-secret-basic|client-secret-post|client-secret-jwt|private-key-jwt) : ;;
        *) log error keycloak auth-revoke-client-method-unsupported; exit 73 ;;
      esac
      [ -n "$issuer" ] && [ -n "$client" ] || {
        log error keycloak auth-revoke-missing-client-or-issuer
        exit 64
      }
      [ -n "$token_file" ] || {
        log error keycloak auth-revoke-missing-protected-files
        exit 70
      }
      case "$token_type_hint" in
        access_token|refresh_token) : ;;
        *) log error keycloak auth-revoke-token-hint-invalid; exit 64 ;;
      esac
      ;;
    status)
      [ -n "$token_file" ] || {
        log error keycloak auth-missing-token-file
        exit 70
      }
      [ -z "$auth_mode" ] && [ -z "$token_store" ] &&
        [ -z "$username" ] && [ -z "$password_file" ] &&
        [ -z "$token_type_hint" ] || {
        log error keycloak auth-status-incompatible-options
        exit 64
      }
      if [ -n "$server" ] || [ -n "$issuer" ] || [ -n "$client" ] ||
        [ -n "$method" ] || [ -n "$secret_file" ] || [ -n "$ca_file" ] ||
        [ -n "$private_key_file" ] || [ -n "$certificate_file" ]
      then
        [ -n "$server" ] && [ -n "$issuer" ] && [ -n "$client" ] &&
          [ -n "$method" ] || {
          log error keycloak auth-status-incomplete-introspection-context
          exit 64
        }
        case "$method" in
          client-secret-basic|client-secret-post|client-secret-jwt|private-key-jwt) : ;;
          *) log error keycloak auth-status-client-method-unsupported; exit 73 ;;
        esac
      fi
      ;;
  esac

  # The authenticator determines which credentials are valid. A selected
  # algorithm is never retried or silently changed on server rejection.
  case "$method" in
    client-secret-jwt)
      [ -z "$private_key_file" ] && [ -z "$certificate_file" ] || {
        log error keycloak auth-client-jwt-credential-mismatch
        exit 64
      }
      [ -n "$secret_file" ] || {
        log error keycloak auth-client-secret-missing
        exit 70
      }
      [ -n "$client_jwt_alg" ] || client_jwt_alg=HS256
      case "$client_jwt_alg" in
        HS256|HS384|HS512) : ;;
        *) log error keycloak auth-client-jwt-alg-unsupported; exit 73 ;;
      esac
      ;;
    private-key-jwt)
      [ -z "$secret_file" ] || {
        log error keycloak auth-private-key-secret-incompatible
        exit 64
      }
      [ -n "$private_key_file" ] && [ -n "$certificate_file" ] || {
        log error keycloak auth-private-key-files-missing
        exit 70
      }
      [ -n "$client_jwt_alg" ] || client_jwt_alg=RS256
      case "$client_jwt_alg" in
        RS256|RS384|RS512|PS256|PS384|PS512|ES256|ES384|ES512) : ;;
        *) log error keycloak auth-private-key-alg-unsupported; exit 73 ;;
      esac
      ;;
    *)
      [ -z "$client_jwt_alg" ] && [ -z "$private_key_file" ] &&
        [ -z "$certificate_file" ] || {
        log error keycloak auth-client-credentials-incompatible
        exit 64
      }
      if [ "$action" != status ] || [ -n "$server" ]
      then
        [ -n "$secret_file" ] || {
          log error keycloak auth-client-secret-missing
          exit 70
        }
      fi
      ;;
  esac

  for selected in "$secret_file" "$token_store" "$token_file" "$ca_file" "$password_file" "$private_key_file" "$certificate_file"
  do
    [ -z "$selected" ] && continue
    case "$selected" in
      /*) : ;;
      *) log error keycloak auth-nonabsolute-remote-file; exit 70 ;;
    esac
  done
  if [ "$action" != status ] || [ -n "$server" ]
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
    "$secret_file" "$token_store" "$token_file" "$ca_file" \
    "$auth_mode" "$username" "$password_file" "$token_type_hint" \
    "$client_jwt_alg" "$private_key_file" "$certificate_file" <<'KEYCLOAK_AUTH_REMOTE'
action=$1
server=$2
issuer=$3
client=$4
method=$5
secret_file=$6
token_store=$7
token_file=$8
ca_file=$9
auth_mode=${10}
username=${11}
password_file=${12}
token_type_hint=${13}
client_jwt_alg=${14}
private_key_file=${15}
certificate_file=${16}

umask 077
auth_error()
{
  printf 'keycloak.auth.%s\n' "$1" >&2
}
# Validate every component, not only the basename: otherwise a symlink
# in /trusted/link/secret can bypass the final-file check.
private_path()
{
  pathname=$1
  case "$pathname" in
    /*) : ;;
    *) return 1 ;;
  esac
  case "$pathname" in
    /|*/|*'//'*) return 1 ;;
  esac
  rest=${pathname#/}
  prefix=
  while [ -n "$rest" ]
  do
    component=${rest%%/*}
    case "$component" in
      ''|.|..) return 1 ;;
    esac
    prefix="$prefix/$component"
    [ ! -L "$prefix" ] || return 1
    if [ "$component" = "$rest" ]
    then
      break
    fi
    [ -d "$prefix" ] || return 1
    rest=${rest#*/}
  done
}
# A private file or its immediate parent must belong to the effective sudo
# identity. Numeric ls -n and id -u are portable to supported POSIX hosts.
private_owner()
{
  file_owner=$(LC_ALL=C ls -ldn "$1" 2>/dev/null | awk '{print $3}') || return 1
  [ -n "$file_owner" ] && [ "$file_owner" = "$(id -u)" ]
}
private_directory()
{
  directory=$1
  private_path "$directory" || return 1
  [ -d "$directory" ] && [ ! -L "$directory" ] || return 1
  private_owner "$directory" || return 1
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
  private_path "$file" || return 1
  [ -f "$file" ] && [ -r "$file" ] && [ ! -L "$file" ] || return 1
  private_owner "$file" || return 1
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
  private_path "$ca_file" &&
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
  if [ -z "$server" ]
  then
    # Does not assert expiry, revocation, issuer or Admin REST authorization.
    printf '{"stored":true,"server_validated":false}\n'
    exit 0
  fi
  # Explicit issuer/client context requests server-side introspection. The
  # access token remains in a protected file and no provider claims are echoed.
fi

if [ "$method" = private-key-jwt ]
then
  private_file "$private_key_file" || {
    auth_error private-key-file-unavailable-or-insecure
    exit 70
  }
  private_file "$certificate_file" || {
    auth_error certificate-file-unavailable-or-insecure
    exit 70
  }
else
  private_file "$secret_file" || {
    auth_error client-secret-file-unavailable-or-insecure
    exit 70
  }
fi
if [ "$action" = revoke ] || [ "$action" = refresh ]
then
  private_file "$token_file" || {
    auth_error revoke-token-store-unavailable-or-insecure
    exit 70
  }
fi
if [ "$auth_mode" = password ]
then
  private_file "$password_file" || {
    auth_error user-password-file-unavailable-or-insecure
    exit 70
  }
fi
if [ "$action" = acquire ] || [ "$action" = refresh ]
then
  parent=${token_store%/*}
  [ -n "$parent" ] || parent=/
  private_directory "$parent" || {
    auth_error token-store-directory-untrusted
    exit 87
  }
  if [ "$action" = acquire ]
  then
    [ ! -e "$token_store" ] && [ ! -L "$token_store" ] || {
      auth_error token-store-already-exists
      exit 87
    }
  fi
fi
command -v mktemp >/dev/null 2>&1 || {
  auth_error mktemp-unavailable
  exit 89
}

tmp=$(mktemp -d "${TMPDIR:-/tmp}/keycloak-auth.XXXXXXXX") || {
  auth_error temporary-directory-unavailable
  exit 87
}
staged=
refresh_lock=
cleanup()
{
  [ -z "$staged" ] || rm -f "$staged"
  rm -rf "$tmp"
  [ -z "$refresh_lock" ] || rmdir "$refresh_lock" 2>/dev/null || :
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
expected_revocation_endpoint="$expected_issuer/protocol/openid-connect/revoke"
expected_introspection_endpoint="$expected_issuer/protocol/openid-connect/token/introspect"

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
if [ "$action" = revoke ]
then
  jq -e --arg expected "$expected_revocation_endpoint" \
    '.revocation_endpoint == $expected' "$tmp/discovery" >/dev/null 2>&1 || {
    auth_error revoke-endpoint-mismatch
    exit 67
  }
fi
if [ "$action" = status ]
then
  jq -e --arg expected "$expected_introspection_endpoint" \
    '.introspection_endpoint == $expected' "$tmp/discovery" >/dev/null 2>&1 || {
    auth_error introspection-endpoint-mismatch
    exit 67
  }
fi

# Read a client secret only for secret-authenticating clients.
if [ "$method" != private-key-jwt ]
then
  # One newline-terminated graphic secret: do not lose NUL/control bytes.
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
fi

if [ "$action" = refresh ]
then
  # Cooperative refresh writers serialize the complete read/request/publish
  # cycle; never remove a lock left by another caller.
  refresh_lock_path=$token_store.keycloak-refresh-lock
  private_path "$refresh_lock_path" || {
    auth_error refresh-lock-path-invalid
    exit 87
  }
  mkdir "$refresh_lock_path" 2>/dev/null || {
    auth_error refresh-store-busy
    exit 87
  }
  refresh_lock=$refresh_lock_path
  private_file "$token_file" || {
    auth_error refresh-store-changed-or-insecure
    exit 87
  }
  jq -e '(.refresh_token | type == "string" and length > 0)' \
    "$token_file" >/dev/null 2>&1 || {
    auth_error refresh-token-missing
    exit 73
  }
  jq -jr '.refresh_token' "$token_file" > "$tmp/refresh-token" || {
    auth_error refresh-token-extraction-failed
    exit 86
  }
  [ -s "$tmp/refresh-token" ] || {
    auth_error refresh-token-empty
    exit 86
  }
  original_inode=$(ls -id "$token_file" 2>/dev/null | awk '{print $1}') || {
    auth_error refresh-store-identity-unavailable
    exit 87
  }
fi

if [ "$action" = status ]
then
  jq -jr '.access_token' "$token_file" > "$tmp/introspection-token" || {
    auth_error introspection-token-extraction-failed
    exit 86
  }
  [ -s "$tmp/introspection-token" ] || {
    auth_error introspection-token-empty
    exit 86
  }
  set -- --output "$tmp/response" --write-out '%{http_code}' \
    --header 'Accept: application/json' \
    --data-urlencode "token@$tmp/introspection-token" \
    --data-urlencode 'token_type_hint=access_token'
fi
if [ "$action" = revoke ]
then
  # RFC 7009 accepts both kinds. An explicit choice prevents silently
  # revoking a refresh token (which can also revoke client consent).
  jq -e --arg kind "$token_type_hint" \
    '.[$kind] | type == "string" and length > 0' \
    "$token_file" >/dev/null 2>&1 || {
    auth_error revoke-selected-token-missing
    exit 73
  }
  jq -jr --arg kind "$token_type_hint" '.[$kind]' \
    "$token_file" > "$tmp/revoke-token" || {
    auth_error revoke-token-extraction-failed
    exit 86
  }
  [ -s "$tmp/revoke-token" ] || {
    auth_error revoke-token-empty
    exit 86
  }
  set -- --output "$tmp/response" --write-out '%{http_code}' \
    --header 'Accept: application/json' \
    --data-urlencode "token@$tmp/revoke-token" \
    --data-urlencode "token_type_hint=$token_type_hint"
elif [ "$action" = acquire ]
then
  case "$auth_mode" in
    client-credentials) grant_type=client_credentials ;;
    password) grant_type=password ;;
    *) auth_error grant-internal-selection-invalid; exit 90 ;;
  esac
fi

if [ "$auth_mode" = password ]
then
  # Preserve spaces/punctuation in a single-line password without putting
  # its bytes in the curl argv or a shell program. Reject NUL/control loss.
  [ "$(wc -l < "$password_file")" -eq 1 ] 2>/dev/null || {
    auth_error user-password-format-invalid
    exit 70
  }
  password=$(cat "$password_file") || {
    auth_error user-password-read-failed
    exit 70
  }
  [ -n "$password" ] &&
    [ "$(printf '%s\n' "$password" | wc -c)" -eq \
      "$(wc -c < "$password_file")" ] 2>/dev/null || {
    auth_error user-password-bytes-invalid
    exit 70
  }
  printf '%s' "$password" > "$tmp/password-data" || {
    auth_error user-password-private-copy-failed
    exit 87
  }
  unset password
fi

if [ "$action" = refresh ]
then
  set -- --output "$tmp/response" --write-out '%{http_code}' \
    --header 'Accept: application/json' \
    --data-urlencode 'grant_type=refresh_token' \
    --data-urlencode "refresh_token@$tmp/refresh-token"
fi
if [ "$action" = acquire ]
then
  set -- --output "$tmp/response" --write-out '%{http_code}' \
    --header 'Accept: application/json' \
    --data-urlencode "grant_type=$grant_type"
  if [ "$auth_mode" = password ]
  then
    set -- "$@" --data-urlencode "username=$username" \
      --data-urlencode "password@$tmp/password-data"
  fi
fi
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
  client-secret-jwt)
    # Explicit Keycloak client-secret-jwt HS256/HS384/HS512 selection.
    # The HMAC secret, signed assertion and token remain out of argv/stdout.
    command -v python3 >/dev/null 2>&1 || {
      auth_error client-jwt-python-unavailable
      exit 89
    }
    unset secret
    python3 - "$secret_file" "$client" "$expected_issuer" "$client_jwt_alg" \
      > "$tmp/client-assertion" 2>/dev/null <<'K04_CLIENT_JWT_PYTHON'
import base64
import hashlib
import hmac
import json
import secrets
import sys
import time

def b64url(payload):
    return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("ascii")

secret_file, client, audience, algorithm = sys.argv[1:]
digests = {"HS256": hashlib.sha256, "HS384": hashlib.sha384,
           "HS512": hashlib.sha512}
if algorithm not in digests:
    raise ValueError("unsupported signed client algorithm")
with open(secret_file, "rb") as source:
    raw = source.read()
if not raw.endswith(b"\n") or len(raw) < 2 or raw.count(b"\n") != 1:
    raise ValueError("invalid protected client secret")
key = raw[:-1]
now = int(time.time())
header = {"alg": algorithm, "typ": "JWT"}
claims = {
    "iss": client,
    "sub": client,
    "aud": audience,
    "jti": secrets.token_urlsafe(24),
    "iat": now,
    "nbf": now,
    "exp": now + 30,
}
h = b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
p = b64url(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
message = (h + "." + p).encode("ascii")
signature = b64url(hmac.new(key, message, digests[algorithm]).digest())
sys.stdout.write(h + "." + p + "." + signature)
K04_CLIENT_JWT_PYTHON
    jwt_status=$?
    [ "$jwt_status" -eq 0 ] && [ -s "$tmp/client-assertion" ] || {
      auth_error client-jwt-signing-failed
      exit 90
    }
    set -- "$@" --data-urlencode "client_id=$client" \
      --data-urlencode 'client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer' \
      --data-urlencode "client_assertion@$tmp/client-assertion"
    ;;
  private-key-jwt)
    # RSA PKCS#1-v1.5, RSA-PSS and curve-bound ECDSA. Credentials stay on
    # the remote sudo target; the public certificate must match the key.
    command -v openssl >/dev/null 2>&1 || {
      auth_error private-key-openssl-unavailable
      exit 89
    }
    command -v python3 >/dev/null 2>&1 || {
      auth_error private-key-python-unavailable
      exit 89
    }
    command -v cmp >/dev/null 2>&1 || {
      auth_error private-key-compare-unavailable
      exit 89
    }
    openssl x509 -in "$certificate_file" -pubkey -noout \
      > "$tmp/cert-public" 2>/dev/null || {
      auth_error private-key-certificate-invalid
      exit 70
    }
    # Empty passphrase forbids unexpected interactive prompts for encrypted
    # private keys. Do not pass key bytes through an argument or stdin.
    openssl pkey -in "$private_key_file" -passin pass: -pubout \
      > "$tmp/key-public" 2>/dev/null || {
      auth_error private-key-unreadable-or-encrypted
      exit 70
    }
    cmp -s "$tmp/cert-public" "$tmp/key-public" || {
      auth_error private-key-certificate-mismatch
      exit 70
    }
    # OpenSSL can sign with an EC key even when the JOSE header says RS256;
    # require the actual key family and the exact JWA curve for ECDSA.
    case "$client_jwt_alg" in
      ES256) expected_curve=prime256v1 ;;
      ES384) expected_curve=secp384r1 ;;
      ES512) expected_curve=secp521r1 ;;
    esac
    case "$client_jwt_alg" in
      ES*)
        openssl ec -pubin -in "$tmp/cert-public" -text -noout \
          > "$tmp/ec-public-info" 2>/dev/null &&
          grep -Fx "ASN1 OID: $expected_curve" "$tmp/ec-public-info" \
          >/dev/null 2>&1 || {
          auth_error private-key-curve-incompatible
          exit 73
        }
        ;;
      *)
        openssl rsa -pubin -in "$tmp/cert-public" -noout \
          >/dev/null 2>&1 || {
          auth_error private-key-rsa-required
          exit 73
        }
        ;;
    esac
    python3 - "$client" "$expected_issuer" "$client_jwt_alg" \
      > "$tmp/assertion-message" 2>/dev/null <<'K04_PRIVATE_KEY_JWT_PYTHON'
import base64
import json
import secrets
import sys
import time

def urlsafe(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

client, audience, algorithm = sys.argv[1:]
if algorithm not in ("RS256", "RS384", "RS512",
                     "PS256", "PS384", "PS512",
                     "ES256", "ES384", "ES512"):
    raise ValueError("unsupported private key assertion algorithm")
now = int(time.time())
header = {"alg": algorithm, "typ": "JWT"}
claims = {
    "iss": client, "sub": client, "aud": audience,
    "jti": secrets.token_urlsafe(24),
    "iat": now, "nbf": now, "exp": now + 30,
}
h = urlsafe(json.dumps(header, separators=(",", ":")).encode("utf-8"))
p = urlsafe(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
sys.stdout.write(h + "." + p)
K04_PRIVATE_KEY_JWT_PYTHON
    [ "$?" -eq 0 ] && [ -s "$tmp/assertion-message" ] || {
      auth_error private-key-assertion-build-failed
      exit 90
    }
    case "$client_jwt_alg" in
      RS256|PS256|ES256) jwt_digest=sha256 ;;
      RS384|PS384|ES384) jwt_digest=sha384 ;;
      RS512|PS512|ES512) jwt_digest=sha512 ;;
    esac
    case "$client_jwt_alg" in
      PS*)
        # JWS RSA-PSS requires MGF1 with the selected SHA digest and a
        # salt exactly as long as that digest (-1 in OpenSSL).
        openssl dgst "-$jwt_digest" -sign "$private_key_file" -passin pass: \
          -sigopt rsa_padding_mode:pss -sigopt rsa_pss_saltlen:-1 \
          -out "$tmp/assertion-signature" "$tmp/assertion-message" 2>/dev/null
        ;;
      *)
        openssl dgst "-$jwt_digest" -sign "$private_key_file" -passin pass: \
          -out "$tmp/assertion-signature" "$tmp/assertion-message" 2>/dev/null
        ;;
    esac
    signature_status=$?
    [ "$signature_status" -eq 0 ] || {
      auth_error private-key-signature-failed
      exit 90
    }
    case "$client_jwt_alg" in
      PS*)
        openssl dgst "-$jwt_digest" -verify "$tmp/cert-public" \
          -sigopt rsa_padding_mode:pss -sigopt rsa_pss_saltlen:-1 \
          -signature "$tmp/assertion-signature" "$tmp/assertion-message" \
          >/dev/null 2>&1
        ;;
      *)
        openssl dgst "-$jwt_digest" -verify "$tmp/cert-public" \
          -signature "$tmp/assertion-signature" "$tmp/assertion-message" \
          >/dev/null 2>&1
        ;;
    esac
    signature_status=$?
    [ "$signature_status" -eq 0 ] || {
      auth_error private-key-signature-verification-failed
      exit 90
    }
    python3 - "$tmp/assertion-message" "$tmp/assertion-signature" "$client_jwt_alg" \
      > "$tmp/client-assertion" 2>/dev/null <<'K04_PRIVATE_KEY_JWT_ENCODE'
import base64
import sys

with open(sys.argv[1], "rb") as message:
    signed = message.read().decode("ascii")
with open(sys.argv[2], "rb") as signature:
    sig = signature.read()

if sys.argv[3].startswith("ES"):
    # OpenSSL ECDSA emits DER SEQUENCE(INTEGER r, INTEGER s).
    # JWS requires fixed-width, unsigned r || s (RFC 7518 section 3.4).
    size = {"ES256": 32, "ES384": 48, "ES512": 66}[sys.argv[3]]

    def der_length(data, at):
        first = data[at]
        at += 1
        if first < 128:
            return first, at
        width = first & 0x7f
        if width == 0 or width > 2 or at + width > len(data):
            raise ValueError("invalid DER length")
        count = int.from_bytes(data[at:at + width], "big")
        if count < 128 or (width > 1 and data[at] == 0):
            raise ValueError("nonminimal DER length")
        return count, at + width

    if not sig or sig[0] != 0x30:
        raise ValueError("not an ECDSA DER sequence")
    sequence_size, offset = der_length(sig, 1)
    if offset + sequence_size != len(sig):
        raise ValueError("invalid ECDSA sequence size")

    def integer(data, at):
        if data[at] != 0x02:
            raise ValueError("missing ECDSA integer")
        length, at = der_length(data, at + 1)
        raw = data[at:at + length]
        if not raw or raw[0] & 0x80:
            raise ValueError("negative or empty ECDSA integer")
        if len(raw) > 1 and raw[0] == 0 and not (raw[1] & 0x80):
            raise ValueError("nonminimal ECDSA integer")
        number = int.from_bytes(raw, "big")
        if number == 0 or number >= (1 << (size * 8)):
            raise ValueError("ECDSA integer outside fixed width")
        return number.to_bytes(size, "big"), at + length

    r, offset = integer(sig, offset)
    s, offset = integer(sig, offset)
    if offset != len(sig):
        raise ValueError("extra ECDSA signature bytes")
    sig = r + s

sig = base64.urlsafe_b64encode(sig).rstrip(b"=").decode("ascii")
sys.stdout.write(signed + "." + sig)
K04_PRIVATE_KEY_JWT_ENCODE
    [ "$?" -eq 0 ] && [ -s "$tmp/client-assertion" ] || {
      auth_error private-key-assertion-encode-failed
      exit 90
    }
    set -- "$@" --data-urlencode "client_id=$client" \
      --data-urlencode 'client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer' \
      --data-urlencode "client_assertion@$tmp/client-assertion"
    ;;
esac

if [ "$action" = revoke ]
then
  endpoint=$expected_revocation_endpoint
  stage=revoke
elif [ "$action" = status ]
then
  endpoint=$expected_introspection_endpoint
  stage=introspection
else
  endpoint=$expected_token_endpoint
  stage=token
fi
http_code=$(safe_curl "$@" --url "$endpoint") || {
  curl_failure "$stage" "$?"
}
case "$http_code" in
  200) : ;;
  400|401)
    if jq -e '.error == "invalid_client"' "$tmp/response" >/dev/null 2>&1 ||
      { [ "$http_code" = 401 ] &&
        jq -e '.error == "unauthorized_client"' "$tmp/response" >/dev/null 2>&1; }
    then
      # Keycloak 26.7.3 also uses unauthorized_client / HTTP 401 for an
      # invalid client secret, distinct from grant-policy HTTP 400.
      auth_error client-authentication-denied
      exit 71
    fi
    if jq -e '.error == "unauthorized_client" or .error == "unsupported_grant_type"' \
      "$tmp/response" >/dev/null 2>&1
    then
      auth_error client-grant-disabled
      exit 73
    fi
    auth_error oauth-grant-denied
    exit 72
    ;;
  403) auth_error token-http-forbidden; exit 80 ;;
  429) auth_error token-rate-limited; exit 83 ;;
  5??) auth_error token-server-error; exit 85 ;;
  *) auth_error token-unexpected-http; exit 86 ;;
esac
if [ "$action" = status ]
then
  jq -e '(.active | type == "boolean")' "$tmp/response" >/dev/null 2>&1 || {
    auth_error introspection-response-invalid
    exit 86
  }
  jq -c '{stored:true, server_validated:true, active:.active}' "$tmp/response" || {
    auth_error introspection-redacted-response-failed
    exit 86
  }
  exit 0
fi
if [ "$action" = revoke ]
then
  # RFC 7009 success is an accepted request, not proof that a previously
  # issued JWT has stopped working everywhere. Do not modify the store.
  printf '{"revocation_requested":true,"token_type_hint":"%s","invalidity_verified":false}\n' \
    "$token_type_hint"
  exit 0
fi
jq -e '(.access_token | type == "string" and length > 0) and
  (.token_type == "Bearer") and
  (.expires_in | type == "number" and . > 0)' \
  "$tmp/response" >/dev/null 2>&1 || {
  auth_error token-response-invalid
  exit 86
}

if [ "$action" = refresh ]
then
  jq -e '(.refresh_token | type == "string" and length > 0)' \
    "$tmp/response" >/dev/null 2>&1 || {
    auth_error refresh-response-without-successor
    exit 86
  }
  staged=$(mktemp "$parent/.keycloak-token.XXXXXXXX") || {
    auth_error refresh-stage-failed
    exit 87
  }
  chmod 600 "$staged" && cp "$tmp/response" "$staged" || {
    auth_error refresh-stage-write-failed
    exit 87
  }
  private_file "$token_file" || {
    auth_error refresh-store-changed-or-insecure
    exit 87
  }
  current_inode=$(ls -id "$token_file" 2>/dev/null | awk '{print $1}') || {
    auth_error refresh-store-identity-unavailable
    exit 87
  }
  [ "$current_inode" = "$original_inode" ] || {
    auth_error refresh-store-concurrently-replaced
    exit 87
  }
  # Atomic same-directory replacement for cooperative writers only.
  mv -f "$staged" "$token_store" || {
    auth_error refresh-publish-failed
    exit 87
  }
  staged=
  printf '{"stored":true,"refreshed":true,"server_validated":false}\n'
  exit 0
fi

# Exclusive-new-store baseline. An exclusive hard link from a staged inode
# is atomic on the same filesystem; existence-check-then-mv is not.
# Existing stores require explicit lifecycle handling and cannot be replaced.
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
# A hard-link creation without -f fails when another writer already
# published the target. Both paths are inside the same protected directory.
# Do not use mv here: POSIX rename can overwrite a concurrent result.
ln "$staged" "$token_store" 2>/dev/null || {
  auth_error token-store-exclusive-publish-failed
  exit 87
}
rm -f "$staged" || {
  auth_error token-stage-cleanup-incomplete
  exit 88
}
staged=
printf '{"stored":true,"grant":"%s","server_validated":false}\n' "$grant_type"
KEYCLOAK_AUTH_REMOTE
)


# K04 private read-only Admin Bearer transport proof. Not the public K05 API.
# Only an explicitly selected realm GET is reachable; response body is secret.
_rsudo_mod_keycloak_admin_transport_probe()
(
  server= issuer= realm= token_file= ca_file=
  while [ "$#" -gt 0 ]
  do
    [ "$#" -ge 2 ] || { log error keycloak admin-probe-option-value; exit 64; }
    key=$1 value=$2
    shift 2
    case "$key" in
      --server) server=$value ;;
      --issuer-realm) issuer=$value ;;
      --target-realm) realm=$value ;;
      --token-file) token_file=$value ;;
      --ca-file) ca_file=$value ;;
      *) log error keycloak admin-probe-unsupported-option option "$key"; exit 64 ;;
    esac
  done
  [ -n "$issuer" ] && [ -n "$realm" ] && [ -n "$token_file" ] || {
    log error keycloak admin-probe-missing-selection
    exit 64
  }
  case "$server" in https://?*) : ;;
    *) log error keycloak admin-probe-untrusted-server; exit 65 ;; esac
  case "$server" in
    *'?'*|*'#'*|*'@'*|*' '*|*'\'*|*'
'*)
      log error keycloak admin-probe-invalid-server-url
      exit 65 ;;
  esac
  case "$server" in */) server=${server%/} ;; esac
  for file in "$token_file" "$ca_file"
  do
    [ -n "$file" ] || continue
    case "$file" in /*) : ;;
      *) log error keycloak admin-probe-nonabsolute-path; exit 70 ;; esac
  done

  RSUDO_INTERACTIVE=
  rsudo -- sh -s -- "$server" "$issuer" "$realm" "$token_file" "$ca_file" <<'KEYCLOAK_K04_ADMIN_REMOTE'
server=$1 issuer=$2 realm=$3 token_file=$4 ca_file=$5
umask 077
admin_error() { printf 'keycloak.admin-probe.%s\n' "$1" >&2; }
safe_path()
{
  case "$1" in /*) : ;; *) return 1 ;; esac
  case "$1" in /|*/|*'//'*) return 1 ;; esac
  remaining=${1#/}
  prefix=
  while [ -n "$remaining" ]
  do
    part=${remaining%%/*}
    case "$part" in ''|.|..) return 1 ;; esac
    prefix="$prefix/$part"
    [ ! -L "$prefix" ] || return 1
    [ "$part" = "$remaining" ] && break
    [ -d "$prefix" ] || return 1
    remaining=${remaining#*/}
  done
}
owned_by_sudo()
{
  owner=$(LC_ALL=C ls -ldn "$1" 2>/dev/null | awk '{print $3}') || return 1
  [ -n "$owner" ] && [ "$owner" = "$(id -u)" ]
}
private_token()
{
  safe_path "$1" && [ -f "$1" ] && [ -r "$1" ] &&
    [ ! -L "$1" ] && owned_by_sudo "$1" || return 1
  parent=${1%/*}
  [ -n "$parent" ] || parent=/
  safe_path "$parent" && [ -d "$parent" ] &&
    owned_by_sudo "$parent" || return 1
  permissions=$(LC_ALL=C ls -ld "$parent" 2>/dev/null) || return 1
  permissions=${permissions%% *}
  [ "$(printf '%s' "$permissions" | cut -c 6)" = '-' ] &&
    [ "$(printf '%s' "$permissions" | cut -c 9)" = '-' ] || return 1
  permissions=$(LC_ALL=C ls -ld "$1" 2>/dev/null) || return 1
  permissions=${permissions%% *}
  case "$permissions" in ????------) : ;; *) return 1 ;; esac
}
curl_safe()
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
curl_failed()
{
  case "$1" in
    28) admin_error timeout; exit 77 ;;
    35|51|58|60|77|83|90) admin_error tls-failed; exit 75 ;;
    *) admin_error transport-failed; exit 76 ;;
  esac
}
command -v curl >/dev/null 2>&1 || { admin_error curl-unavailable; exit 89; }
command -v jq >/dev/null 2>&1 || { admin_error jq-unavailable; exit 89; }
command -v mktemp >/dev/null 2>&1 || { admin_error mktemp-unavailable; exit 89; }
private_token "$token_file" || {
  admin_error token-file-unavailable-or-insecure
  exit 70
}
[ -z "$ca_file" ] || {
  safe_path "$ca_file" && [ -f "$ca_file" ] && [ -r "$ca_file" ] &&
    [ ! -L "$ca_file" ] || { admin_error ca-file-unavailable; exit 75; }
}
# RFC 6750 b64token characters only, never HTTP control characters.
jq -e '(.access_token | type == "string" and
  test("^[A-Za-z0-9._~+/-]+=*$"))' "$token_file" >/dev/null 2>&1 || {
  admin_error token-store-invalid
  exit 86
}
tmp=$(mktemp -d "${TMPDIR:-/tmp}/keycloak-admin.XXXXXXXX") || {
  admin_error temp-unavailable
  exit 87
}
trap 'rm -rf "$tmp"' 0
trap 'exit 88' 1 2 3 15
encoded_issuer=$(jq -rn --arg name "$issuer" '$name | @uri') || {
  admin_error issuer-encoding-failed
  exit 67
}
encoded_realm=$(jq -rn --arg name "$realm" '$name | @uri') || {
  admin_error realm-encoding-failed
  exit 64
}
expected="$server/realms/$encoded_issuer"
discovery_code=$(curl_safe --output "$tmp/discovery" \
  --write-out '%{http_code}' \
  --url "$expected/.well-known/openid-configuration") || curl_failed "$?"
[ "$discovery_code" = 200 ] || {
  admin_error discovery-status
  exit 67
}
jq -e --arg expected "$expected" '.issuer == $expected' \
  "$tmp/discovery" >/dev/null 2>&1 || {
  admin_error issuer-mismatch
  exit 67
}
{
  printf 'Authorization: Bearer '
  jq -jr '.access_token' "$token_file"
  printf '\n'
} > "$tmp/header" || { admin_error header-unavailable; exit 87; }
status=$(curl_safe --request GET --output "$tmp/response" \
  --write-out '%{http_code}' --header "@$tmp/header" \
  --header 'Accept: application/json' \
  --url "$server/admin/realms/$encoded_realm") || curl_failed "$?"
case "$status" in
  200)
    jq -e --arg expected "$realm" \
      '(.realm | type == "string") and (.realm == $expected)' \
      "$tmp/response" >/dev/null 2>&1 || {
      admin_error realm-response-identity-mismatch
      exit 86
    }
    # The resource can contain confidential configuration. Suppress it.
    printf '{"http_status":200,"authorized":true,"body_suppressed":true}\n'
    ;;
  400) admin_error bad-request; exit 78 ;;
  401) admin_error invalid-or-expired-bearer; exit 79 ;;
  403) admin_error forbidden; exit 80 ;;
  404) admin_error absent-or-disabled; exit 81 ;;
  409) admin_error conflict; exit 82 ;;
  429) admin_error throttled; exit 83 ;;
  4??) admin_error other-client-failure; exit 84 ;;
  5??) admin_error server-failure; exit 85 ;;
  *) admin_error unexpected-http-status; exit 86 ;;
esac
KEYCLOAK_K04_ADMIN_REMOTE
)
