import { checkIfFund, uploadFolder } from "@/utils/Irys";

const VALID_MEDIA_EXTENSIONS = ["png", "jpg", "jpeg", "gltf"];
type TokenMetadata = {
    name: string;
    description: string;
    image: string;
    decimals: number;
    properties: any;
};

export const uploadPropertyImages = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aptosWallet: any,
    fileList: FileList,
): Promise<{
    mainImageUri: string,
    imageUri: string;
}> => {

    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
        files.push(fileList[i]);
    }

    // Check valid images
    const imageFiles = files.filter((file) =>
        VALID_MEDIA_EXTENSIONS.some((ext) => file.name.endsWith(`.${ext}`))
    );
    if (imageFiles.length === 0) {
        throw new Error("Image files not found");
    }

    // Folder needs to contain at least "main.*" for the main picture
    const mainImage = files.find((file) => file.name.includes("main"));
    if (!mainImage) {
        throw new Error("The uploaded folder needs to include an image file called 'main.*'")
    }

    // Calculate total files cost to upload to Irys
    const totalFileSize =
        imageFiles.reduce((acc, file) => acc + file.size, 0);

    const GIGABYTE = Math.pow(1024, 3);
    const MAX_SIZE = 2 * GIGABYTE;
    if (totalFileSize > MAX_SIZE) {
        throw new Error("Files size should not exceed 2GB");
    }

    // Check if need to first fund an Irys node
    const funded = await checkIfFund(aptosWallet, files);

    if (funded) {
        let imageFolderReceipt: string;
        try {
            // Upload collection thumbnail image and all NFT images as a folder
            imageFolderReceipt = await uploadFolder(aptosWallet, [...imageFiles]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any

            return {
                mainImageUri: `${imageFolderReceipt}/${mainImage.name}`,
                imageUri: `${imageFolderReceipt}`
            }

        } catch (error: any) {
            throw new Error(`Error uploading collection image and NFT images ${error}`);
        }
    } else {
        throw new Error("Current account balance is not enough to fund a decentralized asset node");
    }
}

export const uploadTokenMetadata = async (
    aptosWallet: any,
    name: string,
    description: string,
    mainImageURI: string,
    imageURI: string,
    address: string,
    propertyType: string,
    marketingDescription: string,
    rentalYield: number,
    propertyValue: number,
    maximumSupply: number,
) => {

    const tokenMetadata: TokenMetadata = {
        "name": name,
        "description": description,
        "image": mainImageURI,
        "decimals": 1,
        "properties": {
            "address": address,
            "type": propertyType,
            "additional_images": imageURI,
            "rental_yield": rentalYield,
            "property_value": propertyValue,
            "marketing_description": marketingDescription,
            "maximum_supply": maximumSupply,
        }
    }

    const jsonTokenMetadataFile = new File([JSON.stringify(tokenMetadata)], "metadata.json", {
        type: "application/json"
    })

    // Check if need to first fund an Irys node
    const funded = await checkIfFund(aptosWallet, [jsonTokenMetadataFile]);

    if (funded) {
        // Upload collection metadata and all NFTs' metadata as a folder
        try {
            const metadataFolderReceipt = await uploadFolder(aptosWallet, [
                jsonTokenMetadataFile
            ]);

            return {
                metadataUri: `${metadataFolderReceipt}/metadata.json`,
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            throw new Error(`Error uploading collection metadata and NFTs' metadata ${error}`);
        }
    } else {
        throw new Error("Current account balance is not enough to fund a decentralized asset node");
    }

}