// This module creates and owns the collection object.
// The app object is also the creator of all ownership token objects.
// Owner of each food token object is aptogochi owner.

module tokenized_properties::ownership_token {
    use aptos_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef, Metadata, FungibleAsset};
    use aptos_framework::object::{Self, Object, ConstructorRef, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::dispatchable_fungible_asset;
    use aptos_framework::function_info::{Self, FunctionInfo};

    use aptos_token_objects::collection::{Self, Collection};
    use aptos_token_objects::token;

    use aptos_std::table::{Self, Table};
    use std::error;
    use std::signer;
    use std::string::{Self, utf8, String};
    use std::option;
    use std::vector;

    friend tokenized_properties::controller;

    // Errors list
    const ENOT_OWNER: u64 = 1;
    const EPAUSED: u64 = 2;

    const APP_SEED: vector<u8> = b"OWNERSHIP_TOKEN_CONTRACT";
    const COLLECTION_NAME: vector<u8> = b"Tokenized Properties Collection";
    const COLLECTION_DESCRIPTION: vector<u8> = b"Tokenized properties collection";
    const COLLECTION_URI: vector<u8> = b"https://aptos.com";

    // Unique per FA
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
        extend_ref: ExtendRef,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct State has key {
        paused: bool,
    }

    // Global resources
    struct DispatchableFunctionsInfo has store {
        deposit_function_info: FunctionInfo,
        withdraw_function_info: FunctionInfo,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct AppObjectController has key {
        app_extend_ref: ExtendRef,
        dispatchable_functions_info: DispatchableFunctionsInfo,
        tokens_info_map: Table<String, address>,
    }

    // Initialize metadata object and store the refs.
    fun init_module(admin: &signer) {
        initialize(admin);
    }

    public(friend) fun initialize(admin: &signer) {
        let deposit = function_info::new_function_info(
            admin,
            string::utf8(b"ownership_token"),
            string::utf8(b"deposit"),
        );
        let withdraw = function_info::new_function_info(
            admin,
            string::utf8(b"ownership_token"),
            string::utf8(b"withdraw"),
        );

        let obj_constructor_ref = object::create_named_object(admin, APP_SEED);
        let obj_signer = object::generate_signer(&obj_constructor_ref);
        let obj_extend_ref = object::generate_extend_ref(&obj_constructor_ref);
        move_to(
            &obj_signer,
            AppObjectController {
                app_extend_ref: obj_extend_ref,
                dispatchable_functions_info: DispatchableFunctionsInfo {
                    deposit_function_info: deposit,
                    withdraw_function_info: withdraw,
                },
                tokens_info_map: table::new(),
            }
        );

        // Create collection
        collection::create_unlimited_collection(
            &obj_signer,
            utf8(COLLECTION_DESCRIPTION),
            utf8(COLLECTION_NAME),
            option::none(),
            utf8(COLLECTION_URI),
        );
    }

    #[view]
    public fun get_collection_address(): address {
        collection::create_collection_address(&get_app_signer_address(), &utf8(COLLECTION_NAME))
    }

    fun get_app_signer_address(): address {
        object::create_object_address(&@tokenized_properties, APP_SEED)
    }

    fun get_app_signer(signer_address: address): signer acquires AppObjectController {
        let object_controller = borrow_global<AppObjectController>(signer_address);
        object::generate_signer_for_extending(&object_controller.app_extend_ref)
    }

    public(friend) fun create_ownership_token (
        name: String,
        symbol: String,
        decimals: u8,
        maximum_supply: u128,
        token_description: String,
        token_uri: String,
        token_icon: String,
    ): ConstructorRef acquires AppObjectController {
        let app_signer = &get_app_signer(get_app_signer_address());
        let token_seed = construct_token_seed(&symbol, &name);

        let collection_addr = collection::create_collection_address(&get_app_signer_address(), &utf8(COLLECTION_NAME));
        let collection_obj = object::address_to_object<Collection>(collection_addr);
        let constructor_ref = token::create_named_token_from_seed(
            app_signer,
            collection_obj,
            token_description,
            name,
            utf8(token_seed),
            option::none(), // royalty
            token_uri,
        );

        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::some(maximum_supply), // maximum supply
            name,
            symbol,
            decimals, // Decimals
            token_icon, // icon
            token_uri, // project
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);

        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(&constructor_ref);

        // let asset_address = object::address_from_constructor_ref(&constructor_ref);
        // let asset_obj = object::address_to_object<Metadata>(asset_address);

        let metadata_object_signer = object::generate_signer(&constructor_ref);
        move_to(
            &metadata_object_signer,
            ManagedFungibleAsset {
                mint_ref,
                transfer_ref,
                burn_ref,
                extend_ref,
            }
        );

        move_to(
            &metadata_object_signer,
            State {
                paused: false, // TODO
            }
        );

        let fa_controller = borrow_global_mut<AppObjectController>(get_app_signer_address());
        table::add(&mut fa_controller.tokens_info_map, utf8(token_seed), signer::address_of(&metadata_object_signer));

        dispatchable_fungible_asset::register_dispatch_functions(
            &constructor_ref,
            option::some(fa_controller.dispatchable_functions_info.withdraw_function_info),
            option::some(fa_controller.dispatchable_functions_info.deposit_function_info),
            option::none(),
        );

        constructor_ref
    }

    /// Deposit function override to ensure that the account is not denylisted and the FA coin is not paused.
    /// OPTIONAL
    public fun deposit<T: key>(
        store: Object<T>,
        fa: FungibleAsset,
        transfer_ref: &TransferRef,
    ) {
        // let asset = fungible_asset::store_metadata(store);
        // assert_not_paused(asset);
        // assert_in_whitelist(store); // Frozen
        fungible_asset::deposit_with_ref(transfer_ref, store, fa);
    }

    /// Withdraw function override to ensure that the account is not denylisted and the FA coin is not paused.
    public fun withdraw<T: key>(
        store: Object<T>,
        amount: u64,
        transfer_ref: &TransferRef,
    ): FungibleAsset acquires AppObjectController, State  {
        let asset = fungible_asset::store_metadata(store);
        assert_not_paused(asset);
        fungible_asset::withdraw_with_ref(transfer_ref, store, amount)
    }

    fun construct_token_seed(
        symbol: &String,
        name: &String,
    ): vector<u8> {
        let seed = *string::bytes(symbol);
        vector::append(&mut seed, b"::");
        vector::append(&mut seed, *string::bytes(name));

        seed
    }

    public(friend) fun mint(
        asset: Object<Metadata>,
        to: address,
        amount: u64,
    ) acquires ManagedFungibleAsset, AppObjectController {
        let app_signer = &get_app_signer(get_app_signer_address());
        let managed_fungible_asset = authorized_borrow_refs(app_signer, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = fungible_asset::mint(&managed_fungible_asset.mint_ref, amount);
        deposit(to_wallet, fa, &managed_fungible_asset.transfer_ref);
    }

    public(friend) fun transfer(
        asset: Object<Metadata>,
        from: address,
        to: address,
        amount: u64,
    ) acquires ManagedFungibleAsset, AppObjectController, State {
        let app_signer = &get_app_signer(get_app_signer_address());
        let transfer_ref = &authorized_borrow_refs(app_signer, asset).transfer_ref;
        let from_wallet = primary_fungible_store::primary_store(from, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = withdraw(from_wallet, amount, transfer_ref);
        deposit(to_wallet, fa, transfer_ref);
    }

    /// Burn fungible assets as the owner of metadata object.
    public(friend) fun burn(
        asset: Object<Metadata>,
        from: address,
        amount: u64,
    ) acquires ManagedFungibleAsset, AppObjectController {
        let app_signer = &get_app_signer(get_app_signer_address());
        let burn_ref = &authorized_borrow_refs(app_signer, asset).burn_ref;
        let from_wallet = primary_fungible_store::primary_store(from, asset);
        fungible_asset::burn_from(burn_ref, from_wallet, amount);
    }

    /// Freeze an account so it cannot transfer or receive fungible assets.
    public(friend) fun freeze_account(
        asset: Object<Metadata>,
        account: address,
    ) acquires ManagedFungibleAsset, AppObjectController {
        let app_signer = &get_app_signer(get_app_signer_address());
        let transfer_ref = &authorized_borrow_refs(app_signer, asset).transfer_ref;
        let wallet = primary_fungible_store::ensure_primary_store_exists(account, asset);
        fungible_asset::set_frozen_flag(transfer_ref, wallet, true);
    }

    /// Unfreeze an account so it can transfer or receive fungible assets.
    public(friend) fun unfreeze_account(
        asset: Object<Metadata>,
        account: address,
    ) acquires ManagedFungibleAsset, AppObjectController {
        let app_signer = &get_app_signer(get_app_signer_address());
        let transfer_ref = &authorized_borrow_refs(app_signer, asset).transfer_ref;
        let wallet = primary_fungible_store::ensure_primary_store_exists(account, asset);
        fungible_asset::set_frozen_flag(transfer_ref, wallet, false);
    }

    // Borrow the immutable reference of the refs of `metadata`
    // This validates that the signer is the metadata object's owner
    inline fun authorized_borrow_refs(
        owner: &signer,
        asset: Object<Metadata>,
    ): &ManagedFungibleAsset acquires ManagedFungibleAsset {
        assert!(object::is_owner(asset, signer::address_of(owner)), error::permission_denied(ENOT_OWNER));
        borrow_global<ManagedFungibleAsset>(object::object_address(&asset))
    }

    /// Assert that the FA coin is not paused.
    fun assert_not_paused(asset: Object<Metadata>) acquires AppObjectController, State {
        let symbol = fungible_asset::symbol(asset);
        let name = fungible_asset::name(asset);
        let seed = construct_token_seed(&symbol, &name);

        let fa_controller = borrow_global<AppObjectController>(object::create_object_address(&@tokenized_properties, APP_SEED));
        let fa_address = table::borrow(&fa_controller.tokens_info_map, utf8(seed));
        let state = borrow_global<State>(*fa_address);
        assert!(!state.paused, EPAUSED);
    }

    /// Pause or unpause the transfer of FA coin. This checks that the caller is the pauser.
    public(friend) fun set_pause(asset: Object<Metadata>, paused: bool) acquires AppObjectController, State {
        // assert!(object::is_owner(asset, signer::address_of(pauser)), error::permission_denied(ENOT_OWNER));

        let symbol = fungible_asset::symbol(asset);
        let name = fungible_asset::name(asset);
        let seed = construct_token_seed(&symbol, &name);

        let fa_controller = borrow_global<AppObjectController>(object::create_object_address(&@tokenized_properties, APP_SEED));
        let fa_address = table::borrow(&fa_controller.tokens_info_map, utf8(seed));
        let state = borrow_global_mut<State>(*fa_address);
        if (state.paused == paused) { return };
        state.paused = paused;
    }

    // #[test(admin = @tokenized_properties, creator = @0x123, receiver = @0xface)]
    // fun test_basic_flow(
    //     admin: &signer,
    //     creator: &signer,
    //     receiver: &signer,
    // ) acquires ManagedFungibleAsset, AppObjectController, State {
    //     init_module(admin);

    //     let ft_constructor_ref = create_ownership_token(
    //         utf8(b"oHILTON Coin"),
    //         utf8(b"oHLT"),
    //         100000000,
    //         utf8(b"Token description"),
    //         utf8(b"Token uri"),
    //     );
    //     let metadata = object::object_from_constructor_ref<Metadata>(&ft_constructor_ref);

    //     let creator_address = signer::address_of(creator);
    //     let receiver_address = signer::address_of(receiver);

    //     mint(metadata, creator_address, 100);

    //     assert!(primary_fungible_store::balance(creator_address, metadata) == 100, 4);

    //     set_pause(metadata, false);
    //     transfer(metadata, creator_address, receiver_address, 10);
    //     assert!(primary_fungible_store::balance(creator_address, metadata) == 90, 5);
    //     assert!(primary_fungible_store::balance(receiver_address, metadata) == 10, 6);
    // }

}