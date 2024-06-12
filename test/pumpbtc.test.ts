import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PumpStaking } from "../typechain-types";
import { parseUnits } from "ethers";

describe("pumpBTC Unit Test", function () {
  async function deployContracts() {
    const [_owner, operator, user1, user2] = await ethers.getSigners();

    // Mock BTC tokens
    const wbtc = await ethers.deployContract("MockWBTC");
    const amount8 = parseUnits("100", 8);
    const amount18 = parseUnits("100", 18);

    // Pump BTC related contracts
    const pumpBTC = await ethers.deployContract("PumpToken");
    const pumpStakingFactory = await ethers.getContractFactory("PumpStaking");
    const pumpStaking = (await upgrades.deployProxy(pumpStakingFactory, [
      await pumpBTC.getAddress(),
      await wbtc.getAddress(),
    ])) as unknown as PumpStaking;
    const pumpStakingAddress = await pumpStaking.getAddress();

    await pumpBTC.setMinter(pumpStakingAddress, true);
    await pumpStaking.setStakeAssetCap(amount18 * 3n);
    await pumpStaking.setOperator(operator.address);

    // Distribute tokens, approve for staking
    await wbtc.transfer(operator.address, amount8);
    await wbtc.transfer(user1.address, amount8);
    await wbtc.transfer(user2.address, amount8);
    await wbtc.connect(operator).approve(pumpStakingAddress, amount8);
    await wbtc.connect(user1).approve(pumpStakingAddress, amount8);
    await wbtc.connect(user2).approve(pumpStakingAddress, amount8);
    await wbtc.approve(pumpStakingAddress, amount8);

    return { pumpBTC, pumpStaking, wbtc };
  }

  it("should deploy the contract correctly", async function () {
    await loadFixture(deployContracts);
  });

  // Initialize function test
  it("should initialize the contract correctly", async function () {
    const { pumpStaking, pumpBTC, wbtc } = await loadFixture(deployContracts);
    const [owner] = await ethers.getSigners();

    const assetAddress = await pumpStaking.asset();
    const assetDecimal = await pumpStaking.assetDecimal();
    const pumpBTCAddress = await pumpStaking.pumpBTC();

    expect(assetAddress).to.equal(await wbtc.getAddress());
    expect(assetDecimal).to.equal(8);
    expect(pumpBTCAddress).to.equal(await pumpBTC.getAddress());
    expect(await pumpStaking.instantUnstakeFee()).to.equal(300);
    expect(await pumpStaking.owner()).to.equal(owner.address);
    expect(await pumpStaking.paused()).to.equal(false);
  });

  it("should handle ownership transfer in two steps", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [operator] = await ethers.getSigners();

    await pumpStaking.transferOwnership(operator.address);
    expect(await pumpStaking.pendingOwner()).to.equal(operator.address);

    await pumpStaking.connect(operator).acceptOwnership();
    expect(await pumpStaking.owner()).to.equal(operator.address);
  });

  // Utils functions test
  it("should return correct date slot", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);

    const timestamp1 = 0; // Epoch time
    const timestamp2 = 3600 * 12; // 12 hours from epoch
    const timestamp3 = 3600 * 24 * 5; // 5 days from epoch

    expect(await pumpStaking._getDateSlot(timestamp1)).to.equal(0); // UTC+8 => still 0
    expect(await pumpStaking._getDateSlot(timestamp2)).to.equal(0); // UTC+8 => still 0
    expect(await pumpStaking._getDateSlot(timestamp3)).to.equal(5 % 10); // UTC+8 => 5 % 10 = 5
  });

  it("should adjust the amount correctly", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const amount8 = parseUnits("1", 8);
    const amount18 = parseUnits("1", 18);
    expect(await pumpStaking._adjustAmount(amount8)).to.equal(
      parseUnits("1", 8)
    );
    expect(await pumpStaking._adjustAmount(amount18)).to.equal(
      parseUnits("1", 18)
    );
  });

  // Owner functions test
  it("should allow owner to pause and unpause the contract", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner] = await ethers.getSigners();

    await expect(pumpStaking.connect(owner).pause()).to.emit(
      pumpStaking,
      "Paused"
    );
    expect(await pumpStaking.paused()).to.equal(true);

    await expect(pumpStaking.connect(owner).unpause()).to.emit(
      pumpStaking,
      "Unpaused"
    );
    expect(await pumpStaking.paused()).to.equal(false);
  });

  it("should revert when non-owner tries to pause and unpause the contract", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const attacker = accounts[4];

    await expect(
      pumpStaking.connect(attacker).pause()
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");

    await expect(
      pumpStaking.connect(attacker).unpause()
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");
  });

  it("should allow owner to set stake asset cap", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner] = await ethers.getSigners();

    const newCap = parseUnits("200", 18);

    await expect(pumpStaking.connect(owner).setStakeAssetCap(newCap))
      .to.emit(pumpStaking, "SetStakeAssetCap")
      .withArgs(await pumpStaking.totalStakingCap(), newCap);

    expect(await pumpStaking.totalStakingCap()).to.equal(newCap);
  });

  it("should revert when non-owner tries to set stake asset cap", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const attacker = accounts[5];

    const newCap = parseUnits("200", 18);

    await expect(
      pumpStaking.connect(attacker).setStakeAssetCap(newCap)
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");
  });

  it("should allow owner to set instant unstake fee", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner] = await ethers.getSigners();

    const newFee = 500; // 5%

    await expect(pumpStaking.connect(owner).setInstantUnstakeFee(newFee))
      .to.emit(pumpStaking, "SetInstantUnstakeFee")
      .withArgs(await pumpStaking.instantUnstakeFee(), newFee);

    expect(await pumpStaking.instantUnstakeFee()).to.equal(newFee);
  });

  it("should revert when non-owner tries to set instant unstake fee", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const attacker = accounts[5];
    const newFee = 500; // 5%

    await expect(
      pumpStaking.connect(attacker).setInstantUnstakeFee(newFee)
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");
  });

  it("should allow owner to set operator", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await expect(pumpStaking.connect(owner).setOperator(user1.address))
      .to.emit(pumpStaking, "SetOperator")
      .withArgs(await pumpStaking.operator(), user1.address);

    expect(await pumpStaking.operator()).to.equal(user1.address);
  });

  it("should revert when non-owner tries to set operator", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await expect(
      pumpStaking.connect(user1).setOperator(user2.address)
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");
  });

  it("should allow owner to collect fee", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const ownerBalanceBefore = await wbtc.balanceOf(owner);

    await pumpStaking.connect(user2).stake(parseUnits("0.2", 8));
    await pumpStaking.connect(user2).unstakeInstant(parseUnits("0.2", 8));

    const collectFeeBefore = await pumpStaking.collectedFee();

    await expect(pumpStaking.connect(owner).collectFee()).to.emit(
      pumpStaking,
      "FeeCollected"
    );

    const ownerBalanceAfter = await wbtc.balanceOf(owner);

    expect(await pumpStaking.collectedFee()).to.equal(0);
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(
      await pumpStaking._adjustAmount(collectFeeBefore)
    );
  });

  it("should revert when non-owner tries to collect fee", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    await expect(
      pumpStaking.connect(user1).collectFee()
    ).to.be.revertedWithCustomError(pumpStaking, "OwnableUnauthorizedAccount");
  });

  // Operator functions test
  it("should allow operator to withdraw", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const stakeAmount = parseUnits("1", 8);
    await pumpStaking.connect(user1).stake(stakeAmount);

    const operatorBalanceBefore = await wbtc.balanceOf(operator.address);

    await expect(pumpStaking.connect(operator).withdraw())
      .to.emit(pumpStaking, "AdminWithdraw")
      .withArgs(operator.address, stakeAmount);

    const operatorBalanceAfter = await wbtc.balanceOf(operator.address);
    expect(operatorBalanceAfter - operatorBalanceBefore).to.equal(
      await pumpStaking._adjustAmount(stakeAmount)
    );
    expect(await pumpStaking.pendingStakeAmount()).to.equal(0);
  });

  it("should revert when non-operator tries to withdraw", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const stakeAmount = parseUnits("1", 8);
    await pumpStaking.connect(user1).stake(stakeAmount);

    await expect(pumpStaking.connect(user2).withdraw()).to.be.revertedWith(
      "PumpBTC: caller is not the operator"
    );
  });

  it("should allow operator to deposit", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const operator = accounts[1];

    const depositAmount = parseUnits("10", 8);
    const operatorBalanceBefore = await wbtc.balanceOf(operator.address);

    await expect(pumpStaking.connect(operator).deposit(depositAmount))
      .to.emit(pumpStaking, "AdminDeposit")
      .withArgs(operator.address, depositAmount);

    const operatorBalanceAfter = await wbtc.balanceOf(operator.address);
    expect(operatorBalanceBefore - operatorBalanceAfter).to.equal(
      await pumpStaking._adjustAmount(depositAmount)
    );
    expect(await pumpStaking.totalClaimableAmount()).to.equal(depositAmount);
  });

  it("should revert when non-operator tries to deposit", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];
    const depositAmount = parseUnits("10", 8);
    await expect(
      pumpStaking.connect(user1).deposit(depositAmount)
    ).to.be.revertedWith("PumpBTC: caller is not the operator");
  });

  it("should allow operator to withdraw and deposit", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const stakeAmount = parseUnits("1", 8);
    await pumpStaking.connect(user1).stake(stakeAmount);

    const operatorBalanceBefore = await wbtc.balanceOf(operator.address);

    const depositAmount = parseUnits("0.5", 8);
    await expect(
      pumpStaking.connect(operator).withdrawAndDeposit(depositAmount)
    )
      .to.emit(pumpStaking, "AdminWithdraw")
      .withArgs(operator.address, stakeAmount)
      .and.to.emit(pumpStaking, "AdminDeposit")
      .withArgs(operator.address, depositAmount);

    const operatorBalanceAfter = await wbtc.balanceOf(operator.address);
    expect(operatorBalanceAfter - operatorBalanceBefore).to.equal(
      await pumpStaking._adjustAmount(stakeAmount - depositAmount)
    );
    expect(await pumpStaking.totalClaimableAmount()).to.equal(depositAmount);
  });

  it("should revert when non-operator tries to withdraw and deposit", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const stakeAmount = parseUnits("1", 8);
    await pumpStaking.connect(user1).stake(stakeAmount);

    const depositAmount = parseUnits("0.5", 8);
    await expect(
      pumpStaking.connect(user2).withdrawAndDeposit(depositAmount)
    ).to.be.revertedWith("PumpBTC: caller is not the operator");
  });

  // User functions test
  it("should allow user to stake tokens when not paused", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    const stakeAmount = parseUnits("1", 8);

    const userBalanceBefore = await wbtc.balanceOf(user1.address);

    await expect(pumpStaking.connect(user1).stake(stakeAmount))
      .to.emit(pumpStaking, "Stake")
      .withArgs(user1.address, stakeAmount);

    const userBalanceAfter = await wbtc.balanceOf(user1.address);

    expect(userBalanceBefore - userBalanceAfter).to.equal(stakeAmount);
    expect(await pumpStaking.totalStakingAmount()).to.equal(stakeAmount);
    expect(await pumpStaking.pendingStakeAmount()).to.equal(stakeAmount);
  });

  it("should revert stake when contract is paused", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(owner).pause();

    const stakeAmount = parseUnits("1", 8);
    await expect(
      pumpStaking.connect(user1).stake(stakeAmount)
    ).to.be.revertedWithCustomError(pumpStaking, "EnforcedPause");
  });

  it("should revert stake with zero amount", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    await expect(pumpStaking.connect(user1).stake(0)).to.be.revertedWith(
      "PumpBTC: amount should be greater than 0"
    );
  });

  it("should revert stake when exceeding the staking cap", async function () {
    const { pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const stakeAmount = await pumpStaking.totalStakingCap();
    await wbtc.connect(owner).mint(user1, stakeAmount);

    await wbtc.connect(user1).approve(pumpStaking, stakeAmount);
    await pumpStaking.connect(user1).stake(stakeAmount);

    await expect(pumpStaking.connect(user1).stake(1)).to.be.revertedWith(
      "PumpBTC: exceed staking cap"
    );
  });

  it("should allow user to request unstake", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    const block = await ethers.provider.getBlock("latest");
    if (block === null) {
      throw new Error("Failed to fetch the latest block");
    }

    const timestamp = block.timestamp;
    const slot = await pumpStaking._getDateSlot(timestamp);

    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.5", 8));

    const userPendingUnstakeAmount = await pumpStaking.pendingUnstakeAmount(
      user1.address,
      slot
    );

    expect(userPendingUnstakeAmount).to.equal(parseUnits("0.5", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.totalRequestedAmount()).to.equal(
      parseUnits("0.5", 8)
    );
  });

  it("should revert PumpBTC: claim the previous unstake first", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await expect(
      pumpStaking.connect(user1).unstakeRequest(parseUnits("0.1", 8))
    );

    await time.increase(86400 * 7);
    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.1", 8));

    await time.increase(86400 * 7);
    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.2", 8));

    await time.increase(86400 * 3);
    await expect(
      pumpStaking.connect(user1).unstakeRequest(parseUnits("0.1", 8))
    ).to.be.revertedWith("PumpBTC: claim the previous unstake first");
  });

  it("should PumpBTC: amount should be greater than 0", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await expect(
      pumpStaking.connect(user1).unstakeRequest(parseUnits("0", 8))
    ).to.be.revertedWith("PumpBTC: amount should be greater than 0");
  });

  it("should allow user to claim unstake amount after the claimable time", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(operator).deposit(parseUnits("0.5", 8));

    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.5", 8));
    const block = await ethers.provider.getBlock("latest");
    if (block === null) {
      throw new Error("Failed to fetch the latest block");
    }
    const slot = await pumpStaking._getDateSlot(block.timestamp);

    await time.increase(86400 * 9);
    expect(await pumpStaking.connect(user1).claimSlot(slot))
      .to.emit(pumpStaking, "ClaimSlot")
      .withArgs(user1.address, parseUnits("0.5", 8), slot);

    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99.5", 8));
    expect(await pumpStaking.totalClaimableAmount()).to.equal(0);
    expect(await pumpStaking.totalRequestedAmount()).to.equal(0);
    expect(
      await pumpStaking.pendingUnstakeAmount(user1.address, slot)
    ).to.equal(0);
  });

  it("should revert when there is no pending unstake", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    const block = await ethers.provider.getBlock("latest");
    if (block === null) {
      throw new Error("Failed to fetch the latest block");
    }
    const slot = await pumpStaking._getDateSlot(block.timestamp);

    await expect(pumpStaking.connect(user1).claimSlot(slot)).to.be.revertedWith(
      "PumpBTC: no pending unstake"
    );
  });

  it("should revert when the claimable time has not been reached", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.5", 8));
    const block = await ethers.provider.getBlock("latest");
    if (block === null) {
      throw new Error("Failed to fetch the latest block");
    }
    const slot = await pumpStaking._getDateSlot(block.timestamp);

    await time.increase(86400 * 2);

    await expect(pumpStaking.connect(user1).claimSlot(slot)).to.be.revertedWith(
      "PumpBTC: haven't reached the claimable time"
    );
  });

  it("should allow user to claim all unstake amounts after the claimable time", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.3", 8));

    await pumpStaking.connect(operator).deposit(parseUnits("0.5", 8));

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(
      parseUnits("0.7", 8)
    );
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));

    await time.increase(86400 * 9);
    await pumpStaking.connect(user1).claimAll();

    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99.3", 8));
    expect(await pumpStaking.totalClaimableAmount()).to.equal(
      parseUnits("0.2", 8)
    );
    expect(await pumpStaking.totalRequestedAmount()).to.equal(0);
  });

  it("should revert when there is no claimable amount", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    await expect(pumpStaking.connect(user1).claimAll()).to.be.revertedWith(
      "PumpBTC: no pending unstake"
    );
  });

  it("should revert when there is no claimable amount before the claimable time", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.3", 8));

    await pumpStaking.connect(operator).deposit(parseUnits("0.5", 8));

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(
      parseUnits("0.7", 8)
    );
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));

    await expect(pumpStaking.connect(user1).claimAll()).to.be.revertedWith(
      "PumpBTC: haven't reached the claimable time"
    );
  });

  it("should allow user to unstake instantly", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(user1).unstakeInstant(parseUnits("0.5", 8));

    const fee = await pumpStaking.collectedFee();
    const amountAfterFee = parseUnits("0.5", 8) - fee;

    expect(await wbtc.balanceOf(user1.address)).to.equal(
      parseUnits("99", 8) + amountAfterFee
    );
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.totalStakingAmount()).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.pendingStakeAmount()).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.collectedFee()).to.equal(fee);
  });

  it("should revert when unstake amount is greater than pending stake amount", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    await pumpStaking.connect(user1).stake(parseUnits("0.5", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99.5", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.totalStakingAmount()).to.equal(
      parseUnits("0.5", 8)
    );
    expect(await pumpStaking.pendingStakeAmount()).to.equal(
      parseUnits("0.5", 8)
    );

    await expect(
      pumpStaking.connect(user1).unstakeInstant(parseUnits("1", 8))
    ).to.be.revertedWith("PumpBTC: insufficient pending stake amount");
  });

  it("should revert when unstake amount is zero", async function () {
    const { pumpStaking } = await loadFixture(deployContracts);
    const accounts = await ethers.getSigners();
    const user1 = accounts[2];

    await expect(
      pumpStaking.connect(user1).unstakeInstant(0)
    ).to.be.revertedWith("PumpBTC: amount should be greater than 0");
  });

  // Finish user journey of staking test
  it("should finish user journey of staking", async function () {
    const { pumpBTC, pumpStaking, wbtc } = await loadFixture(deployContracts);
    const [owner, operator, user1, user2] = await ethers.getSigners();

    // Day 1: User1 stakes 1 WBTC
    await pumpStaking.connect(user1).stake(parseUnits("1", 8));
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("1", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("1", 8));

    await pumpStaking.connect(operator).withdraw();
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("0", 8));

    // Day 2: User2 stakes 2 WBTC
    await time.increase(86400);
    await pumpStaking.connect(user2).stake(parseUnits("2", 8));
    expect(await wbtc.balanceOf(user2.address)).to.equal(parseUnits("98", 8));
    expect(await pumpBTC.balanceOf(user2.address)).to.equal(parseUnits("2", 8));
    expect(await pumpStaking.totalStakingAmount()).to.equal(parseUnits("3", 8));
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("2", 8));

    await pumpStaking.connect(operator).withdraw();
    expect(await pumpStaking.pendingStakeAmount()).to.equal(parseUnits("0", 8));

    // Day 5: User1 unstake 0.3 WBTC
    await time.increase(86400 * 3);
    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.3", 8));

    // Day 12: User1 can't unstake yet, and request again
    await time.increase(86400 * 7);
    await expect(pumpStaking.connect(user1).claimAll()).to.be.revertedWith(
      "PumpBTC: haven't reached the claimable time"
    );
    await pumpStaking.connect(user1).unstakeRequest(parseUnits("0.1", 8));

    // Day 15: User1 can't unstake again before claim
    await time.increase(86400 * 3);
    await pumpStaking.connect(operator).deposit(parseUnits("0.5", 8));
    await expect(
      pumpStaking.connect(user1).unstakeRequest(parseUnits("0.1", 8))
    ).to.be.revertedWith("PumpBTC: claim the previous unstake first");

    // Day 15: User1 claim the unstake
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(
      parseUnits("0.6", 8)
    );
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99", 8));
    await pumpStaking.connect(user1).claimAll();
    expect(await wbtc.balanceOf(user1.address)).to.equal(parseUnits("99.3", 8));

    // Day 16: User2 unstake instantly
    await time.increase(86400);
    await expect(
      pumpStaking.connect(user2).unstakeInstant(parseUnits("0.2", 8))
    ).to.be.revertedWith("PumpBTC: insufficient pending stake amount");
    await pumpStaking.connect(user1).stake(parseUnits("0.5", 8));
    await pumpStaking.connect(user2).unstakeInstant(parseUnits("0.2", 8)); // 0.2 * (1-3%) = 0.194
    expect(await pumpBTC.balanceOf(user2.address)).to.equal(
      parseUnits("1.8", 8)
    );
    expect(await wbtc.balanceOf(user2.address)).to.equal(
      parseUnits("98.194", 8)
    );
    expect(await pumpStaking.pendingStakeAmount()).to.equal(
      parseUnits("0.3", 8)
    );

    // Day 16: Collect fees
    const balanceBefore = await wbtc.balanceOf(owner.address);
    await pumpStaking.collectFee();
    const balanceAfter = await wbtc.balanceOf(owner.address);
    expect(balanceAfter - balanceBefore).to.equal(parseUnits("0.006", 8));
  });
});
