"use client"

import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { Toaster } from "@/components/ui/toaster";
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert";
import type { ReactNode } from "react";
import "../globals.css";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { AptosContextProvider } from "@/contexts/AptosContext";

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Provider store={store}>
        <AptosContextProvider>
          <WalletProvider>
            <ReactQueryProvider>
              <div id="root">{children}</div>
              <WrongNetworkAlert />
              <Toaster />
            </ReactQueryProvider>
          </WalletProvider>
        </AptosContextProvider>
      </Provider>
    </>
  );
}
