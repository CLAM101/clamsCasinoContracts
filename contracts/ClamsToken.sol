// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ClamsToken is ERC20, Ownable {
    uint public currentSupply;
    uint public newAmount;
    mapping(address => bool) hasClaimed;

    constructor(uint256 initialSupply) ERC20("CLAMS TOKEN", "CLT") {
        currentSupply = initialSupply * 10 ** 18;

        address wallet = msg.sender;
        _mint(wallet, (currentSupply / 2));
        currentSupply = currentSupply - (currentSupply / 2);
    }

    receive() external payable {}

    fallback() external payable {}

    function mintAll() public onlyOwner {
        _mint(msg.sender, currentSupply);
        currentSupply = 0;
    }

    function getCurrentSupply() public view returns (uint256) {
        return currentSupply;
    }

    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        newAmount = amount * 10 ** 18;

        return super.approve(spender, newAmount);
    }

    function claimAllocation() public {
        require(currentSupply > 0, "Supply Depleted");
        require(!hasClaimed[msg.sender], "Already Claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, 5000 * 10 ** 18);
        currentSupply = currentSupply - 5000 * 10 ** 18;
    }
}
