// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../oft_bridge/PumpTokenOFT.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PumpLockMint is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    //============================== STATE VARIABLES ==============================

    /**
     * @notice PumpBTC (ERC-20).
     */
    IERC20 public immutable lockAsset;
    
    /**
     * @notice PumpBTC.bera (OFT).
     */
    PumpTokenOFT public immutable mintAsset;

    address public admin;

    //============================== EVENTS ===============================

    event AdminSet(address indexed admin);
    event Locked(address indexed user, uint256 amount);
    event Unlocked(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    //============================== CONSTRUCTOR ===============================

    constructor(address _lockAsset, address _mintAsset) Ownable(_msgSender()) {
        require(_lockAsset != address(0), "Invalid lock asset address");
        require(_mintAsset != address(0), "Invalid mint asset address");

        lockAsset = IERC20(_lockAsset);
        mintAsset = PumpTokenOFT(_mintAsset);
    }

    //============================== MODIFIERS ===============================

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    //============================== SET ADMIN ===============================

    /**
     * @notice Sets the admin address. Can only be called by the contract owner.
     * @param _admin The address to be set as the new admin.
     */
    function setAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        admin = _admin;

        emit AdminSet(_admin);
    }

    //============================== PAUSE ===============================

    /**
     * @notice Only admin can Pauses all contract functions.
     */
    function pause() external onlyAdmin {
        _pause();
    }

    //============================== UNPAUSE ===============================

    /**
     * @notice Only admin can Unpauses all contract functions.
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    //============================== LOCK MINT ===============================

    /**
     * @notice Locks `amount` of lockAsset and mints the same amount of mintAsset to the caller.
     * @param amount The amount of tokens to lock and mint.
     */
    function lockMint(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LockMint: Amount must be greater than zero");
        lockAsset.safeTransferFrom(msg.sender, address(this), amount);

        mintAsset.mint(msg.sender, amount);

        emit Locked(msg.sender, amount);
    }

    //============================== BURN UNLOCK ===============================

    /**
     * @notice Burns `amount` of mintAsset from the caller and unlocks the same amount of lockAsset to the caller.
     * @param amount The amount of tokens to burn and unlock.
     */
    function burnUnlock(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LockMint: Amount must be greater than zero");
        mintAsset.burn(msg.sender, amount);

        lockAsset.safeTransfer(msg.sender, amount);

        emit Unlocked(msg.sender, amount);
    }

    //============================== EMERGENCY WITHDRAW ===============================

    /**
     * @notice Allows the owner to withdraw `amount` of lockAsset in case of an emergency.
     * @param amount The amount of tokens to withdraw.
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "LockMint: Amount must be greater than zero");

        lockAsset.safeTransfer(owner(), amount);

        emit EmergencyWithdraw(msg.sender,amount);
    }
}
