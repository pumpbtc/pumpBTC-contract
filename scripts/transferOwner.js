// const hre = require("hardhat");
// const { run, upgrades } = require("hardhat");
// const { address } = require("ton-core");
// const { ethers } = require("hardhat");

// const sleep = ms => new Promise(r => setTimeout(r, ms));

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deploying contracts with the account:", deployer.address);

//   const pumpBTCAddr = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"
//   const newOwner = "0x4913D495cBA3e1380218d2258126F22Ea5dE5f8B"

//   const pumpBTCContract = await ethers.getContractAt("PumpToken", pumpBTCAddr, deployer);

//   console.log("pumpBTCContract.transferOwnership")
//   const tx1 = await pumpBTCContract.transferOwnership(newOwner);
//   await tx1.wait(3)

//   console.log(tx1)
// }  

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

