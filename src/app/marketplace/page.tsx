"use client"

// External packages
import { useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal utils
// Internal components
import { Header } from "@/components/Header";
// Entry functions
import { Footer } from "@/components/Footer";
import { useGetTokensOfCollection } from "@/hooks/useGetTokensOfCollection";
import { useQueryClient } from "@tanstack/react-query";
import { useGetListings } from "@/hooks/useGetListings";
import { PropertyMarketplaceCard } from "@/components/new-listings/PropertyMarketplaceCard";

function App() {

  const { data, isLoading } = useGetTokensOfCollection();

  const queryClient = useQueryClient();
  const { account } = useWallet();

  const listings = useGetListings();

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient]);

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

      <div className="max-w-screen-xl mx-auto w-full my-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 px-8">
          {
            data?.tokens && data?.tokens.length > 0 && data?.tokens.map((el) => {
              const listing_info = listings.find((listing_el) => listing_el.ownership_token === el.token_data_id)

              return (
                <div key={el?.token_data_id}>
                  <PropertyMarketplaceCard
                    token_data={el}
                    listing_info={listing_info}
                  />
                </div>
              )
            })
          }
        </div>
      </div>
      <Footer />
    </>
  );
}

export default App;