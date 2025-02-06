import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";
import { EntryFunctionABI, TypeTagVector } from "@aptos-labs/ts-sdk";

export type createSecondaryMarketStep1Args = {
  listingInfo: string;
  metadata_serialized: any;
  code: any;
};

export type createSecondaryMarketStep2Args = {
  listingInfo: string;
  coin_type: string;
};

export type createSecondaryMarketStep3Args = {
  listingInfo: string;
  market_id: number;
};

const createSecondaryMarketStep1Abi: EntryFunctionABI = {
  typeParameters: [],
  parameters: [TypeTagVector.u8(), new TypeTagVector(TypeTagVector.u8())],
};

export const createSecondaryMarketStep1 = (args: createSecondaryMarketStep1Args): InputTransactionData => {
  const { listingInfo, metadata_serialized, code } = args;

  const metadata = Array.from(Buffer.from(metadata_serialized, "hex"))
  let code_serialized: any[] = []
  code.map((bytecode: any) => code_serialized.push(Array.from(Buffer.from(bytecode.substring(2), "hex"))))

  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::create_secondary_market_step_1`,
      typeArguments: [],
      functionArguments: [listingInfo, metadata, code_serialized],
      abi: createSecondaryMarketStep1Abi
    },
  };
};

export const createSecondaryMarketStep2 = (args: createSecondaryMarketStep2Args): InputTransactionData => {
  const { listingInfo, coin_type } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::create_secondary_market`,
      typeArguments: [coin_type],
      functionArguments: [listingInfo],
    },
  };
};

export const createSecondaryMarketStep3 = (args: createSecondaryMarketStep3Args): InputTransactionData => {
  const { listingInfo, market_id } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::controller::set_market_id`,
      typeArguments: [],
      functionArguments: [listingInfo, market_id],
    },
  };
};
