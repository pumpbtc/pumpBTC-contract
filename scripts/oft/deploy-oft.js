const sleep = ms => new Promise(r => setTimeout(r, ms));


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts

  // const lzEndpointAddr = "0x1a44076050125825900e736c501f859c50fE728c"; // base
  // const lzEndpointAddr = "0x1a44076050125825900e736c501f859c50fE728c"; // bob
  // const lzEndpointAddr = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B"; // zircuit
  // const lzEndpointAddr = "0x1a44076050125825900e736c501f859c50fE728c"; // eth
  const lzEndpointAddr = "0x6C7Ab2202C98C4227C5c46f1417D81144DA716Ff";  // berachain cartio
  
  const PumpTokenOFT = await ethers.getContractFactory("PumpTokenOFT");
  const pumpTokenOFT = await PumpTokenOFT.deploy(lzEndpointAddr);

  console.log("PumpTokenOFT deployed to:", pumpTokenOFT.target);

  await pumpTokenOFT.waitForDeployment();

  console.log("Verifying contracts on Etherscan...");
  await sleep(10);


  const pumpTokenOFTAddr = await pumpTokenOFT.getAddress()

  // const pumpTokenOFTAddr =  "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E"

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
