import { AccountAddress } from "@aptos-labs/ts-sdk";
import { useState, useEffect } from "react";

import { getListings } from "@/view-functions/getListings";
import { getListingInfo } from "@/view-functions/getListingInfo";

/**
 * A react hook to get all collections under the current contract.
 *
 * This call can be pretty expensive when fetching a big number of collections,
 * therefore it is not recommended to use it in production
 *
 */
export function useGetListings() {
    const [listings, setListings] = useState<Array<any>>([]);

    useEffect(() => {
        async function run() {
            // fetch the contract registry address
            const registry = await getListings();
            // fetch collections objects created under that contract registry address
            const objects = await getListingsInfo(registry);
            // get each collection object data
            //   const collections = await getCollections(objects);
            //   setCollections(collections);
            setListings(objects)
        }

        run();
    }, []);

    return listings;
}

export function useGetListingInfo(obj_addr: string) {
    const [listingInfo, setListingInfo] = useState<any>({});

    useEffect(() => {
        async function run() {
            // fetch collections objects created under that contract registry address
            const objects = await getListingInfo({ listing_obj_addr: obj_addr });
            setListingInfo(objects)
        }

        run();
    }, []);

    return listingInfo;
}


const getListingsInfo = async (registry: [{ inner: string }]) => {
    const objects = await Promise.all(
        registry.map(async (register: { inner: string }) => {
            const formattedRegistry = AccountAddress.from(register.inner).toString();
            const object = await getListingInfo({
                listing_obj_addr: formattedRegistry,
            });

            return object;
        }),
    );
    return objects;
};
