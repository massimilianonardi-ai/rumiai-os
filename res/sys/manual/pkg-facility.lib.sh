NAME
    pkg-facility.lib.sh - validate facility contracts and provider realizations

DESCRIPTION
    pkg-facility.lib.sh owns provider-independent facility identity/compatibility
    parsing and the trusted conformance boundary between an exact facility contract
    and one package provider realization.

    Facility/provider definitions are inert declarations. Validation does not create
    a facility default, create a consumer binding, publish commands, export
    environment variables or otherwise select/apply a provider.

    The generic facility contract envelope is:

        facility/<facility>/<compatibility>/<part>/...

    The current trusted part types are cmd and env. Their schemas and provider
    realization validation are delegated to internal type handlers. Unknown part
    types and unknown provider realization surfaces are rejected.

FUNCTIONS
    pkg_facility_contract_validate <contract-dir>
        Validate one exact provider-independent facility contract directory and all
        of its supported typed parts.

        Returns 0 when the contract is valid, 1 when its structure or typed content
        is invalid, and 2 for invalid invocation.

    pkg_facility_provider_validate <catalog-root> <provider-definition-dir> <provider-root>
        Validate every facility declared by one provider definition against the
        exact contract under <catalog-root>/facility and validate the provider's
        facility-cmd/facility-env realization against that contract and useful root.
        provider-definition-dir must resolve beneath the same <catalog-root>/pkg
        tree, mechanically preserving the same-snapshot conformance boundary.

        A provider definition with no facility declaration is valid only when it
        also contains no facility-cmd or facility-env realization.

        The function performs no provider selection and no state mutation.

        Returns 0 when the provider realization conforms, 1 when declaration,
        contract or realization data is invalid/non-conforming, and 2 for invalid
        invocation.

DEPENDENCIES
    The library runs inside the m bootstrap environment and loads the trusted cmd
    and env facility-part handler libraries.

SEE ALSO
    pkg-dependency.lib.sh
    pkg-provider.lib.sh
