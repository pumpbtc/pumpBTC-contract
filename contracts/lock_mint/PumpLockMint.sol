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
    address public approver;

    bool public burnUnlockEnabled = true;
    bool public approvalRequired = false;

    mapping(address => uint256) public pendingBurnUnlocks;

    //============================== EVENTS ===============================

    event AdminSet(address indexed admin);
    event ApproverSet(address indexed approver);
    event ApprovalRequiredSet(bool required);

    event Locked(address indexed user, uint256 amount);
    event Unlocked(address indexed user, uint256 amount);
    event BurnUnlockRequested(address indexed user, uint256 amount);

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

    modifier onlyApprover() {
        require(msg.sender == approver, "Only approver can call this function");
        _;
    }

    //============================== MANAGE FUNCTIONS ===============================

    /**
     * @notice Sets the admin address. Can only be called by the contract owner.
     * @param _admin The address to be set as the new admin.
     */
    function setAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        admin = _admin;

        emit AdminSet(_admin);
    }

    /**
     * @notice Sets the approver address. Can only be called by the contract owner.
     * @param _approver The address to be set as the new approver.
     */
    function setApprover(address _approver) external onlyOwner {
        require(_approver != address(0), "Invalid approver address");
        approver = _approver;

        emit ApproverSet(_approver);
    }

    /**
     * @notice Sets whether approval is required for burnUnlock. Can only be called by the contract owner.
     * @param _required True if approval is required, false otherwise.
     */
    function setApprovalRequired(bool _required) external onlyOwner {
        approvalRequired = _required;

        emit ApprovalRequiredSet(_required);
    }

    /**
     * @notice Sets whether burnUnlock is enabled. Can only be called by the contract owner.
     * @param _enabled True to enable burnUnlock, false to disable.
     */
    function setBurnUnlockEnabled(bool _enabled) external onlyOwner {
        burnUnlockEnabled = _enabled;
    }

    //============================== GLOBAL FUNCTIONS ===============================

    /**
     * @notice Only admin can Pauses all contract functions.
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @notice Only admin can Unpauses all contract functions.
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    //============================== EXTERNAL FUNCTIONS ===============================

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

    /**
     * @notice Burns `amount` of mintAsset from the caller and unlocks the same amount of lockAsset to the caller.
     * If approval is required, the request is stored and must be approved by the approver.
     * @param amount The amount of tokens to burn and unlock.
     */
    function burnUnlock(uint256 amount) external nonReentrant whenNotPaused {
        require(burnUnlockEnabled, "BurnUnlock is currently disabled");
        require(amount > 0, "LockMint: Amount must be greater than zero");
        require(mintAsset.balanceOf(msg.sender) >= amount, "Insufficient balance");

        if (approvalRequired) {
            require(pendingBurnUnlocks[msg.sender] == 0, "Existing pending burnUnlock request");
            pendingBurnUnlocks[msg.sender] = amount;
            emit BurnUnlockRequested(msg.sender, amount);
        } else {
            _processBurnUnlock(msg.sender, amount);
        }
    }

    /**
     * @notice Approves a pending burnUnlock request for a user. Can only be called by the approver.
     * @param user The address of the user whose request is being approved.
     */
    function approveBurnUnlock(address user) external onlyApprover nonReentrant whenNotPaused {
        uint256 amount = pendingBurnUnlocks[user];
        require(amount > 0, "No pending burnUnlock request for this user");

        pendingBurnUnlocks[user] = 0;

        _processBurnUnlock(user, amount);
    }

    /**
     * @notice Approves pending burnUnlock requests for multiple users. Can only be called by the approver.
     * @param users The addresses of the users whose requests are being approved.
     */
    function approverBatchBurnUnlock(address[] calldata users) external onlyApprover nonReentrant whenNotPaused {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = pendingBurnUnlocks[user];
            if (amount > 0) {
                pendingBurnUnlocks[user] = 0;
                _processBurnUnlock(user, amount);
            }
        }
    }

    /**
     * @notice Allows the owner to withdraw `amount` of lockAsset in case of an emergency.
     * @param amount The amount of tokens to withdraw.
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "LockMint: Amount must be greater than zero");

        lockAsset.safeTransfer(owner(), amount);

        emit EmergencyWithdraw(msg.sender,amount);
    }

    //============================== INTERNAL FUNCTIONS ===============================

    /**
     * @dev Internal function to process burnUnlock.
     * @param user The address of the user.
     * @param amount The amount to burn and unlock.
     */
    function _processBurnUnlock(address user, uint256 amount) internal {
        mintAsset.burn(user, amount);
        lockAsset.safeTransfer(user, amount);
        emit Unlocked(user, amount);
    }
}
