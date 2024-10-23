const { deployUpgradeableContract, deployContract } = require("./utils")
const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");
const { ethers } = require("hardhat");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const pumpBTCaddr = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E"
  const minter = "0xE7fB36b4a3787CFa32fde7AfFdeD0cFb6825f255"

  const pumpBTC = await ethers.getContractAt("PumpToken", pumpBTCaddr);
  console.log("PumpToken deployed to:", pumpBTC.address);

  await pumpBTC.setMinter(minter,true);
  console.log("Minter set to:", minter);

}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

