// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

/**
 * @title PumpTokenOFT
 * @dev This contract is based on LayerZero's OFT (Omni-chain Fungible Token) implementation.
 *      OFT is a multi-chain interoperable token standard that allows seamless transfers
 *      between different blockchains. 
 *
 *      By using OFT, we achieve the following benefits:
 *      1. Cross-chain interoperability: OFT enables tokens to move seamlessly across multiple blockchains, removing the limitations of a single chain.
 *      2. Enhanced liquidity: Users can transact and use the token on different blockchains, increasing the token's liquidity.
 *      3. Simplified development: OFT provides a standard interface and implementation, simplifying the development of cross-chain operations.
 */
contract PumpTokenOFT is Ownable,OFT  {
    // Mapping to store addresses with minting permissions
    mapping(address => bool) isMinter;

    // Event for setting minter permissions
    event SetMinter(address minter, bool isMinter);

    // Modifier to allow only minter addresses
    modifier onlyMinter() {
        require(isMinter[_msgSender()], "PumpToken: not the minter");
        _;
    }

    /**
     * @dev Constructor to initialize the contract and set LayerZero's endpoint address.
     * @param _lzEndpoint LayerZero endpoint address
     */
    constructor(address _lzEndpoint) OFT("pumpBTC", "pumpBTC", _lzEndpoint, msg.sender) Ownable(msg.sender) {}

    /**
     * @dev Function to set the minter address permissions.
     * @param minter The address to set as minter
     * @param isMinter_ Boolean indicating whether the address has minting permissions
     */
    function setMinter(address minter, bool isMinter_) public onlyOwner {
        isMinter[minter] = isMinter_;
        emit SetMinter(minter, isMinter_);
    }

    /**
     * @dev Function to mint new tokens.
     * @param to The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }

    /**
     * @dev Function to burn tokens.
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) public onlyMinter {
        _burn(from, amount);
    }

    /**
     * @dev Override function to return the number of decimals.
     * @return uint8 Number of decimals for the token
     */
    function decimals() public view virtual override returns (uint8) {
        return 8;
    }

    /**
     * @dev Override function to return the shared number of decimals.
     * @return uint8 Shared number of decimals for the token
     */
    function sharedDecimals() public view virtual override returns (uint8) {
        return 8;
    }
}
