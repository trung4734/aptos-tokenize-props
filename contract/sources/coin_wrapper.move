/// Original implementation: https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/move-examples/swap/sources/coin_wrapper.move#L1-L208

/// This module can be included in a project to enable internal wrapping and unwrapping of fungible assets into coin.
/// This allows the project to only have to store and process fungible assets in core data structures, while still be
/// able to support both native fungible assets and coins. Note that the wrapper fungible assets are INTERNAL ONLY and
/// are not meant to be released to user's accounts outside of the project. Othwerwise, this would create multiple
/// conflicting fungible asset versions of a specific coin in the ecosystem.
///
/// The flow works as follows:
/// 1. Add the coin_wrapper module to the project.
/// 2. Add a friend declaration for any core modules that needs to call wrap/unwrap. Wrap/Unwrap are both friend-only
/// functions so external modules cannot call them and leak the internal fungible assets outside of the project.
/// 3. Add entry functions in the core modules that take coins. Those functions will be calling wrap to create the
/// internal fungible assets and store them.
/// 4. Add entry functions in the core modules that return coins. Those functions will be extract internal fungible
/// assets from the core data structures, unwrap them into and return the coins to the end users.
///
/// The fungible asset wrapper for a coin has the same name, symbol and decimals as the original coin. This allows for
/// easier accounting and tracking of the deposited/withdrawn coins.
module tokenized_properties::coin_wrapper {
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::coin::{Self, Coin, BurnCapability, FreezeCapability, MintCapability,};
    use aptos_framework::fungible_asset::{Self, FungibleAsset, Metadata};
    use aptos_framework::object::{Self, Object, ExtendRef, ObjectCore};
    use aptos_framework::primary_fungible_store;
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::type_info;
    use std::string::{Self, String, utf8};
    use std::signer;
    use std::debug;

    use tokenized_properties::package_manager;

    // Modules in the same package that need to wrap/unwrap coins need to be added as friends here.
    friend tokenized_properties::controller;

