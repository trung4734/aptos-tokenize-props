import { useQuery } from "@tanstack/react-query";

import { NO_CUSTODIAN } from "@/constants";
import { API_URL } from "@/env";
import { type ApiMarket } from "@/components/marketplace/types/api";
import { useWallet } from "@aptos-labs/wallet-adapter-react";


export const useBalance = (marketData: ApiMarket) => {
  const { account } = useWallet();
  const {
    data: balance,
    refetch,
    ...rest
  } = useQuery({
    queryKey: ["accountBalance", account?.address, marketData.market_id],

    refetchInterval: 1000 * 30,
    queryFn: async () => {
      try {
        const response = await fetch(
          `${API_URL}/rpc/user_balance?user_address=${account?.address}&market=${marketData.market_id}&custodian=${NO_CUSTODIAN}`,
        );
        const balance = await response.json();
        if (balance.length) {
          return {
            base_total: balance[0].base_total / 10 ** marketData.base.decimals,
            base_available:
              balance[0].base_available / 10 ** marketData.base.decimals,
            base_ceiling:
              balance[0].base_ceiling / 10 ** marketData.base.decimals,
            quote_total:
              balance[0].quote_total / 10 ** marketData.quote.decimals,
            quote_available:
              balance[0].quote_available / 10 ** marketData.quote.decimals,
            quote_ceiling:
              balance[0].quote_ceiling / 10 ** marketData.quote.decimals,
          };
        }

        return {
          base_total: null,
          base_available: null,
          base_ceiling: null,
          quote_total: null,
          quote_available: null,
          quote_ceiling: null,
        };
      } catch (e) {
        return {
          base_total: null,
          base_available: null,
          base_ceiling: null,
          quote_total: null,
          quote_available: null,
          quote_ceiling: null,
        };
      }
    }
  });

  return {
    balance,
    refetch,
    ...rest,
  };
};
