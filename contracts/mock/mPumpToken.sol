// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPumpToken is ERC20, Ownable2Step {
    mapping(address => bool) isMinter;

    event SetMinter(address, bool);

    modifier onlyMinter() {
        require(isMinter[_msgSender()], "mPumpToken: not the minter");
        _;
    }

    constructor() ERC20("mPumpBTC", "mPumpBTC") Ownable(_msgSender()) {}

    function setMinter(address minter, bool isMinter_) public onlyOwner {
        isMinter[minter] = isMinter_;
        emit SetMinter(minter, isMinter_);
    }

    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyMinter {
        _burn(from, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
}