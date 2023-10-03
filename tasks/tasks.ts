// tasks/factory.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import hre from "hardhat";

export function createTasks() {
  task("balance", "Prints an account's balance")
    .addParam("account", "The account's address")
    .setAction(async (taskArgs) => {
      const balance = await hre.ethers.provider.getBalance(taskArgs.account);

      console.log("Balance", balance.toString());
    });

  task("fulfillMock", "Prints an account's balance")
    .addParam("account", "The account's address")
    .setAction(async (taskArgs) => {
      const balance = await hre.ethers.provider.getBalance(taskArgs.account);

      console.log("Balance", balance.toString());
    });
}
