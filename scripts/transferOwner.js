const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");
const { ethers } = require("hardhat");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const pumpBTCAddr = "0x5a2aa871954eBdf89b1547e75d032598356caad5"
  const newOwner = "0x14A359aE2446eaC89495b3F28b7a29cE2A17f392"

  const pumpBTCContract = await ethers.getContractAt("PumpToken", pumpBTCAddr, deployer);

  console.log("pumpBTCContract.transferOwnership")
  const tx1 = await pumpBTCContract.transferOwnership(newOwner);
  await tx1.wait(3)

  console.log(tx1)
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

