import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type UnwrapTokenArguments = {
  coin_type: string;
  amount: number;
};

export const unWrapToken = (args: UnwrapTokenArguments): InputTransactionData => {
  const { coin_type, amount } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::unwrap_ownership_token`,
      typeArguments: [coin_type],
      functionArguments: [amount],
    },
  };
};