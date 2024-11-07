// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ILayerZeroEndpointV2, MessagingParams, MessagingFee, MessagingReceipt, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

contract MockEndpointV2  {
    address public lzToken;
    mapping(address oapp => address delegate) public delegates;

    constructor(uint32 _eid, address _owner) {
       
    }

    function quote(MessagingParams calldata _params, address _sender) external view returns (MessagingFee memory) {
        // Mock implementation (empty)
    }

    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory) {
        // Mock implementation (empty)
    }

    function verify(Origin calldata _origin, address _receiver, bytes32 _payloadHash) external {
        // Mock implementation (empty)
    }

    function lzReceive(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable {
        // Mock implementation (empty)
    }

    function lzReceiveAlert(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        uint256 _gas,
        uint256 _value,
        bytes calldata _message,
        bytes calldata _extraData,
        bytes calldata _reason
    ) external {
        // Mock implementation (empty)
    }

    function clear(address _oapp, Origin calldata _origin, bytes32 _guid, bytes calldata _message) external {
        // Mock implementation (empty)
    }

    function setLzToken(address _lzToken) public {
        lzToken = _lzToken;
    }

    function recoverToken(address _token, address _to, uint256 _amount) external {
        // Mock implementation (empty)
    }

    function setDelegate(address _delegate) external {
        delegates[msg.sender] = _delegate;
    }

    function initializable(Origin calldata _origin, address _receiver) external view returns (bool) {
        // Mock implementation (empty)
    }

    function verifiable(Origin calldata _origin, address _receiver) external view returns (bool) {
        // Mock implementation (empty)
    }

    function nativeToken() external pure returns (address) {
        return address(0x0); // Mock native token address
    }
}