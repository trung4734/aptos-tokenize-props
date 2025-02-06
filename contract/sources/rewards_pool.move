// Rewards pool (from rent) for token holders.
// Only the admin can add/ deposit rewards
// Only the admin can set who can claim/ set the list of awarded addresses.
// Anyone can claim the rewards if they hold the tokens.

// The module owns the pools.

module tokenized_properties::rewards_pool {

    use aptos_framework::fungible_asset::{Self, FungibleStore, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::{Self, Object, ExtendRef};
    // use aptos_std::pool_u64_unbound::{Self as pool_u64, Pool};
    use aptos_std::simple_map::{Self, SimpleMap};
    // use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::table::{Self, Table};

    // use rewards_pool::epoch;

    use std::signer;
    use std::vector;
    use std::debug;

    friend tokenized_properties::controller;

    // Errors
    const EREWARD_TOKEN_NOT_SUPPORTED: u64 = 0;
    const ECLAIMER_NOT_IN_LIST: u64 = 1;

    struct RewardStore has store {
        store: Object<FungibleStore>,
        store_extend_ref: ExtendRef,
    }

    struct RewardsClaimer has store {
        claimers: vector<address>,
        reward_claimers: Table<address, u64>,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct RewardsPool has key {
        reward_claimers: RewardsClaimer,
        reward_store: SimpleMap<Object<Metadata>, RewardStore>
    }

    public(friend) fun create_entry(
        reward_token: Object<Metadata>,
    ) : Object<RewardsPool> {
        let pool_constructor_ref = &object::create_object(@tokenized_properties);
        let pool_signer = &object::generate_signer(pool_constructor_ref);
        let pool_addr = signer::address_of(pool_signer);

        let reward_store = simple_map::new();

        let store_constructor_ref = &object::create_object(pool_addr);
        let store_extend_ref = object::generate_extend_ref(store_constructor_ref);
        let store = fungible_asset::create_store(store_constructor_ref, reward_token);
        simple_map::add(&mut reward_store, reward_token, RewardStore {
            store,
            store_extend_ref,
        });

        move_to(
            pool_signer,
            RewardsPool {
                reward_claimers: RewardsClaimer {
                    claimers: vector::empty(),
                    reward_claimers: table::new(),

                },
                reward_store: reward_store
            }
        );

        object::object_from_constructor_ref(pool_constructor_ref)
    }

    public(friend) fun deposit_reward(
        admin: &signer,
        reward_pool: Object<RewardsPool>,
        asset: Object<Metadata>,
        amount: u64,
    ) acquires RewardsPool {
        let rewards_pool = borrow_global_mut<RewardsPool>(object::object_address(&reward_pool));
        let rewards_store = &rewards_pool.reward_store;

        assert!(simple_map::contains_key(rewards_store, &asset), EREWARD_TOKEN_NOT_SUPPORTED);

        // Deposit the reward to the corresponding store
        let reward_store = simple_map::borrow(rewards_store, &asset);
        let receiver_addr = object::object_address(&reward_store.store);
        debug::print(&receiver_addr);
        primary_fungible_store::transfer(admin, asset, receiver_addr, amount);
    }

    public(friend) fun set_claimers_shares(
        reward_pool: Object<RewardsPool>,
        claimers: vector<address>,
        rewards: vector<u64>,
    ) acquires RewardsPool {
        let rewards_pool = borrow_global_mut<RewardsPool>(object::object_address(&reward_pool));
        let reward_claimers = &mut rewards_pool.reward_claimers;

        vector::for_each(claimers, |claimer| {
            let (_, idx) = vector::index_of(&claimers, &claimer);
            let reward_share = *vector::borrow(&rewards, idx);
            if (!vector::contains(&reward_claimers.claimers, &claimer)) {
                vector::push_back(&mut reward_claimers.claimers, claimer);
                table::add(&mut reward_claimers.reward_claimers, claimer, reward_share);
            } else {

            }
        });

    }

    public entry fun claim_reward(
        claimer: &signer,
        reward_pool: Object<RewardsPool>
    ) acquires RewardsPool {
        let rewards_pool = borrow_global<RewardsPool>(object::object_address(&reward_pool));
        let reward_claimers = &rewards_pool.reward_claimers;
        assert!(vector::contains(&reward_claimers.claimers, &signer::address_of(claimer)), ECLAIMER_NOT_IN_LIST);

        let reward_store = &rewards_pool.reward_store;
        let reward_tokens = simple_map::keys(reward_store);

        vector::for_each(reward_tokens, |reward_token| {
            let token_store = simple_map::borrow(reward_store, &reward_token);
            let store_signer = &object::generate_signer_for_extending(&token_store.store_extend_ref);
            let reward = *table::borrow(&reward_claimers.reward_claimers, signer::address_of(claimer));
            let fa = primary_fungible_store::withdraw(store_signer, reward_token, reward);
            primary_fungible_store::deposit(signer::address_of(claimer), fa);
        });
    }

}