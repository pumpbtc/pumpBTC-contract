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
    int256 public totalStakingAmount;      // Current amount of staked amount
    uint256 public totalStakingCap;         // Upper limit of staking amount
    uint256 public totalRequestedAmount;    // Total requested balance
    uint256 public totalClaimableAmount;    // Total claimable balance
    uint256 public pendingStakeAmount;      // Today's pending staked amount
    uint256 public collectedFee;            // Total collected fee

    address public operator;                // Operator address, for deposit and withdraw
    uint256 public normalUnstakeFee;        // Fee for normal unstake
    uint256 public instantUnstakeFee;       // Fee for instant unstake
    bool public onlyAllowStake;             // Only allow stake at first

    // User => DateSlot => Unstake request time
    mapping(address => mapping(uint8 => uint256)) public pendingUnstakeTime;

    // User => DateSlot => Unstake amount
    mapping(address => mapping(uint8 => uint256)) public pendingUnstakeAmount;


    // =============================== Events ==============================
    event SetStakeAssetCap(uint256 oldTotalStakingCap, uint256 newTotalStakingCap);
    event SetNormalUnstakeFee(uint256 oldNormalUnstakeFee, uint256 newNormalUnstakeFee);
    event SetInstantUnstakeFee(uint256 oldInstantUnstakeFee, uint256 newInstantUnstakeFee);
    event SetOperator(address oldOperator, address newOperator);
    event SetOnlyAllowStake(bool onlyAllowStake);
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

    modifier allowUnstakeOrClaim {
        require(!onlyAllowStake, "PumpBTC: only allow stake at first");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _pumpTokenAddress, address _assetTokenAddress) public initializer {
        asset = IERC20(_assetTokenAddress);
        assetDecimal = ERC20(_assetTokenAddress).decimals();
        require(assetDecimal >= 8, "PumpBTC: invalid asset token");

        pumpBTC = PumpToken(_pumpTokenAddress);
        require(pumpBTC.decimals() == 8, "PumpBTC: invalid pump BTC token");

        normalUnstakeFee = 0;     // Means 0%
        instantUnstakeFee = 300;    // Means 3%
        onlyAllowStake = true;

        __Ownable_init(_msgSender());
        __Ownable2Step_init();
        __Pausable_init();
    }


    // ========================== Utils functions ==========================
    function _getPeriod() public virtual pure returns (uint256) {
        return 1 days;
    }

    function _getDateSlot(uint256 timestamp) public pure returns (uint8) {
        return uint8((timestamp + 8 hours) / _getPeriod() % MAX_DATE_SLOT);   // UTC+8 date slot
    }

    function _adjustAmount(uint256 amount) public view returns (uint256) {
        return assetDecimal == 8 ? amount : amount * 10 ** (assetDecimal - 8);
    }


    // ========================== Owner functions ==========================
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setStakeAssetCap(uint256 newTotalStakingCap) public onlyOwner {
        require(int256(newTotalStakingCap) >= totalStakingAmount, "PumpBTC: staking cap too small");

        emit SetStakeAssetCap(totalStakingCap, newTotalStakingCap);
        totalStakingCap = newTotalStakingCap;
    }

    function setNormalUnstakeFee(uint256 newNormalUnstakeFee) public onlyOwner {
        require(newNormalUnstakeFee < 10000, "PumpBTC: fee should be less than 100%");

        emit SetNormalUnstakeFee(normalUnstakeFee, newNormalUnstakeFee);
        normalUnstakeFee = newNormalUnstakeFee;
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

    function setOnlyAllowStake(bool _onlyAllowStake) public onlyOwner {
        emit SetOnlyAllowStake(_onlyAllowStake);
        onlyAllowStake = _onlyAllowStake;
    }

    function collectFee() public onlyOwner {
        uint256 oldCollectedFee = collectedFee;
        collectedFee = 0;
        emit FeeCollected(oldCollectedFee);

        asset.safeTransfer(_msgSender(), _adjustAmount(oldCollectedFee));
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

        uint256 oldPendingStakeAmount = pendingStakeAmount;
        pendingStakeAmount = 0;
        emit AdminWithdraw(_msgSender(), oldPendingStakeAmount);

        asset.safeTransfer(_msgSender(), _adjustAmount(oldPendingStakeAmount));
    }

    /**
     * @param amount records `Y` on day T-10.
     */
    function deposit(uint256 amount) public onlyOperator {
        require(amount > 0, "PumpBTC: amount should be greater than 0");

        totalClaimableAmount += amount;
        emit AdminDeposit(_msgSender(), amount);

        asset.safeTransferFrom(_msgSender(), address(this), _adjustAmount(amount));
    }

    /**
     * @dev Call `withdraw` and `deposit` in one function.
     */
    function withdrawAndDeposit(uint256 depositAmount) public onlyOperator {
        uint256 oldPendingStakeAmount = pendingStakeAmount;
        pendingStakeAmount = 0;
        totalClaimableAmount += depositAmount;

        emit AdminWithdraw(_msgSender(), oldPendingStakeAmount);
        emit AdminDeposit(_msgSender(), depositAmount);

        if (oldPendingStakeAmount > depositAmount) {
            asset.safeTransfer(_msgSender(), _adjustAmount(oldPendingStakeAmount - depositAmount));
        }
        else if (oldPendingStakeAmount < depositAmount){
            asset.safeTransferFrom(
                _msgSender(), address(this), _adjustAmount(depositAmount - oldPendingStakeAmount)
            );
        }

    }


    // =========================== User functions ==========================
    function stake(uint256 amount) public whenNotPaused {
        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(
            totalStakingAmount + int256(amount) <= int256(totalStakingCap), 
            "PumpBTC: exceed staking cap"
        );

        totalStakingAmount += int256(amount);
        pendingStakeAmount += amount;

        emit Stake(_msgSender(), amount);

        asset.safeTransferFrom(_msgSender(), address(this), _adjustAmount(amount));
        pumpBTC.mint(_msgSender(), amount);
    }


    function unstakeRequest(uint256 amount) public whenNotPaused allowUnstakeOrClaim {
        address user = _msgSender();
        uint8 slot = _getDateSlot(block.timestamp);

        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(
            block.timestamp - pendingUnstakeTime[user][slot] < _getPeriod()
            || pendingUnstakeAmount[user][slot] == 0, "PumpBTC: claim the previous unstake first"
        );

        pendingUnstakeTime[user][slot] = block.timestamp;
        pendingUnstakeAmount[user][slot] += amount;
        totalStakingAmount -= int256(amount);
        totalRequestedAmount += amount;

        emit UnstakeRequest(user, amount, slot);

        pumpBTC.burn(user, amount);
    }

    function claimSlot(uint8 slot) public whenNotPaused allowUnstakeOrClaim {
        address user = _msgSender();
        uint256 amount = pendingUnstakeAmount[user][slot];
        uint256 fee = amount * normalUnstakeFee / 10000;

        require(amount > 0, "PumpBTC: no pending unstake");
        require(
            block.timestamp - pendingUnstakeTime[user][slot] >= (MAX_DATE_SLOT - 1) * _getPeriod(),
            "PumpBTC: haven't reached the claimable time"
        );

        pendingUnstakeAmount[user][slot] = 0;
        totalClaimableAmount -= amount;
        totalRequestedAmount -= amount;
        collectedFee += fee;

        emit ClaimSlot(user, amount, slot);

        asset.safeTransfer(user, _adjustAmount(amount - fee));
    }

    function claimAll() public whenNotPaused allowUnstakeOrClaim {
        address user = _msgSender();
        uint256 totalAmount = 0;
        uint256 pendingCount = 0;

        for(uint8 slot = 0; slot < MAX_DATE_SLOT; slot++) {
            uint256 amount = pendingUnstakeAmount[user][slot];
            bool readyToClaim = block.timestamp - pendingUnstakeTime[user][slot] >= (MAX_DATE_SLOT - 1) * _getPeriod();
            if (amount > 0) {
                pendingCount += 1;
                if (readyToClaim) {
                    totalAmount += amount;
                    pendingUnstakeAmount[user][slot] = 0;
                }
            }
        }
        uint256 fee = totalAmount * normalUnstakeFee / 10000;

        require(pendingCount > 0, "PumpBTC: no pending unstake");   
        require(totalAmount > 0, "PumpBTC: haven't reached the claimable time");

        totalClaimableAmount -= totalAmount;
        totalRequestedAmount -= totalAmount;
        collectedFee += fee;

        emit ClaimAll(user, totalAmount);

        asset.safeTransfer(user, _adjustAmount(totalAmount - fee));
    }

    function unstakeInstant(uint256 amount) public whenNotPaused allowUnstakeOrClaim {
        address user = _msgSender();
        uint256 fee = amount * instantUnstakeFee / 10000;

        require(amount > 0, "PumpBTC: amount should be greater than 0");
        require(amount <= pendingStakeAmount, "PumpBTC: insufficient pending stake amount");

        totalStakingAmount -= int256(amount);
        pendingStakeAmount -= amount;
        collectedFee += fee;

        emit UnstakeInstant(user, amount);

        pumpBTC.burn(user, amount);
        asset.safeTransfer(user, _adjustAmount(amount - fee));
    }

}