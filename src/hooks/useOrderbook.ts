import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useDispatch } from "react-redux";

import { API_URL } from "@/env";
import { type Orderbook, type Precision } from "../components/marketplace/types/global";
import { setOrderBook } from "@/components/marketplace/features/orderBookSlice";

type OrderBookResponse = {
  market_id: number;
  direction: "bid" | "ask";
  price: number;
  total_size?: number;
  size?: number;
  version: number;
};

export const useOrderBook = (
  market_id: number,
  precision: Precision = "0.01",
  depth = 60,
): UseQueryResult<Orderbook> => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: ["orderBook", market_id, precision],
    refetchInterval: 1000 * 10,
    queryFn: async () => {
      const fetchPromises = [
        fetch(
          `${API_URL}/price_levels?market_id=eq.${market_id}&direction=eq.bid&order=price.desc&limit=${depth}`,
        ),
        fetch(
          `${API_URL}/price_levels?market_id=eq.${market_id}&direction=eq.ask&order=price.asc&limit=${depth}`,
        ),
      ];
      const [response1, response2] = await Promise.all(fetchPromises);
      const bids = await response1.json();
      const asks = await response2.json();
      bids.forEach((bid: OrderBookResponse) => {
        bid.size = bid.total_size;
        delete bid.total_size;
      });
      asks.forEach((ask: OrderBookResponse) => {
        ask.size = ask.total_size;
        delete ask.total_size;
      });
      const orderBookData = { bids, asks };
      dispatch(setOrderBook(orderBookData));
      return orderBookData as Orderbook;
    },
  });
};
