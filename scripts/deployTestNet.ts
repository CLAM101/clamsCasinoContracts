async function main() {
  const initialSupply = 10000000;

  // const [owner, otherAccount, thirdAccount, fourthAccount] =
  //   await ethers.getSigners();

  // const V2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const ClamsToken = await ethers.getContractFactory("ClamsToken");
  const Casino = await ethers.getContractFactory("Casino");

  const clamstoken = await ClamsToken.deploy(10000000);

  await clamstoken.waitForDeployment();

  // const v2mock = await V2Mock.deploy(1000000000, 1000000000);

  // await v2mock.waitForDeployment();

  // await v2mock.createSubscription();

  // await v2mock.fundSubscription(1, 1000000000000000);

  const casino = await Casino.deploy(
    14273,
    "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
    "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15"
  );

  await casino.waitForDeployment();

  //await v2mock.addConsumer(1, casino.target);

  // const deployerAccountBalance = await clamstoken.balanceOf(owner);

  //const currentSupply = await clamstoken.getCurrentSupply();

  console.log(
    // "token deployed current supply:",
    // currentSupply.toString(),
    // "deployer account balance",
    // deployerAccountBalance.toString(),
    "Casino address",
    casino.target
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
