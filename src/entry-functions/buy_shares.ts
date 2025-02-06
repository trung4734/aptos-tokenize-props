import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type BuyShareArguments = {
    listingInfo: string;
    amount: number;
};

export const buyShares = (args: BuyShareArguments): InputTransactionData => {
    const { listingInfo, amount } = args;
    return {
        data: {
            function: `${MODULE_ADDRESS}::controller::buy_shares`,
            typeArguments: [],
            functionArguments: [listingInfo, amount],
        },
    };
};
