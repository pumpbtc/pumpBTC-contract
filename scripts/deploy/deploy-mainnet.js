const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");
const { ethers } = require("hardhat");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // deploy PumpToken
  const pumpBTC = await deployContract("PumpToken")

  console.log("PumpToken deployed to:", pumpBTC.target);

  await pumpBTC.waitForDeployment();
  const pumpBTCAddr = pumpBTC.target

  // FBTC
  const btcbAddr = "0xC96dE26018A54D51c097160568752c4E3BD6C364";

  // deploy pumpStaking
  const PumpStaking =await deployUpgradeableContract(
    "PumpStaking", [pumpBTCAddr, btcbAddr ]
  )

  console.log("PumpStaking deployed to:", PumpStaking.target);

  await PumpStaking.waitForDeployment();
  
  console.log("Verifying contracts on Etherscan...");
  await sleep(10);

  const PumpStakingAddr = PumpStaking.target
  const PumpStakingProxyAdminAddr = await upgrades.erc1967.getAdminAddress(PumpStakingAddr)


  try {
    await run("verify:verify", {
      address: pumpBTCAddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
  try {
    await run("verify:verify", {
      address: PumpStakingAddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }




  // After run deploy script, need manual setup:
  //   1 - Set PumpStaking as minter of PumpToken
  //   2 - PumpStaking setStakeAssetCap
  //   3 - PumpStaking setOperator

  const stakingOperator = "0xC7DA129335F8815d62fBd3ca7183A3b2791CdB5e";
  const contractOwner = "0x4913D495cBA3e1380218d2258126F22Ea5dE5f8B";

  const pumpBTCContract = await ethers.getContractAt("PumpTokenOFT", pumpBTCAddr, deployer);
  const PumpStakingProxyAdmin = await ethers.getContractAt("ProxyAdmin", PumpStakingProxyAdminAddr, deployer);

  console.log("pumpBTCContract.setMinter")
  const tx1 = await pumpBTCContract.setMinter(PumpStakingAddr, true);
  await tx1.wait(3)

   console.log("PumpStakingContract.setStakeAssetCap")
   const PumpStakingContract = await ethers.getContractAt("PumpStaking", PumpStakingAddr, deployer);
   const tx2 = await PumpStakingContract.setStakeAssetCap(2100000000000000);
   await tx2.wait(3)

   console.log("PumpStakingContract.setOperator")
   const tx3 = await PumpStakingContract.setOperator(stakingOperator);
   await tx3.wait(3)

   console.log("PumpStakingContract.transferOwnership")
   const tx4 = await PumpStakingContract.transferOwnership(contractOwner);
   await tx4.wait(3)

   console.log("pumpBTCContract.transferOwnership")
   const tx5 = await pumpBTCContract.transferOwnership(contractOwner);
   await tx5.wait(3)


   console.log("PumpStakingProxyAdmin.transferOwnership")
   const tx6 = await PumpStakingProxyAdmin.transferOwnership(contractOwner);
   await tx6.wait(3)

}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

