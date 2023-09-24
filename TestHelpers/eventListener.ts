import { ethers } from "hardhat";
import { Casino } from "../typechain-types";
import { expect } from "chai";

export async function getEventsCasino(
  startBlock: number | null,
  endBlock: number | null,
  contract: Casino
) {
  const events = await ethers.provider.getLogs({
    fromBlock: startBlock,
    toBlock: endBlock,
    address: contract.target,
  });

  const eventInterface = new ethers.Interface([
    "event GameStarted(uint256 gameId, uint256 maxPlayers, uint256 entryfee)",
    "event PlayerJoined(uint gameId, address player)",
    "event GameEnded(uint gameId, address winner)",
    "event RequestSent(uint256 requestId, uint32 numwords, uint256 gameId)",
    "event RequestFulfilled(uint256 requestId, uint256[] randomWords, uint256 gameId)",
  ]);

  return { eventInterface, events };
}
