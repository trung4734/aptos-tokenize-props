"use client"

import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ConnectWalletAlert } from "@/components/new-listings/ConnectWalletAlert";
import { Footer } from "@/components/Footer";
import { MintCard } from "@/components/new-listings/MintCard";
import { useGetTokensOfCollection } from "@/hooks/useGetTokensOfCollection";
import { PropertyHeroSection } from "@/components/new-listings/PropertyHeroSection";
import { config } from "@/config";
import { useGetListings } from "@/hooks/useGetListings";
import { PropertyDetailTab } from "@/components/new-listings/PropertyDetailTab";

export default function Page({ params }: { params: { id: string } }) {

    const queryClient = useQueryClient();
    const { account } = useWallet();

    const { data, isLoading } = useGetTokensOfCollection();
    const listings: Array<any> = useGetListings();

    const [tokenData, setTokenData] = useState<any>();
    const [tokenMetadata, setTokenMetadata] = useState<any>();
    const [listingInfo, setListingInfo] = useState<any>();

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

    if (isLoading) {
        return (
            <div className="text-center p-8">
                <h1 className="title-md">Loading...</h1>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div style={{ overflow: "hidden" }} className="overflow-hidden">
                <main className="flex flex-col gap-10 md:gap-16 mt-6 max-w-screen-lg mx-auto">
                    <ConnectWalletAlert />
                    <PropertyHeroSection
                        tokenId={tokenData?.token_data_id}
                        propertyName={tokenData?.token_name ?? config.defaultCollection?.name}
                        propertyMetadata={tokenMetadata}
                        listingInfo={listingInfo}
                    />
                    <PropertyDetailTab
                        propertyMetadata={tokenMetadata}
                    />
                    <MintCard
                        tokenId={tokenData?.token_data_id}
                        propertyName={tokenData?.token_name ?? config.defaultCollection?.name}
                        propertyMetadata={tokenMetadata}
                        listingInfo={listingInfo}
                    />
                </main>

            </div>
            <Footer />
        </>
    );
}
