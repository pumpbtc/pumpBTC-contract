const sleep = ms => new Promise(r => setTimeout(r, ms));


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const pumpTokenaddr = "0xf469fbd2abcd6b9de8e169d128226c0fc90a012e";

  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
  const lzEndpointAddr = "0x1a44076050125825900e736c501f859c50fE728c";

  const PumpTokenOFTAdapter = await ethers.getContractFactory("PumpTokenOFTAdapter");
  const pumpTokenOFTAdapter = await PumpTokenOFTAdapter.deploy(
    pumpTokenaddr,
    lzEndpointAddr
  );

  console.log("PumpTokenOFTAdapter deployed to:", pumpTokenOFTAdapter.target);

  await pumpTokenOFTAdapter.waitForDeployment();

  console.log("Verifying contracts on Etherscan...");
  await sleep(10);


//   const pumpTokenOFTAdapterAddr = "0xD57aAA5C8116cf0F83F7DA5FDCDF90fdde58ea35"
  const pumpTokenOFTAdapterAddr = await pumpTokenOFTAdapter.getAddress()

  try {
    await run("verify:verify", {
      address: pumpTokenOFTAdapterAddr,
      constructorArguments: [pumpTokenaddr,lzEndpointAddr],
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
