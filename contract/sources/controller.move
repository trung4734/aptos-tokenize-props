module tokenized_properties::controller {

    use aptos_framework::account;
    use aptos_framework::aptos_account;
    use aptos_framework::code;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin::{Self};
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleAsset};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_std::type_info;

    use tokenized_properties::ownership_token;
    use tokenized_properties::rewards_pool::{Self, RewardsPool};
    use tokenized_properties::coin_wrapper;

    use econia::market;

    use std::bcs;
    use std::debug;
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{String, utf8};
    use std::vector::{Self};

    // Errors list

    /// Caller is not authorized to make this call
    const EUNAUTHORIZED: u64 = 1;
    /// No operations are allowed when contract is paused
    const EPAUSED: u64 = 2;
    /// Given Coin Type does not match the one registered in this listing
    const ECOIN_TYPE_NOT_MATCH_REGISTERED_COIN_TYPE_IN_LISTING: u64 = 3;
    /// No remaining share for this listing
    const ENO_REMAINING_SHARES: u64 = 4;
    // Listing is not active
    const ELISTING_NOT_ACTIVE: u64 = 5;
    /// The mint stage start time must be less than the mint stage end time.
    const EINVALID_START_TIME: u64 = 6;
    /// The mint stage end time must be greater than the current time.
    const EINVALID_END_TIME: u64 = 7;
    /// The mint stage has not started yet.
    const EMINT_NOT_STARTED: u64 = 8;
    /// The mint stage has ended.
    const EMINT_ENDED: u64 = 9;


    const APP_OBJECT_SEED: vector<u8> = b"PROP_CONTROLLER";

    // Notes:
    // dividends/ yields pool

    // init_module

    // public entry fun deposit
    // public entry fun withdraw

    // create an object to hold the NFT. metadata points to FT?
    // create an object to hold pre-minted tokens.
    // create an object to dividends pool. (users claim or automatic claim upon selling)

    // TODO
    // - OK Store list of listings
    // - OK init_module -> clean up, setup up admins
    // - OK create_listing -> Fill in more information
    // - OK buy_shares -> transfer USDC to listing store.
    // - dividends -> create a FT store, users can claim, map user -> rewards, snapshot?
    // - marketplace to buy/sell tokens (Order book style?)

    // Global per contract
    struct Registry has key {
        listings: vector<Object<ListingInfo>>,
    }

    struct Roles has key {
        creator: address,
        admins: vector<address>,
    }

    struct AppObjectController has key {
        extend_ref: ExtendRef,
        addr: address,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ListingInfo has key {
        status: u8,
        start_date: u64,
        end_date: u64,
        funding_target: u128,
        token_price: u64,
        ownership_token: Object<Metadata>,
        reward_pool: Object<RewardsPool>,
        minting_fee: u64,
        market_id: u64,
        market_registered: bool,
        wrapper_coin: Option<address>,
    }

    // Property Name
    // Type : Residential, Office, Apartment, etc
    // Annual rental Yield
    // Token Price
    // Minimum investment
    // Maximum investment
    // Total token supply
    // Property Value
    // NFT URI for documents
    // Location
    // Funding Target

    fun init_module(admin: &signer) {
        let obj_constructor_ref = object::create_named_object(admin, APP_OBJECT_SEED);
        let obj_signer = object::generate_signer(&obj_constructor_ref);
        let obj_extend_ref = object::generate_extend_ref(&obj_constructor_ref);

        move_to(
            &obj_signer,
            AppObjectController {
                extend_ref: obj_extend_ref,
                addr: signer::address_of(admin),
            }
        );

        move_to(
            &obj_signer,
            Roles {
                creator: @admin_addr,
                admins: vector[@admin_addr],
            }
        );

        move_to(
            &obj_signer,
            Registry {
                listings: vector::empty<Object<ListingInfo>>(),
            }
        );

        coin_wrapper::initialize();
    }

    // Create a new property listing
    public entry fun create_entry(
        admin: &signer,
        description: String,
        name: String,
        symbol: String,
        maximum_supply: u128,
        entry_uri: String,
        icon_uri: String,
        _premint_addresses: Option<vector<address>>,
        _premint_amount: Option<vector<u64>>,
        public_mint_start_time: u64,
        public_mint_end_time: u64,
        _public_mint_limit_per_addr: Option<u64>,
        individual_token_price: u64,
        public_mint_fee: u64,
    ) acquires Registry, Roles {
        // Only an admin can issue a new token.
        assert_is_admin(admin);

        assert!(public_mint_start_time < public_mint_end_time, error::invalid_argument(EINVALID_START_TIME));
        assert!(public_mint_end_time > timestamp::now_seconds(), error::invalid_argument(EINVALID_END_TIME));

        let listing_owner_constructor_ref = &object::create_object(@tokenized_properties);
        let listing_owner_signer = object::generate_signer(listing_owner_constructor_ref);

        // Create FT
        let ft_constructor_ref = ownership_token::create_ownership_token(
            name,
            symbol,
            0 as u8,
            maximum_supply,
            description,
            entry_uri,
            icon_uri,
        );

        let metadata = object::object_from_constructor_ref<Metadata>(&ft_constructor_ref);

        // Create reward pool
        let apt_fa_metadata = *option::borrow(&coin::paired_metadata<AptosCoin>());
        let reward_pool_obj = rewards_pool::create_entry(apt_fa_metadata);
        // rewards_pool::deposit_reward(admin, reward_pool_obj, apt_fa_metadata, 10);

        // Listing Status
        move_to(
            &listing_owner_signer,
            ListingInfo {
                status: 1,
                start_date: public_mint_start_time,
                end_date: public_mint_end_time,
                funding_target: maximum_supply * (individual_token_price as u128),
                token_price: individual_token_price,
                ownership_token: metadata,
                reward_pool: reward_pool_obj,
                minting_fee: public_mint_fee,
                market_id: 0,
                market_registered: false,
                wrapper_coin: option::none(),
            }
        );

        let listing_obj = object::object_from_constructor_ref(listing_owner_constructor_ref);

        let registry: &mut Registry = borrow_global_mut<Registry>(get_app_signer_addres());
        vector::push_back(&mut registry.listings, listing_obj);

    }

    fun get_app_signer_addres(): address {
        object::create_object_address(&@tokenized_properties, APP_OBJECT_SEED)
    }

    fun get_app_signer(signer_address: address): signer acquires AppObjectController {
        let object_controller = borrow_global<AppObjectController>(signer_address);
        object::generate_signer_for_extending(&object_controller.extend_ref)
    }

    // mint/ buy shares
    public entry fun buy_shares(
        account: &signer,
        token_object: Object<ListingInfo>,
        amount: u64
    ) acquires ListingInfo {
        // Check remaining shares > 0
        assert!(remaining_shares(token_object) >= (amount as u128), ENO_REMAINING_SHARES);

        let listing_info = borrow_global<ListingInfo>(object::object_address(&token_object));

        // Check the end date and start date
        let current_time = timestamp::now_seconds();
        assert!(current_time >= listing_info.start_date, error::invalid_state(EMINT_NOT_STARTED));
        assert!(current_time < listing_info.end_date, error::invalid_state(EMINT_ENDED));

        // Check if the listing is still active or not.
        assert!(listing_info.status == 1, ELISTING_NOT_ACTIVE);

        // Transfer token to this contract? (APT or USDC). amount * UNIT_PRICE
        // 7-decimal is for testing purposes.
        let usdc_amount = listing_info.token_price * amount * (10000000 as u64);
        // let usdc_metadata = object::address_to_object<Metadata>(listing_info.ownership_token);
        // primary_fungible_store::transfer(account, usdc_metadata, @tokenized_properties, usdc_amount);
        aptos_account::transfer(account, @tokenized_properties, usdc_amount);

        // Transfer FT to the caller account.
        let metadata: Object<Metadata> = listing_info.ownership_token;
        ownership_token::mint(metadata, signer::address_of(account), amount);
    }

    // close sale
    public entry fun close_sale(
        admin: &signer,
        listing: Object<ListingInfo>,
    ) acquires ListingInfo, Roles {
        assert_is_admin(admin);
        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );
        listing_status.status = 3;
    }

    // open sale
    public entry fun open_sale(
        admin: &signer,
        listing: Object<ListingInfo>,
    ) acquires ListingInfo, Roles {
        assert_is_admin(admin);
        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );
        listing_status.status = 1;
    }

    // pause sale
    public entry fun pause_sale(
        admin: &signer,
        listing: Object<ListingInfo>,
    ) acquires ListingInfo, Roles {
        assert_is_admin(admin);
        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );
        listing_status.status = 2;
    }

    // -------------------------------------
    // Deposit to Econia
    public entry fun wrap_ownership_token<CoinType>(
        account: &signer,
        metadata: Object<Metadata>,
        amount: u64,
    ) {
        if (!coin::is_account_registered<CoinType>(signer::address_of(account))) {
            // Register one.
          coin::register<CoinType>(account);
        };

        let fa: FungibleAsset = primary_fungible_store::withdraw(account, metadata, amount);
        let coins = coin_wrapper::wrap_fa<CoinType>(fa);
        coin::deposit<CoinType>(signer::address_of(account), coins);
    }

    // Withdraw from Econia
    public entry fun unwrap_ownership_token<CoinType>(
        account: &signer,
        amount: u64,
    ) {
        let coins = coin::withdraw<CoinType>(account, amount);
        let fa = coin_wrapper::unwrap_fa<CoinType>(coins);
        primary_fungible_store::deposit(signer::address_of(account), fa);
    }

    #[view]
    public fun get_coin_type_from_fa(listing_info: Object<ListingInfo>): String acquires ListingInfo {
        let listing_status: &ListingInfo = borrow_global<ListingInfo>(
            object::object_address(&listing_info)
        );
        coin_wrapper::get_coin_type_from_fa(listing_status.ownership_token)
    }

    public fun create_coin_wrapper<CoinType>(
        account: &signer,
        fa_metadata: Object<Metadata>
    ) {
        // assert_is_admin(account);
        coin_wrapper::create_coin_asset<CoinType>(account, fa_metadata);
    }

    // Create a marketplace using Econia API
    // Step 1. create_object_and_publish_package
    public entry fun create_secondary_market_step_1(
        admin: &signer,
        listing: Object<ListingInfo>,
        metadata_serialized: vector<u8>,
        code: vector<vector<u8>>,
    ) acquires ListingInfo, Roles {
        assert_is_admin(admin);

        let seeds = vector[];

        let sequence_number = account::get_sequence_number(signer::address_of(admin)) + 1;
        let separator: vector<u8> = b"aptos_framework::object_code_deployment";
        vector::append(&mut seeds, bcs::to_bytes(&separator));
        vector::append(&mut seeds, bcs::to_bytes(&sequence_number));

        let constructor_ref = &object::create_named_object(admin, seeds);
        let code_signer = &object::generate_signer(constructor_ref);
        let code_signer_addr = object::address_from_constructor_ref(constructor_ref);

        code::publish_package_txn(
            code_signer,
            metadata_serialized,
            code
        );

        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );
        listing_status.wrapper_coin = option::some(code_signer_addr);
    }

    // Step 2. Register the market using the newly created coin type using Econia SDK
    public entry fun create_secondary_market<QuoteAssetType>(
        admin: &signer,
        listing: Object<ListingInfo>,
    ) acquires ListingInfo, Roles {
        assert_is_admin(admin);

        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );
        let type_info = &type_info::type_of<QuoteAssetType>();
        assert!(
            type_info::account_address(type_info) == option::get_with_default(&listing_status.wrapper_coin, @0x00),
            ECOIN_TYPE_NOT_MATCH_REGISTERED_COIN_TYPE_IN_LISTING
        );

        // Step 2: get the type and the front-end should call `create_secondary_market_step_2<>`
        let lot_size = 1; // 1 Wrapper Coin
        let tick_size = 1000000; // 0.01 WrapperCoin
        let min_size = 1; // 1 APT
        market::register_market_base_coin_from_coinstore<
            QuoteAssetType,
            aptos_framework::aptos_coin::AptosCoin,
            aptos_framework::aptos_coin::AptosCoin,
        >(
            admin,
            lot_size,
            tick_size,
            min_size
        );

        listing_status.market_registered = true;
    }

    public entry fun set_market_id(
        admin: &signer,
        listing: Object<ListingInfo>,
        market_id: u64,
     ) acquires ListingInfo, Roles {
        assert_is_admin(admin);
        let listing_status: &mut ListingInfo = borrow_global_mut<ListingInfo>(
            object::object_address(&listing)
        );

        listing_status.market_id = market_id;
    }

    #[view]
    public fun remaining_shares(
        listing: Object<ListingInfo>,
    ) : u128 acquires ListingInfo {
        let listing_info = borrow_global<ListingInfo>(object::object_address(&listing));
        let metadata_obj = listing_info.ownership_token;

        let supply: u128 = option::get_with_default(&fungible_asset::supply(metadata_obj), 0u128);
        let maximum_supply: u128 = option::get_with_default(&fungible_asset::maximum(metadata_obj), supply);

        let result = maximum_supply - supply;
        debug::print(&utf8(b"remaining_shares"));
        debug::print(&result);
        result
    }

    fun assert_is_admin(
        admin: &signer,
    ) acquires Roles {
        let roles = borrow_global<Roles>(get_app_signer_addres());
        assert!(vector::contains(&roles.admins, &signer::address_of(admin)), EUNAUTHORIZED);
    }

    #[view]
    public fun get_all_listings() : vector<Object<ListingInfo>> acquires Registry {
        let registry: &mut Registry = borrow_global_mut<Registry>(get_app_signer_addres());
        registry.listings
    }

    #[view]
    public fun get_listing_info(listing: Object<ListingInfo>): (
        u8, u64, u64, u128, u64, u64, address, address, u64, Option<address>, bool
    ) acquires ListingInfo {
        let listing_info: &ListingInfo = borrow_global<ListingInfo>(object::object_address(&listing));
        (
            listing_info.status,
            listing_info.start_date,
            listing_info.end_date,
            listing_info.funding_target,
            listing_info.token_price,
            listing_info.minting_fee,
            object::object_address(&listing_info.ownership_token),
            object::object_address(&listing_info.reward_pool),
            listing_info.market_id,
            listing_info.wrapper_coin,
            listing_info.market_registered,
        )
    }

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    struct FakeMoney {}

    #[test_only]
    use tokenized_properties::package_manager;

     #[test(admin = @tokenized_properties, receiver = @0x123, core = @0x01)]
    fun test_create_coin_wrapper(
        admin: &signer,
        core: &signer,
        receiver: &signer,
    ) acquires Registry, ListingInfo, Roles {
        let (burn_cap, mint_cap) = aptos_framework::aptos_coin::initialize_for_test(core);
        aptos_account::create_account(signer::address_of(admin));
        coin::deposit(signer::address_of(admin), coin::mint(100_00000000, &mint_cap));
        aptos_account::create_account(signer::address_of(receiver));
        coin::deposit(signer::address_of(receiver), coin::mint(100_00000000, &mint_cap));

        ownership_token::initialize(admin);
        package_manager::init_module_for_test(admin);
        coin_wrapper::init_module_for_test(admin);
        coin_wrapper::initialize();

        init_module(admin);

        timestamp::set_time_has_started_for_testing(core);
        timestamp::fast_forward_seconds(50);

        create_entry(
            admin,
            utf8(b"description"),
            utf8(b"name"),
            utf8(b"symbol"),
            100000000,
            utf8(b"uri"),
            utf8(b"icon"),
            option::none(),
            option::none(),
            0,
            100,
            option::none(),
            1,
            0,
        );

        let sequence_number = account::get_sequence_number(signer::address_of(admin)) + 1;

        let seeds = vector[];
        let separator: vector<u8> = b"aptos_framework::object_code_deployment";
        vector::append(&mut seeds, bcs::to_bytes(&separator));
        vector::append(&mut seeds, bcs::to_bytes(&sequence_number));
        debug::print(&seeds);

        let listings = get_all_listings();
        assert!(vector::length(&listings) == 1, 1);

        let listing_info_obj = *vector::borrow(&listings, 0);
        let asset_addr = object::object_address(&listing_info_obj);
        let listing_info = borrow_global<ListingInfo>(asset_addr);
        let metadata = listing_info.ownership_token;

        create_coin_wrapper<FakeMoney>(admin, metadata);

        buy_shares(receiver, listing_info_obj, 100);
        assert!(coin::balance<AptosCoin>(signer::address_of(receiver)) == 90_00000000, 2);
        assert!(primary_fungible_store::balance(signer::address_of(receiver), metadata) == 100, 3);

        wrap_ownership_token<FakeMoney>(receiver, metadata, 5);
        assert!(coin::balance<FakeMoney>(signer::address_of(receiver)) == 5, 4);
        assert!(primary_fungible_store::balance(signer::address_of(receiver), metadata) == 95, 5);

        unwrap_ownership_token<FakeMoney>(receiver, 5);
        assert!(coin::balance<FakeMoney>(signer::address_of(receiver)) == 0, 6);
        assert!(primary_fungible_store::balance(signer::address_of(receiver), metadata) == 100, 7);

        let type_name = get_coin_type_from_fa(listing_info_obj);
        debug::print(&type_name);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

}

