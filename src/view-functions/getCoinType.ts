import { AccountAddress } from "@aptos-labs/ts-sdk";
import { aptosClient } from "@/utils/aptosClient";
import { MODULE_ADDRESS } from "@/constants";


export type getCoinTypeFromListingArgs = {
  listingInfo: string;
};

export const getCoinTypeFromListing = async (args: getCoinTypeFromListingArgs) => {
  const { listingInfo } = args;

  const registry = await aptosClient().view<[string]>({
    payload: {
      function: `${AccountAddress.from(MODULE_ADDRESS!)}::controller::get_coin_type_from_fa`,
      functionArguments: [listingInfo],
    },
  });
  return registry[0];
};
