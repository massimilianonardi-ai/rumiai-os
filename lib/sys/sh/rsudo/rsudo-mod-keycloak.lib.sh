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
