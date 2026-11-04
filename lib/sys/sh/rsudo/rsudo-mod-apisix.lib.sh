# Compatibility bridge while the new apisix administration module is developed.
# The legacy source is preserved under a separate dispatcher identity.
# Replace individual entrypoints here only when their new semantics and tests are ready.

loadsyslib "rsudo/rsudo-mod-apisixlegacy" || return 1

rsudo_mod_apisix_set_auth_vars()
{
  rsudo_mod_apisixlegacy_set_auth_vars "$@"
}

rsudo_mod_apisix_json_string_or_array()
{
  rsudo_mod_apisixlegacy_json_string_or_array "$@"
}

rsudo_mod_apisix_key()
{
  rsudo_mod_apisixlegacy_key "$@"
}

rsudo_mod_apisix_keyset()
{
  rsudo_mod_apisixlegacy_keyset "$@"
}

rsudo_mod_apisix_api()
{
  rsudo_mod_apisixlegacy_api "$@"
}

rsudo_mod_apisix_get()
{
  rsudo_mod_apisixlegacy_get "$@"
}

rsudo_mod_apisix_put()
{
  rsudo_mod_apisixlegacy_put "$@"
}

rsudo_mod_apisix_post()
{
  rsudo_mod_apisixlegacy_post "$@"
}

rsudo_mod_apisix_del()
{
  rsudo_mod_apisixlegacy_del "$@"
}

rsudo_mod_apisix_delete()
{
  rsudo_mod_apisixlegacy_delete "$@"
}

rsudo_mod_apisix_delete_service()
{
  rsudo_mod_apisixlegacy_delete_service "$@"
}

rsudo_mod_apisix_delete_route()
{
  rsudo_mod_apisixlegacy_delete_route "$@"
}

rsudo_mod_apisix_delete_stream_route()
{
  rsudo_mod_apisixlegacy_delete_stream_route "$@"
}

rsudo_mod_apisix_delete_upstream()
{
  rsudo_mod_apisixlegacy_delete_upstream "$@"
}

rsudo_mod_apisix_delete_consumer()
{
  rsudo_mod_apisixlegacy_delete_consumer "$@"
}

rsudo_mod_apisix_delete_consumer_group()
{
  rsudo_mod_apisixlegacy_delete_consumer_group "$@"
}

rsudo_mod_apisix_delete_ssl()
{
  rsudo_mod_apisixlegacy_delete_ssl "$@"
}

rsudo_mod_apisix_delete_global_rule()
{
  rsudo_mod_apisixlegacy_delete_global_rule "$@"
}

rsudo_mod_apisix_delete_plugin_metadata()
{
  rsudo_mod_apisixlegacy_delete_plugin_metadata "$@"
}

rsudo_mod_apisix_delete_plugin_config()
{
  rsudo_mod_apisixlegacy_delete_plugin_config "$@"
}

rsudo_mod_apisix_delete_secret()
{
  rsudo_mod_apisixlegacy_delete_secret "$@"
}

rsudo_mod_apisix_delete_proto()
{
  rsudo_mod_apisixlegacy_delete_proto "$@"
}

rsudo_mod_apisix_create()
{
  rsudo_mod_apisixlegacy_create "$@"
}

rsudo_mod_apisix_create_generic()
{
  rsudo_mod_apisixlegacy_create_generic "$@"
}

rsudo_mod_apisix_create_upstream()
{
  rsudo_mod_apisixlegacy_create_upstream "$@"
}

rsudo_mod_apisix_create_upstream_simple()
{
  rsudo_mod_apisixlegacy_create_upstream_simple "$@"
}

rsudo_mod_apisix_create_service()
{
  rsudo_mod_apisixlegacy_create_service "$@"
}

rsudo_mod_apisix_create_service_simple()
{
  rsudo_mod_apisixlegacy_create_service_simple "$@"
}

rsudo_mod_apisix_create_service_standard()
{
  rsudo_mod_apisixlegacy_create_service_standard "$@"
}

rsudo_mod_apisix_create_route()
{
  rsudo_mod_apisixlegacy_create_route "$@"
}

rsudo_mod_apisix_create_route_simple()
{
  rsudo_mod_apisixlegacy_create_route_simple "$@"
}

rsudo_mod_apisix_create_route_map()
{
  rsudo_mod_apisixlegacy_create_route_map "$@"
}

rsudo_mod_apisix_create_route_authn()
{
  rsudo_mod_apisixlegacy_create_route_authn "$@"
}

rsudo_mod_apisix_create_route_authn_authz()
{
  rsudo_mod_apisixlegacy_create_route_authn_authz "$@"
}

rsudo_mod_apisix_create_global_rule()
{
  rsudo_mod_apisixlegacy_create_global_rule "$@"
}
