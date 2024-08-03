import { deployContract } from "./utils-zksync";

export default async function main() {
  const contractArtifactName = "PumpTokenOFT";
  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
  const lzEndpointAddr = "0x5c6cfF4b7C49805F8295Ff73C204ac83f3bC4AE7";
  const constructorArguments = [lzEndpointAddr];
  await deployContract(contractArtifactName, constructorArguments);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
