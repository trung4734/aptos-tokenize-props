require("dotenv").config();

const cli = require("@aptos-labs/ts-sdk/dist/common/cli/index.js");

async function test() {
  const move = new cli.Move();

  await move.test({
    packageDirectoryPath: "contract",
    namedAddresses: {
      // message_board_addr: "0x100",
      tokenized_properties: process.env.NEXT_MODULE_PUBLISHER_ACCOUNT_ADDRESS,
      admin_addr: process.env.NEXT_PUBLIC_COLLECTION_CREATOR_ADDRESS,
    },
  });
}
test();
