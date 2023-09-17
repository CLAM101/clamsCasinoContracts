import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { VRFCoordinatorV2Mock, Casino, ClamsToken } from "../typechain-types";

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Casino", async function () {
  let casino: Casino,
    clamstoken: ClamsToken,
    owner: HardhatEthersSigner,
    otherAccount: HardhatEthersSigner,
    thirdAccount: HardhatEthersSigner,
    fourthAccount: HardhatEthersSigner,
    v2mock: VRFCoordinatorV2Mock;

  async function deployCasino() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount, fourthAccount] =
      await ethers.getSigners();

    const ClamsToken = await ethers.getContractFactory("ClamsToken");
    const v2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const Casino = await ethers.getContractFactory("Casino");

    const clamstoken = await ClamsToken.deploy(10000000);

    await clamstoken.waitForDeployment();
    const v2mock = await v2Mock.deploy(1000000000, 1000000000);

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

    return {
      casino,
      owner,
      otherAccount,
      v2mock,
      clamstoken,
      thirdAccount,
      fourthAccount,
    };
  }

  before(async function () {
    const fixture = await loadFixture(deployCasino);
    casino = fixture.casino;
    owner = fixture.owner;
    otherAccount = fixture.otherAccount;
    thirdAccount = fixture.thirdAccount;
    fourthAccount = fixture.fourthAccount;
    v2mock = fixture.v2mock;
    clamstoken = fixture.clamstoken;
  });

  describe("Deployment", async function () {
    it("Starts the game", async function () {
      // const entryFee = ethers.parseEther("1");
      const reciept = await casino.connect(owner).startGame(2, 50);

      await reciept.wait();

      const events = await ethers.provider.getLogs({
        fromBlock: reciept.blockNumber,
        toBlock: reciept.blockNumber,
        address: casino.target, // Address of the contract where the event was emitted
      });

      const eventInterface = new ethers.Interface([
        "event GameStarted(uint256 gameId, uint256 maxPlayers, uint256 entryfee)",
      ]);

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);
        if (parsedEvent && parsedEvent.name === "GameStarted") {
          // Access the event parameters
          const gameId = parsedEvent.args.gameId;
          const maxPlayers = parsedEvent.args.maxPlayers;
          const entryfee = parsedEvent.args.entryfee;

          // Perform assertions or checks based on the event parameters
          expect(gameId).to.equal(1); // Replace 1 with the expected value
          expect(maxPlayers).to.equal(2); // Replace 2 with the expected value
          expect(entryfee).to.equal(50); // Compare with the expected entryFee
          console.log("GameStarted Event - gameId:", gameId.toString());
          console.log("GameStarted Event - maxPlayers:", maxPlayers.toString());
          console.log("GameStarted Event - entryfee:", entryfee.toString());
        }
      }
    });

    it("Allows Players to Join", async function () {
      const tokenAmount = 50;

      const player1ClaimAllocation = await clamstoken
        .connect(otherAccount)
        .claimAllocation();
      const player2ClaimAllocation = await clamstoken
        .connect(thirdAccount)
        .claimAllocation();

      await player1ClaimAllocation.wait();
      await player2ClaimAllocation.wait();

      const player1Balance = await clamstoken.balanceOf(otherAccount);
      const player2Balance = await clamstoken.balanceOf(thirdAccount);

      console.log(
        "player 1 balance",
        player1Balance,
        "player 2 balance",
        player2Balance
      );

      //approve tokens for spend
      const player1TokenApproval = await clamstoken
        .connect(otherAccount)
        .approve(casino.target, tokenAmount);
      const player2TokenApproval = await clamstoken
        .connect(thirdAccount)
        .approve(casino.target, tokenAmount);

      //wait for transactions
      await player1TokenApproval.wait();
      await player2TokenApproval.wait();

      // join game and stake tokens
      const player1joinGame = await casino
        .connect(otherAccount)
        .joinGame(tokenAmount);
      const player2joinGame = await casino
        .connect(thirdAccount)
        .joinGame(tokenAmount);

      await player1joinGame.wait();
      await player2joinGame.wait();

      let sudoRandomNum = [Math.trunc(Math.random() * 10000000)];

      const confirmation = await v2mock.fulfillRandomWordsWithOverride(
        1,
        casino.target,
        sudoRandomNum
      );

      await confirmation.wait();

      const latestBlock = await ethers.provider.getBlockNumber();

      const events = await ethers.provider.getLogs({
        fromBlock: player1joinGame.blockNumber,
        toBlock: latestBlock,
        address: casino.target, // Address of the contract where the event was emitted
      });

      const eventInterface = new ethers.Interface([
        "event PlayerJoined(uint gameId, address player)",
        "event GameEnded(uint gameId, address winner)",
        "event RequestSent(uint256 requestId, uint32 numwords)",
        "event RequestFulfilled(uint256 requestId, uint256[] randomWords)",
      ]);

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);

        if (parsedEvent && parsedEvent.name === "PlayerJoined") {
          const eventArgs = parsedEvent.args;

          console.log("Player Joined event args", eventArgs);
          // Access the event parameters
          const gameId = parsedEvent.args.gameId;
          const player = parsedEvent.args.player;

          // Perform assertions or checks based on the event parameters
          expect(gameId).to.equal(1); // Replace 1 with the expected value
          expect(player).to.exist; // Replace 1 with the expected value

          console.log("PlayerJoined Event - gameId:", gameId.toString());
          console.log("PlayerJoined Event - player:", player.toString());
        }

        if (parsedEvent && parsedEvent.name === "GameEnded") {
          const eventArgs = parsedEvent.args;
          console.log("Game Ended event args", eventArgs);
        }
        if (parsedEvent && parsedEvent.name === "RequestSent") {
          const eventArgs = parsedEvent.args;
          console.log("Request Sent args event args", eventArgs);
        }
        if (parsedEvent && parsedEvent.name === "RequestFulfilled") {
          const eventArgs = parsedEvent.args;
          console.log("Request fulfilled args event args", eventArgs);
        }
      }

      const player1Balancelatest = await clamstoken.balanceOf(otherAccount);
      const player2Balancelatest = await clamstoken.balanceOf(thirdAccount);
      const currentPot = await casino.getCurrentPot();
      const requestStatus = await casino.getRequestStatus(1);

      const convertedPlayer1Balance = ethers.formatUnits(
        player1Balancelatest,
        18
      );
      const convertedPlayer2Balance = ethers.formatUnits(
        player2Balancelatest,
        18
      );

      const convertedPot = ethers.formatUnits(currentPot, 18);

      console.log(
        "currentPot",
        convertedPot,
        "latest player 1 balance",
        convertedPlayer1Balance,
        "latestPlayer2Balance",
        convertedPlayer2Balance,
        "request status",
        requestStatus
      );
    });
  });
});
