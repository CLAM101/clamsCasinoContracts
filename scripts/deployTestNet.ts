import * as dotenv from "dotenv";

dotenv.config();
import { ethers } from "hardhat";
async function main() {
  const ClamsToken = await ethers.getContractFactory("ClamsToken");
  const Casino = await ethers.getContractFactory("Casino");

  const clamstoken = await ClamsToken.deploy(10000000);

  await clamstoken.waitForDeployment();

  const casino = await Casino.deploy(
    process.env.GOERLI_VRF_SUBID,
    process.env.GOERLI_VRF_COORDINATOR_ADDRESS,
    process.env.GOERLI_VRF_COORDINATOR_KEY_HASH,
    clamstoken.target
  );

  await casino.waitForDeployment();

  console.log("Casino address", casino.target);
  console.log("token address", clamstoken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
