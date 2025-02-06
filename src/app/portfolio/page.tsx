"use client";

// Internal components
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/Header";
import { Image } from "@/components/ui/image";
// Internal hooks
// Internal constants
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { useGetListings } from "@/hooks/useGetListings";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useGetFungibleAmountByOwner } from "@/hooks/useGetFungibleAmount";
import { Button } from "@/components/ui/button";
import { ClaimRewardDialog } from "@/components/new-listings/ClaimRewardDialog";

function App() {
  const queryClient = useQueryClient();
  const { account } = useWallet();

  const { data } = useGetFungibleAmountByOwner(account?.address ?? "");

  const listings: Array<any> = useGetListings();

  const [tokenMetadatas, setTokenMetadatas] = useState<Array<any>>([]);

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient]);

  useEffect(() => {
    const fetchTokenMetadatas = async (tokens: Array<any>) => {
      const metadatas = await Promise.all(
        tokens.map(async (token: any) => {
          try {
            const res = await fetch(token?.token_uri);
            const metadata = await res.json();
            return metadata;
          } catch (e) {
            console.warn(e);
          }
        })
      );

      console.log("Results", tokens, metadatas)
      setTokenMetadatas(metadatas);
      return metadatas;
    };

    fetchTokenMetadatas(data?.tokens_data ?? [])

  }, [data]);

  // If we are on Production mode, redierct to the mint page
  // const navigate = useNavigate();
  // if (IS_PROD) navigate("/", { replace: true });

  return (
    <>
      <Header />
      <Table className="max-w-screen-xl mx-auto px-10">
        {!tokenMetadatas.length && (
          <TableCaption>A list of the collections created under the current contract.</TableCaption>
        )}
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Shares</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokenMetadatas.length > 0 &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tokenMetadatas.map((tokenMetadata: any, idx: number) => {

              const listing_info = listings.find((el) => el.ownership_token === data?.tokens_data![idx].token_data_id)

              return (
                <TableRow key={tokenMetadata?.name}>
                  <TableCell className="max-w-60">
                    <div className="flex flex-col lg:flex-row gap-6 w-full items-center lg:items-start">
                      <Image
                        src={tokenMetadata?.image ?? ""}
                        rounded
                        className="w-96 h-56 bg-gray-100 shrink-0"
                      />
                      <div className="flex flex-col items-start gap-3 flex-wrap">
                        <h1 className="text-lg font-bold">{tokenMetadata?.name}</h1>
                        <p>{tokenMetadata?.properties.address}</p>
                        <div className="flex flex-row gap-6 w-3/4">
                          <div className="flex flex-col gap-4 w-full items-center border border-indigo-800 rounded-lg py-4 shadow-md">
                            <p className="text-xs font-bold text-center">Annual Rental Yield</p>
                            <p className="text-xs font-normal text-secondary-text">{tokenMetadata.properties?.rental_yield} %</p>
                          </div>
                          <div className="flex flex-col gap-4 w-full items-center border border-indigo-800 rounded-lg py-4 shadow-md">
                            <p className="text-xs font-bold text-center">Property Fair Value</p>
                            <p className="text-xs font-normal text-secondary-text">$ {tokenMetadata.properties?.property_value}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-md">
                        {data?.fungible_assets?.find((el) => el.asset_type_v2 === data.tokens_data[idx].token_data_id)?.amount_v2 ?? 0}
                        <span className="font-bold"> ${data?.fungible_assets?.find((el) => el.asset_type_v2 === data.tokens_data[idx].token_data_id)?.metadata.symbol}</span>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-4">
                    <div className="flex flex-col gap-2 mx-4">
                      <Link href={`/portfolio/${data?.tokens_data![idx].token_data_id}`}>
                        <Button className="w-full">
                          <p className="text-md">See Details</p>
                        </Button>
                      </Link>
                      <ClaimRewardDialog
                        listingInfo={listing_info}
                        tokenShare={data?.fungible_assets?.find((el) => el.asset_type_v2 === data.tokens_data[idx].token_data_id)?.amount_v2}
                        tokenSymbol={data?.fungible_assets?.find((el) => el.asset_type_v2 === data.tokens_data[idx].token_data_id)?.metadata.symbol}
                      >
                        <Button>Claim Rewards 🎁</Button>
                      </ClaimRewardDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table >
      <Footer />
    </>
  );
}


export default App;

