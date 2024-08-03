const sleep = ms => new Promise(r => setTimeout(r, ms));


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
  const lzEndpointAddr = "0x1a44076050125825900e736c501f859c50fE728c";
  const PumpTokenOFT = await ethers.getContractFactory("PumpTokenOFT");
  const pumpTokenOFT = await PumpTokenOFT.deploy(lzEndpointAddr);

  console.log("PumpTokenOFT deployed to:", pumpTokenOFT.target);

  await pumpTokenOFT.waitForDeployment();

  console.log("Verifying contracts on Etherscan...");
  await sleep(10);


  const pumpTokenOFTAddr = await pumpTokenOFT.getAddress()

  // const pumpTokenOFTAddr =  "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"

  try {
    await run("verify:verify", {
      address: pumpTokenOFTAddr,
      constructorArguments: [lzEndpointAddr],
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
