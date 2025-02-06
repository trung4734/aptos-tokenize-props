import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type ClaimRewardsArguments = {
  rewardPool: string;
};

export const claimReward = (args: ClaimRewardsArguments): InputTransactionData => {
  const { rewardPool } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::rewards_pool::claim_reward`,
      typeArguments: [],
      functionArguments: [rewardPool],
    },
  };
};
