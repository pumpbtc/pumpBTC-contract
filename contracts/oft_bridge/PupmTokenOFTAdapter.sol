// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTAdapter.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title PumpTokenOFTAdapter
 * @dev This contract adapts an existing ERC20 token to the LayerZero OFT (Omnichain Fungible Token) standard.
 *      The OFT Adapter enables cross-chain token transfers, providing seamless interoperability across multiple blockchains.
 *      Benefits include improved liquidity, increased token utility, and enhanced user experience through simplified cross-chain transactions.
 */
contract PumpTokenOFTAdapter is Ownable, OFTAdapter {
    /**
     * @notice Constructor to initialize the OFT Adapter contract
     * @param _token The address of the already deployed ERC20 token
     * @param _layerZeroEndpoint The address of the local LayerZero endpoint
     */
    constructor(
        address _token,
        address _layerZeroEndpoint
    ) OFTAdapter(_token, _layerZeroEndpoint, msg.sender) Ownable(msg.sender) { }

    /**
     * @dev Override function to return the shared number of decimals.
     * @return uint8 Shared number of decimals for the token
     */
    function sharedDecimals() public view virtual override returns (uint8) {
        return 8;
    }
}
