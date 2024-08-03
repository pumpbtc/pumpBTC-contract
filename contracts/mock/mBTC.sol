// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockBTC is ERC20, Ownable {
    constructor() ERC20("Mock BTC", "mBTC") Ownable(_msgSender()) {
        _mint(msg.sender, 21000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }
    
}