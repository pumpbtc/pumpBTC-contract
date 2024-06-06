// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;


import "./PumpToken.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

using SafeERC20 for IERC20;

contract PumpStaking is Ownable2StepUpgradeable, PausableUpgradeable {

    // ============================= Variables =============================
    uint8 constant public MAX_DATE_SLOT = 10;

    PumpToken public pumpBTC;
    IERC20 public asset;
    uint8 public assetDecimal;

    // all the following variables are in the same decimal as pumpBTC (18 decimal)
    uint256 public totalStakingAmount;      // Current amount of staked amount
    uint256 public totalStakingCap;         // Upper limit of staking amount
    uint256 public totalRequestedAmount;    // Total requested balance
    uint256 public totalClaimableAmount;    // Total claimable balance
    uint256 public pendingStakeAmount;      // Today's pending staked amount
    uint256 public collectedFee;            // Total collected fee

    address public operator;                // Operator address, for deposit and withdraw
    uint256 public instantUnstakeFee;       // Fee for instant unstake

    // User => DateSlot => Unstake request time
    mapping(address => mapping(uint8 => uint256)) public pendingUnstakeTime;

    // User => DateSlot => Unstake amount
    mapping(address => mapping(uint8 => uint256)) public pendingUnstakeAmount;


    // =============================== Events ==============================
    event SetStakeAssetCap(uint256 oldTotalStakingCap, uint256 newTotalStakingCap);
    event SetInstantUnstakeFee(uint256 oldInstantUnstakeFee, uint256 newInstantUnstakeFee);
    event SetOperator(address oldOperator, address newOperator);
    event FeeCollected(uint256 amount);

    event Stake(address indexed user, uint256 amount);
    event UnstakeRequest(address indexed user, uint256 amount, uint8 slot);
    event ClaimSlot(address indexed user, uint256 amount, uint8 slot);
    event ClaimAll(address indexed user, uint256 amount);
    event UnstakeInstant(address indexed user, uint256 amount);
    event AdminWithdraw(address indexed owner, uint256 amount);
    event AdminDeposit(address indexed owner, uint256 amount);


    // ======================= Modifier & Initializer ======================

    modifier onlyOperator {
        require(_msgSender() == operator, "PumpBTC: caller is not the operator");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _pumpTokenAddress, address _assetTokenAddress) public initializer {
        asset = IERC20(_assetTokenAddress);
        assetDecimal = ERC20(_assetTokenAddress).decimals();
        require(assetDecimal > 0, "PumpBTC: invalid asset token");

        pumpBTC = PumpToken(_pumpTokenAddress);
        require(pumpBTC.decimals() == 18, "PumpBTC: invalid pump BTC token");

        instantUnstakeFee = 300;    // Means 3%

        __Ownable_init(_msgSender());
        __Ownable2Step_init();
        __Pausable_init();
    }


    // ========================== Utils functions ==========================
    function _getDateSlot(uint256 timestamp) public pure returns (uint8) {
        return uint8((timestamp + 8 hours) / 1 days % MAX_DATE_SLOT);   // UTC+8 date slot
    }

    function _adjustAmount(uint256 amount) public view returns (uint256) {
        return assetDecimal > 18 ? amount * 10 ** (assetDecimal - 18) : amount / 10 ** (18 - assetDecimal);
    }


    // ========================== Owner functions ==========================
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setStakeAssetCap(uint256 newTotalStakingCap) public onlyOwner {
        emit SetStakeAssetCap(totalStakingCap, newTotalStakingCap);
        totalStakingCap = newTotalStakingCap;
    }

    function setInstantUnstakeFee(uint256 newInstantUnstakeFee) public onlyOwner {
        require(newInstantUnstakeFee < 10000, "PumpBTC: fee should be less than 100%");

        emit SetInstantUnstakeFee(instantUnstakeFee, newInstantUnstakeFee);
        instantUnstakeFee = newInstantUnstakeFee;
    }

    function setOperator(address newOperator) public onlyOwner {
        emit SetOperator(operator, newOperator);
        operator = newOperator;
    }

    function collectFee() public onlyOwner {
        emit FeeCollected(collectedFee);
        asset.safeTransfer(_msgSender(), _adjustAmount(collectedFee));
        collectedFee = 0;
    }


    // ========================= Operator functions ========================
    /**
     * @dev Suppose that the total staking amount is X, total unstaking request amount is 
     *  Y, and total unstaking-instantly amount is Z. Then the admin should withdraw X-Z, 
     *  and then deposit X-Z to Babylon. Meanwhile, the admin should request withdraw Y
     *  from Babylon. `pendingStakeAmount` aims to record `X-Z`.
     */
    function withdraw() public onlyOperator {
        require(pendingStakeAmount > 0, "PumpBTC: no pending stake amount");

        asset.safeTransfer(_msgSender(), _adjustAmount(pendingStakeAmount));
        emit AdminWithdraw(_msgSender(), pendingStakeAmount);

        pendingStakeAmount = 0;
    }

    /**
     * @param amount records `Y` on day T-10.
     */
    function deposit(uint256 amount) public onlyOperator {
        require(amount > 0, "PumpBTC: amount should be greater than 0");

        asset.safeTransferFrom(_msgSender(), address(this), _adjustAmount(amount));
        emit AdminDeposit(_msgSender(), amount);

        totalClaimableAmount += amount;
    }

    /**
     * @dev Call `withdraw` and `deposit` in one function.
     */
    function withdrawAndDeposit(uint256 depositAmount) public onlyOperator {
        if (pendingStakeAmount > depositAmount) {
            asset.safeTransfer(_msgSender(), _adjustAmount(pendingStakeAmount - depositAmount));
        }
        else if (pendingStakeAmount < depositAmount){
            asset.safeTransferFrom(
                _msgSender(), address(this), _adjustAmount(depositAmount - pendingStakeAmount)
            );
        }

        emit AdminWithdraw(_msgSender(), pendingStakeAmount);
        emit AdminDeposit(_msgSender(), depositAmount);

        pendingStakeAmount = 0;
        totalClaimableAmount += depositAmount;
    }


    // =========================== User functions ==========================
    function stake(uint256 amount) public whenNotPaused {
        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(
            totalStakingAmount + amount <= totalStakingCap, 
            "PumpBTC: exceed staking cap"
        );

        asset.safeTransferFrom(_msgSender(), address(this), _adjustAmount(amount));
        pumpBTC.mint(_msgSender(), amount);

        totalStakingAmount += amount;
        pendingStakeAmount += amount;

        emit Stake(_msgSender(), amount);
    }


    function unstakeRequest(uint256 amount) public whenNotPaused {
        address user = _msgSender();
        uint8 slot = _getDateSlot(block.timestamp);

        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(
            block.timestamp - pendingUnstakeTime[user][slot] < 1 days
            || pendingUnstakeAmount[user][slot] == 0, "PumpBTC: claim the previous unstake first"
        );

        pumpBTC.burn(user, amount);

        pendingUnstakeTime[user][slot] = block.timestamp;
        pendingUnstakeAmount[user][slot] += amount;
        totalStakingAmount -= amount;
        totalRequestedAmount += amount;

        emit UnstakeRequest(user, amount, slot);
    }

    function claimSlot(uint8 slot) public whenNotPaused {
        address user = _msgSender();
        uint256 amount = pendingUnstakeAmount[user][slot];

        require(amount > 0, "PumpBTC: no pending unstake");
        require(
            block.timestamp - pendingUnstakeTime[user][slot] >= (MAX_DATE_SLOT - 1) * 1 days,
            "PumpBTC: haven't reached the claimable time"
        );

        asset.safeTransfer(user, _adjustAmount(amount));

        pendingUnstakeAmount[user][slot] = 0;
        totalClaimableAmount -= amount;
        totalRequestedAmount -= amount;

        emit ClaimSlot(user, amount, slot);
    }

    function claimAll() public whenNotPaused {
        address user = _msgSender();
        uint256 totalAmount = 0;
        uint256 pendingCount = 0;

        for(uint8 slot = 0; slot < MAX_DATE_SLOT; slot++) {
            uint256 amount = pendingUnstakeAmount[user][slot];
            bool readyToClaim = block.timestamp - pendingUnstakeTime[user][slot] >= (MAX_DATE_SLOT - 1) * 1 days;
            if (amount > 0) {
                pendingCount += 1;
                if (readyToClaim) {
                    totalAmount += amount;
                    pendingUnstakeAmount[user][slot] = 0;
                }
            }
        }

        require(pendingCount > 0, "PumpBTC: no pending unstake");   
        require(totalAmount > 0, "PumpBTC: haven't reached the claimable time");

        asset.safeTransfer(user, _adjustAmount(totalAmount));

        totalClaimableAmount -= totalAmount;
        totalRequestedAmount -= totalAmount;

        emit ClaimAll(user, totalAmount);
    }

    function unstakeInstant(uint256 amount) public whenNotPaused {
        address user = _msgSender();
        uint256 fee = amount * instantUnstakeFee / 10000;

        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(amount <= pendingStakeAmount, "PumpBTC: insufficient pending stake amount");

        pumpBTC.burn(user, amount);
        asset.safeTransfer(user, _adjustAmount(amount - fee));
        
        totalStakingAmount -= amount;
        pendingStakeAmount -= amount;
        collectedFee += fee;

        emit UnstakeInstant(user, amount);
    }

}