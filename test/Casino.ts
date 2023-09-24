import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { VRFCoordinatorV2Mock, Casino, ClamsToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { getEventsCasino } from "../TestHelpers/eventListener";

describe("Casino", async function () {
  let casino: Casino,
    clamstoken: ClamsToken,
    owner: HardhatEthersSigner,
    otherAccount: HardhatEthersSigner,
    thirdAccount: HardhatEthersSigner,
    fourthAccount: HardhatEthersSigner,
    fifthAccount: HardhatEthersSigner,
    sixthAccount: HardhatEthersSigner,
    v2mock: VRFCoordinatorV2Mock;

  async function deployCasino() {
    // Contracts are deployed using the first signer/account by default
    const [
      owner,
      otherAccount,
      thirdAccount,
      fourthAccount,
      fifthAccount,
      sixthAccount,
    ] = await ethers.getSigners();

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
      fifthAccount,
      sixthAccount,
    };
  }

  before(async function () {
    const fixture = await loadFixture(deployCasino);
    casino = fixture.casino;
    owner = fixture.owner;
    otherAccount = fixture.otherAccount;
    thirdAccount = fixture.thirdAccount;
    fourthAccount = fixture.fourthAccount;
    fifthAccount = fixture.fifthAccount;
    sixthAccount = fixture.sixthAccount;
    v2mock = fixture.v2mock;
    clamstoken = fixture.clamstoken;
  });

  describe("Deployment", async function () {
    it("Starts Game 1", async function () {
      const recieptGame1 = await casino.connect(owner).startGame(2, 50);

      await recieptGame1.wait();

      const { eventInterface, events } = await getEventsCasino(
        recieptGame1.blockNumber,
        recieptGame1.blockNumber,
        casino
      );

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);
        if (parsedEvent && parsedEvent.name === "GameStarted") {
          // Access the event parameters
          const gameId = parsedEvent.args.gameId;
          const maxPlayers = parsedEvent.args.maxPlayers;
          const entryfee = parsedEvent.args.entryfee;

          // Perform assertions or checks based on the event parameters
          expect(gameId).to.equal(1);
          expect(maxPlayers).to.equal(2);
          expect(entryfee).to.equal(50);
          console.log("GameStarted Event Game 1 - gameId:", gameId.toString());
          console.log(
            "GameStarted Event Game 1 - maxPlayers:",
            maxPlayers.toString()
          );
          console.log(
            "GameStarted Event Game 1 - entryfee:",
            entryfee.toString()
          );
        }
      }
    });

    it("Starts Game 2", async function () {
      const recieptGame2 = await casino.connect(owner).startGame(2, 100);

      await recieptGame2.wait();

      const { eventInterface, events } = await getEventsCasino(
        recieptGame2.blockNumber,
        recieptGame2.blockNumber,
        casino
      );

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);
        if (parsedEvent && parsedEvent.name === "GameStarted") {
          // Access the event parameters
          const gameId = parsedEvent.args.gameId;
          const maxPlayers = parsedEvent.args.maxPlayers;
          const entryfee = parsedEvent.args.entryfee;

          // Perform assertions or checks based on the event parameters
          expect(gameId).to.equal(2);
          expect(maxPlayers).to.equal(2);
          expect(entryfee).to.equal(100);
          console.log("GameStarted Event Game 2 - gameId:", gameId.toString());
          console.log(
            "GameStarted Event Game 2 - maxPlayers:",
            maxPlayers.toString()
          );
          console.log(
            "GameStarted Event Game 2 - entryfee:",
            entryfee.toString()
          );
        }
      }
    });

    it("Allows Players to Join and selects winner game 1", async function () {
      const tokenAmount = 50;
      const gameIdFirstGame = 1;

      // first Game Player Claims
      const player1Game1ClaimAllocation = await clamstoken
        .connect(otherAccount)
        .claimAllocation();
      const player2Game1ClaimAllocation = await clamstoken
        .connect(thirdAccount)
        .claimAllocation();

      await player1Game1ClaimAllocation.wait();
      await player2Game1ClaimAllocation.wait();

      const player1Game1Balance = ethers.formatUnits(
        await clamstoken.balanceOf(otherAccount),
        18
      );

      const player2Game1Balance = ethers.formatUnits(
        await clamstoken.balanceOf(thirdAccount),
        18
      );

      expect(player1Game1Balance).to.equal("5000.0");
      expect(player2Game1Balance).to.equal("5000.0");

      console.log(
        "player 1 Game 1 balance",
        player1Game1Balance,
        "player 2 Game 1 balance",
        player2Game1Balance
      );

      // Game 1 token approvals
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

      //Game one Join and stake
      // join game and stake tokens
      const player1joinGame = await casino
        .connect(otherAccount)
        .joinGame(tokenAmount, gameIdFirstGame);
      const player2joinGame = await casino
        .connect(thirdAccount)
        .joinGame(tokenAmount, gameIdFirstGame);

      await player1joinGame.wait();
      await player2joinGame.wait();

      // random Num and confirmation game 1
      let sudoRandomNumGame1 = [Math.trunc(Math.random() * 10000000)];

      const confirmationGame1 = await v2mock.fulfillRandomWordsWithOverride(
        1,
        casino.target,
        sudoRandomNumGame1
      );

      await confirmationGame1.wait();

      const latestBlock = await ethers.provider.getBlockNumber();

      const { eventInterface, events } = await getEventsCasino(
        player1joinGame.blockNumber,
        latestBlock,
        casino
      );

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);

        if (parsedEvent && parsedEvent.name === "PlayerJoined") {
          const eventArgs = parsedEvent.args;

          console.log("Player Joined event args", eventArgs);

          const gameId = parsedEvent.args.gameId;
          const player = parsedEvent.args.player;

          expect(gameId).to.equal(1);
          expect(player).to.exist;

          console.log("PlayerJoined Event Game 1 - gameId:", gameId.toString());
          console.log("PlayerJoined Event Game 1 - player:", player.toString());
        }

        if (parsedEvent && parsedEvent.name === "RequestSent") {
          const gameId = parsedEvent.args.gameId;
          const requestId = parsedEvent.args.requestId;
          const numwords = parsedEvent.args.numwords;

          expect(gameId).to.equal(1);
          expect(requestId).to.equal(1);
          expect(numwords).to.equal(1);

          console.log("Request sent Game 1 Game Id", gameId);
          console.log("Request sent Game 1 Request Id", requestId);
          console.log("Request sent Game 1 numwords", numwords);
        }

        if (parsedEvent && parsedEvent.name === "RequestFulfilled") {
          const gameId = parsedEvent.args.gameId;
          const requestId = parsedEvent.args.requestId;
          const randomWords = parsedEvent.args.randomWords;
          expect(gameId).to.equal(1);
          expect(requestId).to.equal(1);
          expect(randomWords).to.exist;

          console.log("RequestFulfilled Game 1 Game Id", gameId);
          console.log("RequestFulfilled Game 1 Request Id", requestId);
          console.log("RequestFulfilled Game 1 numwords", randomWords);
        }
        if (parsedEvent && parsedEvent.name === "GameEnded") {
          const gameId = parsedEvent.args.gameId;
          const winner = parsedEvent.args.winner;

          expect(gameId).to.equal(1);
          expect(winner).to.exist;

          console.log("Game Ended Game Id Game 1", gameId);
          console.log("Game Ended Winner Game 1", winner);
        }
      }

      // game 1 latest balance check
      const player1Game1Balancelatest = await clamstoken.balanceOf(
        otherAccount
      );
      const player2Game1Balancelatest = await clamstoken.balanceOf(
        thirdAccount
      );
      const game1Pot = await casino.getPotById(gameIdFirstGame);
      const requestStatusGame1 = await casino.getRequestStatus(1);

      const convertedPlayer1BalanceGame1 = ethers.formatUnits(
        player1Game1Balancelatest,
        18
      );
      const convertedPlayer2BalanceGame1 = ethers.formatUnits(
        player2Game1Balancelatest,
        18
      );

      const convertedPotGame1 = ethers.formatUnits(game1Pot, 18);

      expect(convertedPotGame1).to.equal("0.0");

      console.log(
        "Game 1 Pot",
        convertedPotGame1,
        "latest player 1 Game 1 balance",
        convertedPlayer1BalanceGame1,
        "latestPlayer2Balance Game 1",
        convertedPlayer2BalanceGame1,
        "request status Game 1",
        requestStatusGame1
      );
    });

    it("Allows Players to Join and selects winner game 2", async function () {
      const gameIdSecondGame = 2;
      const tokenAmount = 100;

      //second game player claims
      const player1Game2ClaimAllocation = await clamstoken
        .connect(fifthAccount)
        .claimAllocation();
      const player2Game2ClaimAllocation = await clamstoken
        .connect(sixthAccount)
        .claimAllocation();

      await player1Game2ClaimAllocation.wait();
      await player2Game2ClaimAllocation.wait();

      const player1Game2Balance = ethers.formatUnits(
        await clamstoken.balanceOf(fifthAccount),
        18
      );

      const player2Game2Balance = ethers.formatUnits(
        await clamstoken.balanceOf(sixthAccount),
        18
      );

      expect(player1Game2Balance).to.equal("5000.0");
      expect(player2Game2Balance).to.equal("5000.0");

      console.log(
        "player 1 Game 2 balance",
        player1Game2Balance,
        "player 2 Game 2 balance",
        player2Game2Balance
      );

      // game 2 token approvals
      //approve tokens for spend
      const player1Game2TokenApproval = await clamstoken
        .connect(fifthAccount)
        .approve(casino.target, tokenAmount);
      const player2Game2TokenApproval = await clamstoken
        .connect(sixthAccount)
        .approve(casino.target, tokenAmount);

      //wait for transactions
      await player1Game2TokenApproval.wait();
      await player2Game2TokenApproval.wait();

      // Game two join and stake
      // join game and stake tokens
      const player1Game2joinGame = await casino
        .connect(fifthAccount)
        .joinGame(tokenAmount, gameIdSecondGame);
      const player2Game2joinGame = await casino
        .connect(sixthAccount)
        .joinGame(tokenAmount, gameIdSecondGame);

      await player1Game2joinGame.wait();
      await player2Game2joinGame.wait();

      // random num and confirmation game 2
      let sudoRandomNumGame2 = [Math.trunc(Math.random() * 10000000)];

      const confirmationGame2 = await v2mock.fulfillRandomWordsWithOverride(
        2,
        casino.target,
        sudoRandomNumGame2
      );

      await confirmationGame2.wait();

      const latestBlock = await ethers.provider.getBlockNumber();

      const { eventInterface, events } = await getEventsCasino(
        player1Game2joinGame.blockNumber,
        latestBlock,
        casino
      );

      for (const event of events) {
        const parsedEvent = eventInterface.parseLog(event);

        if (parsedEvent && parsedEvent.name === "PlayerJoined") {
          const eventArgs = parsedEvent.args;

          console.log("Player Joined event args", eventArgs);

          const gameId = parsedEvent.args.gameId;
          const player = parsedEvent.args.player;

          expect(gameId).to.equal(2);
          expect(player).to.exist;

          console.log("PlayerJoined Event Game 2 - gameId:", gameId.toString());
          console.log("PlayerJoined Event Game 2 - player:", player.toString());
        }

        if (parsedEvent && parsedEvent.name === "RequestSent") {
          const gameId = parsedEvent.args.gameId;
          const requestId = parsedEvent.args.requestId;
          const numwords = parsedEvent.args.numwords;

          expect(gameId).to.equal(2);
          expect(requestId).to.equal(2);
          expect(numwords).to.equal(1);

          console.log("Request sent Game 2 Game Id", gameId);
          console.log("Request sent Game 2 Request Id", requestId);
          console.log("Request sent Game 2 numwords", numwords);
        }

        if (parsedEvent && parsedEvent.name === "RequestFulfilled") {
          const gameId = parsedEvent.args.gameId;
          const requestId = parsedEvent.args.requestId;
          const randomWords = parsedEvent.args.randomWords;
          expect(gameId).to.equal(2);
          expect(requestId).to.equal(2);
          expect(randomWords).to.exist;

          console.log("RequestFulfilled Game 2 Game Id", gameId);
          console.log("RequestFulfilled Game 2 Request Id", requestId);
          console.log("RequestFulfilled Game 2 numwords", randomWords);
        }
        if (parsedEvent && parsedEvent.name === "GameEnded") {
          const gameId = parsedEvent.args.gameId;
          const winner = parsedEvent.args.winner;

          expect(gameId).to.equal(2);
          expect(winner).to.exist;

          console.log("Game Ended Game Id Game 2", gameId);
          console.log("Game Ended Winner Game 2", winner);
        }
      }

      // game 2 latest balance check
      const player1Game2Balancelatest = await clamstoken.balanceOf(
        fifthAccount
      );
      const player2Game2Balancelatest = await clamstoken.balanceOf(
        sixthAccount
      );

      const game2Pot = await casino.getPotById(gameIdSecondGame);
      const requestStatusGame2 = await casino.getRequestStatus(2);

      const convertedPlayer1BalanceGame2 = ethers.formatUnits(
        player1Game2Balancelatest,
        18
      );
      const convertedPlayer2BalanceGame2 = ethers.formatUnits(
        player2Game2Balancelatest,
        18
      );

      const convertedPotGame2 = ethers.formatUnits(game2Pot, 18);

      expect(convertedPotGame2).to.equal("0.0");

      console.log(
        "Game 2 Pot",
        convertedPotGame2,
        "latest player 1 Game 2 balance",
        convertedPlayer1BalanceGame2,
        "latestPlayer2Balance Game 2",
        convertedPlayer2BalanceGame2,
        "request status Game 2",
        requestStatusGame2
      );
    });
  });
});
