import { AccountAddress, type AccountAddressInput } from "@aptos-labs/ts-sdk";
import { useQuery } from "@tanstack/react-query";

import { fromRawCoinAmount } from "@/utils/coin";
import { type TypeTag } from "@/utils/TypeTag";
import { useCoinInfo } from "./useCoinInfo";
import { aptosClient } from "@/utils/aptosClient";


export type CoinStore = {
  coin: {
    value: number;
  };
};

export const CoinBalanceQueryKey = (
  coinTypeTag?: TypeTag | null,
  userAddr?: AccountAddressInput | null,
) => [
    "useCoinBalance",
    coinTypeTag?.toString(),
    userAddr ? AccountAddress.from(userAddr) : null,
  ];

export const useCoinBalance = (
  coinTypeTag?: TypeTag | null,
  userAddrInput?: AccountAddressInput | null,
) => {
  const coinInfo = useCoinInfo(coinTypeTag);
  const userAddr = userAddrInput ? AccountAddress.from(userAddrInput) : null;

  console.log("Coin balance ", coinTypeTag, userAddrInput)

  return useQuery({
    queryKey: CoinBalanceQueryKey(coinTypeTag, userAddr),
    enabled: !!coinInfo.data,
    queryFn: async () => {
      console.log("CCC", coinTypeTag, userAddr)
      if (!userAddr || !coinTypeTag) return null;
      try {
        const coinStore = await aptosClient().getAccountResource<CoinStore>({
          accountAddress: userAddr,
          resourceType: `0x1::coin::CoinStore<${coinTypeTag.toString()}>`,
        });
        console.log("Coin Store", coinStore)
        return fromRawCoinAmount(coinStore.coin.value, coinInfo.data!.decimals);
      } catch (e) {
        console.log("Unable to query Coin balance", e)
        return 0;
      }
    },
  });
};
