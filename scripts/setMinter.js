const hre = require("hardhat");
const { run, upgrades } = require("hardhat");
const { address } = require("ton-core");
const { ethers } = require("hardhat");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const pumpBTCAddr = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"
  const minter = "0xC6D1283FDc3a8fcB12f6a9ee2B8b8c2ac60117Bf"
  const isMinter = true

  const pumpBTCContract = await ethers.getContractAt("PumpToken", pumpBTCAddr, deployer);

  console.log("pumpBTCContract.setMinter")
  const tx1 = await pumpBTCContract.setMinter(minter, isMinter);
  await tx1.wait(3)

  console.log(tx1)
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

