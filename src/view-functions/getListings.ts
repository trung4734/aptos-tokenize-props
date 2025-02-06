import { AccountAddress } from "@aptos-labs/ts-sdk";
import { aptosClient } from "@/utils/aptosClient";
import { MODULE_ADDRESS } from "@/constants";

export const getListings = async () => {
    const registry = await aptosClient().view<[[{ inner: string }]]>({
        payload: {
            function: `${AccountAddress.from(MODULE_ADDRESS!)}::controller::get_all_listings`,
        },
    });
    return registry[0];
};
