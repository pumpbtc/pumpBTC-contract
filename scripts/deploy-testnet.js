const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // deploy mockBTCB and mockPumpToken
  const btcb = await deployContract("MockWBTC")
  const pumpBTC = await deployContract("MockPumpToken")

  console.log("MockBTCB deployed to:", btcb.target);
  console.log("PumpToken deployed to:", pumpBTC.target);

  await btcb.waitForDeployment();
  await pumpBTC.waitForDeployment();


  const pumpBTCaddr = await pumpBTC.getAddress()
  const btcbaddr = await btcb.getAddress()


  // deploy pumpStaking
  const PumpStaking =await deployUpgradeableContract(
    "PumpStakingTest", [pumpBTCaddr, btcbaddr]
  )

  console.log("PumpStaking deployed to:", PumpStaking.target);

  await PumpStaking.waitForDeployment();
    
  console.log("Verifying contracts on Etherscan...");
  await sleep(10);

  try {
    await run("verify:verify", {
      address: btcbaddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }

  try {
    await run("verify:verify", {
      address: pumpBTCaddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
  try {
    await run("verify:verify", {
      address: PumpStakingaddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }




  // After run deploy script, need  setup:
  //   1 - Set PumpStaking as minter of PumpToken
  //   2 - PumpStaking setStakeAssetCap
  //   3 - PumpStaking setOperator

  // const pumpBTCContract = await ethers.getContractAt("MockPumpToken", pumpBTCaddr, deployer);
  // const tx1 = await pumpBTCContract.setMinter(PumpStakingaddr, true);
  // await tx1.wait(3)

   const PumpStakingContract = await ethers.getContractAt("PumpStakingTest", PumpStakingaddr, deployer);
   const tx2 = await PumpStakingContract.setStakeAssetCap(2100000000000000);
   await tx2.wait(3)

   const tx3 = await PumpStakingContract.setOperator(deployer.address);
   await tx3.wait(3)

}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

