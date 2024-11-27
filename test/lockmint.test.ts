import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { parseUnits, ZeroAddress } from "ethers";

describe("LockMint Unit Test", function () {
  async function deployContracts() {
    const [owner, admin, approver, user1, user2, user3] = await ethers.getSigners();

    // Deploy LayerZero endpoint mock
    const MockEndpointV2 = await ethers.getContractFactory("MockEndpointV2");
    const mockEndpointV2 = await MockEndpointV2.deploy(10, owner.address);

    // Deploy Mock PumpToken
    const pumpBTC = await ethers.deployContract("MockPumpToken");
    const amount8 = parseUnits("100", 8);

    // Deploy PumpTokenOFT
    const PumpTokenOFT = await ethers.getContractFactory("PumpTokenOFT");
    const lzEndpoint = await mockEndpointV2.getAddress();
    const mintAsset = await PumpTokenOFT.deploy(lzEndpoint);

    // Deploy LockMint
    const lockAssetAddress = await pumpBTC.getAddress();
    const mintAssetAddress = await mintAsset.getAddress();

    const LockMint = await ethers.getContractFactory("PumpLockMint");
    const lockMint = await LockMint.deploy(lockAssetAddress, mintAssetAddress);
    const lockMintAddress = await lockMint.getAddress();

    // Set minter and admin
    await pumpBTC.setMinter(owner.address, true);
    await lockMint.setAdmin(admin.address);
    await mintAsset.setMinter(lockMintAddress, true);

    await pumpBTC.mint(user1.address, amount8);
    await pumpBTC.mint(user2.address, amount8);
    await pumpBTC.mint(user3.address, amount8);

    await pumpBTC.connect(user1).approve(lockMintAddress, amount8);
    await pumpBTC.connect(user2).approve(lockMintAddress, amount8);
    await pumpBTC.connect(user3).approve(lockMintAddress, amount8);

    await mintAsset.connect(user1).approve(lockMintAddress, amount8);
    await mintAsset.connect(user2).approve(lockMintAddress, amount8);
    await mintAsset.connect(user3).approve(lockMintAddress, amount8);

    return { pumpBTC, mintAsset, lockMint, owner, admin, approver, user1, user2, user3, lockMintAddress };
  }

  it("should deploy the contract correctly", async function () {
    await loadFixture(deployContracts);
  });

  it("should allow owner to set admin", async function () {
    const { lockMint, owner, admin } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).setAdmin(admin.address))
      .to.emit(lockMint, "AdminSet")
      .withArgs(admin.address);

    expect(await lockMint.admin()).to.equal(admin.address);
  });

  it("should not allow non-owner to set admin", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).setAdmin(user1.address))
      .to.be.revertedWithCustomError(lockMint, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
  });

  it("should revert when setting admin to zero address", async function () {
    const { lockMint, owner } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).setAdmin(ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid admin address"
    );
  });

  it("should allow admin to pause and unpause", async function () {
    const { lockMint, owner, admin } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setAdmin(admin.address);

    await lockMint.connect(admin).pause();
    expect(await lockMint.paused()).to.be.true;

    await lockMint.connect(admin).unpause();
    expect(await lockMint.paused()).to.be.false;
  });

  it("should not allow non-admin to pause or unpause", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).pause()).to.be.revertedWith("Only admin can call this function");
    await expect(lockMint.connect(user1).unpause()).to.be.revertedWith("Only admin can call this function");
  });

  it("should prevent lockMint and burnUnlock when paused", async function () {
    const { lockMint, owner, admin, user1 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setAdmin(admin.address);
    await lockMint.connect(admin).pause();

    const amount = parseUnits("10", 8);

    await expect(lockMint.connect(user1).lockMint(amount))
      .to.be.revertedWithCustomError(lockMint, "EnforcedPause");
    await expect(lockMint.connect(user1).burnUnlock(amount))
      .to.be.revertedWithCustomError(lockMint, "EnforcedPause");
  });

  it("should lock lockAsset and mint mintAsset", async function () {
    const { lockMint, user1, pumpBTC, mintAsset, lockMintAddress } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    const initialLockAssetBalance = await pumpBTC.balanceOf(user1.address);
    const initialMintAssetBalance = await mintAsset.balanceOf(user1.address);

    await expect(lockMint.connect(user1).lockMint(amount))
      .to.emit(lockMint, "Locked")
      .withArgs(user1.address, amount);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(initialLockAssetBalance - amount);
    expect(await mintAsset.balanceOf(user1.address)).to.equal(initialMintAssetBalance + amount);
    expect(await pumpBTC.balanceOf(lockMintAddress)).to.equal(amount);
  });

  it("should revert when amount is zero in lockMint", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).lockMint(0)).to.be.revertedWith("LockMint: Amount must be greater than zero");
  });

  it("should revert when user has insufficient lockAsset", async function () {
    const { lockMint, user1, user2, pumpBTC, lockMintAddress } = await loadFixture(deployContracts);
  
    const amount = parseUnits("100", 8);

    await pumpBTC.connect(user2).transfer(user1.address, amount);
    
    await pumpBTC.connect(user2).approve(lockMintAddress, amount);
  
    await expect(lockMint.connect(user2).lockMint(amount))
      .to.be.revertedWithCustomError(pumpBTC, "ERC20InsufficientBalance")
      .withArgs(user2.address, 0, amount);
  });
  

  it("should burn mintAsset and unlock lockAsset", async function () {
    const { lockMint, user1, pumpBTC, mintAsset, lockMintAddress } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    await lockMint.connect(user1).lockMint(amount);

    const initialLockAssetBalance = await pumpBTC.balanceOf(user1.address);
    const initialMintAssetBalance = await mintAsset.balanceOf(user1.address);

    await expect(lockMint.connect(user1).burnUnlock(amount))
      .to.emit(lockMint, "Unlocked")
      .withArgs(user1.address, amount);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(initialLockAssetBalance + amount);
    expect(await mintAsset.balanceOf(user1.address)).to.equal(initialMintAssetBalance - amount);
    expect(await pumpBTC.balanceOf(lockMintAddress)).to.equal(0);
    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);
  });

  it("should revert when amount is zero in burnUnlock", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).burnUnlock(0)).to.be.revertedWith(
      "LockMint: Amount must be greater than zero"
    );
  });

  it("should revert when user has insufficient mintAsset", async function () {
    const { lockMint, user1, mintAsset } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    await expect(lockMint.connect(user1).burnUnlock(amount))
      .to.be.revertedWithCustomError(mintAsset, "ERC20InsufficientBalance")
      .withArgs(user1.address, 0, amount);
  });

  it("should allow owner to withdraw lockAsset", async function () {
    const { lockMint, owner, user1, pumpBTC, lockMintAddress } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    await lockMint.connect(user1).lockMint(amount);

    const initialOwnerBalance = await pumpBTC.balanceOf(owner.address);

    await expect(lockMint.connect(owner).emergencyWithdraw(amount))
      .to.emit(lockMint, "EmergencyWithdraw")
      .withArgs(owner.address, amount);

    expect(await pumpBTC.balanceOf(owner.address)).to.equal(initialOwnerBalance + amount);
    expect(await pumpBTC.balanceOf(lockMintAddress)).to.equal(0);
  });

  it("should revert when emergencyWithdraw is called by non-owner", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    await expect(lockMint.connect(user1).emergencyWithdraw(amount))
      .to.be.revertedWithCustomError(lockMint, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
  });

  it("should revert when amount is zero in emergencyWithdraw", async function () {
    const { lockMint, owner } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).emergencyWithdraw(0)).to.be.revertedWith(
      "LockMint: Amount must be greater than zero"
    );
  });

  it("should allow owner to set approver", async function () {
    const { lockMint, owner, approver } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).setApprover(approver.address))
      .to.emit(lockMint, "ApproverSet")
      .withArgs(approver.address);

    expect(await lockMint.approver()).to.equal(approver.address);
  });

  it("should not allow non-owner to set approver", async function () {
    const { lockMint, user1, approver } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).setApprover(approver.address))
      .to.be.revertedWithCustomError(lockMint, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
  });

  it("should revert when setting approver to zero address", async function () {
    const { lockMint, owner } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).setApprover(ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid approver address"
    );
  });

  it("should allow owner to set approvalRequired", async function () {
    const { lockMint, owner } = await loadFixture(deployContracts);

    await expect(lockMint.connect(owner).setApprovalRequired(true))
      .to.emit(lockMint, "ApprovalRequiredSet")
      .withArgs(true);

    expect(await lockMint.approvalRequired()).to.be.true;

    await expect(lockMint.connect(owner).setApprovalRequired(false))
      .to.emit(lockMint, "ApprovalRequiredSet")
      .withArgs(false);

    expect(await lockMint.approvalRequired()).to.be.false;
  });

  it("should not allow non-owner to set approvalRequired", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).setApprovalRequired(true))
      .to.be.revertedWithCustomError(lockMint, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
  });

  it("should allow owner to set burnUnlockEnabled", async function () {
    const { lockMint, owner } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setBurnUnlockEnabled(false);
    expect(await lockMint.burnUnlockEnabled()).to.be.false;

    await lockMint.connect(owner).setBurnUnlockEnabled(true);
    expect(await lockMint.burnUnlockEnabled()).to.be.true;
  });

  it("should not allow non-owner to set burnUnlockEnabled", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).setBurnUnlockEnabled(false))
      .to.be.revertedWithCustomError(lockMint, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
  });

  it("should revert burnUnlock when burnUnlockEnabled is false", async function () {
    const { lockMint, owner, user1 } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await lockMint.connect(owner).setBurnUnlockEnabled(false);

    await expect(lockMint.connect(user1).burnUnlock(amount)).to.be.revertedWith(
      "BurnUnlock is currently disabled"
    );
  });

  it("should allow user to submit burnUnlock request when approval is required", async function () {
    const { lockMint, owner, user1 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await expect(lockMint.connect(user1).burnUnlock(amount))
      .to.emit(lockMint, "BurnUnlockRequested")
      .withArgs(user1.address, amount);

    expect(await lockMint.pendingBurnUnlocks(user1.address)).to.equal(amount);
  });

  it("should prevent user from submitting another burnUnlock request when one is pending", async function () {
    const { lockMint, owner, user1 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await lockMint.connect(user1).burnUnlock(amount);

    await expect(lockMint.connect(user1).burnUnlock(amount)).to.be.revertedWith(
      "Existing pending burnUnlock request"
    );
  });

  it("should allow approver to approve burnUnlock request", async function () {
    const { lockMint, owner, approver, user1, pumpBTC, mintAsset } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(approver.address);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await lockMint.connect(user1).burnUnlock(amount);

    await expect(lockMint.connect(approver).approveBurnUnlock(user1.address))
      .to.emit(lockMint, "Unlocked")
      .withArgs(user1.address, amount);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(amount * (10n));
    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);
    expect(await lockMint.pendingBurnUnlocks(user1.address)).to.equal(0);
  });

  it("should prevent non-approver from approving burnUnlock request", async function () {
    const { lockMint, owner, user1, user2 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(user2.address);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await lockMint.connect(user1).burnUnlock(amount);

    await expect(lockMint.connect(user1).approveBurnUnlock(user1.address)).to.be.revertedWith(
      "Only approver can call this function"
    );
  });

  it("should revert approveBurnUnlock when there is no pending request", async function () {
    const { lockMint, owner, approver, user1 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(approver.address);

    await expect(lockMint.connect(approver).approveBurnUnlock(user1.address)).to.be.revertedWith(
      "No pending burnUnlock request for this user"
    );
  });

  it("should allow approver to batch approve burnUnlock requests", async function () {
    const { lockMint, owner, approver, user1, user2, user3, pumpBTC, mintAsset } = await loadFixture(
      deployContracts
    );

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(approver.address);

    const amount = parseUnits("10", 8);

    await lockMint.connect(user1).lockMint(amount);
    await lockMint.connect(user2).lockMint(amount);
    await lockMint.connect(user3).lockMint(amount);

    await lockMint.connect(user1).burnUnlock(amount);
    await lockMint.connect(user2).burnUnlock(amount);
    await lockMint.connect(user3).burnUnlock(amount);

    await lockMint.connect(approver).approverBatchBurnUnlock([user1.address, user2.address, user3.address]);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(amount * (10n));
    expect(await pumpBTC.balanceOf(user2.address)).to.equal(amount * (10n));
    expect(await pumpBTC.balanceOf(user3.address)).to.equal(amount * (10n));

    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);
    expect(await mintAsset.balanceOf(user2.address)).to.equal(0);
    expect(await mintAsset.balanceOf(user3.address)).to.equal(0);

    expect(await lockMint.pendingBurnUnlocks(user1.address)).to.equal(0);
    expect(await lockMint.pendingBurnUnlocks(user2.address)).to.equal(0);
    expect(await lockMint.pendingBurnUnlocks(user3.address)).to.equal(0);
  });

  it("should handle batch approval when some users have no pending requests", async function () {
    const { lockMint, owner, approver, user1, user2 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(approver.address);

    const amount = parseUnits("10", 8);

    await lockMint.connect(user1).lockMint(amount);
    await lockMint.connect(user1).burnUnlock(amount);

    await lockMint.connect(approver).approverBatchBurnUnlock([user1.address, user2.address]);

    expect(await lockMint.pendingBurnUnlocks(user1.address)).to.equal(0);

    expect(await lockMint.pendingBurnUnlocks(user2.address)).to.equal(0);
  });

  it("should prevent non-approver from batch approving", async function () {
    const { lockMint, owner, user1, user2 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(user2.address);

    const amount = parseUnits("10", 8);

    await lockMint.connect(user1).lockMint(amount);
    await lockMint.connect(user1).burnUnlock(amount);

    await expect(lockMint.connect(user1).approverBatchBurnUnlock([user1.address])).to.be.revertedWith(
      "Only approver can call this function"
    );
  });

  it("should prevent non-admin from pausing or unpausing", async function () {
    const { lockMint, user1 } = await loadFixture(deployContracts);

    await expect(lockMint.connect(user1).pause()).to.be.revertedWith("Only admin can call this function");
    await expect(lockMint.connect(user1).unpause()).to.be.revertedWith("Only admin can call this function");
  });

  it("should allow burnUnlock without approval when approvalRequired is false", async function () {
    const { lockMint, owner, user1, pumpBTC, mintAsset } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(false);

    const amount = parseUnits("10", 8);
    await lockMint.connect(user1).lockMint(amount);

    await expect(lockMint.connect(user1).burnUnlock(amount))
      .to.emit(lockMint, "Unlocked")
      .withArgs(user1.address, amount);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(amount * (10n));
    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);
  });

  it("should toggle approvalRequired and handle requests accordingly", async function () {
    const { lockMint, owner, user1, pumpBTC, mintAsset } = await loadFixture(deployContracts);

    const amount = parseUnits("10", 8);

    // Set approvalRequired to true
    await lockMint.connect(owner).setApprovalRequired(true);

    // User1 locks tokens
    await lockMint.connect(user1).lockMint(amount);

    // User1 submits burnUnlock request
    await lockMint.connect(user1).burnUnlock(amount);

    // Set approvalRequired to false
    await lockMint.connect(owner).setApprovalRequired(false);

    // Since approvalRequired is now false, pending request should not be auto-processed
    expect(await lockMint.pendingBurnUnlocks(user1.address)).to.equal(amount);

    // User1 cannot submit another request
    await expect(lockMint.connect(user1).burnUnlock(amount)).to.be.revertedWith(
      "Existing pending burnUnlock request"
    );

    // Approver can still approve the pending request
    await lockMint.connect(owner).setApprover(owner.address);
    await lockMint.connect(owner).approveBurnUnlock(user1.address);

    // Check balances
    expect(await pumpBTC.balanceOf(user1.address)).to.equal(amount * (10n));
    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);

    // User1 can now call burnUnlock directly without approval
    await lockMint.connect(user1).lockMint(amount);
    await lockMint.connect(user1).burnUnlock(amount);

    expect(await pumpBTC.balanceOf(user1.address)).to.equal(amount * (10n));
    expect(await mintAsset.balanceOf(user1.address)).to.equal(0);
  });

  it("should revert when amount is zero in approveBurnUnlock and approverBatchBurnUnlock", async function () {
    const { lockMint, owner, approver, user1 } = await loadFixture(deployContracts);

    await lockMint.connect(owner).setApprovalRequired(true);
    await lockMint.connect(owner).setApprover(approver.address);

    await expect(lockMint.connect(approver).approveBurnUnlock(user1.address)).to.be.revertedWith(
      "No pending burnUnlock request for this user"
    );

    await expect(
      lockMint.connect(approver).approverBatchBurnUnlock([user1.address])
    ).to.not.be.reverted;
  });
});