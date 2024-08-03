const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // update maxPriorityFeePerGas for movement testnet
  const feeData = await ethers.provider.getFeeData();
  console.log(feeData)
  const overrides = {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxFeePerGas,
  };
  console.log(overrides)


  
  // deploy mockBTC and mockPumpToken
  const btc = await deployContract("MockBTC",[overrides])
  const pumpBTC = await deployContract("MockPumpToken",[overrides])

  console.log("MockBTC deployed to:", btc.target);
  console.log("PumpToken deployed to:", pumpBTC.target);

  await btc.waitForDeployment();
  await pumpBTC.waitForDeployment();


  const pumpBTCaddr = await pumpBTC.getAddress()
  const btcaddr = await btc.getAddress()

  // const btcaddr = "0x2CfC917CBE830003F2B0BE802d1226b476e385e7"
  // const pumpBTCaddr = "0xb45aB56AafB1fFb21eE36C9Dee3B7D8ec5779fC8"


  // deploy pumpStaking
  const PumpStaking =await deployUpgradeableContract(
    "PumpStakingTest", [pumpBTCaddr, btcaddr], overrides
  )

  console.log("PumpStaking deployed to:", PumpStaking.target);

  await PumpStaking.waitForDeployment();

  const PumpStakingaddr = await PumpStaking.getAddress()

  // const PumpStakingaddr = "0x1e443Ae0e846F26F53820E44650C554853c0fcC2"
    
  console.log("Verifying contracts on Etherscan...");
  await sleep(10);

  try {
    await run("verify:verify", {
      address: btcaddr,
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

  console.log("pumpBTCContract.setMinter")
  const pumpBTCContract = await ethers.getContractAt("MockPumpToken", pumpBTCaddr, deployer);

  const tx1 = await pumpBTCContract.setMinter(PumpStakingaddr, true, overrides);
  await tx1.wait(3)

  console.log("PumpStakingContract.setStakeAssetCap")
  const PumpStakingContract = await ethers.getContractAt("PumpStakingTest", PumpStakingaddr, deployer);

  const tx2 = await PumpStakingContract.setStakeAssetCap(2100000000000000,overrides);
  await tx2.wait(3)

  console.log("PumpStakingContract.setOperator")
  const tx3 = await PumpStakingContract.setOperator(deployer.address,overrides);
  await tx3.wait(3)

  console.log (await PumpStakingContract.totalStakingCap())


}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

