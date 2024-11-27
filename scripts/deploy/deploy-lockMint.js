const { run } = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const lockAssetAddress = "0xf469fbd2abcd6b9de8e169d128226c0fc90a012e"; // PumpBTC address
  const mintAssetAddress = "0xADc9c900b05F39f48bB6F402A1BAE60929F4f9A8"; // PumpBTC.bera address

  // deploy lockMint contract
  // const LockMint = await ethers.getContractFactory("PumpLockMint");
  // const lockMint = await LockMint.deploy(lockAssetAddress, mintAssetAddress);

  // console.log("LockMint deployed to:", lockMint.target);

  // await lockMint.waitForDeployment();
  // const lockMintAddr = lockMint.target

  const lockMintAddr = "0xeB863b2dc8acA4e3C053009d6770e76BD16A55a9"

  try {
    await run("verify:verify", {
      address: lockMintAddr,
      constructorArguments: [lockAssetAddress, mintAssetAddress],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }


  // const contractOwner = "0x77A0545Dc1Dc6bAee8d9c1d436c6688a75Ae5777";

  // const pumpLockMint = await ethers.getContractAt("PumpLockMint", lockMintAddr, deployer);

  // console.log("PumpLockMint.setAdmin")
  // const tx1 = await pumpLockMint.setAdmin(contractOwner);
  // await tx1.wait(3)

  // console.log("PumpLockMint.setApprover")
  // const tx2 = await pumpLockMint.setApprover(contractOwner);
  // await tx2.wait(3)

  // console.log("PumpLockMint.transferOwnership")
  // const tx3 = await pumpLockMint.transferOwnership(contractOwner);
  // await tx3.wait(3)
  // // 0xc3c02d146bBE9B4B51243AC626862b7FBb5B23E4

}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