    const APP_OBJECT_SEED: vector<u8> = b"COIN_WRAPPER";
    const COIN_WRAPPER_NAME: vector<u8> = b"COIN_FA_WRAPPER";

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct CapabilityStore<phantom CoinType> has key {
      burn_cap: BurnCapability<CoinType>,
      freeze_cap: FreezeCapability<CoinType>,
      mint_cap: MintCapability<CoinType>,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct FungibleAssetStore has key, store {
        extend_ref: ExtendRef,
        metadata: Object<Metadata>,
        fa_store: address,
    }

    /// The resource stored in the main resource account to track all the fungible asset wrappers.
    /// This main resource account will also be the one holding all the deposited coins, each of which in a separate
    /// CoinStore<CoinType> resource. See coin.move in the Aptos Framework for more details.
    struct WrapperAccountCoin has key {
      // Signer cap used to withdraw deposited coins from the main resource account during unwrapping.
      signer_cap: SignerCapability,
      // Map from an original FA to the coin capbility.
      fungible_asset_to_coin: SmartTable<Object<Metadata>, Object<ObjectCore>>,
      // Map from a coin wrapper to origin FA
      coin_to_fungible_asset: SmartTable<String, Object<Metadata>>,
    }

    struct CoinRegistry has key {
      fungible_asset_to_coin_type: SmartTable<Object<Metadata>, String>
    }

    struct AppObjectController has key {
        extend_ref: ExtendRef,
    }

    /// Create the coin wrapper account to host all the deposited coins.
    fun init_module(admin: &signer) {
      let obj_constructor_ref = object::create_named_object(admin, APP_OBJECT_SEED);
      let obj_signer = object::generate_signer(&obj_constructor_ref);
      let obj_extend_ref = object::generate_extend_ref(&obj_constructor_ref);

      move_to(
        &obj_signer,
        AppObjectController {
            extend_ref: obj_extend_ref,
        }
      );

      move_to(
        &obj_signer,
        CoinRegistry {
            fungible_asset_to_coin_type: smart_table::new(),
        }
      );
    }

    public fun get_app_address(): address {
        object::create_object_address(&@tokenized_properties, APP_OBJECT_SEED)
    }

    public entry fun initialize() {
        if (is_initialized()) {
            return
        };

        let swap_signer = &package_manager::get_signer();
        let (coin_wrapper_signer, signer_cap) = account::create_resource_account(swap_signer, COIN_WRAPPER_NAME);
        package_manager::add_address(string::utf8(COIN_WRAPPER_NAME), signer::address_of(&coin_wrapper_signer));

        move_to(&coin_wrapper_signer, WrapperAccountCoin {
            signer_cap,
            coin_to_fungible_asset: smart_table::new(),
            fungible_asset_to_coin: smart_table::new(),
        });
    }

    #[view]
    public fun is_initialized(): bool {
        package_manager::address_exists(string::utf8(COIN_WRAPPER_NAME))
    }

    #[view]
    /// Return the address of the resource account that stores all deposited coins.
    public fun wrapper_address(): address {
        package_manager::get_address(string::utf8(COIN_WRAPPER_NAME))
    }

    #[view]
    /// Return whether a specific CoinType has a wrapper fungible asset. This is only the case if at least one wrap()
    /// call has been made for that CoinType.
    public fun is_supported(fa_metadata: Object<Metadata>): bool acquires WrapperAccountCoin {
        smart_table::contains(&wrapper_account_fa().fungible_asset_to_coin, fa_metadata)
    }

    #[view]
    /// Return true if the given fungible asset is a wrapper fungible asset.
    public fun is_wrapper<CoinType>(): bool acquires WrapperAccountCoin {
        let coin_type = type_info::type_name<CoinType>();
        smart_table::contains(&wrapper_account_fa().coin_to_fungible_asset, coin_type)
    }

    #[view]
    /// Return the original CoinType for a specific wrapper fungible asset. This errors out if there's no such wrapper.
    public fun get_fa_type<CoinType>(): Object<Metadata> acquires WrapperAccountCoin {
        let coin_type = type_info::type_name<CoinType>();
        *smart_table::borrow(&wrapper_account_fa().coin_to_fungible_asset, coin_type)
    }

    #[view]
    /// Return the wrapper fungible asset for a specific CoinType. This errors out if there's no such wrapper.
    public fun get_wrapper(fa_metadata: Object<Metadata>): String acquires CoinRegistry{
        *smart_table::borrow(&registry_coin().fungible_asset_to_coin_type, fa_metadata)
    }

    // Wrap the given fungible asset into coins. The FA is stored in the contract object.
    // The coins are minted to the caller address
    public(friend) fun wrap_fa<CoinType>(
        fa: FungibleAsset
    ): Coin<CoinType> acquires WrapperAccountCoin, FungibleAssetStore, CapabilityStore {
        // Ensure the corresponding fungible asset has already been created.
        let metadata = fungible_asset::asset_metadata(&fa);

        let wrapper_account = wrapper_account_fa();
        //   let wrapper_signer = &account::create_signer_with_capability(&wrapper_account.signer_cap);
        let fungible_asset_to_coin = &wrapper_account.fungible_asset_to_coin;
        let coin_wrapper = smart_table::borrow(fungible_asset_to_coin, metadata);

        let capability = borrow_global<CapabilityStore<CoinType>>(object::object_address(coin_wrapper));
        let amount = fungible_asset::amount(&fa);

        let store_address = fungible_asset_data_fa_coin(metadata).fa_store;

        primary_fungible_store::deposit(store_address, fa);
        coin::mint<CoinType>(amount, &capability.mint_cap)
    }

    /// Unwrap the given coins into fungible asset. This will burn the coin and withdraw&return the fungible asset from
    /// the main resource account.
    public(friend) fun unwrap_fa<CoinType>(
        coins: Coin<CoinType>
    ): FungibleAsset acquires WrapperAccountCoin, CapabilityStore, FungibleAssetStore {
        let amount = coin::value(&coins);

        let type_name = type_info::type_name<CoinType>();

        let fa = *smart_table::borrow(&wrapper_account_fa().coin_to_fungible_asset, type_name);
        let burn_cap = &fungible_asset_data_fa<CoinType>(fa).burn_cap;
        coin::burn(coins, burn_cap);

        let extend_ref = &fungible_asset_data_fa_coin(fa).extend_ref;
        let receiver_signer = &object::generate_signer_for_extending(extend_ref);
        primary_fungible_store::withdraw(receiver_signer, fa, amount)
    }

    // Create the coin give CoinType if it doesn't exist yet.
    public(friend) fun create_coin_asset<CoinType>(
      account: &signer,
      fa_metadata: Object<Metadata>
    ) acquires WrapperAccountCoin, CoinRegistry {
      // Initialize coin info at coin type publisher's account,
      // returning coin capabilities (this fails is the calling
      // account is not the coin type publisher).
      assert!(!coin::is_coin_initialized<CoinType>(), 13);

      let coin_type = type_info::type_name<CoinType>();
      let coin_name: String = utf8(b"W");
      let coin_symbol: String = utf8(b"w");
      string::append(&mut coin_name, fungible_asset::name(fa_metadata));
      string::append(&mut coin_symbol, fungible_asset::symbol(fa_metadata));

      let wrapper_account = mut_wrapper_account_fa();
      //   let wrapper_signer = &account::create_signer_with_capability(&wrapper_account.signer_cap);
      let fungible_asset_to_coin = &mut wrapper_account.fungible_asset_to_coin;

      if (!smart_table::contains(fungible_asset_to_coin, fa_metadata)) {

        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<CoinType>(
          account,
          coin_name,
          coin_symbol,
          fungible_asset::decimals(fa_metadata),
          false
        );

        let obj_constructor_ref = object::create_object(@tokenized_properties);
        let obj_signer = object::generate_signer(&obj_constructor_ref);
        let obj_cap = object::object_from_constructor_ref(&obj_constructor_ref);
        let obj_extend_ref = object::generate_extend_ref(&obj_constructor_ref);

        move_to(
            &obj_signer,
            CapabilityStore<CoinType> {
                burn_cap,
                freeze_cap,
                mint_cap,
            }
        );

        move_to(
            &obj_signer,
            FungibleAssetStore {
                extend_ref: obj_extend_ref,
                metadata: fa_metadata,
                fa_store: signer::address_of(&obj_signer),
            }
        );


        smart_table::add(fungible_asset_to_coin, fa_metadata, obj_cap);
        smart_table::add(&mut wrapper_account.coin_to_fungible_asset, coin_type, fa_metadata);

        let registry_coin = mut_registry_coin();
        smart_table::add(&mut registry_coin.fungible_asset_to_coin_type, fa_metadata, coin_type);

      }
    }

    #[view]
    public fun get_coin_type_from_fa(metadata: Object<Metadata>) : String acquires CoinRegistry {
      let registry_coin = registry_coin();
      let fa_to_coin = &registry_coin.fungible_asset_to_coin_type;
      assert!(smart_table::contains(fa_to_coin, metadata), 12);

      *smart_table::borrow(fa_to_coin, metadata)
    }

    inline fun fungible_asset_data_fa<CoinType>(fa: Object<Metadata>): &CapabilityStore<CoinType> acquires WrapperAccountCoin, CapabilityStore {
        let coin_obj = smart_table::borrow(&wrapper_account_fa().fungible_asset_to_coin, fa);
        borrow_global<CapabilityStore<CoinType>>(object::object_address(coin_obj))
    }

    inline fun fungible_asset_data_fa_coin(fa: Object<Metadata>): &FungibleAssetStore acquires WrapperAccountCoin, FungibleAssetStore {
        let coin_obj = smart_table::borrow(&wrapper_account_fa().fungible_asset_to_coin, fa);
        borrow_global<FungibleAssetStore>(object::object_address(coin_obj))
    }

    inline fun wrapper_account_fa(): &WrapperAccountCoin acquires WrapperAccountCoin {
        borrow_global<WrapperAccountCoin>(wrapper_address())
    }

    inline fun mut_wrapper_account_fa(): &mut WrapperAccountCoin acquires WrapperAccountCoin {
        borrow_global_mut<WrapperAccountCoin>(wrapper_address())
    }

    inline fun registry_coin(): &CoinRegistry acquires CoinRegistry {
        borrow_global<CoinRegistry>(get_app_address())
    }
    inline fun mut_registry_coin(): &mut CoinRegistry acquires CoinRegistry {
        borrow_global_mut<CoinRegistry>(get_app_address())
    }

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }
}