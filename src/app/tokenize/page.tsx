"use client"

// External packages
import { useRef, useState } from "react";
import { isAptosConnectWallet, useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal utils
import { aptosClient } from "@/utils/aptosClient";
// Internal components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { CREATOR_ADDRESS } from "@/constants";
import { WarningAlert } from "@/components/ui/warning-alert";
import { UploadSpinner } from "@/components/UploadSpinner";
import { LabeledInput } from "@/components/ui/labeled-input";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { ConfirmButton } from "@/components/ui/confirm-button";
// Entry functions
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { createEntry } from "@/entry-functions/create_entry";
import { uploadPropertyImages, uploadTokenMetadata } from "@/utils/assetsMetadataUploader";
import { LabelTextArea } from "@/components/ui/labeled-textarea";

function App() {
  // Wallet Adapter provider
  const aptosWallet = useWallet();
  const { account, wallet, signAndSubmitTransaction } = useWallet();

  // Collection data entered by the user on UI
  const [propertyName, setPropertyName] = useState<string>("");
  const [propertyAddress, setPropertyAddress] = useState<string>("");
  const [propertySymbol, setPropertySymbol] = useState<string>("");
  const [propertyType, setPropertyType] = useState<string>("");
  const [propertyValue, setPropertyValue] = useState<number>(0);
  const [rentalYield, setRentalYield] = useState<number>(0);
  const [targetFunding, setTargetFunding] = useState<number>(0);
  const [maximumSupply, setMaximumSupply] = useState<number>(0);
  const [marketingDescription, setMarketingDescription] = useState<string>("");
  const [publicMintStartDate, setPublicMintStartDate] = useState<Date>();
  const [publicMintStartTime, setPublicMintStartTime] = useState<string>();
  const [publicMintEndDate, setPublicMintEndDate] = useState<Date>();
  const [publicMintEndTime, setPublicMintEndTime] = useState<string>();
  const [publicMintLimitPerAccount, setPublicMintLimitPerAccount] = useState<number>(1);
  const [publicMintFeePerNFT, setPublicMintFeePerNFT] = useState<number>();
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileURLs, setFileURLs] = useState<string[] | null>(null);

  // Internal state
  const [isUploading, setIsUploading] = useState(false);

  // Local Ref
  const inputRef = useRef<HTMLInputElement>(null);

  // On publish mint start date selected
  const onPublicMintStartTime = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    setPublicMintStartTime(timeValue);

    const [hours, minutes] = timeValue.split(":").map(Number);

    publicMintStartDate?.setHours(hours);
    publicMintStartDate?.setMinutes(minutes);
    publicMintStartDate?.setSeconds(0);
    setPublicMintStartDate(publicMintStartDate);
  };

  // On publish mint end date selected
  const onPublicMintEndTime = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    setPublicMintEndTime(timeValue);

    const [hours, minutes] = timeValue.split(":").map(Number);

    publicMintEndDate?.setHours(hours);
    publicMintEndDate?.setMinutes(minutes);
    publicMintEndDate?.setSeconds(0);
    setPublicMintEndDate(publicMintEndDate);
  };

  // On create collection button clicked
  const onCreateCollection = async () => {
    try {
      if (!account) throw new Error("Please connect your wallet");
      if (!files) throw new Error("Please upload files");
      if (account.address !== CREATOR_ADDRESS) throw new Error("Wrong account");
      if (isUploading) throw new Error("Uploading in progress");

      // Set internal isUploading state
      setIsUploading(true);

      const { mainImageUri, imageUri } = await uploadPropertyImages(
        aptosWallet,
        files
      )

      const { metadataUri } = await uploadTokenMetadata(
        aptosWallet,
        propertyName,
        `Represents tokenized property shares of ${propertyName}`,
        mainImageUri,
        imageUri,
        propertyAddress,
        propertyType,
        marketingDescription,
        rentalYield,
        propertyValue,
        maximumSupply,
      )

      // Submit a create_collection entry function transaction
      const individualTokenPrice = targetFunding / maximumSupply
      const response = await signAndSubmitTransaction(
        createEntry({
          propertyDescription: `Represents tokenized property shares of ${propertyName}`,
          propertyName,
          propertySymbol,
          maximumSupply,
          entryUri: metadataUri,
          iconUri: mainImageUri,
          premintAddresses: undefined,
          preMintAmount: undefined,
          publicMintStartDate,
          publicMintEndDate,
          publicMintLimitPerAccount,
          individualTokenPrice,
          publicMintFeePerNFT,
        }),
      );

      // Wait for the transaction to be commited to chain
      const committedTransactionResponse = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });

      // Once the transaction has been successfully commited to chain, navigate to the `my-collection` page
      if (committedTransactionResponse.success) {
        // navigate(`/my-collections`, { replace: true });
      }
    } catch (error) {
      alert(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="flex flex-col md:flex-row items-start justify-between px-8 py-2 gap-4 max-w-screen-xl mx-auto">
        <div className="w-full md:w-2/3 flex flex-col gap-y-4 order-2 md:order-1">
          {(!account || account.address !== CREATOR_ADDRESS) && (
            <WarningAlert title={account ? "Wrong account connected" : "No account connected"}>
              To continue with creating your collection, make sure you are connected with a Wallet and with the same
              profile account as in your COLLECTION_CREATOR_ADDRESS in{" "}
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                .env
              </code>{" "}
              file
            </WarningAlert>
          )}

          {wallet && isAptosConnectWallet(wallet) && (
            <WarningAlert title="Wallet not supported">
              Google account is not supported when creating a NFT collection. Please use a different wallet.
            </WarningAlert>
          )}

          <LabeledInput
            id="property-name"
            type="text"
            required
            label="Name"
            tooltip="Name of the property"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPropertyName(e.target.value);
            }}
          />

          <LabeledInput
            id="property-address"
            required
            type="text"
            label="Address"
            tooltip="Property address"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPropertyAddress(e.target.value);
            }}
          />

          <LabeledInput
            id="property-type"
            required
            type="text"
            label="Property Type"
            tooltip="Property type"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPropertyType(e.target.value);
            }}
          />

          <LabeledInput
            id="property-symbol"
            required
            type="text"
            label="Token Symbol"
            tooltip="Token symbol"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPropertySymbol(e.target.value);
            }}
          />

          <UploadSpinner on={isUploading} />
          <div className="flex flex-col item-center space-y-4">
            <Label>
              Images
            </Label>
            <Card>
              <CardHeader>
                <CardDescription>Uploads collection files to Irys, a decentralized storage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-start justify-between">
                  {!files?.length && (
                    <Label
                      htmlFor="upload"
                      className={buttonVariants({
                        variant: "outline",
                        className: "cursor-pointer",
                      })}
                    >
                      Choose Folder to Upload
                    </Label>
                  )}
                  <Input
                    className="hidden"
                    ref={inputRef}
                    id="upload"
                    disabled={isUploading || !account || !wallet || isAptosConnectWallet(wallet)}
                    webkitdirectory="true"
                    multiple
                    type="file"
                    placeholder="Upload Assets"
                    onChange={(event) => {
                      setFiles(event.currentTarget.files);

                      let file_urls: string[] = []
                      if (!!event.currentTarget.files) {
                        for (var i = 0; i < event.currentTarget.files.length; i++) {
                          file_urls.push(URL.createObjectURL(event.currentTarget.files[i]));
                        };
                        setFileURLs(file_urls)
                      }
                    }}
                  />

                  {!!files?.length && (
                    <div>
                      {files.length} images uploaded {" "}
                      <Button
                        variant="link"
                        className="text-destructive"
                        onClick={() => {
                          setFiles(null);
                          inputRef.current!.value = "";
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <LabelTextArea
            id="marketing-desc"
            required
            label="Marketing Description"
            tooltip="Description of tokenized property to attract investors"
            disabled={isUploading || !account}
            onChange={(e) => {
              setMarketingDescription(e.target.value);
            }}
          />

          <LabeledInput
            id="property-value"
            required
            label="Property Value in $"
            tooltip="Appraised Fair market value"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPropertyValue(parseInt(e.target.value));
            }}
          />

          <LabeledInput
            id="rental-yield"
            required
            label="Rental Yield in %"
            tooltip="Estimated annual rental yield"
            disabled={isUploading || !account}
            onChange={(e) => {
              setRentalYield(parseInt(e.target.value));
            }}
          />

          <LabeledInput
            id="target-funding"
            required
            label="Target Funding in $"
            tooltip="Target funding"
            disabled={isUploading || !account}
            onChange={(e) => {
              setTargetFunding(parseInt(e.target.value));
            }}
          />

          <div className="flex justify-stretch item-center gap-4 mt-4">
            <div className="basis-1/2">
              <LabeledInput
                id="maximum-supply"
                required
                label="Maximum Token Supply"
                tooltip="Maximum tokens that can be minted"
                disabled={isUploading || !account}
                onChange={(e) => {
                  setMaximumSupply(parseInt(e.target.value));
                }}
              />
            </div>

            <div className="basis-1/2">
              <LabeledInput
                id="token-price"
                label="Individual Token Price"
                tooltip="Individual token price"
                disabled
                value={maximumSupply > 0 ? targetFunding / maximumSupply : 0}
                onChange={(_: any) => { }}
              />
            </div>
          </div>

          <LabeledInput
            id="mint-limit"
            label="Mint limit per address"
            tooltip="How many tokens an individual address is allowed to mint"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPublicMintLimitPerAccount(parseInt(e.target.value));
            }}
          />

          <LabeledInput
            id="mint-fee"
            label="Mint fee in APT"
            tooltip="The fee the nft minter is paying the collection creator when they mint an NFT, denominated in APT"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPublicMintFeePerNFT(Number(e.target.value));
            }}
          />

          <div className="flex item-center gap-4 mt-4">
            <DateTimeInput
              id="mint-start"
              label="Mint start date"
              tooltip="When minting becomes active"
              disabled={isUploading || !account}
              date={publicMintStartDate}
              onDateChange={setPublicMintStartDate}
              time={publicMintStartTime}
              onTimeChange={onPublicMintStartTime}
              className="basis-1/2"
            />

            <DateTimeInput
              id="mint-end"
              label="Mint end date"
              tooltip="When minting finishes"
              disabled={isUploading || !account}
              date={publicMintEndDate}
              onDateChange={setPublicMintEndDate}
              time={publicMintEndTime}
              onTimeChange={onPublicMintEndTime}
              className="basis-1/2"
            />
          </div>

          <ConfirmButton
            title="Create Collection"
            className="self-start mt-8 bg-black"
            onSubmit={onCreateCollection}
            // disabled={
            //   !account ||
            //   !files?.length ||
            //   !publicMintStartDate ||
            //   !publicMintLimitPerAccount ||
            //   !account ||
            //   isUploading
            // }
            confirmMessage={
              <>
                <p>The upload process requires at least 2 message signatures</p>
                <ol className="list-decimal list-inside">
                  <li>To upload collection cover image file and NFT image files into Irys.</li>

                  <li>To upload collection metadata file and NFT metadata files into Irys.</li>
                </ol>
                <p>In the case we need to fund a node on Irys, a transfer transaction submission is required also.</p>
              </>
            }
          />
        </div>
        <div className="flex flex-col gap-y-4 w-full md:w-1/3 order-1 md:order-2">
          <Card>
            <CardHeader className="body-md-semibold">Location</CardHeader>
            <CardContent>
              <Link href="https://aptos.dev/standards/digital-asset" className="body-sm underline" target="_blank">
                Find out more about Digital Assets on Aptos
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="body-md-semibold">Images</CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                {
                  !!fileURLs?.length && fileURLs.map((fileURL) => (
                    <div key={fileURL}>
                      <Image
                        className="h-auto max-w-full rounded-lg"
                        src={fileURL}
                        alt=""
                        width={300}
                        height={300}
                      />
                    </div>
                  ))
                }
              </div>
              {
                !fileURLs &&
                <p>Uploaded images will be shown here</p>

              }
            </CardContent>
          </Card>
        </div>
      </div >
      <Footer />
    </>
  );
}

export default App;