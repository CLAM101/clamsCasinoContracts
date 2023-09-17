// import {
//   time,
//   loadFixture,
// } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
// import { expect } from "chai";
// import { ethers } from "hardhat";

// describe("ClamsToken", function () {
//   async function deployToken() {
//     // Contracts are deployed using the first signer/account by default
//     const [owner, otherAccount] = await ethers.getSigners();

//     const ClamsToken = await ethers.getContractFactory("ClamsToken");
//     const clamstoken = await ClamsToken.deploy(10000000);

//     return { clamstoken, owner, otherAccount };
//   }

//   describe("Deployment", function () {
//     it("Should Deploy Token and provide balances", async function () {
//       const { clamstoken, owner, otherAccount } = await loadFixture(
//         deployToken
//       );

//       const ownerBalance = (await clamstoken.balanceOf(owner)).toString();
//       const currentSupply = (await clamstoken.getCurrentSupply()).toString();

//       expect(ownerBalance).to.equal("5000000000000000000000000");
//       console.log("Owner Balance", ownerBalance);
//       expect(currentSupply).to.equal("5000000000000000000000000");
//       console.log("Current Supply", ownerBalance);
//     });
//   });
// });
