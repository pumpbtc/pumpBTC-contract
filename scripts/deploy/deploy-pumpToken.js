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

  try {
    await run("verify:verify", {
      address: pumpBTCAddr,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }

}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

