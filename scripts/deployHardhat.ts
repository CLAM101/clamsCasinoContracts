require("dotenv").config();
import { ethers } from "hardhat";

async function main() {
  const initialSupply = 10000000;

  const [owner, otherAccount, thirdAccount, fourthAccount] =
    await ethers.getSigners();

  const V2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const ClamsToken = await ethers.getContractFactory("ClamsToken");
  const Casino = await ethers.getContractFactory("Casino");

  const clamstoken = await ClamsToken.deploy(10000000);

  await clamstoken.waitForDeployment();

  const v2mock = await V2Mock.deploy(1000000000, 1000000000);

  await v2mock.waitForDeployment();

  await v2mock.createSubscription();

  await v2mock.fundSubscription(1, 1000000000000000);

  const casino = await Casino.deploy(
    1,
    v2mock.target,
    "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    clamstoken.target
  );

  await casino.waitForDeployment();

  await v2mock.addConsumer(1, casino.target);

  const deployerAccountBalance = await clamstoken.balanceOf(owner);

  const currentSupply = await clamstoken.getCurrentSupply();

  console.log(
    "token deployed current supply:",
    currentSupply.toString(),
    "deployer account balance",
    deployerAccountBalance.toString(),
    "Casino address",
    casino
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
