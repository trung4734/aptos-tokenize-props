import { useQuery } from "@tanstack/react-query";

import { type TypeTag } from "@/utils/TypeTag";
import { aptosClient } from "@/utils/aptosClient";

export type CoinInfo = {
  decimals: number;
  name: string;
  symbol: string;
};

export const useCoinInfo = (coinTypeTag?: TypeTag | null) => {
  return useQuery({
    queryKey: ["useCoinInfo", coinTypeTag?.toString()],
    queryFn: async () => {
      if (!coinTypeTag) return null;
      const coinInfo = await aptosClient().getAccountResource<CoinInfo>({
        accountAddress: coinTypeTag.addr,
        resourceType: `0x1::coin::CoinInfo<${coinTypeTag.toString()}>`,
      });
      return coinInfo;
    }
  });
};
