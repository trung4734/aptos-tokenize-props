import { AccountAddressInput } from "@aptos-labs/ts-sdk";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

import { APT_DECIMALS, dateToSeconds, convertAmountFromHumanReadableToOnChain } from "@/utils/helpers";
import { MODULE_ADDRESS } from "@/constants";

export type CreateEntryArguments = {
  propertyDescription: string; // The collection description
  propertyName: string; // The collection name
  propertySymbol: string;
  entryUri: string; // The project URI (i.e https://mydomain.com)
  iconUri: string;
  maximumSupply: number; // The amount of NFTs in a collection
  premintAddresses?: Array<AccountAddressInput>; // addresses in the allow list
  preMintAmount?: Array<number>; // amount of NFT to pre-mint for myself
  publicMintStartDate?: Date; // public mint start time (in seconds)
  publicMintEndDate?: Date; // public mint end time (in seconds)
  publicMintLimitPerAccount: number; // mint limit per address in the public mint
  individualTokenPrice: number; //Price of a token share
  publicMintFeePerNFT?: number; // mint fee per NFT for the public mint, on chain stored in smallest unit of APT (i.e. 1e8 oAPT = 1 APT)
};

export const createEntry = (args: CreateEntryArguments): InputTransactionData => {
  const {
    propertyDescription,
    propertyName,
    propertySymbol,
    maximumSupply,
    entryUri,
    iconUri,
    premintAddresses,
    preMintAmount,
    publicMintStartDate,
    publicMintEndDate,
    publicMintLimitPerAccount,
    individualTokenPrice,
    publicMintFeePerNFT,
  } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::create_entry`,
      typeArguments: [],
      functionArguments: [
        propertyDescription,
        propertyName,
        propertySymbol,
        maximumSupply,
        entryUri,
        iconUri,
        premintAddresses,
        preMintAmount,
        publicMintStartDate ? dateToSeconds(publicMintStartDate) : dateToSeconds(new Date()),
        dateToSeconds(publicMintEndDate),
        publicMintLimitPerAccount,
        individualTokenPrice,
        publicMintFeePerNFT ? convertAmountFromHumanReadableToOnChain(publicMintFeePerNFT, APT_DECIMALS) : 0,
      ],
    },
  };
};
