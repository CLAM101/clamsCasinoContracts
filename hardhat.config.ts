import { HardhatUserConfig, extendEnvironment, task } from "hardhat/config";

import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
dotenv.config();

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs) => {
    const balance = await ethers.provider.getBalance(taskArgs.account);

    console.log(ethers.formatEther(balance), "ETH");
  });

task("accounts", "Prints test accounts").setAction(async (taskArgs) => {
  const accounts = await ethers.getSigners();

  console.log("accounts", accounts);
});
const deployerPrivateKey = process.env.DEPLOYER_ACCOUNT_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.7",
  networks: {
    hardhat: {
      chainId: 1337,
    },

    goerli: {
      url: process.env.GOERLI_ALCHEMYURL,
      accounts: [deployerPrivateKey],
    },

    polygon_mumbai: {
      url: process.env.MUMBAI_URL,
      accounts: [deployerPrivateKey],
    },
    ganache: {
      url: "http://172.31.112.1:7545",
      chainId: 5777,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
