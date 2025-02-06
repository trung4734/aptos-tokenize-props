import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type WrapTokenArguments = {
  coin_type: string;
  fa_metadata: string;
  amount: number;
};

export const wrapToken = (args: WrapTokenArguments): InputTransactionData => {
  const { coin_type, fa_metadata, amount } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::wrap_ownership_token`,
      typeArguments: [coin_type],
      functionArguments: [fa_metadata, amount],
    },
  };
};