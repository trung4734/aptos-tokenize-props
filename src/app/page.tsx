"use client"

import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect } from "react";

import { useGetCollectionData } from "@/hooks/useGetCollectionData";

import { Header } from "@/components/Header";
import { HowToMintSection } from "@/components/new-listings/HowToMintSection";
// import { OurTeamSection } from "@/components/new-listings/OurTeamSection";
import { FAQSection } from "@/components/new-listings/FAQSection";
import { OurStorySection } from "@/components/new-listings/OurStorySection";

import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { data, isLoading } = useGetCollectionData();

  const queryClient = useQueryClient();
  const { account } = useWallet();
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
      <div style={{ overflow: "hidden" }} className="overflow-hidden">
        <main className="flex flex-col gap-14 md:gap-16 mt-32">
          <section className="bg-white dark:bg-gray-900 my-60">
            <div className="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
              <div className="mx-auto max-w-screen-sm text-center">
                <h2 className="mb-4 text-4xl tracking-tight font-extrabold leading-tight text-gray-900 dark:text-white">
                  Invest in Real Estate with Blockchain Technology
                </h2>
                <p className="mb-6 font-light text-gray-500 dark:text-gray-400 md:text-lg">
                  Fractional ownership of premium real estate made possible by blockchain and tokenization.
                </p>
                <div className="flex gap-4 items-center w-full justify-center">
                  <Link href="/new-listings">
                    <Button variant="primary">
                      Buy Property
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button variant="green">
                      Marketplace
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <HowToMintSection />
          <OurStorySection />
          {/* <OurTeamSection /> */}
          <FAQSection />
        </main>

        <footer className="footer-container px-4 pb-6 w-full max-w-screen-xl mx-auto mt-6 md:mt-16 flex items-center justify-between">
          <p>{data?.collection.collection_name}</p>
          {/* <Socials /> */}
        </footer>
      </div>
      <Footer />
    </>
  );
}
