"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { DepthChart } from "@/components/marketplace/DepthChart";
import { MarketDetail } from "@/components/marketplace/MarketDetail";
import { OrderbookTable } from "@/components/marketplace/OrderBookTable";
import { OrderEntry } from "@/components/marketplace/OrderEntry";
import { OrdersTable } from "@/components/marketplace/OrderTable";
import { StatsBar } from "@/components/marketplace/StatsBar";
import { TradeHistoryTable } from "@/components/marketplace/TradeHistoryTable";
import { DepositWithdrawFlowModal } from "@/components/marketplace/modals/flows/DepositWithdrawFlowModal";
import { WrapUnwrapFlowModal } from "@/components/marketplace/modals/flows/WrapUnwrapFlowModal";
import { ApiMarket } from "@/components/marketplace/types/api";
// Internal Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/config";
import { OrderEntryContextProvider } from "@/contexts/OrderEntryContext";
import { useGetListings } from "@/hooks/useGetListings";
import { useGetTokensOfCollection } from "@/hooks/useGetTokensOfCollection";
import { useOrderBook } from "@/hooks/useOrderbook";
import { getAllMarket } from "@/utils/helpers";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";


let ChartContainer = dynamic(
  () => {
    return import("@/components/marketplace/LightweightChartsContainer").then(
      (mod) => mod.LightweightChartsContainer,
    );
  },
  { ssr: false },
);

export default function Page({ params }: { params: { id: string } }) {

  const queryClient = useQueryClient();
  const { account, connected } = useWallet();

  const { data } = useGetTokensOfCollection();
  const listings: Array<any> = useGetListings();

  const [marketData, setMarketData] = useState<Array<any>>([]);
  const [tokenData, setTokenData] = useState<any>();
  const [tokenMetadata, setTokenMetadata] = useState<any>();
  const [listingInfo, setListingInfo] = useState<any>();
  const [depositWithdrawModalOpen, setDepositWithdrawModalOpen] = useState<boolean>(false);
  const [wrapUnwrapModalOpen, setWrapUnwrapModalOpen] = useState<boolean>(false);

  const {
    data: orderbookData,
    isFetching: orderbookIsFetching,
    isLoading: orderbookIsLoading,
  } = useOrderBook(marketData.length ? marketData[0].market_id : 0);

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient]);

  useEffect(() => {
    const filteredData = data?.tokens.filter((el) => el.token_data_id === params.id)
    if (filteredData && filteredData?.length > 0) {
      setTokenData(filteredData[0])
    }
  }, [data]);

  useEffect(() => {
    const listing_info = listings?.find((el) => el.ownership_token === params.id)
    setListingInfo(listing_info);

    try {
      fetch(tokenData?.token_uri)
        .then((res) => {
          res.json().then((res_json) => {
            setTokenMetadata(res_json)
          })
        })
    } catch (e) {
      console.warn(e);
    }
  }, [listings, tokenData])

  useEffect(() => {
    const run = async () => {
      const res = await getAllMarket();

      const filtered_res = res.filter((el) => el.market_id === listingInfo?.market_id)
      setMarketData(filtered_res);
    }

    run();
  }, [listingInfo])

  const defaultTVChartProps = useMemo(() => {
    return {
      symbol: `${marketData[0]?.name ?? ""}`,
      selectedMarket: marketData[0] as ApiMarket,
      allMarketData: marketData as ApiMarket[],
    };
  }, [marketData]);

  if (orderbookIsLoading) {
    return (
      <div className="text-center p-8">
        <h1 className="title-md">Loading...</h1>
      </div>
    );
  }

  return (
    <>
      <OrderEntryContextProvider>
        <Header />
        <div className="flex items-center justify-center flex-col max-w-screen-2xl mx-auto">
          {connected ? (
            <>
              <div className="flex flex-row gap-4 p-3 mx-auto">
                {
                  marketData && marketData.length &&
                  <>
                    <div className="basis-4/6 flex flex-col gap-2">
                      <MarketDetail
                        selectedMarket={marketData[0]}
                        propertyName={tokenData?.token_name ?? config.defaultCollection?.name}
                        propertyMetadata={tokenMetadata}
                      />
                      <Card>
                        <CardContent className="flex flex-col pt-6">

                          <StatsBar allMarketData={marketData} selectedMarket={marketData[0]} />
                          <div className="flex h-full min-h-[680px] w-full grow flex-col gap-3 md:flex-row">
                            <div className=" flex flex-col w-full">
                              <div className="flex h-full min-h-[400px]">
                                <ChartContainer {...defaultTVChartProps} />
                              </div>

                              <div className="hidden h-[140px] tall:block">
                                <DepthChart
                                  marketData={marketData[0]} />
                              </div>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="flex flex-col gap-6 pt-6">
                          <OrderbookTable
                            marketData={marketData[0]}
                            data={orderbookData}
                            isFetching={orderbookIsFetching}
                            isLoading={orderbookIsLoading}
                          />
                          <OrdersTable
                            market_id={marketData[0].market_id}
                            marketData={marketData[0]}
                          />
                          <TradeHistoryTable
                            marketData={marketData[0]}
                            marketId={marketData[0].market_id}
                          />
                        </CardContent>
                      </Card>

                    </div>
                    <div className="basis-2/6">
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            <p className="font-bold text-xl">Order Entry</p>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          <OrderEntry
                            marketData={marketData[0]}
                            onDepositWithdrawClick={() => setDepositWithdrawModalOpen(true)}
                          />
                          <Separator />
                          <Button
                            type="submit"
                            // variant="blue"
                            className="w-full whitespace-nowrap py-[10px] uppercase !leading-5 tracking-[0.32px]"
                            onClick={(e) => {
                              e.preventDefault();
                              setWrapUnwrapModalOpen(true);
                            }}
                          >
                            Wrap / Unwrap Property Token
                          </Button>
                          <Button
                            type="submit"
                            // variant="blue"
                            className="w-full whitespace-nowrap py-[10px] uppercase !leading-5 tracking-[0.32px]"
                            onClick={(e) => {
                              e.preventDefault();
                              setDepositWithdrawModalOpen(true);
                            }}
                          >
                            Deposit / Withdraw Fund
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                }
              </div>
            </>
          ) : (
            <CardHeader>
              <CardTitle>To get started Connect a wallet</CardTitle>
            </CardHeader>
          )}
        </div >
      </OrderEntryContextProvider >
      <DepositWithdrawFlowModal
        selectedMarket={marketData[0]}
        isOpen={depositWithdrawModalOpen}
        onClose={() => {
          setDepositWithdrawModalOpen(false);
        }}
        allMarketData={marketData}
      />
      <WrapUnwrapFlowModal
        selectedMarket={marketData[0]}
        tokenType={listingInfo?.ownership_token}
        isOpen={wrapUnwrapModalOpen}
        onClose={() => {
          setWrapUnwrapModalOpen(false);
        }}
        allMarketData={marketData}
      />
    </>
  );
}
