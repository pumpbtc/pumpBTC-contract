const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // deploy PumpToken
  const pumpBTC = await deployContract("PumpToken")

  console.log("PumpToken deployed to:", pumpBTC.target);

  await pumpBTC.waitForDeployment();
  const pumpBTCAddr = pumpBTC.target
 
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
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

