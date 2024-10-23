const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");
const { ethers } = require("hardhat");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // // deploy PumpToken
  // const pumpBTC = await deployContract("PumpToken")

  // console.log("PumpToken deployed to:", pumpBTC.target);

  // await pumpBTC.waitForDeployment();
  // const pumpBTCAddr = pumpBTC.target

  // // FBTC
  const pumpBTCAddr = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E"
  const btcAddr = "0xC96dE26018A54D51c097160568752c4E3BD6C364";
  const PumpStakingAddr = "0xd7C019326B5C22A6a2e0AadD1241Af94FF7ecf7B";

  // const pumpBTCAddr = "0xf469fbd2abcd6b9de8e169d128226c0fc90a012e"
  // const btcAddr = "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf";
  // const PumpStakingAddr = "0xc0c687A198D94B0315137a8EaDE116a579622f88";

  // // deploy pumpStaking
  // const PumpStaking =await deployUpgradeableContract(
  //   "PumpStaking", [pumpBTCAddr, btcAddr ]
  // )

  // console.log("PumpStaking deployed to:", PumpStaking.target);

  // await PumpStaking.waitForDeployment();
  
  // console.log("Verifying contracts on Etherscan...");
  // await sleep(10);

  // const PumpStakingAddr = PumpStaking.target
  const PumpStakingProxyAdminAddr = await upgrades.erc1967.getAdminAddress(PumpStakingAddr)


  
  // try {
  //   await run("verify:verify", {
  //     address: pumpBTCAddr,
  //     constructorArguments: [],
  //   });
  //   console.log("Contract verified successfully!");
  // } catch (error) {
  //   console.error("Verification failed:", error);
  // }
  try {
    await run("verify:verify", {
      address: PumpStakingAddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }




  // // After run deploy script, need manual setup:
  // //   1 - Set PumpStaking as minter of PumpToken
  // //   2 - PumpStaking setStakeAssetCap
  // //   3 - PumpStaking setOperator

  // ETH MultiSig
  const stakingOperator = "0xC7DA129335F8815d62fBd3ca7183A3b2791CdB5e";
  const contractOwner = "0x4913D495cBA3e1380218d2258126F22Ea5dE5f8B";

  const pumpBTCContract = await ethers.getContractAt("PumpToken", pumpBTCAddr, deployer);
  const PumpStakingContract = await ethers.getContractAt("PumpStaking", PumpStakingAddr, deployer);
  const PumpStakingProxyAdmin = await ethers.getContractAt("ProxyAdmin", PumpStakingProxyAdminAddr, deployer);

  // console.log("pumpBTCContract.setMinter")
  // const tx1 = await pumpBTCContract.setMinter(PumpStakingAddr, true);
  // await tx1.wait(3)

  //  console.log("PumpStakingContract.setStakeAssetCap")
  //  const tx2 = await PumpStakingContract.setStakeAssetCap(2100000000000000);
  //  await tx2.wait(3)

  //  console.log("PumpStakingContract.setOperator")
  //  const tx3 = await PumpStakingContract.setOperator(stakingOperator);
  //  await tx3.wait(3)

   console.log("PumpStakingContract.transferOwnership")
   const tx4 = await PumpStakingContract.transferOwnership(contractOwner);
   await tx4.wait(3)

  //  console.log("pumpBTCContract.transferOwnership")
  //  const tx5 = await pumpBTCContract.transferOwnership(contractOwner);
  //  await tx5.wait(3)


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

