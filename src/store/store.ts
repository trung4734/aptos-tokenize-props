import { configureStore } from "@reduxjs/toolkit";

import orderBookReducer from "../components/marketplace/features/orderBookSlice";
import priceStatsReducer from "../components/marketplace/features/priceStatsSlice";

export const store = configureStore({
  reducer: {
    priceStats: priceStatsReducer,
    orderBook: orderBookReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
