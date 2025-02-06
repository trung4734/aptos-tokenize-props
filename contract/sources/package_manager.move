module tokenized_properties::package_manager {
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_std::smart_table::{Self, SmartTable};
    use std::string::String;

    const APP_OBJECT_SEED: vector<u8> = b"PACKAGE_MANAGER";

    friend tokenized_properties::coin_wrapper;

    /// Stores permission config such as SignerCapability for controlling the resource account.
    struct PermissionConfig has key {
        /// Required to obtain the resource account signer.
        extend_ref: ExtendRef,
        /// Track the addresses created by the modules in this package.
        addresses: SmartTable<String, address>,
    }

    /// Initialize PermissionConfig to establish control over the resource account.
    /// This function is invoked only when this package is deployed the first time.
    fun init_module(admin: &signer) {

        let obj_constructor_ref = object::create_named_object(admin, APP_OBJECT_SEED);
        let obj_signer = object::generate_signer(&obj_constructor_ref);
        let obj_extend_ref = object::generate_extend_ref(&obj_constructor_ref);

        move_to(&obj_signer,
          PermissionConfig {
            addresses: smart_table::new<String, address>(),
            extend_ref: obj_extend_ref,
          }
        );
    }

    fun get_signer_address(): address {
        object::create_object_address(&@tokenized_properties, APP_OBJECT_SEED)
    }

    /// Can be called by friended modules to obtain the resource account signer.
    public(friend) fun get_signer(): signer acquires PermissionConfig {
        let extend_ref = &borrow_global<PermissionConfig>(get_signer_address()).extend_ref;
        object::generate_signer_for_extending(extend_ref)
    }

    /// Can be called by friended modules to keep track of a system address.
    public(friend) fun add_address(name: String, object: address) acquires PermissionConfig {
        let addresses = &mut borrow_global_mut<PermissionConfig>(get_signer_address()).addresses;
        smart_table::add(addresses, name, object);
    }

    public fun address_exists(name: String): bool acquires PermissionConfig {
        smart_table::contains(&safe_permission_config().addresses, name)
    }

    public fun get_address(name: String): address acquires PermissionConfig {
        let addresses = &borrow_global<PermissionConfig>(get_signer_address()).addresses;
        *smart_table::borrow(addresses, name)
    }

    inline fun safe_permission_config(): &PermissionConfig acquires PermissionConfig {
        borrow_global<PermissionConfig>(get_signer_address())
    }

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

}