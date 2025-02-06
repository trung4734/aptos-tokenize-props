import { useQuery } from "@tanstack/react-query";

import { aptosClient } from "@/utils/aptosClient";
import { COLLECTION_ADDRESS } from "@/constants";

export interface Token {
    token_name: string;
    token_data_id: string;
    token_uri: string;
}

export interface Collection {
    creator_address: string;
    collection_id: string;
    collection_name: string;
    current_supply: number;
    max_supply: number;
    uri: string;
    description: string;
    cdn_asset_uris: {
        cdn_animation_uri: string;
        cdn_image_uri: string;
    };
}

interface MintQueryResult {
    current_token_datas_v2: Array<Token>;
}
interface TokenQueryResult {
    current_fungible_asset_balances: Array<any>;
    current_fungible_asset_balances_aggregate: any;

}

export function useGetTokensOfCollection(collection_address: string = COLLECTION_ADDRESS) {

    return useQuery({
        queryKey: ["tokens-data-of-collection", collection_address],
        refetchInterval: 1000 * 30,
        queryFn: async () => {
            try {
                if (!collection_address) return null;

                const res = await aptosClient().queryIndexer<MintQueryResult>({
                    query: {
                        variables: {
                            collection_id: collection_address,
                        },
                        query: `
						query PropsTokenQuery($collection_id: String) {
							current_token_datas_v2(
                                where: { current_collection: {collection_id: { _eq: $collection_id } } }
                            ) {
                                decimals
                                is_deleted_v2
                                is_fungible_v2
                                token_name
                                token_properties
                                token_uri
                                token_data_id
                                collection_id
                                description
                                current_collection {
                                    collection_id
                                    collection_name
                                    collection_properties
                                    creator_address
                                    current_supply
                                    description
                                    max_supply
                                    table_handle_v1
                                    token_standard
                                    total_minted_v2
                                    uri
                                }
							}
						}`,
                    },
                });

                const tokens = res.current_token_datas_v2;
                if (!tokens) return null;

                return {
                    tokens
                };
            } catch (error) {
                console.error("Error 1", error);
                return null;
            }
        },
    });
}

export function useGetTokenData(token_address: string) {

    return useQuery({
        queryKey: ["token-data-by-id", token_address],
        refetchInterval: 1000 * 30,
        queryFn: async () => {
            try {
                if (!token_address) return null;

                const res = await aptosClient().queryIndexer<TokenQueryResult>({
                    query: {
                        variables: {
                            token_id: token_address,
                        },
                        query: `
						query PropsTokenQuery($token_id: String) {
							current_fungible_asset_balances(
                                where: { asset_type_v2: { _eq: $token_id } }
                            ) {
                                amount_v2
                                asset_type_v2
                                metadata {
                                    icon_uri
                                    maximum_v2
                                    project_uri
                                    supply_aggregator_table_handle_v1
                                    supply_aggregator_table_key_v1
                                    supply_v2
                                    symbol
                                    token_standard
                                }
                                owner_address
							}
                            current_fungible_asset_balances_aggregate(
                                where: {asset_type_v2: {_eq: $token_id } }
                            ) {
                                aggregate {
                                    sum {
                                        amount_v2
                                    }
                                }
                            }
						}`,
                    },
                });

                // const tokens = res.current_fungible_asset_balances;
                // console.log("TOkens, ", token_address, tokens)
                // if (!tokens || tokens?.length == 0) return {};

                // return tokens[0]

                const total_balances = res.current_fungible_asset_balances_aggregate?.aggregate?.sum?.amount_v2 ?? 0

                return {
                    amount_v2: total_balances
                }

            } catch (error) {
                console.error("Error 2", error);
                return null;
            }
        },
    });
}
